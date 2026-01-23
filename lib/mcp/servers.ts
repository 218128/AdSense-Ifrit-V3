/**
 * MCP Server Configurations
 * 
 * Pre-configured MCP servers that can be enabled by users.
 * These provide AI tools for enhanced content generation.
 */

export interface MCPServerConfig {
    id: string;
    name: string;
    description: string;
    command: string;
    args: string[];
    requiresApiKey: boolean;
    apiKeyEnvVar?: string;
    apiKeyArg?: string;  // CLI argument name for API key (e.g., '--brave-api-key')
    category: 'research' | 'seo' | 'integration' | 'utility';
}

/**
 * Available MCP Servers
 * Users can enable these in Settings
 * 
 * CLEANED: Removed unused servers (playwright, fetch, github, filesystem, brave-search)
 * - Brave has dedicated handlers in imageSearchHandlers.ts
 * - Playwright/Fetch/Filesystem were never used
 * - GitHub was for legacy websites (deprecated)
 */
export const MCP_SERVERS: MCPServerConfig[] = [
    // AI Research (Perplexity via MCP - alternative to direct API)
    {
        id: 'perplexity',
        name: 'AI Research (Perplexity)',
        description: 'Deep research, reasoning, and web search with AI',
        command: 'npx',
        args: ['-y', '@perplexity-ai/mcp-server'],
        requiresApiKey: true,
        apiKeyEnvVar: 'PERPLEXITY_API_KEY',
        category: 'research'
    },
    // Hostinger WordPress Hosting
    {
        id: 'hostinger',
        name: 'Hostinger WordPress Hosting',
        description: 'Create WordPress sites, manage hosting, domains, SSL, DNS',
        command: 'npx',
        args: ['-y', 'hostinger-api-mcp@latest'],
        requiresApiKey: true,
        apiKeyEnvVar: 'API_TOKEN',
        category: 'integration'
    }
];

/**
 * Get servers by category
 */
export function getServersByCategory(category: MCPServerConfig['category']): MCPServerConfig[] {
    return MCP_SERVERS.filter(s => s.category === category);
}

/**
 * Get server by ID
 */
export function getServerById(id: string): MCPServerConfig | undefined {
    return MCP_SERVERS.find(s => s.id === id);
}
