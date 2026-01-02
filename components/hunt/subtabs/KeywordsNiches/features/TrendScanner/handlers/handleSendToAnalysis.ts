/**
 * handleSendToAnalysis - Send selected trends to KeywordHunter for analysis
 * 
 * Takes selected topic strings and passes them to the parent component
 * via the onSelectKeywords callback for deeper keyword analysis.
 * 
 * @module TrendScanner/handlers
 */

/**
 * Parameters for handleSendToAnalysis
 */
export interface HandleSendToAnalysisParams {
    /** Callback to receive selected keywords */
    onSelectKeywords?: (keywords: string[]) => void;
    /** Number of currently selected trends */
    selectedCount: number;
    /** Function to get selected topic strings */
    getSelectedTopics: () => string[];
}

/**
 * Creates the handleSendToAnalysis handler function
 * 
 * @param params - Dependencies and parameters
 * @returns Handler function that sends topics to analysis
 * 
 * @example
 * const send = createHandleSendToAnalysis({ onSelectKeywords, selectedCount, getSelectedTopics });
 * send(); // Sends selected topics to KeywordHunter
 */
export function createHandleSendToAnalysis({
    onSelectKeywords,
    selectedCount,
    getSelectedTopics,
}: HandleSendToAnalysisParams): () => void {
    return () => {
        // Guard: Check if callback exists and has selections
        if (!onSelectKeywords) {
            console.warn('[handleSendToAnalysis] No onSelectKeywords callback provided');
            return;
        }

        if (selectedCount === 0) {
            console.warn('[handleSendToAnalysis] No trends selected');
            return;
        }

        try {
            const topics = getSelectedTopics();
            onSelectKeywords(topics);
        } catch (error) {
            console.error('[handleSendToAnalysis] Failed to send topics:', error);
        }
    };
}

/**
 * Direct handler for use in components
 * 
 * @param onSelectKeywords - Callback to receive keywords
 * @param selectedCount - Number of selected items
 * @param getSelectedTopics - Function to get selected topics
 */
export function handleSendToAnalysis(
    onSelectKeywords: ((keywords: string[]) => void) | undefined,
    selectedCount: number,
    getSelectedTopics: () => string[]
): void {
    if (!onSelectKeywords || selectedCount === 0) {
        return;
    }

    try {
        onSelectKeywords(getSelectedTopics());
    } catch (error) {
        console.error('[handleSendToAnalysis] Failed:', error);
    }
}
