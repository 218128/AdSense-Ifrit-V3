/**
 * MCP Tool Mapper
 * 
 * Maps MCP tools to Ifrit capabilities automatically.
 * When an MCP server connects, its tools are analyzed and
 * registered as capability handlers.
 */

import type { ExecuteOptions, ExecuteResult } from '../ai/services/types';

// ============================================
// TOOL TO CAPABILITY MAPPING
// ============================================

/**
 * Default mappings from known MCP tool names to capabilities.
 * Users can override these in Settings.
 */
export const DEFAULT_TOOL_MAPPINGS: Record<string, string[]> = {
    // Brave Search MCP
    'brave_web_search': ['research'],
    'brave_local_search': ['research'],

    // Puppeteer MCP
    'puppeteer_navigate': ['scrape'],
    'puppeteer_screenshot': ['scrape', 'images'],
    'puppeteer_click': ['scrape'],
    'puppeteer_fill': ['scrape'],
    'puppeteer_evaluate': ['scrape', 'analyze'],

    // Fetch/URL MCP
    'fetch': ['scrape', 'research'],
    'fetch_url': ['scrape', 'research'],

    // GitHub MCP
    'create_repository': ['code'],
    'push_files': ['code'],
    'create_issue': ['code'],
    'create_pull_request': ['code'],
    'search_repositories': ['research', 'code'],

    // File System MCP
    'read_file': ['analyze'],
    'write_file': ['code'],
    'list_directory': ['analyze'],

    // Filesystem MCP (alternative naming)
    'read': ['analyze'],
    'write': ['code'],
    'list': ['analyze'],
};

/**
 * Infer capabilities from tool description and name
 */
export function inferCapabilities(
    toolName: string,
    description?: string
): string[] {
    // Check default mappings first
    const lowerName = toolName.toLowerCase();
    if (DEFAULT_TOOL_MAPPINGS[lowerName]) {
        return DEFAULT_TOOL_MAPPINGS[lowerName];
    }

    // Infer from name patterns
    const capabilities: string[] = [];

    if (lowerName.includes('search') || lowerName.includes('query')) {
        capabilities.push('research');
    }

    if (lowerName.includes('scrape') || lowerName.includes('fetch') || lowerName.includes('crawl')) {
        capabilities.push('scrape');
    }

    if (lowerName.includes('screenshot') || lowerName.includes('image') || lowerName.includes('capture')) {
        capabilities.push('images');
    }

    if (lowerName.includes('analyze') || lowerName.includes('parse') || lowerName.includes('extract')) {
        capabilities.push('analyze');
    }

    if (lowerName.includes('translate') || lowerName.includes('localize')) {
        capabilities.push('translate');
    }

    if (lowerName.includes('summarize') || lowerName.includes('summary')) {
        capabilities.push('summarize');
    }

    if (lowerName.includes('code') || lowerName.includes('generate') || lowerName.includes('write')) {
        capabilities.push('generate');
    }

    // Infer from description if available
    if (description) {
        const descLower = description.toLowerCase();

        if (descLower.includes('search') || descLower.includes('find') || descLower.includes('lookup')) {
            if (!capabilities.includes('research')) capabilities.push('research');
        }

        if (descLower.includes('web') || descLower.includes('page') || descLower.includes('url')) {
            if (!capabilities.includes('scrape')) capabilities.push('scrape');
        }

        if (descLower.includes('image') || descLower.includes('visual')) {
            if (!capabilities.includes('images')) capabilities.push('images');
        }
    }

    // Default to 'generate' if nothing matched
    if (capabilities.length === 0) {
        capabilities.push('generate');
    }

    return capabilities;
}

// ============================================
// MCP TOOL WRAPPER
// ============================================

export interface MCPToolInfo {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

/**
 * Create an execute function for an MCP tool
 */
export function createMCPExecutor(
    callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>,
    tool: MCPToolInfo
): (options: ExecuteOptions) => Promise<ExecuteResult> {
    return async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();

        try {
            // Build tool arguments from options
            const toolArgs = buildToolArgs(tool, options);

            // Call the MCP tool
            const result = await callTool(tool.name, toolArgs);

            // Parse and return result
            return {
                success: true,
                data: result,
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                handlerUsed: `mcp-${tool.name}`,
                source: 'mcp',
                latencyMs: Date.now() - startTime,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'MCP tool execution failed',
                handlerUsed: `mcp-${tool.name}`,
                source: 'mcp',
                latencyMs: Date.now() - startTime,
            };
        }
    };
}

/**
 * Build tool arguments from ExecuteOptions
 */
function buildToolArgs(
    tool: MCPToolInfo,
    options: ExecuteOptions
): Record<string, unknown> {
    const toolName = tool.name.toLowerCase();

    // Smart argument mapping based on common tool patterns

    // Search tools
    if (toolName.includes('search')) {
        return {
            query: options.prompt,
            ...(options.context || {}),
        };
    }

    // Navigate/fetch tools
    if (toolName.includes('navigate') || toolName.includes('fetch')) {
        // If prompt looks like a URL, use it
        const isUrl = options.prompt.startsWith('http');
        return {
            url: isUrl ? options.prompt : (options.context?.url as string || options.prompt),
            ...(options.context || {}),
        };
    }

    // Screenshot tools
    if (toolName.includes('screenshot')) {
        return {
            name: options.prompt || 'screenshot',
            ...(options.context || {}),
        };
    }

    // Default: pass prompt as query/input/text depending on schema
    const schema = tool.inputSchema as Record<string, Record<string, unknown>> | undefined;

    if (schema?.properties) {
        const props = Object.keys(schema.properties);

        if (props.includes('query')) return { query: options.prompt, ...options.context };
        if (props.includes('input')) return { input: options.prompt, ...options.context };
        if (props.includes('text')) return { text: options.prompt, ...options.context };
        if (props.includes('url')) return { url: options.prompt, ...options.context };
        if (props.includes('prompt')) return { prompt: options.prompt, ...options.context };
    }

    // Fallback: use prompt as first string argument
    return {
        query: options.prompt,
        ...options.context,
    };
}

// ============================================
// STORAGE FOR CUSTOM MAPPINGS
// ============================================

const CUSTOM_MAPPINGS_KEY = 'ifrit_mcp_tool_mappings';

/**
 * Get user-customized tool mappings
 */
export function getCustomMappings(): Record<string, string[]> {
    if (typeof window === 'undefined') return {};

    try {
        const stored = localStorage.getItem(CUSTOM_MAPPINGS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save a custom tool mapping
 */
export function setCustomMapping(toolName: string, capabilities: string[]): void {
    if (typeof window === 'undefined') return;

    const mappings = getCustomMappings();
    mappings[toolName] = capabilities;
    localStorage.setItem(CUSTOM_MAPPINGS_KEY, JSON.stringify(mappings));
}

/**
 * Get capabilities for a tool (custom mapping takes precedence)
 */
export function getCapabilitiesForTool(
    toolName: string,
    description?: string
): string[] {
    // Check custom mappings first
    const custom = getCustomMappings();
    if (custom[toolName]) {
        return custom[toolName];
    }

    // Fall back to inference
    return inferCapabilities(toolName, description);
}
