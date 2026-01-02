/**
 * handleResearchTrends - Research selected trends using AI Capabilities
 * 
 * Uses the AIServices capability system to get AI-powered insights about
 * selected trends. Supports multiple AI providers (Perplexity, OpenAI, etc.)
 * through the capabilities abstraction.
 * 
 * @module TrendScanner/handlers
 */

/**
 * Result from AI research
 */
export interface ResearchResult {
    success: boolean;
    data?: {
        keyFindings?: string[];
    };
    text?: string;
    error?: string;
}

/**
 * Parameters for handleResearchTrends
 */
export interface HandleResearchTrendsParams {
    /** Number of selected trends */
    selectedCount: number;
    /** Function to get selected topic strings */
    getSelectedTopics: () => string[];
    /** Function to save research results */
    addResearchResult: (topic: string, findings: string[]) => void;
    /** Function to set researching state */
    setResearching: (value: boolean) => void;
}

/**
 * Creates the handleResearchTrends async handler function
 * 
 * @param params - Dependencies and parameters
 * @returns Async handler that researches selected trends
 * 
 * @example
 * const research = createHandleResearchTrends({ ... });
 * await research(); // Researches selected trends via AI
 */
export function createHandleResearchTrends({
    selectedCount,
    getSelectedTopics,
    addResearchResult,
    setResearching,
}: HandleResearchTrendsParams): () => Promise<void> {
    return async () => {
        // Guard: No selection
        if (selectedCount === 0) {
            console.warn('[handleResearchTrends] No trends selected');
            return;
        }

        setResearching(true);

        try {
            // Dynamic import to avoid circular dependencies
            const { aiServices } = await import('@/lib/ai/services');

            const topics = getSelectedTopics();

            // Call AI research capability
            const result = await aiServices.research(
                `Research these trending topics for monetization potential and content opportunities: ${topics.join(', ')}`,
                { researchType: 'deep' }
            ) as ResearchResult;

            if (result.success && result.data) {
                // Extract key findings
                const findings = result.data.keyFindings ||
                    (result.text ? [result.text] : []);

                // Save results for each topic
                for (const topic of topics) {
                    addResearchResult(topic, findings);
                }
            } else if (!result.success) {
                console.warn('[handleResearchTrends] Research failed:', result.error);

                // User-friendly error for no handlers
                if (result.error?.includes('No handlers')) {
                    alert('No research provider configured. Go to Settings → Capabilities to set up a handler.');
                }
            }
        } catch (error) {
            console.error('[handleResearchTrends] Exception:', error);
        } finally {
            setResearching(false);
        }
    };
}

/**
 * Direct async handler for use in components
 */
export async function handleResearchTrends(
    selectedCount: number,
    getSelectedTopics: () => string[],
    addResearchResult: (topic: string, findings: string[]) => void,
    setResearching: (value: boolean) => void
): Promise<void> {
    const handler = createHandleResearchTrends({
        selectedCount,
        getSelectedTopics,
        addResearchResult,
        setResearching,
    });
    await handler();
}
