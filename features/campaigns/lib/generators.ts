/**
 * Content Generators
 * FSD: features/campaigns/lib/generators.ts
 * 
 * Uses the Unified AI Capabilities System for all AI operations.
 * Generates SEMANTIC HTML directly (no MD→HTML conversion).
 */

import type { Campaign, PipelineContext, SourceItem } from '../model/types';
import type { WPSite } from '@/features/wordpress';
import { createPost, uploadMedia } from '@/features/wordpress';
import { buildResearchPrompt, buildImagePrompt } from './prompts';
import { buildHtmlPrompt, type ArticleType, type HtmlPromptConfig } from './htmlPrompts';

// ============================================================================
// Research Generator - Uses 'research' capability
// ============================================================================

export async function performResearch(
    topic: string,
    aiConfig: Campaign['aiConfig']
): Promise<string> {
    const response = await fetch('/api/capabilities/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: buildResearchPrompt(topic),
            maxTokens: 2000,
            preferredHandler: aiConfig.researchProvider
                ? `${aiConfig.researchProvider}-research`
                : undefined,
            topic,
            itemType: 'research',
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

    const response = await fetch('/api/capabilities/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: fullPrompt,
            maxTokens: Math.ceil(aiConfig.targetLength * 2), // HTML is larger
            temperature: 0.7,
            preferredHandler: aiConfig.provider
                ? `${aiConfig.provider}-generate`
                : undefined,
            topic: sourceItem.topic,
            itemType: 'html-article',
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
// Image Generator - Uses 'images' capability
// ============================================================================

export async function generateImages(
    title: string,
    aiConfig: Campaign['aiConfig']
): Promise<PipelineContext['images']> {
    const images: PipelineContext['images'] = {};

    if (aiConfig.imagePlacements?.includes('cover') || !aiConfig.imagePlacements) {
        try {
            const response = await fetch('/api/capabilities/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: buildImagePrompt(title),
                    preferredHandler: aiConfig.imageProvider
                        ? `${aiConfig.imageProvider}-images`
                        : undefined,
                    topic: title,
                    itemType: 'image',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.text) {
                    images.cover = { url: data.text, alt: title };
                    console.log(`[Images] Success via ${data.handlerUsed} in ${data.latencyMs}ms`);
                } else {
                    console.warn('[Images] Failed:', data.error);
                }
            }
        } catch (error) {
            console.warn('Cover image generation failed:', error);
        }
    }

    return images;
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

    // Content is already semantic HTML from AI generation
    const htmlContent = ctx.content.body;

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
