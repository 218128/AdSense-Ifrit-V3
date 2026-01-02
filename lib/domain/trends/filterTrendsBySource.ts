/**
 * filterTrendsBySource - Filter trends by source
 * 
 * Pure function that filters trends to show only those from a specific source.
 * 
 * @module domain/trends
 */

import type { TrendItem } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';

/**
 * Filter trends by source name
 * 
 * @param trends - Array of trend items
 * @param source - Source name to filter by (e.g., 'googlenews-trends')
 * @returns Filtered array with only matching source
 * 
 * @example
 * const googleOnly = filterTrendsBySource(trends, 'googlenews-trends');
 */
export function filterTrendsBySource(
    trends: TrendItem[],
    source: string | null
): TrendItem[] {
    if (!trends || trends.length === 0) return [];
    if (!source) return trends; // No filter

    return trends.filter(trend => trend.source === source);
}

/**
 * Get available sources from trends
 * 
 * @param trends - Array of trend items
 * @returns Array of unique source names
 */
export function getUniqueSources(trends: TrendItem[]): string[] {
    if (!trends || trends.length === 0) return [];

    const sources = new Set<string>();
    trends.forEach(trend => {
        if (trend.source) sources.add(trend.source);
    });
    return Array.from(sources);
}

/**
 * Count trends by source
 * 
 * @param trends - Array of trend items
 * @returns Record of source name to count
 */
export function countTrendsBySource(
    trends: TrendItem[]
): Record<string, number> {
    if (!trends || trends.length === 0) return {};

    const counts: Record<string, number> = {};
    trends.forEach(trend => {
        const source = trend.source || 'unknown';
        counts[source] = (counts[source] || 0) + 1;
    });
    return counts;
}
