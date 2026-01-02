/**
 * handleScan - Trigger trend scanning from all sources
 * 
 * Calls the trendStore.scanTrends() action which fetches trends from:
 * - Hacker News
 * - Google News
 * - Product Hunt
 * - Brave Search (requires API key)
 * 
 * @module TrendScanner/handlers
 */

/**
 * Parameters for handleScan
 */
export interface HandleScanParams {
    /** Brave Search API key (optional) */
    braveApiKey: string | null;
    /** scanTrends function from trendStore */
    scanTrends: (apiKey?: string | null) => Promise<void>;
}

/**
 * Creates the handleScan handler function
 * 
 * @param params - Dependencies and parameters
 * @returns Handler function that triggers trend scanning
 * 
 * @example
 * const scan = createHandleScan({ braveApiKey, scanTrends });
 * scan(); // Triggers scan
 */
export function createHandleScan({ braveApiKey, scanTrends }: HandleScanParams): () => void {
    return () => {
        try {
            scanTrends(braveApiKey);
        } catch (error) {
            console.error('[handleScan] Failed to trigger scan:', error);
        }
    };
}

/**
 * Direct handler for use in components
 * 
 * @param braveApiKey - Brave API key
 * @param scanTrends - scanTrends action from store
 */
export function handleScan(
    braveApiKey: string | null,
    scanTrends: (apiKey?: string | null) => Promise<void>
): void {
    try {
        scanTrends(braveApiKey);
    } catch (error) {
        console.error('[handleScan] Failed to trigger scan:', error);
    }
}
