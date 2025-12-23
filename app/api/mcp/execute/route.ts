import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getServerById, MCPServerConfig } from '@/lib/mcp/servers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ExecuteRequest {
    serverId: string;
    toolName: string;
    arguments: Record<string, unknown>;
    apiKey?: string;
}

interface ExecuteResponse {
    success: boolean;
    result?: unknown;
    error?: string;
    toolName?: string;
    executionTimeMs?: number;
}

// Cache for connected clients (connection pooling)
const clientCache = new Map<string, { client: Client; transport: StdioClientTransport; lastUsed: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Get or create a connected MCP client
 */
async function getClient(config: MCPServerConfig, apiKey?: string): Promise<Client> {
    const cacheKey = `${config.id}-${apiKey ? 'keyed' : 'no-key'}`;

    // Check cache
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUsed < CACHE_TTL) {
        cached.lastUsed = Date.now();
        return cached.client;
    }

    // Build environment
    const env: Record<string, string> = { ...process.env } as Record<string, string>;
    if (config.requiresApiKey && config.apiKeyEnvVar && apiKey) {
        env[config.apiKeyEnvVar] = apiKey;
    }

    // Build args with API key if needed
    const args = [...config.args];
    if (config.requiresApiKey && config.apiKeyArg && apiKey) {
        args.push(config.apiKeyArg, apiKey);
    }

    // Create transport and client
    const transport = new StdioClientTransport({
        command: config.command,
        args,
        env
    });

    const client = new Client({
        name: `ifrit-${config.id}`,
        version: '1.0.0'
    });

    await client.connect(transport);

    // Cache for reuse
    clientCache.set(cacheKey, { client, transport, lastUsed: Date.now() });

    // Clean old entries
    for (const [key, val] of clientCache.entries()) {
        if (Date.now() - val.lastUsed > CACHE_TTL) {
            try { await val.client.close(); } catch { }
            clientCache.delete(key);
        }
    }

    return client;
}

/**
 * POST - Execute an MCP tool
 */
export async function POST(request: NextRequest): Promise<NextResponse<ExecuteResponse>> {
    const startTime = Date.now();

    try {
        const body: ExecuteRequest = await request.json();
        const { serverId, toolName, arguments: toolArgs, apiKey } = body;

        if (!serverId || !toolName) {
            return NextResponse.json({
                success: false,
                error: 'serverId and toolName are required'
            }, { status: 400 });
        }

        // Get server config
        const config = getServerById(serverId);
        if (!config) {
            return NextResponse.json({
                success: false,
                error: `Unknown MCP server: ${serverId}`
            }, { status: 404 });
        }

        // Check API key
        if (config.requiresApiKey && !apiKey) {
            return NextResponse.json({
                success: false,
                error: `API key required for ${config.name}`
            }, { status: 400 });
        }

        console.log(`[MCP Execute] Running ${toolName} on ${serverId}`);

        // Get connected client
        const client = await getClient(config, apiKey);

        // Execute tool
        const result = await client.callTool({
            name: toolName,
            arguments: toolArgs || {}
        });

        console.log(`[MCP Execute] ${toolName} completed in ${Date.now() - startTime}ms`);

        return NextResponse.json({
            success: true,
            result: result.content,
            toolName,
            executionTimeMs: Date.now() - startTime
        });

    } catch (error) {
        console.error('[MCP Execute] Error:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Execution failed',
            executionTimeMs: Date.now() - startTime
        }, { status: 500 });
    }
}
