/**
 * Content Generators (Barrel Export)
 * FSD: features/campaigns/lib/generators.ts
 * 
 * This file has been refactored following Separation of Concerns.
 * Implementation is split into focused modules:
 * - researchService.ts - Topic research
 * - contentGenerator.ts - Article content generation
 * - imageGenerator.ts - Image generation with fallbacks
 * - wpPublisher.ts - WordPress publishing
 * 
 * This barrel file re-exports for backward compatibility.
 */

// Re-export from split modules for backward compatibility
export { performResearch } from './researchService';
export { generateContent, mapArticleType, parseHtmlContent } from './contentGenerator';
export { generateImages, generateSingleImage, type ImageProgressCallback } from './imageGenerator';
export { publishToWordPress, retryImagesForPost, type RetryImagesResult } from './wpPublisher';

// NOTE: Original implementation is preserved below for reference.
// Once all consumers are updated to use direct imports, this file can be reduced.

import type { Campaign, PipelineContext, SourceItem } from '../model/types';
import type { WPSite } from '@/features/wordpress';
import { createPost, uploadMedia } from '@/features/wordpress';
import { buildResearchPrompt, buildImagePrompt } from './prompts';
import { buildHtmlPrompt, type ArticleType, type HtmlPromptConfig } from './htmlPrompts';

export async function performResearch(
    topic: string,
    aiConfig: Campaign['aiConfig']
): Promise<string> {
    // Get API key from client-side key manager for the preferred provider
    let apiKey: string | undefined;
    try {
        const { getCapabilityKey } = await import('@/lib/ai/utils/getCapabilityKey');
        apiKey = await getCapabilityKey();
    } catch {
        console.warn('[Research] Could not get API key from KeyManager');
    }

    const response = await fetch('/api/capabilities/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: buildResearchPrompt(topic),
            maxTokens: 2000,
            topic,
            itemType: 'research',
            // Pass API key to server via context
            context: apiKey ? { apiKey } : undefined,
        }),
    });

    if (!response.ok) {
        throw new Error('Research failed');
    }

    const data = await response.json();

    if (!data.success) {
        console.warn('[Research] Failed:', data.error, 'Handler:', data.handlerUsed);
        throw new Error(data.error || 'Research failed');
    }

    console.log(`[Research] Success via ${data.handlerUsed} in ${data.latencyMs}ms`);
    return data.text || '';
}

// ============================================================================
// Content Generator - Direct HTML Generation
// ============================================================================

/**
 * Map campaign article type to HTML prompt type
 */
function mapArticleType(type: Campaign['aiConfig']['articleType']): ArticleType {
    switch (type) {
        case 'listicle':
            return 'listicle';
        case 'how-to':
            return 'howto';
        case 'pillar':
        case 'cluster':
        case 'review':
        default:
            return 'guide';
    }
}

/**
 * Generate content as semantic HTML directly
 */
export async function generateContent(
    sourceItem: SourceItem,
    campaign: Campaign,
    research?: string
): Promise<PipelineContext['content']> {
    const { aiConfig } = campaign;

    // Build HTML prompt configuration
    const htmlConfig: HtmlPromptConfig = {
        topic: sourceItem.topic,
        niche: campaign.name || 'general',
        wordCount: aiConfig.targetLength,
        includeFAQ: aiConfig.includeFAQ ?? true,
        includeTableOfContents: true,
        adDensity: 'medium',
    };

    // Get article type for HTML prompt
    const articleType = mapArticleType(aiConfig.articleType);
    const prompt = buildHtmlPrompt(articleType, htmlConfig);

    // Add research context if available
    const fullPrompt = research
        ? `${prompt}\n\nUse this research to inform the content (cite naturally):\n${research}`
        : prompt;

    // Get API key from client-side key manager
    let apiKey: string | undefined;
    try {
        const { getCapabilityKey } = await import('@/lib/ai/utils/getCapabilityKey');
        apiKey = await getCapabilityKey();
    } catch {
        console.warn('[Generate] Could not get API key from KeyManager');
    }

    // Use generous token limit for complete article generation
    // Full HTML articles with TOC, sections, FAQ need substantial tokens
    // Quality over cost - no artificial limits
    const minTokensForQuality = 16384;

    const response = await fetch('/api/capabilities/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: fullPrompt,
            maxTokens: minTokensForQuality,  // No artificial limits - complete articles only
            temperature: 0.7,
            topic: sourceItem.topic,
            itemType: 'html-article',
            context: apiKey ? { apiKey } : undefined,
        }),
    });

    if (!response.ok) {
        throw new Error('Content generation failed');
    }

    const data = await response.json();

    if (!data.success) {
        console.warn('[Generate] Failed:', data.error, 'Handler:', data.handlerUsed);
        throw new Error(data.error || 'Content generation failed');
    }

    console.log(`[Generate] HTML via ${data.handlerUsed} in ${data.latencyMs}ms`);
    const htmlContent = data.text || '';

    return parseHtmlContent(htmlContent, sourceItem.topic);
}

