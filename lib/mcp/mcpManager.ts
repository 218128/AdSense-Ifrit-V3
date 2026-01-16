/**
 * MCP Manager
 * 
 * Manages MCP client connections for AI tool integration.
 * Auto-registers discovered tools with AIServices as capability handlers.
 * 
 * MIGRATION: Uses dynamic import of aiServices. Engine accessible via @/lib/core.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPServerConfig, getServerById, MCP_SERVERS } from './servers';
import { getCapabilitiesForTool, createMCPExecutor, type MCPToolInfo } from './toolMapper';

// Storage keys
const STORAGE_KEY = 'ifrit_mcp_enabled';
const API_KEYS_STORAGE = 'ifrit_mcp_api_keys';

export interface MCPClientState {
    serverId: string;
    client: Client;
    connected: boolean;
    tools: MCPToolInfo[];
}

export interface MCPToolDiscovery {
    serverId: string;
    serverName: string;
    tools: Array<{
        name: string;
        description?: string;
        capabilities: string[];
    }>;
}

/**
 * MCP Manager Class
 * Singleton that manages MCP server connections
 */
class MCPManagerClass {
    private clients: Map<string, MCPClientState> = new Map();
    private enabledServers: Set<string> = new Set();
    private apiKeys: Record<string, string> = {};

    // Event listeners for tool discovery
    private toolDiscoveryListeners: ((discovery: MCPToolDiscovery) => void)[] = [];

    constructor() {
        this.loadState();
    }

    /**
     * Load enabled servers from storage
     */
    private loadState(): void {
        if (typeof window === 'undefined') return;

        try {
            const enabled = localStorage.getItem(STORAGE_KEY);
            if (enabled) {
                this.enabledServers = new Set(JSON.parse(enabled));
            }

            const keys = localStorage.getItem(API_KEYS_STORAGE);
            if (keys) {
                this.apiKeys = JSON.parse(keys);
            }
        } catch {
            // Ignore parse errors
        }
    }

