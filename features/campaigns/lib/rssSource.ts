/**
 * RSS Source Helper
 * FSD: features/campaigns/lib/rssSource.ts
 * 
 * Converts RSS feed items to pipeline source items.
 */

import type { SourceItem, RSSSourceConfig } from '../model/types';
import type { FeedItem } from './rssParser';
import { fetchFeed } from './rssParser';

// ============================================================================
// Types
// ============================================================================

export interface RSSFetchResult {
    success: boolean;
    items: SourceItem[];
    feedTitle?: string;
    error?: string;
}

// ============================================================================
// Fetch and Convert
// ============================================================================

/**
 * Fetch RSS feeds and convert to source items
 */
export async function fetchRSSSourceItems(
    config: RSSSourceConfig,
    limit: number = 10
): Promise<RSSFetchResult> {
    const allItems: SourceItem[] = [];
    const errors: string[] = [];

    for (const feedUrl of config.feedUrls) {
        const result = await fetchFeed(feedUrl);

        if (!result.success || !result.feed) {
            errors.push(`${feedUrl}: ${result.error}`);
            continue;
        }

        // Convert feed items to source items
        const items = result.feed.items
            .filter(item => filterFeedItem(item, config))
            .map(item => feedItemToSourceItem(item, feedUrl, config));

        allItems.push(...items);
    }

    // Dedupe by title (case-insensitive)
    const seen = new Set<string>();
    const deduped = allItems.filter(item => {
        const key = item.topic.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort by date (newest first) and limit
    const sorted = deduped
        .sort((a, b) => {
            const dateA = (a.metadata?.pubDate as number) || 0;
            const dateB = (b.metadata?.pubDate as number) || 0;
            return dateB - dateA;
        })
        .slice(0, limit);

    return {
        success: errors.length === 0 || sorted.length > 0,
        items: sorted,
        error: errors.length > 0 ? errors.join('; ') : undefined,
    };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Filter feed items based on config
 */
function filterFeedItem(item: FeedItem, config: RSSSourceConfig): boolean {
    if (!item.title?.trim()) return false;

    // Filter by keywords if specified
    if (config.filterKeywords && config.filterKeywords.length > 0) {
        const text = `${item.title} ${item.description || ''}`.toLowerCase();
        const hasMatch = config.filterKeywords.some(kw =>
            text.includes(kw.toLowerCase())
        );
        if (!hasMatch) return false;
    }

    return true;
}

/**
 * Convert a feed item to a source item
 */
function feedItemToSourceItem(
    item: FeedItem,
    feedUrl: string,
    config: RSSSourceConfig
): SourceItem {
    return {
        id: `rss_${item.id}_${Date.now()}`,
        topic: item.title,
        sourceType: 'rss',
        metadata: {
            feedUrl,
            originalLink: item.link,
            description: item.description,
            pubDate: item.pubDate,
            author: item.author,
            categories: item.categories,
            aiRewrite: config.aiRewrite,
            extractFullContent: config.extractFullContent,
        },
    };
}

/**
 * Extract full content from article URL (optional enhancement)
 */
export async function extractArticleContent(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Ifrit Content Extractor/1.0' },
        });

        if (!response.ok) return null;

        const html = await response.text();

        // Simple content extraction - look for article/main tags
        const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

        const content = articleMatch?.[1] || mainMatch?.[1] || '';

        // Strip HTML tags and clean up
        return content
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 5000); // Limit length
    } catch {
        return null;
    }
}
