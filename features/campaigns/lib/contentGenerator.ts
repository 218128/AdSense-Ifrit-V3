/**
 * Content Generator Service
 * FSD: features/campaigns/lib/contentGenerator.ts
 * 
 * SoC: Separated from generators.ts
 * Responsibility: Generate article content as semantic HTML
 */

import type { Campaign, PipelineContext, SourceItem } from '../model/types';
import { buildHtmlPrompt, type ArticleType, type HtmlPromptConfig } from './htmlPrompts';

// ============================================================================
// Types
// ============================================================================

export interface ContentGenerationResult {
    title: string;
    body: string;
    excerpt: string;
    slug: string;
}

export interface ContentGenerationOptions {
    research?: string;
    onProgress?: (message: string) => void;
}

// ============================================================================
// Article Type Mapping
// ============================================================================

/**
 * Map campaign article type to HTML prompt type
 */
export function mapArticleType(type: Campaign['aiConfig']['articleType']): ArticleType {
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

// ============================================================================
// Content Generation
// ============================================================================

/**
 * Generate article content as semantic HTML
 * 
 * @param sourceItem - The topic/keyword to generate content for
 * @param campaign - Campaign configuration
 * @param options - Optional research context and progress callback
 * @returns Parsed content with title, body, excerpt, slug
 */
export async function generateContent(
    sourceItem: SourceItem,
    campaign: Campaign,
    options?: ContentGenerationOptions
): Promise<ContentGenerationResult> {
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
    const fullPrompt = options?.research
        ? `${prompt}\n\nUse this research to inform the content (cite naturally):\n${options.research}`
        : prompt;

    options?.onProgress?.('Fetching API key...');

    // Get API key from client-side key manager
    let apiKey: string | undefined;
    try {
        const { getCapabilityKey } = await import('@/lib/ai/utils/getCapabilityKey');
        apiKey = await getCapabilityKey();
    } catch {
        console.warn('[ContentGenerator] Could not get API key from KeyManager');
    }

    options?.onProgress?.('Generating content with AI...');

    // Calculate generous token limit for complete article generation
    // Full HTML articles with TOC, sections, FAQ, and conclusion need substantial tokens
    // Use 16384 (Gemini Pro max) to ensure no truncation - quality over cost
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
        console.warn('[ContentGenerator] Failed:', data.error, 'Handler:', data.handlerUsed);
        throw new Error(data.error || 'Content generation failed');
    }

    console.log(`[ContentGenerator] HTML via ${data.handlerUsed} in ${data.latencyMs}ms`);
    const htmlContent = data.text || '';

    options?.onProgress?.('Parsing generated content...');

    return parseHtmlContent(htmlContent, sourceItem.topic);
}

// ============================================================================
// HTML Parsing
// ============================================================================

/**
 * Parse generated HTML content to extract title, body, excerpt
 */
export function parseHtmlContent(html: string, fallbackTitle: string): ContentGenerationResult {
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
// Content Utilities
// ============================================================================

/**
 * Estimate reading time based on word count
 */
export function estimateReadingTime(content: string): number {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return Math.ceil(wordCount / 200); // Average reading speed
}

/**
 * Extract headings from HTML for TOC generation
 */
export function extractHeadings(html: string): Array<{ level: number; text: string; id: string }> {
    const headingRegex = /<h([2-4])[^>]*(?:id="([^"]*)")?[^>]*>([^<]+)<\/h\d>/gi;
    const headings: Array<{ level: number; text: string; id: string }> = [];

    let match;
    while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1], 10);
        const text = match[3].trim();
        const id = match[2] || text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headings.push({ level, text, id });
    }

    return headings;
}