/**
 * Parse generated HTML content to extract title, body, excerpt
 */
function parseHtmlContent(html: string, fallbackTitle: string) {
    // Extract title from <h1>
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : fallbackTitle;

    // Generate slug from title
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);

    // Extract excerpt from <p class="excerpt"> or first <p>
    const excerptMatch = html.match(/<p[^>]*class="excerpt"[^>]*>([^<]+)<\/p>/i)
        || html.match(/<header[^>]*>[\s\S]*?<p[^>]*>([^<]+)<\/p>/i);
    const excerpt = excerptMatch
        ? excerptMatch[1].trim().slice(0, 160) + '...'
        : '';

    // Body is the full HTML (WP handles it)
    const body = html;

    return { title, body, excerpt, slug };
}

// ============================================================================
// Image Generator - Uses 'images' (AI) + 'search-images' (Stock) capabilities
// ============================================================================

/**
 * Progress callback for SSE tracking
 */
type ImageProgressCallback = (status: {
    phase: 'starting' | 'cover' | 'inline' | 'complete';
    message: string;
    current?: number;
    total?: number
}) => void;

/**
 * Generate images using capabilities with fallback chain:
 * - AI generation via 'images' capability
 * - Stock search via 'search-images' capability (fallback)
 */
export async function generateImages(
    title: string,
    aiConfig: Campaign['aiConfig'],
    onProgress?: ImageProgressCallback
): Promise<PipelineContext['images'] & { _failures?: Array<{ type: string; error: string }> }> {
    const images: PipelineContext['images'] = {};
    const failures: Array<{ type: string; error: string }> = [];

    // Get placements from config (default: cover only)
    const placements = aiConfig.imagePlacements || ['cover'];
    const totalImages = (placements.includes('cover') ? 1 : 0) + (placements.includes('inline') ? 2 : 0);
    let currentImage = 0;

    onProgress?.({ phase: 'starting', message: `Generating ${totalImages} images...`, current: 0, total: totalImages });

    // Generate cover image
    if (placements.includes('cover')) {
        onProgress?.({ phase: 'cover', message: 'Generating cover image...', current: currentImage, total: totalImages });
        const result = await generateSingleImage(title, 'cover', aiConfig);
        currentImage++;
        if (result) {
            images.cover = result;
            onProgress?.({ phase: 'cover', message: 'Cover image ready', current: currentImage, total: totalImages });
        } else {
            failures.push({ type: 'cover', error: 'All image sources failed' });
            onProgress?.({ phase: 'cover', message: '⚠️ Cover image failed - check API keys', current: currentImage, total: totalImages });
        }
    }

    // Generate inline images if configured
    if (placements.includes('inline')) {
        const inlineImages: Array<{ url: string; alt: string; position: string }> = [];

        // Generate up to 2 inline images
        for (let i = 0; i < 2; i++) {
            onProgress?.({ phase: 'inline', message: `Generating inline image ${i + 1}...`, current: currentImage, total: totalImages });
            const position = i === 0 ? 'after-intro' : 'after-h2';
            const result = await generateSingleImage(
                `${title} - illustration ${i + 1}`,
                'inline',
                aiConfig
            );
            currentImage++;
            if (result) {
                inlineImages.push({ ...result, position });
            } else {
                failures.push({ type: `inline-${i + 1}`, error: 'All image sources failed' });
                onProgress?.({ phase: 'inline', message: `⚠️ Inline image ${i + 1} failed`, current: currentImage, total: totalImages });
            }
        }

        if (inlineImages.length > 0) {
            images.inline = inlineImages;
        }
    }

    // Report summary with failures
    const successCount = (images.cover ? 1 : 0) + (images.inline?.length || 0);
    const failCount = failures.length;
    const summary = failCount > 0
        ? `⚠️ ${successCount} generated, ${failCount} failed`
        : `✅ ${successCount} images ready`;

    onProgress?.({ phase: 'complete', message: summary, current: totalImages, total: totalImages });

    // Attach failures to result for tracking
    if (failures.length > 0) {
        (images as { _failures?: typeof failures })._failures = failures;
    }

    return images;
}

/**
 * Generate a single image using AI first, then stock search fallback
 */
