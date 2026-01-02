/**
 * Scan Trends Use Case
 * 
 * Application layer orchestration for trend scanning.
 * Connects domain logic with infrastructure and UI.
 * 
 * @module application/trends
 */

import type { TrendItem, SourceStatus } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';
import type { ActionStatus } from '@/lib/shared/types';
import { deduplicateTrends } from '@/lib/domain/trends';
import { fetchTrendsAggregate, type FetchTrendsResult } from '@/lib/infrastructure/api';

/**
 * Scan trends use case result
 */
export interface ScanTrendsUseCaseResult {
    trends: TrendItem[];
    sources: Record<string, SourceStatus>;
    duplicatesRemoved: number;
}

/**
 * Execute scan trends use case
 * 
 * Orchestrates:
 * 1. Infrastructure: Fetch from sources
 * 2. Domain: Deduplicate trends
 * 3. Progress reporting
 * 
 * @param onProgress - Progress callback for UI
 * @param options - Options
 * @returns Deduplicated trends and source statuses
 */
export async function scanTrendsUseCase(
    onProgress: (status: ActionStatus) => void,
    options: {
        maxItemsPerSource?: number;
        braveApiKey?: string | null;
        sourceSettings?: Record<string, any>;
        page?: number;
    } = {}
): Promise<ScanTrendsUseCaseResult> {
    // 1. Fetch from infrastructure
    const fetchResult: FetchTrendsResult = await fetchTrendsAggregate(
        onProgress,
        options
    );

    // 2. Apply domain logic: deduplicate
    const uniqueTrends = deduplicateTrends(fetchResult.trends);
    const duplicatesRemoved = fetchResult.trends.length - uniqueTrends.length;

    // 3. Log if duplicates removed
    if (duplicatesRemoved > 0) {
        console.log(`[scanTrendsUseCase] Removed ${duplicatesRemoved} duplicate trends`);
    }

    return {
        trends: uniqueTrends,
        sources: fetchResult.sources,
        duplicatesRemoved,
    };
}

/**
 * Load more trends use case
 * 
 * Fetches additional trends and merges with existing.
 * 
 * @param existingTrends - Already loaded trends
 * @param onProgress - Progress callback
 * @param options - Options
 * @returns New unique trends (not in existing)
 */
export async function loadMoreTrendsUseCase(
    existingTrends: TrendItem[],
    onProgress: (status: ActionStatus) => void,
    options: {
        maxItemsPerSource?: number;
        braveApiKey?: string | null;
        sourceSettings?: Record<string, any>;
    } = {}
): Promise<{ newTrends: TrendItem[]; sources: Record<string, SourceStatus> }> {
    // Fetch fresh data
    const fetchResult = await fetchTrendsAggregate(onProgress, options);

    // Build set of existing topics for fast lookup
    const existingTopics = new Set(
        existingTrends.map(t => t.topic.toLowerCase())
    );

    // Filter to only new trends
    const newTrends = fetchResult.trends.filter(
        t => !existingTopics.has(t.topic.toLowerCase())
    );

    // Deduplicate new trends among themselves
    const uniqueNewTrends = deduplicateTrends(newTrends);

    console.log(`[loadMoreTrendsUseCase] Found ${uniqueNewTrends.length} new unique trends`);

    return {
        newTrends: uniqueNewTrends,
        sources: fetchResult.sources,
    };
}
