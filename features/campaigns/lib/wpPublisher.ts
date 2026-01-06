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
 * Upload a cover image to WordPress and return the media ID
 */
async function uploadCoverImage(
    wpSite: WPSite,
    imageUrl: string,
    slug: string,
    altText: string
): Promise<number | undefined> {
    try {
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

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
                const imageResponse = await fetch(inlineImg.url);
                const imageBlob = await imageResponse.blob();
                const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

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
            ctx.images.inline,
            htmlContent,
            ctx.content.slug
        );
    }

    options?.onProgress?.('Creating WordPress post...');

    // Determine WP author ID
    // Priority: 1. Matched Ifrit author's WP mapping, 2. Campaign targetAuthorId
    let wpAuthorId: number | undefined = campaign.targetAuthorId;

    if (ctx.matchedAuthor?.id) {
        // Get the full author profile to access WP mappings
        const { useAuthorStore, getWPUserIdForSite } = await import('@/features/authors');
        const fullAuthor = useAuthorStore.getState().getAuthor(ctx.matchedAuthor.id);

        if (fullAuthor) {
            const mappedWpUserId = fullAuthor.wpAuthorMappings.find(m => m.siteId === wpSite.id)?.wpUserId;
            if (mappedWpUserId) {
                wpAuthorId = mappedWpUserId;
                console.log(`[WPPublisher] Using mapped WP author: ${fullAuthor.name} (WP ID: ${mappedWpUserId})`);
            } else {
                console.log(`[WPPublisher] Author ${fullAuthor.name} not synced to ${wpSite.name}, using default author`);
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
 * Retry image generation for an existing WordPress post
 * Generates new images and updates the post with featured media
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
        onProgress?.({ phase: 'starting', message: 'Regenerating images...', current: 0, total: 1 });

        // Generate images
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
        try {
            const imageResponse = await fetch(images.cover.url);
            if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer();
                const uploadResult = await uploadMedia(wpSite, {
                    file: imageBuffer,
                    filename: `retry-${postId}-cover.jpg`,
                    mimeType: 'image/jpeg',
                    alt_text: images.cover.alt,
                });

                if (uploadResult.success && uploadResult.data) {
                    featuredMediaId = uploadResult.data.id;
                }
            }
        } catch (error) {
            console.warn('[WPPublisher] Retry cover upload failed:', error);
        }

        // Update the post with featured image
        if (featuredMediaId) {
            await updatePost(wpSite, postId, {
                featured_media: featuredMediaId,
            });

            onProgress?.({ phase: 'complete', message: '✅ Cover image added', current: 1, total: 1 });

            return {
                success: true,
                coverUploaded: true,
                inlineCount: images.inline?.length || 0,
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
