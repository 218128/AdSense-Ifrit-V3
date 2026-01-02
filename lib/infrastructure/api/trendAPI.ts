/**
 * Trend API Service
 * 
 * Infrastructure layer for fetching trends from external sources.
 * Contains all API/network calls for trends.
 * 
 * @module infrastructure/api
 */

import type { TrendItem, SourceStatus } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';
import type { ActionStatus, SourceActionStatus } from '@/lib/shared/types';
import { ActionStatusFactory } from '@/lib/shared/types';

/**
 * Trend source configuration
 */
export interface TrendSource {
    id: string;
    name: string;
    enabled: boolean;
}

/**
 * Default sources for trend scanning
 */
export const DEFAULT_TREND_SOURCES: TrendSource[] = [
    { id: 'hackernews-trends', name: 'Hacker News', enabled: true },
    { id: 'googlenews-trends', name: 'Google News', enabled: true },
    { id: 'producthunt-trends', name: 'Product Hunt', enabled: true },
    { id: 'brave-search-trends', name: 'Brave Search', enabled: true },
];

/**
 * Fetch trends result
 */
export interface FetchTrendsResult {
    trends: TrendItem[];
    sources: Record<string, SourceStatus>;
    totalCount: number;
    successCount: number;
    failedCount: number;
}

/**
 * Fetch trends using AIServices aggregate
 * 
 * @param onProgress - Progress callback for real-time updates
 * @param options - Fetch options
 * @returns Trends and source statuses
 */
export async function fetchTrendsAggregate(
    onProgress: (status: ActionStatus) => void,
    options: {
        maxItemsPerSource?: number;
        braveApiKey?: string | null;
        sourceSettings?: Record<string, any>;
    } = {}
): Promise<FetchTrendsResult> {
    const { maxItemsPerSource = 10, braveApiKey, sourceSettings } = options;

    // Track source results for final status
    const sourceResults: SourceActionStatus[] = [];

    // Prompt is now generic since specific queries are handled per source
    const prompt = 'trending';

    try {
        const { aiServices } = await import('@/lib/ai/services');

        const result = await aiServices.executeAggregate({
            capability: 'trend-scan',
            prompt,
            context: {
                maxItems: maxItemsPerSource,
                apiKey: braveApiKey || undefined,
                // Pass full settings map to handlers
                sourceSettings
            },
            // Pass granular progress callback
            onProgress: (progress) => {
                if (progress.phase === 'starting') {
                    onProgress({
                        phase: 'running',
                        message: progress.message,
                        progress: { current: 0, total: progress.total || 4 },
                        updatedAt: Date.now(),
                    });
                } else if (progress.phase === 'handler') {
                    // Track completed sources
                    if (progress.success !== undefined) {
                        sourceResults.push({
                            sourceId: progress.handlerId || 'unknown',
                            sourceName: progress.handlerName || 'Unknown',
                            phase: progress.success ? 'success' : 'error',
                            message: progress.success ? `${progress.current} items` : 'Failed',
                            count: progress.current,
                            error: progress.error,
                        });
                    }

                    onProgress({
                        phase: 'running',
                        message: progress.message,
                        progress: {
                            current: progress.current || 0,
                            total: progress.total || 4
                        },
                        sources: [...sourceResults],
                        updatedAt: Date.now(),
                    });
                } else if (progress.phase === 'complete') {
                    // Final progress update handled below
                }
            },
        });

        if (result.success && result.data) {
            const trends = result.data as TrendItem[];
            const sourceData = (result.metadata?.sources as Record<string, { success: boolean; count: number; error?: string }>) || {};

            // Build source statuses
            const sources: Record<string, SourceStatus> = {};
            const finalSourceStatuses: SourceActionStatus[] = [];

            for (const [id, status] of Object.entries(sourceData)) {
                sources[id] = {
                    success: status.success,
                    count: status.count,
                    error: status.error,
                };

                // Build UI status
                if (status.success) {
                    finalSourceStatuses.push(ActionStatusFactory.sourceComplete(id, status.count));
                } else {
                    finalSourceStatuses.push(ActionStatusFactory.sourceFailed(id, status.error || 'Unknown error'));
                }
            }

            const successCount = Object.values(sources).filter(s => s.success).length;
            const failedCount = Object.values(sources).filter(s => !s.success).length;

            // Final success status - PERMANENT (no auto-hide)
            onProgress({
                phase: 'success',
                message: `✓ Fetched ${trends.length} trends from ${successCount} sources`,
                count: trends.length,
                sources: finalSourceStatuses,
                updatedAt: Date.now(),
            });

            return {
                trends,
                sources,
                totalCount: trends.length,
                successCount,
                failedCount,
            };
        } else {
            throw new Error(result.error || 'Failed to fetch trends');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onProgress(ActionStatusFactory.error('Failed to fetch trends', errorMessage));
        throw error;
    }
}

