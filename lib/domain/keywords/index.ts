/**
 * Keywords Domain Layer
 * 
 * Pure business logic for keyword processing.
 * Re-exports from shared utils + additional pure functions.
 * 
 * @module domain/keywords
 */

import type { KeywordItem, AnalyzedKeyword } from '@/lib/keywords/types';

// Re-export CSV parsing from shared utils
export { parseCSV, parseCSVLegacy } from '@/components/hunt/subtabs/KeywordsNiches/shared/utils/csvParser';

/**
 * Deduplicate keywords by keyword string (case-insensitive)
 * 
 * @param keywords - Array of keyword items
 * @returns Array with duplicates removed
 */
export function deduplicateKeywords(keywords: KeywordItem[]): KeywordItem[] {
    if (!keywords || keywords.length === 0) return [];

    const seen = new Set<string>();
    return keywords.filter(kw => {
        const key = kw.keyword.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Filter keywords by niche
 * 
 * @param keywords - Array of keyword items
 * @param niche - Niche to filter by
 * @returns Filtered keywords
 */
export function filterKeywordsByNiche(
    keywords: KeywordItem[],
    niche: string | null
): KeywordItem[] {
    if (!keywords || keywords.length === 0) return [];
    if (!niche) return keywords;

    return keywords.filter(kw => kw.niche?.toLowerCase() === niche.toLowerCase());
}

/**
 * Sort analyzed keywords by CPC value (highest first)
 * 
 * @param keywords - Array of analyzed keywords
 * @returns Sorted array
 */
export function sortKeywordsByCPC(keywords: AnalyzedKeyword[]): AnalyzedKeyword[] {
    if (!keywords || keywords.length === 0) return [];

    return [...keywords].sort((a, b) => {
        const aCPC = parseFloat(a.analysis?.estimatedCPC?.replace(/[^0-9.]/g, '') || '0');
        const bCPC = parseFloat(b.analysis?.estimatedCPC?.replace(/[^0-9.]/g, '') || '0');
        return bCPC - aCPC;
    });
}

/**
 * Get high-value keywords (CPC > threshold)
 * 
 * @param keywords - Array of analyzed keywords
 * @param threshold - CPC threshold (default $1.50)
 * @returns High-value keywords
 */
export function getHighValueKeywords(
    keywords: AnalyzedKeyword[],
    threshold: number = 1.5
): AnalyzedKeyword[] {
    if (!keywords || keywords.length === 0) return [];

    return keywords.filter(kw => {
        const cpc = parseFloat(kw.analysis?.estimatedCPC?.replace(/[^0-9.]/g, '') || '0');
        return cpc >= threshold;
    });
}
