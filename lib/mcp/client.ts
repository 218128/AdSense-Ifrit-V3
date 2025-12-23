/**
 * MCP Client Utilities
 * 
 * Client-side functions for calling MCP tools via the API.
 */

const STORAGE_KEY = 'ifrit_mcp_enabled';
const API_KEYS_STORAGE = 'ifrit_mcp_api_keys';

interface MCPExecuteResult {
    success: boolean;
    result?: unknown;
    error?: string;
    toolName?: string;
    executionTimeMs?: number;
}

/**
 * Check if an MCP server is enabled
 */
export function isMCPServerEnabled(serverId: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const enabled = localStorage.getItem(STORAGE_KEY);
        if (enabled) {
            const servers = new Set(JSON.parse(enabled));
            return servers.has(serverId);
        }
    } catch { }
    return false;
}

/**
 * Get API key for an MCP server
 */
export function getMCPApiKey(serverId: string): string | undefined {
    if (typeof window === 'undefined') return undefined;

    try {
        const keys = localStorage.getItem(API_KEYS_STORAGE);
        if (keys) {
            const parsed = JSON.parse(keys);
            return parsed[serverId];
        }
    } catch { }
    return undefined;
}

/**
 * Execute an MCP tool
 */
export async function executeMCPTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
): Promise<MCPExecuteResult> {
    const apiKey = getMCPApiKey(serverId);

    if (!apiKey && serverId === 'brave-search') {
        return { success: false, error: 'Brave API key not configured' };
    }

    try {
        const response = await fetch('/api/mcp/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serverId,
                toolName,
                arguments: args,
                apiKey
            })
        });

        const result: MCPExecuteResult = await response.json();
        return result;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'MCP execution failed'
        };
    }
}

/**
 * Perform a Brave web search
 */
export async function braveWebSearch(query: string, count: number = 10): Promise<{
    success: boolean;
    results?: Array<{ title: string; url: string; description: string }>;
    error?: string;
}> {
    console.log('[braveWebSearch] Starting search for:', query);

    const hasKey = !!getMCPApiKey('brave-search');
    console.log('[braveWebSearch] Has API key:', hasKey);

    if (!hasKey) {
        return { success: false, error: 'Brave Search API key not configured' };
    }

    const result = await executeMCPTool('brave-search', 'brave_web_search', {
        query,
        count
    });

    console.log('[braveWebSearch] Execute result:', result.success, result.error);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    // Parse the Brave search results
    try {
        const content = result.result as Array<{ type: string; text?: string }>;
        const textContent = content?.find(c => c.type === 'text')?.text;

        console.log('[braveWebSearch] Raw text content length:', textContent?.length || 0);

        if (textContent) {
            // Parse JSON results from Brave
            const parsed = JSON.parse(textContent);

            // DEBUG: Log the entire parsed structure
            console.log('[braveWebSearch] Parsed structure keys:', Object.keys(parsed));
            console.log('[braveWebSearch] Full parsed:', JSON.stringify(parsed).substring(0, 500));

            // Handle different response formats
            // Format 1: { web: { results: [...] } }
            // Format 2: { results: [...] }
            // Format 3: Array directly
            // Format 4: Single object with url/title/description (what Brave MCP actually returns!)
            let rawResults: Array<{ title?: string; url?: string; description?: string; snippet?: string }>;

            if (parsed.web?.results) {
                rawResults = parsed.web.results;
            } else if (parsed.results) {
                rawResults = parsed.results;
            } else if (Array.isArray(parsed)) {
                rawResults = parsed;
            } else if (parsed.url && parsed.title) {
                // Single result object - wrap in array
                rawResults = [parsed];
            } else {
                rawResults = [];
            }

            console.log('[braveWebSearch] Found results:', rawResults.length);

            const results = rawResults.slice(0, 10).map((r) => ({
                title: r.title || '',
                url: r.url || '',
                description: r.description || r.snippet || ''
            }));

            return {
                success: true,
                results
            };
        }
    } catch (parseError) {
        console.error('[braveWebSearch] Parse error:', parseError);
        return {
            success: true,
            results: []
        };
    }

    return { success: true, results: [] };
}

/**
 * Check if Brave Search is available
 * 
 * Returns true if either:
 * 1. Brave Search is enabled AND has an API key, OR
 * 2. Just has an API key (user may have forgotten to toggle)
 */
export function isBraveSearchAvailable(): boolean {
    const hasKey = !!getMCPApiKey('brave-search');
    const isEnabled = isMCPServerEnabled('brave-search');

    // Be lenient - if they have a key, they probably want to use it
    return hasKey;
}
