/**
 * CSV Parser Utility
 * 
 * Parses CSV content into KeywordItem array.
 * Extracted from KeywordHunter.tsx for single responsibility.
 */

import type { KeywordItem } from '@/lib/keywords/types';

/**
 * Parse CSV content into KeywordItem array
 * Expected columns: keyword, niche, context, difficulty, searchVolume
 */
export function parseCSV(content: string): KeywordItem[] {
    const lines = content.split('\n').filter(line => line.trim());
    const items: KeywordItem[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
        if (parts[0]) {
            items.push({
                keyword: parts[0],
                source: 'csv',
                niche: parts[1] || undefined,
                context: parts[2] || undefined,
                difficulty: parts[3] || undefined,
                searchVolume: parts[4] || undefined,
            });
        }
    }
    return items;
}
