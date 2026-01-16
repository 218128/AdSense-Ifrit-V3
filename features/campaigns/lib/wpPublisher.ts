/**
 * WordPress Publisher Service
 * FSD: features/campaigns/lib/wpPublisher.ts
 * 
 * SoC: Separated from generators.ts
 * Responsibility: Publish content to WordPress sites
 */

import type { Campaign, PipelineContext } from '../model/types';
import type { WPSite } from '@/features/wordpress';
import { createPost, updatePost, uploadMedia } from '@/features/wordpress';
import type { GeneratedImages, ImageProgressCallback } from './imageGenerator';
import { generateImages } from './imageGenerator';

// ============================================================================
// Types
// ============================================================================

export interface PublishResult {
    postId: number;
    postUrl: string;
}

export interface RetryImagesResult {
    success: boolean;
    coverUploaded?: boolean;
    inlineCount?: number;
    error?: string;
}

export interface PublishOptions {
    onProgress?: (message: string) => void;
}

// ============================================================================
// Image Upload Helpers
// ============================================================================
/**
 * Fetch image via server-side proxy to bypass CORS restrictions
 * Includes retry logic and CORS-friendly fallback for known sources
 */
async function fetchImageViaProxy(imageUrl: string, maxRetries = 3): Promise<Buffer | null> {
    // Handle data URLs directly
    if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1];
        return Buffer.from(base64Data, 'base64');
    }

    // Check if URL is from a CORS-friendly source (try direct first)
    const corsAllowedHosts = ['images.unsplash.com', 'images.pexels.com'];
    const isCorsAllowed = corsAllowedHosts.some(host => imageUrl.includes(host));

    // Try direct fetch first for CORS-allowed sources
    if (isCorsAllowed) {
        try {
            const directResponse = await fetch(imageUrl);
            if (directResponse.ok) {
                const blob = await directResponse.blob();
                const arrayBuffer = await blob.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }
        } catch {
            // CORS blocked, fall through to proxy
        }
    }

    // Use server-side proxy with retry logic
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const proxyResponse = await fetch('/api/proxy-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: imageUrl }),
            });

            if (proxyResponse.ok) {
                const result = await proxyResponse.json();
                if (result.success && result.data) {
                    return Buffer.from(result.data, 'base64');
                }
            } else if (proxyResponse.status === 404 && attempt < maxRetries) {
                // Route may have been temporarily unavailable (HMR), retry
                console.log(`[WPPublisher] Proxy 404, retrying (${attempt}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, 500 * attempt)); // Exponential backoff
                continue;
            } else {
                console.warn(`[WPPublisher] Proxy failed for ${imageUrl}: ${proxyResponse.status}`);
            }
        } catch (error) {
            if (attempt < maxRetries) {
                console.log(`[WPPublisher] Proxy error, retrying (${attempt}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, 500 * attempt));
                continue;
            }
            console.warn('[WPPublisher] Image fetch via proxy failed:', error);
        }
    }

    return null;
}

/**
 * Upload a cover image to WordPress and return the media ID
 */
async function uploadCoverImage(
    wpSite: WPSite,
    imageUrl: string,
    slug: string,
    altText: string
): Promise<number | undefined> {
    try {
        const imageBuffer = await fetchImageViaProxy(imageUrl);
        if (!imageBuffer) {
            console.warn('[WPPublisher] Failed to download cover image');
            return undefined;
        }

        const uploadResult = await uploadMedia(wpSite, {
            file: imageBuffer,
            filename: `${slug}-cover.jpg`,
            mimeType: 'image/jpeg',
            alt_text: altText,
        });

        if (uploadResult.success && uploadResult.data) {
            return uploadResult.data.id;
        }
    } catch (error) {
        console.warn('[WPPublisher] Featured image upload failed:', error);
    }
    return undefined;
}

/**
 * Upload inline images and inject them into content
 */