async function generateSingleImage(
    topic: string,
    type: 'cover' | 'inline' | 'og-image' | 'twitter-card',
    aiConfig: Campaign['aiConfig']
): Promise<{ url: string; alt: string } | null> {
    // Get API key from client-side key manager
    let apiKey: string | undefined;
    try {
        const { getCapabilityKey } = await import('@/lib/ai/utils/getCapabilityKey');
        apiKey = await getCapabilityKey();
    } catch {
        // KeyManager not available
    }

    // Strategy: AI first (if preferred) or search first (free)
    const preferAI = aiConfig.imageProvider === 'gemini' || aiConfig.imageProvider === 'openrouter';
    const sources = preferAI ? ['ai', 'search'] : ['search', 'ai'];

    for (const source of sources) {
        try {
            const capability = source === 'ai' ? 'images' : 'search-images';
            const prompt = source === 'ai'
                ? buildImagePrompt(topic)
                : topic;  // search-images just needs the topic/keyword

            const response = await fetch(`/api/capabilities/${capability}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    preferredHandler: aiConfig.imageProvider
                        ? `${aiConfig.imageProvider}`
                        : undefined,
                    topic,
                    itemType: type,
                    context: apiKey ? { apiKey } : undefined,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.text) {
                    console.log(`[Images] ${type} via ${data.handlerUsed} in ${data.latencyMs}ms`);
                    return { url: data.text, alt: topic };
                }
            }
        } catch (error) {
            console.warn(`[Images] ${source} failed for ${type}:`, error);
        }
    }

    console.warn(`[Images] All sources failed for ${type}: ${topic}`);
    return null;
}

// ============================================================================
// WordPress Publisher
// ============================================================================

export async function publishToWordPress(
    wpSite: WPSite,
    campaign: Campaign,
    ctx: PipelineContext
): Promise<PipelineContext['wpResult']> {
    if (!ctx.content) {
        throw new Error('No content to publish');
    }

    let featuredMediaId: number | undefined;
    let htmlContent = ctx.content.body;

    // Upload cover image if available
    if (ctx.images?.cover) {
        try {
            const imageResponse = await fetch(ctx.images.cover.url);
            const imageBlob = await imageResponse.blob();
            const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

            const uploadResult = await uploadMedia(wpSite, {
                file: imageBuffer,
                filename: `${ctx.content.slug}-cover.jpg`,
                mimeType: 'image/jpeg',
                alt_text: ctx.images.cover.alt,
            });

            if (uploadResult.success && uploadResult.data) {
                featuredMediaId = uploadResult.data.id;
            }
        } catch (error) {
            console.warn('Featured image upload failed:', error);
        }
    }

    // Upload and inject inline images if available
    if (ctx.images?.inline && ctx.images.inline.length > 0) {
        try {
            const { injectImages } = await import('./imageOptimization');
            type GeneratedImage = { url: string; altText: string; placement: 'after-intro' | 'after-h2' | 'before-conclusion' | 'inline' };
            const uploadedImages: GeneratedImage[] = [];

            for (let i = 0; i < ctx.images.inline.length; i++) {
                const inlineImg = ctx.images.inline[i];
                try {
                    const imageResponse = await fetch(inlineImg.url);
                    const imageBlob = await imageResponse.blob();
                    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

                    const uploadResult = await uploadMedia(wpSite, {
                        file: imageBuffer,
                        filename: `${ctx.content.slug}-inline-${i + 1}.jpg`,
                        mimeType: 'image/jpeg',
                        alt_text: inlineImg.alt,
                    });

                    if (uploadResult.success && uploadResult.data) {
                        // Use WP Media URL for the injected image
                        uploadedImages.push({
                            url: uploadResult.data.source_url,
                            altText: inlineImg.alt,
                            placement: i === 0 ? 'after-intro' : 'after-h2',
                        });
                        console.log(`[Inline Image ${i + 1}] Uploaded to WP Media: ${uploadResult.data.id}`);
                    }
                } catch (error) {
                    console.warn(`Inline image ${i + 1} upload failed:`, error);
                }
            }

            // Inject uploaded images into content
            if (uploadedImages.length > 0) {
                const injectionResult = injectImages(htmlContent, uploadedImages);
                htmlContent = injectionResult.content;
                console.log(`[Publish] Injected ${injectionResult.imagesAdded} inline images`);
            }
        } catch (error) {
            console.warn('Inline image processing failed:', error);
        }
    }

    const postResult = await createPost(wpSite, {
        title: ctx.content.title,
        content: htmlContent,
        excerpt: ctx.content.excerpt,
        slug: ctx.content.slug,
        status: campaign.postStatus,
        categories: campaign.targetCategoryId ? [campaign.targetCategoryId] : undefined,
        author: campaign.targetAuthorId,
        featured_media: featuredMediaId,
    });

    if (!postResult.success || !postResult.data) {
        throw new Error(postResult.error || 'Failed to create WordPress post');
    }

    return { postId: postResult.data.id, postUrl: postResult.data.link };
}

// ============================================================================
// Retry Images for Existing Post
// ============================================================================

export interface RetryImagesResult {
    success: boolean;
    coverUploaded?: boolean;
    inlineCount?: number;
    error?: string;
}

/**
 * Retry image generation for an existing WordPress post
 * Generates new images and updates the post with featured media
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
            console.warn('[Retry] Cover upload failed:', error);
        }

        // Update the post with featured image
        if (featuredMediaId) {
            const { updatePost } = await import('@/features/wordpress');
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
