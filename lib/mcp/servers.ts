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
 */
export const MCP_SERVERS: MCPServerConfig[] = [
    // Research & Web
    {
        id: 'brave-search',
        name: 'Web Search (Brave)',
        description: 'Real-time web search for article research',
        command: 'npx',
        args: ['-y', '@brave/brave-search-mcp-server'],
        requiresApiKey: true,
        apiKeyEnvVar: 'BRAVE_API_KEY',
        apiKeyArg: '--brave-api-key',
        category: 'research'
    },
    {
        id: 'playwright',
        name: 'Browser Automation (Playwright)',
        description: 'Navigate, scrape, and automate web pages',
        command: 'npx',
        args: ['-y', '@playwright/mcp@latest'],
        requiresApiKey: false,
        category: 'research'
    },

    // SEO & Keywords
    {
        id: 'fetch',
        name: 'URL Fetcher',
        description: 'Fetch content from URLs for analysis',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-fetch'],
        requiresApiKey: false,
        category: 'seo'
    },

    // Integrations
    {
        id: 'github',
        name: 'GitHub',
        description: 'Create repos, manage code, push changes',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        requiresApiKey: true,
        apiKeyEnvVar: 'GITHUB_TOKEN',
        category: 'integration'
    },
    {
        id: 'filesystem',
        name: 'File System',
        description: 'Read and write local files',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        requiresApiKey: false,
        category: 'utility'
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
