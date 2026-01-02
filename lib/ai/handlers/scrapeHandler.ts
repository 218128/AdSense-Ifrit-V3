/**
 * Scrape Capability Handler
 * FSD: lib/ai/handlers/scrapeHandler.ts
 * 
 * Implements the 'scrape' capability for aiServices.
 * Uses the features/sources scraper engine.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Handler Definition
// ============================================================================

export const scrapeHandler: CapabilityHandler = {
    id: 'scraper',
    name: 'Web Scraper',
    source: 'local',
    capabilities: ['scrape'],
    priority: 50,
    isAvailable: true,
    requiresApiKey: false,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const { prompt, context } = options;
        const startTime = Date.now();

        // Parse scrape request from prompt
        const url = extractUrl(prompt);
        if (!url) {
            return {
                success: false,
                error: 'No valid URL found in request',
                handlerUsed: 'scraper',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            // Dynamic import to avoid bundling issues
            const { scrapeUrl, htmlToMarkdown } = await import('@/features/sources');

            // Get template from context if provided
            const templateId = context?.templateId as string | undefined;
            const { findTemplateForDomain } = await import('@/features/sources/lib/scraperTemplates');

            const domain = new URL(url).hostname.replace('www.', '');
            const template = templateId
                ? (await import('@/features/sources/lib/scraperTemplates')).getTemplate(templateId)
                : findTemplateForDomain(domain);

            // Scrape the URL
            const result = await scrapeUrl(url, {
                contentSelector: template?.selectors.content,
                titleSelector: template?.selectors.title,
                removeSelectors: template?.removeSelectors,
                extractMeta: true,
            });

            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: result.error || 'Scrape failed',
                    handlerUsed: 'scraper',
                    source: 'local',
                    latencyMs: Date.now() - startTime,
                };
            }

            // Convert to markdown if requested
            const outputFormat = context?.outputFormat as string || 'markdown';
            const content = outputFormat === 'html'
                ? result.data.content
                : htmlToMarkdown(result.data.content);

            return {
                success: true,
                text: content,
                handlerUsed: 'scraper',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Scrape failed',
                handlerUsed: 'scraper',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Helper Functions
// ============================================================================

function extractUrl(text: string): string | null {
    // Match URLs in the text
    const urlRegex = /https?:\/\/[^\s"'<>]+/i;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
}

export default scrapeHandler;
