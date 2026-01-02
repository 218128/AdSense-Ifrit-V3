/**
 * deduplicateTrends - Remove duplicate trends by topic
 * 
 * Pure function that filters trends to keep only unique topics.
 * Case-insensitive comparison.
 * 
 * @module domain/trends
 */

import type { TrendItem } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';

/**
 * Remove duplicate trends by topic (case-insensitive)
 * 
 * @param trends - Array of trend items
 * @returns Array with duplicates removed, keeping first occurrence
 * 
 * @example
 * const unique = deduplicateTrends([
 *   { topic: 'AI', source: 'news' },
 *   { topic: 'ai', source: 'reddit' },  // Removed (duplicate)
 *   { topic: 'Crypto', source: 'news' },
 * ]);
 * // Returns: [{ topic: 'AI' }, { topic: 'Crypto' }]
 */
export function deduplicateTrends(trends: TrendItem[]): TrendItem[] {
    if (!trends || trends.length === 0) return [];

    const seen = new Set<string>();
    return trends.filter(trend => {
        const key = trend.topic.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Count duplicates in trends array
 * 
 * @param trends - Array of trend items
 * @returns Number of duplicates (total - unique)
 */
export function countDuplicates(trends: TrendItem[]): number {
    if (!trends || trends.length === 0) return 0;
    const unique = deduplicateTrends(trends);
    return trends.length - unique.length;
}
