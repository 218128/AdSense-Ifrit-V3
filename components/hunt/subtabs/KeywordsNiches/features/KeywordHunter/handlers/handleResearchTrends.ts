/**
 * handleResearchTrends - Research selected keywords using AI
 * 
 * Uses AIServices capability system to get latest trends and
 * statistics for selected keywords from AI providers.
 * 
 * @module KeywordHunter/handlers
 */

/**
 * Research result from AI
 */
export interface ResearchResult {
    success: boolean;
    data?: { keyFindings?: string[] };
    text?: string;
    error?: string;
}

/**
 * Parameters for handleResearchTrends
 */
export interface HandleResearchTrendsParams {
    /** Number of selected keywords */
    selectedCount: number;
    /** Set of selected keyword strings */
    selectedKeywords: Set<string>;
    /** Function to save research results */
    addResearchResult: (keyword: string, findings: string[]) => void;
    /** Function to set researching state */
    setResearching: (value: boolean) => void;
}

/**
 * Creates handleResearchTrends async handler
 * 
 * @param params - Dependencies
 * @returns Async handler that researches keywords
 */
export function createHandleResearchTrends({
    selectedCount,
    selectedKeywords,
    addResearchResult,
    setResearching,
}: HandleResearchTrendsParams): () => Promise<void> {
    return async () => {
        // Guard: No selection
        if (selectedCount === 0) {
            console.warn('[handleResearchTrends] No keywords selected');
            return;
        }

        setResearching(true);

        try {
            // Dynamic import for AI services
            const { aiServices } = await import('@/lib/ai/services');

            const keywords = Array.from(selectedKeywords);

            const result = await aiServices.research(
                `Latest trends and statistics for: ${keywords.join(', ')}`,
                { researchType: 'quick' }
            ) as ResearchResult;

            if (result.success && result.data) {
                // Extract findings
                const findings = result.data.keyFindings ||
                    (result.text ? [result.text] : []);

                // Save for each keyword
                for (const keyword of keywords) {
                    addResearchResult(keyword, findings);
                }
            } else if (!result.success && result.error?.includes('No handlers')) {
                alert('No research provider configured. Go to Settings → Capabilities.');
            }
        } catch (error) {
            console.error('[handleResearchTrends] Research failed:', error);
        } finally {
            setResearching(false);
        }
    };
}

/**
 * Direct async handler
 */
export async function handleResearchTrends(
    selectedCount: number,
    selectedKeywords: Set<string>,
    addResearchResult: (keyword: string, findings: string[]) => void,
    setResearching: (value: boolean) => void
): Promise<void> {
    const handler = createHandleResearchTrends({
        selectedCount,
        selectedKeywords,
        addResearchResult,
        setResearching,
    });
    await handler();
}
