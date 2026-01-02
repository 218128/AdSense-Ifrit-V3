/**
 * handleHuntDomains - Navigate to Domain Acquire tab with keywords
 * 
 * Collects analyzed keywords and passes them to the domain hunting
 * tab via the onNavigateToDomains callback.
 * 
 * @module KeywordHunter/handlers
 */

import type { AnalyzedKeyword } from '@/lib/keywords/types';

/**
 * Parameters for handleHuntDomains
 */
export interface HandleHuntDomainsParams {
    /** Callback to navigate with keywords */
    onNavigateToDomains?: (keywords: string[]) => void;
    /** Analyzed keywords to send */
    analyzedKeywords: AnalyzedKeyword[];
}

/**
 * Creates handleHuntDomains handler
 * 
 * @param params - Dependencies
 * @returns Handler that triggers domain hunting
 */
export function createHandleHuntDomains({
    onNavigateToDomains,
    analyzedKeywords,
}: HandleHuntDomainsParams): () => void {
    return () => {
        // Guard: No callback
        if (!onNavigateToDomains) {
            console.warn('[handleHuntDomains] No navigation callback');
            return;
        }

        // Guard: No keywords
        if (!analyzedKeywords || analyzedKeywords.length === 0) {
            console.warn('[handleHuntDomains] No analyzed keywords');
            return;
        }

        try {
            // Extract keyword strings
            const keywords = analyzedKeywords.map(k => k.keyword);
            onNavigateToDomains(keywords);
        } catch (error) {
            console.error('[handleHuntDomains] Navigation failed:', error);
        }
    };
}

/**
 * Direct handler
 */
export function handleHuntDomains(
    analyzedKeywords: AnalyzedKeyword[],
    onNavigateToDomains?: (keywords: string[]) => void
): void {
    const handler = createHandleHuntDomains({ onNavigateToDomains, analyzedKeywords });
    handler();
}
