/**
 * Google Trends Source Helper
 * FSD: features/campaigns/lib/trendsSource.ts
 * 
 * Converts trending topics to pipeline source items.
 */

import type { SourceItem, TrendsSourceConfig } from '../model/types';
import type { TrendingTopic, TrendsResult, TrendsRegion } from './trendsApi';
import { fetchTrends } from './trendsApi';

// ============================================================================
// Types
// ============================================================================

export interface TrendsFetchResult {
    success: boolean;
    items: SourceItem[];
    source: 'unofficial' | 'serpapi';
    error?: string;
}

// ============================================================================
// Fetch and Convert
// ============================================================================

/**
 * Fetch trending topics and convert to source items
 */
export async function fetchTrendsSourceItems(
    config: TrendsSourceConfig,
    limit: number = 10,
    serpApiKey?: string
): Promise<TrendsFetchResult> {
    const result = await fetchTrends({
        provider: serpApiKey ? 'auto' : 'unofficial',
        region: (config.region || 'US') as TrendsRegion,
        category: config.category,
        serpApiKey,
    });

    if (!result.success) {
        return {
            success: false,
            items: [],
            source: result.source,
            error: result.error,
        };
    }

    // Filter and convert topics
    const items = result.topics
        .filter(topic => filterTrendingTopic(topic, config))
        .slice(0, limit)
        .map(topic => trendingTopicToSourceItem(topic));

    return {
        success: items.length > 0,
        items,
        source: result.source,
        error: items.length === 0 ? 'No matching trends found' : undefined,
    };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Filter trending topics based on config
 */
function filterTrendingTopic(topic: TrendingTopic, config: TrendsSourceConfig): boolean {
    if (!topic.title?.trim()) return false;

    // Filter by minimum search volume if specified
    if (config.minSearchVolume && topic.searchVolume) {
        // searchVolume is like "100K+" or "1M+"
        const volume = parseSearchVolume(topic.searchVolume);
        if (volume < config.minSearchVolume) return false;
    }

    return true;
}

/**
 * Parse search volume string to number
 */
function parseSearchVolume(volumeStr: string): number {
    const cleaned = volumeStr.replace(/[^0-9KMB+]/gi, '').toUpperCase();
    const num = parseInt(cleaned.replace(/[KMB+]/g, '')) || 0;

    if (cleaned.includes('B')) return num * 1_000_000_000;
    if (cleaned.includes('M')) return num * 1_000_000;
    if (cleaned.includes('K')) return num * 1_000;
    return num;
}

/**
 * Convert a trending topic to a source item
 */
function trendingTopicToSourceItem(topic: TrendingTopic): SourceItem {
    return {
        id: `trend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        topic: topic.title,
        sourceType: 'trends',
        metadata: {
            searchVolume: topic.searchVolume,
            relatedQueries: topic.relatedQueries,
            articleUrl: topic.articleUrl,
            imageUrl: topic.imageUrl,
            source: topic.source,
            publishedAt: topic.publishedAt,
        },
    };
}

/**
 * Get suggested related topics for content ideas
 */
export function getRelatedTopics(item: SourceItem): string[] {
    if (item.sourceType !== 'trends') return [];
    const related = (item.metadata?.relatedQueries as string[]) || [];
    return related.slice(0, 5);
}
