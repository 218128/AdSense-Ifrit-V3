/**
 * Analyze Keywords Use Case
 * 
 * Application layer orchestration for keyword analysis.
 * Connects domain logic with infrastructure and UI.
 * 
 * @module application/keywords
 */

import type { KeywordItem, AnalyzedKeyword } from '@/lib/keywords/types';
import type { ActionStatus } from '@/lib/shared/types';
import { deduplicateKeywords, sortKeywordsByCPC } from '@/lib/domain/keywords';
import { analyzeKeywords as analyzeKeywordsAPI } from '@/lib/infrastructure/api';

/**
 * Analyze keywords use case result
 */
export interface AnalyzeKeywordsUseCaseResult {
    keywords: AnalyzedKeyword[];
    sorted: boolean;
    highValueCount: number;
}

/**
 * Execute analyze keywords use case
 * 
 * Orchestrates:
 * 1. Domain: Deduplicate input
 * 2. Infrastructure: Call AI analysis
 * 3. Domain: Sort by CPC
 * 
 * @param keywords - Keywords to analyze
 * @param onProgress - Progress callback for UI
 * @param options - Options including optional research data
 * @returns Analyzed and sorted keywords
 */
export async function analyzeKeywordsUseCase(
    keywords: KeywordItem[],
    onProgress: (status: ActionStatus) => void,
    options: {
        sortByCPC?: boolean;
        highValueThreshold?: number;
        researchData?: Record<string, string[]>;
    } = {}
): Promise<AnalyzeKeywordsUseCaseResult> {
    const { sortByCPC = true, highValueThreshold = 1.5, researchData } = options;

    // 1. Domain: Deduplicate input
    const uniqueKeywords = deduplicateKeywords(keywords);

    // 2. Infrastructure: Analyze (pass research data for context)
    const result = await analyzeKeywordsAPI(uniqueKeywords, onProgress, { researchData });

    // 3. Domain: Sort by CPC if requested
    let finalKeywords = result.keywords;
    if (sortByCPC) {
        finalKeywords = sortKeywordsByCPC(result.keywords);
    }

    // 4. Count high-value keywords
    const highValueCount = finalKeywords.filter(kw => {
        const cpc = parseFloat(kw.analysis?.estimatedCPC?.replace(/[^0-9.]/g, '') || '0');
        return cpc >= highValueThreshold;
    }).length;

    return {
        keywords: finalKeywords,
        sorted: sortByCPC,
        highValueCount,
    };
}
