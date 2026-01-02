/**
 * handleUseKeyword - Select a keyword for use in content creation
 * 
 * Calls the onSelect callback with keyword data including topic,
 * context (niche + CPC), and source type.
 * 
 * @module KeywordHunter/handlers
 */

import type { AnalyzedKeyword } from '@/lib/keywords/types';

/**
 * Data passed to onSelect callback
 */
export interface KeywordSelectData {
    topic: string;
    context: string;
    source: 'live' | 'fallback' | 'csv_import';
}

/**
 * Parameters for handleUseKeyword
 */
export interface HandleUseKeywordParams {
    /** Callback to receive selected keyword */
    onSelect?: (data: KeywordSelectData) => void;
}

/**
 * Creates handleUseKeyword handler
 * 
 * @param params - Dependencies
 * @returns Handler that processes keyword selection
 */
export function createHandleUseKeyword({
    onSelect,
}: HandleUseKeywordParams): (kw: AnalyzedKeyword) => void {
    return (kw: AnalyzedKeyword) => {
        // Guard: No callback
        if (!onSelect) {
            console.warn('[handleUseKeyword] No onSelect callback provided');
            return;
        }

        // Guard: Invalid keyword
        if (!kw || !kw.keyword) {
            console.error('[handleUseKeyword] Invalid keyword object');
            return;
        }

        try {
            // Build context from analysis data
            const context = kw.analysis
                ? `${kw.analysis.niche} - ${kw.analysis.estimatedCPC}`
                : kw.keyword;

            // Determine source type
            const source: KeywordSelectData['source'] =
                kw.source === 'csv' ? 'csv_import' : 'fallback';

            onSelect({
                topic: kw.keyword,
                context,
                source,
            });
        } catch (error) {
            console.error('[handleUseKeyword] Selection failed:', error);
        }
    };
}

/**
 * Direct handler
 */
export function handleUseKeyword(
    kw: AnalyzedKeyword,
    onSelect?: (data: KeywordSelectData) => void
): void {
    const handler = createHandleUseKeyword({ onSelect });
    handler(kw);
}
