import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getServerById, MCP_SERVERS } from '@/lib/mcp/servers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface ConnectRequest {
    serverId: string;
    apiKey?: string;
}

interface ConnectResponse {
    success: boolean;
    serverId?: string;
    serverName?: string;
    tools?: Array<{ name: string; description?: string }>;
    toolCount?: number;
    error?: string;
    message?: string;
}

/**
 * POST - Connect to an MCP server and discover its tools
 * 
 * This endpoint spawns the MCP server process, connects to it,
 * lists available tools, and returns them.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ConnectResponse>> {
    try {
        const body: ConnectRequest = await request.json();
        const { serverId, apiKey } = body;

        if (!serverId) {
            return NextResponse.json({
                success: false,
                error: 'serverId is required'
            }, { status: 400 });
        }

        // Get server config
        const config = getServerById(serverId);
        if (!config) {
            return NextResponse.json({
                success: false,
                error: `Unknown MCP server: ${serverId}`,
                message: `Available servers: ${MCP_SERVERS.map(s => s.id).join(', ')}`
            }, { status: 404 });
        }

        // Check if API key is required
        if (config.requiresApiKey && !apiKey) {
            return NextResponse.json({
                success: false,
                error: `API key required for ${config.name}`,
                message: `Set ${config.apiKeyEnvVar} in request body as 'apiKey'`
            }, { status: 400 });
        }

        // Build environment with API key
        const env: Record<string, string> = { ...process.env } as Record<string, string>;
        if (config.requiresApiKey && config.apiKeyEnvVar && apiKey) {
            env[config.apiKeyEnvVar] = apiKey;
        }

        // Build args - add API key argument if needed
        const args = [...config.args];
        if (config.requiresApiKey && config.apiKeyArg && apiKey) {
            args.push(config.apiKeyArg, apiKey);
        }

        console.log(`[MCP Connect] Connecting to ${serverId}...`);
        console.log(`[MCP Connect] Command: ${config.command} ${args.join(' ')}`);

        // Create transport
        const transport = new StdioClientTransport({
            command: config.command,
            args,
            env
        });

        // Create client
        const client = new Client({
            name: `ifrit-${serverId}-test`,
            version: '1.0.0'
        });

        // Connect with timeout
        const connectPromise = client.connect(transport);
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout (20s)')), 20000)
        );

        await Promise.race([connectPromise, timeoutPromise]);
        console.log(`[MCP Connect] Connected to ${serverId}`);

        // Discover tools
        let tools: Array<{ name: string; description?: string }> = [];
        try {
            const toolsResult = await client.listTools();
            tools = toolsResult.tools.map(t => ({
                name: t.name,
                description: t.description
            }));
            console.log(`[MCP Connect] Discovered ${tools.length} tools from ${serverId}`);
        } catch (toolError) {
            console.warn(`[MCP Connect] Failed to list tools:`, toolError);
        }

        // Close connection (this is just a test)
        try {
            await client.close();
        } catch {
            // Ignore close errors
        }

        return NextResponse.json({
            success: true,
            serverId,
            serverName: config.name,
            tools,
            toolCount: tools.length,
            message: `Successfully connected to ${config.name} and discovered ${tools.length} tools`
        });

    } catch (error) {
        console.error('[MCP Connect] Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Provide helpful error messages
        let hint = '';
        if (errorMessage.includes('ENOENT') || errorMessage.includes('spawn')) {
            hint = 'Make sure npx is installed and accessible. Try running: npx -y @anthropic-ai/mcp-server-brave-search --help';
        } else if (errorMessage.includes('timeout')) {
            hint = 'Server took too long to respond. Check if the command is correct.';
        } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
            hint = 'API key may be invalid. Check your key and try again.';
        }

        return NextResponse.json({
            success: false,
            error: errorMessage,
            message: hint || 'Failed to connect to MCP server'
        }, { status: 500 });
    }
}

/**
 * GET - List available MCP servers
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        success: true,
        servers: MCP_SERVERS.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            requiresApiKey: s.requiresApiKey,
            apiKeyEnvVar: s.apiKeyEnvVar
        }))
    });
}