async function processInlineImages(
    wpSite: WPSite,
    inlineImages: NonNullable<GeneratedImages['inline']>,
    htmlContent: string,
    slug: string
): Promise<string> {
    try {
        const { injectImages } = await import('./imageOptimization');
        type GeneratedImage = {
            url: string;
            altText: string;
            placement: 'after-intro' | 'after-h2' | 'before-conclusion' | 'inline'
        };
        const uploadedImages: GeneratedImage[] = [];

        for (let i = 0; i < inlineImages.length; i++) {
            const inlineImg = inlineImages[i];
            try {
                // Use proxy to bypass CORS restrictions
                const imageBuffer = await fetchImageViaProxy(inlineImg.url);
                if (!imageBuffer) {
                    console.warn(`[WPPublisher] Inline image ${i + 1} download failed (CORS or network)`);
                    continue;
                }

                const uploadResult = await uploadMedia(wpSite, {
                    file: imageBuffer,
                    filename: `${slug}-inline-${i + 1}.jpg`,
                    mimeType: 'image/jpeg',
                    alt_text: inlineImg.alt,
                });

                if (uploadResult.success && uploadResult.data) {
                    uploadedImages.push({
                        url: uploadResult.data.source_url,
                        altText: inlineImg.alt,
                        placement: i === 0 ? 'after-intro' : 'after-h2',
                    });
                    console.log(`[WPPublisher] Inline image ${i + 1} uploaded: ${uploadResult.data.id}`);
                }
            } catch (error) {
                console.warn(`[WPPublisher] Inline image ${i + 1} upload failed:`, error);
            }
        }

        // Inject uploaded images into content
        if (uploadedImages.length > 0) {
            const injectionResult = injectImages(htmlContent, uploadedImages);
            console.log(`[WPPublisher] Injected ${injectionResult.imagesAdded} inline images`);
            return injectionResult.content;
        }
    } catch (error) {
        console.warn('[WPPublisher] Inline image processing failed:', error);
    }
    return htmlContent;
}

// ============================================================================
// Main Publish Function
// ============================================================================

/**
 * Publish content pipeline result to WordPress
 * 
 * @param wpSite - The WordPress site to publish to
 * @param campaign - Campaign configuration
 * @param ctx - Pipeline context with content and images
 * @param options - Optional progress callbacks
 * @returns Post ID and URL
 */
export async function publishToWordPress(
    wpSite: WPSite,
    campaign: Campaign,
    ctx: PipelineContext,
    options?: PublishOptions
): Promise<PublishResult> {
    if (!ctx.content) {
        throw new Error('No content to publish');
    }

    let featuredMediaId: number | undefined;
    let htmlContent = ctx.content.body;

    options?.onProgress?.('Uploading images to WordPress...');

    // Upload cover image if available
    if (ctx.images?.cover) {
        featuredMediaId = await uploadCoverImage(
            wpSite,
            ctx.images.cover.url,
            ctx.content.slug,
            ctx.images.cover.alt
        );
    }

    // Upload and inject inline images if available
    if (ctx.images?.inline && ctx.images.inline.length > 0) {
        htmlContent = await processInlineImages(
            wpSite,
            ctx.images.inline as NonNullable<GeneratedImages['inline']>,
            htmlContent,
            ctx.content.slug
        );
    }

    options?.onProgress?.('Creating WordPress post...');

    // Determine WP author ID
    // Priority: 1. Matched Ifrit author's WP mapping (auto-sync if needed), 2. Campaign targetAuthorId
    let wpAuthorId: number | undefined = campaign.targetAuthorId;

    // DEBUG: Log author resolution start
    console.log(`[WPPublisher] Author resolution starting:`, {
        hasMatchedAuthor: !!ctx.matchedAuthor,
        matchedAuthorId: ctx.matchedAuthor?.id || 'none',
        matchedAuthorName: ctx.matchedAuthor?.name || 'none',
        campaignTargetAuthorId: campaign.targetAuthorId || 'none',
    });

    if (ctx.matchedAuthor?.id) {
        // Get the full author profile to access WP mappings
        const { useAuthorStore, syncAuthorToSite } = await import('@/features/authors');
        const fullAuthor = useAuthorStore.getState().getAuthor(ctx.matchedAuthor.id);

        if (fullAuthor) {
            // Check for existing mapping
            let mappedWpUserId = fullAuthor.wpAuthorMappings.find(m => m.siteId === wpSite.id)?.wpUserId;

            if (!mappedWpUserId) {
                // AUTO-SYNC: Author not synced to this site - sync now!
                console.log(`[WPPublisher] Auto-syncing author "${fullAuthor.name}" to ${wpSite.name}...`);
                options?.onProgress?.(`Syncing author ${fullAuthor.name}...`);

                const syncResult = await syncAuthorToSite(fullAuthor, wpSite);

                if (syncResult.success && syncResult.wpUserId) {
                    mappedWpUserId = syncResult.wpUserId;
                    console.log(`[WPPublisher] ${syncResult.action}: ${syncResult.message}`);
                } else {
                    console.warn(`[WPPublisher] Author sync failed: ${syncResult.message}, using default author`);
                }
            }

            if (mappedWpUserId) {
                wpAuthorId = mappedWpUserId;
                console.log(`[WPPublisher] Using WP author: ${fullAuthor.name} (WP ID: ${mappedWpUserId})`);
            }
        }
    }

    const postResult = await createPost(wpSite, {
        title: ctx.content.title,
        content: htmlContent,
        excerpt: ctx.content.excerpt,
        slug: ctx.content.slug,
        status: campaign.postStatus,
        categories: campaign.targetCategoryId ? [campaign.targetCategoryId] : undefined,
        author: wpAuthorId,
        featured_media: featuredMediaId,
    });

    if (!postResult.success || !postResult.data) {
        throw new Error(postResult.error || 'Failed to create WordPress post');
    }

    options?.onProgress?.('Published successfully!');

    return {
        postId: postResult.data.id,
        postUrl: postResult.data.link
    };
}

