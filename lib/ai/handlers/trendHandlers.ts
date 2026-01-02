/**
 * Trend Scanning Handlers
 * FSD: lib/ai/handlers/trendHandlers.ts
 * 
 * Implements handlers for the 'trend-scan' capability.
 * Each handler fetches trends from a different source.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Hacker News Handler (Free, No Auth)
// ============================================================================

export const hackerNewsHandler: CapabilityHandler = {
    id: 'hackernews-trends',
    name: 'Hacker News',
    source: 'integration',
    capabilities: ['trend-scan'],
    priority: 60,
    isAvailable: true,
    requiresApiKey: false,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const maxItems = (options.context?.maxItems as number) || 10;
        const page = (options.context?.page as number) || 1;

        try {
            // Fetch top story IDs
            const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            if (!idsRes.ok) throw new Error(`HN API error: ${idsRes.status}`);

            const ids: number[] = await idsRes.json();

            // Pagination: Slice IDs based on page
            const startStr = (page - 1) * maxItems;
            const endStr = page * maxItems;
            const topIds = ids.slice(startStr, endStr);

            // Fetch story details
            const stories = await Promise.all(
                topIds.map(async (id) => {
                    const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                    return res.json();
                })
            );

            // Map to Trend Items without filtering
            // We want the pure feed of what is actually trending
            const validStories = stories.filter((s) => s && s.title);

            const trends = validStories.map((story) => ({
                topic: story.title,
                context: story.url || `HN discussion with ${story.descendants || 0} comments`,
                source: 'Hacker News',
                sourceType: 'live' as const,
                url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                timestamp: new Date(story.time * 1000),
                niche: 'technology',
            }));

            return {
                success: true,
                data: trends,
                handlerUsed: 'hackernews-trends',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch HN trends',
                handlerUsed: 'hackernews-trends',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};



// ============================================================================
// Google News RSS Handler (Free, No Auth)
// ============================================================================

export const googleNewsHandler: CapabilityHandler = {
    id: 'googlenews-trends',
    name: 'Google News',
    source: 'integration',
    capabilities: ['trend-scan'],
    priority: 55,
    isAvailable: true,
    requiresApiKey: false,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const maxItems = (options.context?.maxItems as number) || 10;

        // Extract settings from context
        const sourceSettings = options.context?.sourceSettings as Record<string, any> || {};
        const settings = sourceSettings['googlenews-trends'] || {};
        const topic = settings.topic || '';

        try {
            // Call server-side API route (handles RSS parsing server-side)
            const res = await fetch('/api/trends/google-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, maxItems }),
            });

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.error || 'Google News fetch failed');
            }

            return {
                success: true,
                data: result.data,
                handlerUsed: 'googlenews-trends',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch Google News',
                handlerUsed: 'googlenews-trends',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Product Hunt Handler (Free, No Auth)
// ============================================================================

export const productHuntHandler: CapabilityHandler = {
    id: 'producthunt-trends',
    name: 'Product Hunt',
    source: 'integration',
    capabilities: ['trend-scan'],
    priority: 50,
    isAvailable: true,
    requiresApiKey: false,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const maxItems = (options.context?.maxItems as number) || 10;

        try {
            // Call server-side API route (handles Atom parsing server-side)
            // Just fetch standard maxItems, no filtering
            const res = await fetch('/api/trends/product-hunt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxItems }),
            });

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.error || 'Product Hunt fetch failed');
            }

            // Return pure feed data without filtering
            const data = result.data as Array<{ topic: string, context: string }>;

            return {
                success: true,
                data: data.slice(0, maxItems),
                handlerUsed: 'producthunt-trends',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch Product Hunt',
                handlerUsed: 'producthunt-trends',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Brave Search MCP Handler (Requires API Key)
// ============================================================================

export const braveSearchHandler: CapabilityHandler = {
    id: 'brave-search-trends',
    name: 'Brave Search',
    source: 'mcp',
    mcpServerId: 'brave-search',
    mcpToolName: 'brave_web_search',
    capabilities: ['trend-scan', 'research'],
    priority: 80,
    isAvailable: true,
    requiresApiKey: true,
    apiKeySettingName: 'braveApiKey',

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const apiKey = options.context?.apiKey as string;

        if (!apiKey) {
            return {
                success: false,
                error: 'Brave Search API key required',
                handlerUsed: 'brave-search-trends',
                source: 'mcp',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const maxItems = (options.context?.maxItems as number) || 10;
            const page = (options.context?.page as number) || 1;
            const offset = Math.max(0, page - 1); // API expects 0-indexed offset (0-9)

            // Extract settings from context
            const sourceSettings = options.context?.sourceSettings as Record<string, any> || {};
            const settings = sourceSettings['brave-search-trends'] || {};

            // Use direct query from settings, no assumption
            const query = settings.query;
            const freshness = settings.freshness; // e.g. 'pd', 'pw', 'pm', 'py'

            // NOTE: If query is missing, the API route handles a fallback
            const res = await fetch('/api/trends/brave-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, query, freshness, maxItems, offset }),
            });

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.error || 'Brave Search failed');
            }

            return {
                success: true,
                data: result.data,
                handlerUsed: 'brave-search-trends',
                source: 'mcp',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Brave Search failed',
                handlerUsed: 'brave-search-trends',
                source: 'mcp',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Helper Functions (RSS/Atom parsing)
// ============================================================================

interface RSSItem {
    title: string;
    link: string;
    description?: string;
    pubDate?: string;
}

function parseRSSItems(xml: string): RSSItem[] {
    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        const title = extractTag(itemXml, 'title');
        const link = extractTag(itemXml, 'link');

        if (title && link) {
            items.push({
                title: decodeEntities(title),
                link,
                description: extractTag(itemXml, 'description'),
                pubDate: extractTag(itemXml, 'pubDate'),
            });
        }
    }

    return items;
}

function parseAtomEntries(xml: string): RSSItem[] {
    const items: RSSItem[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
        const entryXml = match[1];
        const title = extractTag(entryXml, 'title');

        // Atom uses <link href="..."/>
        const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/);
        const link = linkMatch ? linkMatch[1] : '';

        if (title && link) {
            items.push({
                title: decodeEntities(title),
                link,
                description: extractTag(entryXml, 'summary') || extractTag(entryXml, 'content'),
            });
        }
    }

    return items;
}

function extractTag(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? (match[1] || match[2])?.trim() : undefined;
}

function decodeEntities(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

// ============================================================================
// Export all handlers
// ============================================================================

export const trendHandlers = [
    hackerNewsHandler,
    googleNewsHandler,
    productHuntHandler,
    braveSearchHandler,
];

export default trendHandlers;
