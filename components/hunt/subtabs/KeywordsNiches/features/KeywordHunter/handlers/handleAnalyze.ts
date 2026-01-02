/**
 * handleAnalyze - Run AI keyword analysis on selected keywords
 * 
 * Takes selected keywords and runs them through the AI analysis
 * capability to get CPC scores, competition data, and niche info.
 * 
 * @module KeywordHunter/handlers
 */

import type { KeywordItem } from '@/lib/keywords/types';

/**
 * Parameters for handleAnalyze
 */
export interface HandleAnalyzeParams {
    /** Number of selected keywords */
    selectedCount: number;
    /** All available keywords */
    allKeywords: KeywordItem[];
    /** Set of selected keyword strings */
    selectedKeywords: Set<string>;
    /** Function to run analysis */
    runAnalysis: (keywords: KeywordItem[]) => Promise<void>;
    /** Function to clear selection after analysis */
    clearSelection: () => void;
}

/**
 * Creates handleAnalyze async handler
 * 
 * @param params - Dependencies
 * @returns Async handler that runs keyword analysis
 * 
 * @example
 * const analyze = createHandleAnalyze({ ... });
 * await analyze();
 */
export function createHandleAnalyze({
    selectedCount,
    allKeywords,
    selectedKeywords,
    runAnalysis,
    clearSelection,
}: HandleAnalyzeParams): () => Promise<void> {
    return async () => {
        // Guard: No selection
        if (selectedCount === 0) {
            console.warn('[handleAnalyze] No keywords selected');
            return;
        }

        try {
            // Filter to get selected keyword objects
            const toAnalyze = allKeywords.filter(k => selectedKeywords.has(k.keyword));

            if (toAnalyze.length === 0) {
                console.warn('[handleAnalyze] No matching keywords found');
                return;
            }

            // Run analysis
            await runAnalysis(toAnalyze);

            // Clear selection after successful analysis
            clearSelection();
        } catch (error) {
            console.error('[handleAnalyze] Analysis failed:', error);
        }
    };
}

/**
 * Direct async handler
 */
export async function handleAnalyze(
    selectedCount: number,
    allKeywords: KeywordItem[],
    selectedKeywords: Set<string>,
    runAnalysis: (keywords: KeywordItem[]) => Promise<void>,
    clearSelection: () => void
): Promise<void> {
    const handler = createHandleAnalyze({
        selectedCount,
        allKeywords,
        selectedKeywords,
        runAnalysis,
        clearSelection,
    });
    await handler();
}