// ============================================================================
// Retry Images for Existing Post
// ============================================================================

/**
 * Retry image generation for a post that was published without images
 * Generates new images and updates the post with featured media AND inline images
 * 
 * @param wpSite - The WordPress site
 * @param postId - The existing post ID
 * @param title - Post title for image generation
 * @param aiConfig - Campaign AI configuration
 * @param onProgress - Optional progress callback
 */
export async function retryImagesForPost(
    wpSite: WPSite,
    postId: number,
    title: string,
    aiConfig: Campaign['aiConfig'],
    onProgress?: ImageProgressCallback
): Promise<RetryImagesResult> {
    try {
        const totalSteps = aiConfig.includeImages && aiConfig.imagePlacements?.includes('inline') ? 3 : 2;
        onProgress?.({ phase: 'starting', message: 'Regenerating images...', current: 0, total: totalSteps });

        // Generate images (cover + inline if configured)
        const images = await generateImages(title, aiConfig, onProgress);

        // Check if we have a cover image
        if (!images.cover) {
            return {
                success: false,
                error: 'Image generation failed - check API keys in Settings',
            };
        }

        // Upload cover as featured media
        let featuredMediaId: number | undefined;
        let inlineCount = 0;

        try {
            onProgress?.({ phase: 'cover', message: 'Uploading cover image...', current: 1, total: totalSteps });

            // Use proxy to bypass CORS
            const imageBuffer = await fetchImageViaProxy(images.cover.url);
            if (imageBuffer) {
                const uploadResult = await uploadMedia(wpSite, {
                    file: imageBuffer,
                    filename: `retry-${postId}-cover.jpg`,
                    mimeType: 'image/jpeg',
                    alt_text: images.cover.alt,
                });

                if (uploadResult.success && uploadResult.data) {
                    featuredMediaId = uploadResult.data.id;
                    console.log(`[WPPublisher] Retry cover uploaded: ${uploadResult.data.id}`);
                }
            }
        } catch (error) {
            console.warn('[WPPublisher] Retry cover upload failed:', error);
        }

        // Process inline images if we have them and post has content to inject into
        if (images.inline && images.inline.length > 0) {
            try {
                onProgress?.({ phase: 'inline', message: 'Processing inline images...', current: 2, total: totalSteps });

                // Fetch existing post content
                const { getPost } = await import('@/features/wordpress/api/wordpressApi');
                const postResult = await getPost(wpSite, postId);

                // WPPostResult has data.content as {rendered: string}
                const postData = postResult.data as { content?: { rendered?: string }; slug?: string };
                if (postResult.success && postData.content?.rendered) {
                    // Get the raw content (we need to strip WP's wrapper if present)
                    let existingContent = postData.content.rendered;

                    // Process inline images and inject into content
                    const slug = postData.slug || `post-${postId}`;
                    const updatedContent = await processInlineImages(wpSite, images.inline, existingContent, slug);

                    // Count how many images were added
                    inlineCount = images.inline.length;

                    // Update the post with new content that includes inline images
                    if (updatedContent !== existingContent) {
                        await updatePost(wpSite, postId, {
                            content: updatedContent,
                        });
                        console.log(`[WPPublisher] Retry injected ${inlineCount} inline images`);
                    }
                }
            } catch (error) {
                console.warn('[WPPublisher] Retry inline images failed:', error);
            }
        }

        // Update the post with featured image
        if (featuredMediaId) {
            await updatePost(wpSite, postId, {
                featured_media: featuredMediaId,
            });

            onProgress?.({ phase: 'complete', message: `✅ Cover + ${inlineCount} inline images added`, current: totalSteps, total: totalSteps });

            return {
                success: true,
                coverUploaded: true,
                inlineCount,
            };
        }

        return {
            success: false,
            error: 'Failed to upload image to WordPress',
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Retry failed',
        };
    }
}
