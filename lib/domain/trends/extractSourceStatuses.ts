/**
 * extractSourceStatuses - Extract source success/failure from API response
 * 
 * Pure function that transforms raw source metadata into normalized SourceStatus objects.
 * 
 * @module domain/trends
 */

import type { SourceStatus } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';

/**
 * Raw source data from API response
 */
export interface RawSourceData {
    success: boolean;
    count: number;
    error?: string;
}

/**
 * Extract and normalize source statuses from API metadata
 * 
 * @param sourceData - Raw source data from API
 * @returns Normalized SourceStatus records
 * 
 * @example
 * const sources = extractSourceStatuses({
 *   'googlenews-trends': { success: true, count: 10 },
 *   'brave-search': { success: false, count: 0, error: 'API key required' }
 * });
 */
export function extractSourceStatuses(
    sourceData: Record<string, RawSourceData> | undefined
): Record<string, SourceStatus> {
    if (!sourceData) return {};

    const sources: Record<string, SourceStatus> = {};

    for (const [id, status] of Object.entries(sourceData)) {
        sources[id] = {
            success: status.success,
            count: status.count,
            error: status.error,
        };
    }

    return sources;
}

/**
 * Get count of successful sources
 * 
 * @param sources - SourceStatus records
 * @returns Number of successful sources
 */
export function countSuccessfulSources(
    sources: Record<string, SourceStatus>
): number {
    return Object.values(sources).filter(s => s.success).length;
}

/**
 * Get count of failed sources
 * 
 * @param sources - SourceStatus records
 * @returns Number of failed sources
 */
export function countFailedSources(
    sources: Record<string, SourceStatus>
): number {
    return Object.values(sources).filter(s => !s.success).length;
}

/**
 * Get total items fetched from all sources
 * 
 * @param sources - SourceStatus records
 * @returns Total count across all sources
 */
export function getTotalItemCount(
    sources: Record<string, SourceStatus>
): number {
    return Object.values(sources).reduce((sum, s) => sum + s.count, 0);
}