    /**
     * Save enabled servers to storage
     */
    private saveState(): void {
        if (typeof window === 'undefined') return;

        localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.enabledServers]));
        localStorage.setItem(API_KEYS_STORAGE, JSON.stringify(this.apiKeys));
    }

    /**
     * Enable a server
     */
    enableServer(serverId: string): void {
        this.enabledServers.add(serverId);
        this.saveState();
    }

    /**
     * Disable a server
     */
    disableServer(serverId: string): void {
        this.enabledServers.delete(serverId);
        this.disconnectServer(serverId);
        this.saveState();
    }

    /**
     * Check if server is enabled
     */
    isServerEnabled(serverId: string): boolean {
        return this.enabledServers.has(serverId);
    }

    /**
     * Set API key for a server
     */
    setApiKey(serverId: string, apiKey: string): void {
        this.apiKeys[serverId] = apiKey;
        this.saveState();
    }

    /**
     * Get API key for a server
     */
    getApiKey(serverId: string): string | undefined {
        return this.apiKeys[serverId];
    }

    /**
     * Connect to an MCP server
     */
    async connectServer(serverId: string): Promise<boolean> {
        const config = getServerById(serverId);
        if (!config) {
            console.error(`Unknown MCP server: ${serverId}`);
            return false;
        }

        // Check if already connected
        const existing = this.clients.get(serverId);
        if (existing?.connected) {
            return true;
        }

        try {
            // Build environment with API key if needed
            const env: Record<string, string> = { ...process.env } as Record<string, string>;
            if (config.requiresApiKey && config.apiKeyEnvVar) {
                const apiKey = this.apiKeys[serverId];
                if (!apiKey) {
                    console.error(`API key required for ${serverId}`);
                    return false;
                }
                env[config.apiKeyEnvVar] = apiKey;
            }

            // Create transport
            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args,
                env
            });

            // Create client
            const client = new Client({
                name: `ifrit-${serverId}`,
                version: '1.0.0'
            });

            // Connect
            await client.connect(transport);

            // Discover tools
            const tools = await this.discoverTools(client, serverId, config.name);

            this.clients.set(serverId, {
                serverId,
                client,
                connected: true,
                tools
            });

            // Auto-register with AIServices
            await this.registerWithAIServices(serverId, client, tools);

            console.log(`Connected to MCP server: ${serverId} with ${tools.length} tools`);
            return true;
        } catch (error) {
            console.error(`Failed to connect to ${serverId}:`, error);
            return false;
        }
    }

    /**
     * Discover tools from an MCP server
     */
    private async discoverTools(
        client: Client,
        serverId: string,
        serverName: string
    ): Promise<MCPToolInfo[]> {
        try {
            const result = await client.listTools();
            const tools: MCPToolInfo[] = result.tools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema as Record<string, unknown>
            }));

            // Notify listeners
            const discovery: MCPToolDiscovery = {
                serverId,
                serverName,
                tools: tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    capabilities: getCapabilitiesForTool(t.name, t.description)
                }))
            };

            for (const listener of this.toolDiscoveryListeners) {
                try {
                    listener(discovery);
                } catch (e) {
                    console.error('[MCPManager] Discovery listener error:', e);
                }
            }

            return tools;
        } catch (error) {
            console.warn(`Failed to list tools for ${serverId}:`, error);
            return [];
        }
    }

    /**
     * Register discovered tools with AIServices
     */
    private async registerWithAIServices(
        serverId: string,
        client: Client,
        tools: MCPToolInfo[]
    ): Promise<void> {
        try {
            // Dynamic import to avoid circular deps
            const { aiServices } = await import('../ai/services');

            for (const tool of tools) {
                const capabilities = getCapabilitiesForTool(tool.name, tool.description);

                // Create executor that calls the MCP tool
                const executor = createMCPExecutor(
                    async (name, args) => {
                        const result = await client.callTool({ name, arguments: args });
                        return result.content;
                    },
                    tool
                );

                // Register with AIServices
                aiServices.registerMCPHandler(serverId, tool, capabilities, executor);
            }

            console.log(`[MCPManager] Registered ${tools.length} tools from ${serverId} with AIServices`);
        } catch (error) {
            console.error('[MCPManager] Failed to register with AIServices:', error);
        }
    }

    /**
     * Disconnect from an MCP server
     */
    async disconnectServer(serverId: string): Promise<void> {
        const state = this.clients.get(serverId);
        if (state?.connected) {
            try {
                // Unregister from AIServices
                const { aiServices } = await import('../ai/services');
                aiServices.unregisterMCPServer(serverId);
            } catch {
                // AIServices might not be loaded
            }

            try {
                await state.client.close();
            } catch {
                // Ignore close errors
            }
            this.clients.delete(serverId);
        }
    }

    /**
     * Get all connected clients
     */
    getConnectedClients(): Client[] {
        return Array.from(this.clients.values())
            .filter(s => s.connected)
            .map(s => s.client);
    }

    /**
     * Get all discovered tools across all connected servers
     */
    getAllTools(): Array<MCPToolInfo & { serverId: string }> {
        const tools: Array<MCPToolInfo & { serverId: string }> = [];

        for (const [serverId, state] of this.clients.entries()) {
            if (state.connected) {
                for (const tool of state.tools) {
                    tools.push({ ...tool, serverId });
                }
            }
        }

        return tools;
    }

    /**
     * Get tools for a specific server
     */
    getServerTools(serverId: string): MCPToolInfo[] {
        return this.clients.get(serverId)?.tools || [];
    }

    /**
     * Get enabled server configs
     */
    getEnabledServers(): MCPServerConfig[] {
        return MCP_SERVERS.filter(s => this.enabledServers.has(s.id));
    }

    /**
     * Check if any tools are available
     */
    hasActiveTools(): boolean {
        return this.getConnectedClients().length > 0;
    }

    /**
     * Connect all enabled servers
     */
    async connectAllEnabled(): Promise<void> {
        for (const serverId of this.enabledServers) {
            await this.connectServer(serverId);
        }
    }

    /**
     * Disconnect all servers
     */
    async disconnectAll(): Promise<void> {
        for (const serverId of this.clients.keys()) {
            await this.disconnectServer(serverId);
        }
    }

    /**
     * Subscribe to tool discovery events
     */
    onToolDiscovery(listener: (discovery: MCPToolDiscovery) => void): () => void {
        this.toolDiscoveryListeners.push(listener);
        return () => {
            this.toolDiscoveryListeners = this.toolDiscoveryListeners.filter(l => l !== listener);
        };
    }

    /**
     * Call a tool directly by name
     */
    async callTool(
        serverId: string,
        toolName: string,
        args: Record<string, unknown>
    ): Promise<unknown> {
        const state = this.clients.get(serverId);
        if (!state?.connected) {
            throw new Error(`Server ${serverId} not connected`);
        }

        const result = await state.client.callTool({
            name: toolName,
            arguments: args
        });

        return result.content;
    }
}

// Export singleton instance
export const mcpManager = new MCPManagerClass();

// Export class for type usage
export { MCPManagerClass };

