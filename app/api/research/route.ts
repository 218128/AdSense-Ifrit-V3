import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getServerById } from '@/lib/mcp/servers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ResearchRequest {
    query: string;
    type: 'quick' | 'deep' | 'competitor';
    tool?: 'perplexity' | 'brave' | 'playwright';
    apiKey?: string; // For Perplexity
}

interface Source {
    title: string;
    url: string;
    snippet: string;
    relevance: number;
}

interface ResearchResponse {
    success: boolean;
    sources?: Source[];
    keyFindings?: string[];
    suggestedContext?: string;
    error?: string;
    toolUsed?: string;
}

/**
 * POST - Research a topic using MCP tools
 * 
 * This endpoint calls Perplexity MCP (or Brave Search as fallback)
 * to gather research data before article generation.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ResearchResponse>> {
    try {
        const body: ResearchRequest = await request.json();
        const { query, type = 'quick', tool = 'perplexity', apiKey } = body;

        if (!query?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Query is required'
            }, { status: 400 });
        }

        // Determine which MCP server to use
        const serverId = tool === 'perplexity' ? 'perplexity' :
            tool === 'brave' ? 'brave-search' :
                'playwright';

        const config = getServerById(serverId);
        if (!config) {
            return NextResponse.json({
                success: false,
                error: `MCP server not found: ${serverId}`
            }, { status: 400 });
        }

        // Check API key
        if (config.requiresApiKey && !apiKey) {
            return NextResponse.json({
                success: false,
                error: `API key required for ${config.name}`
            }, { status: 400 });
        }

        // Build environment
        const env: Record<string, string> = { ...process.env } as Record<string, string>;
        if (config.requiresApiKey && config.apiKeyEnvVar && apiKey) {
            env[config.apiKeyEnvVar] = apiKey;
        }

        console.log(`[Research] Starting ${type} research with ${serverId}...`);
        console.log(`[Research] Query: "${query}"`);

        // Create transport and client
        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env
        });

        const client = new Client({
            name: `ifrit-research-${serverId}`,
            version: '1.0.0'
        });

        // Connect with timeout
        const connectPromise = client.connect(transport);
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout (30s)')), 30000)
        );

        await Promise.race([connectPromise, timeoutPromise]);
        console.log(`[Research] Connected to ${serverId}`);

        // Determine which tool to call based on type
        let toolName: string;
        let toolArgs: Record<string, unknown>;

        if (serverId === 'perplexity') {
            // perplexity_ask expects { messages: [{ role: 'user', content: '...' }] }
            toolName = 'perplexity_ask';
            toolArgs = {
                messages: [
                    { role: 'user', content: query }
                ]
            };
        } else if (serverId === 'brave-search') {
            toolName = 'brave_web_search';
            toolArgs = {
                query: query,
                count: 10
            };
        } else {
            // Playwright - for competitor analysis
            toolName = 'browser_snapshot';
            toolArgs = {
                url: query // query would be a URL in this case
            };
        }

        console.log(`[Research] Calling tool: ${toolName}`);

        // Call the tool
        const result = await client.callTool({
            name: toolName,
            arguments: toolArgs
        });

        console.log(`[Research] Tool returned result`);

        // Close connection
        try {
            await client.close();
        } catch {
            // Ignore close errors
        }

        // Parse the result
        const content = result.content;
        let textContent = '';

        if (Array.isArray(content)) {
            textContent = content
                .filter(c => c.type === 'text')
                .map(c => (c as { type: 'text'; text: string }).text)
                .join('\n');
        } else if (typeof content === 'string') {
            textContent = content;
        }

        // Extract sources and findings from the response
        // This is a simplified extraction - real implementation would parse citations
        const sources: Source[] = [];
        const keyFindings: string[] = [];

        // Try to extract bullet points as key findings
        const lines = textContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.match(/^\d+\./)) {
                keyFindings.push(trimmed.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''));
            }
        }

        // Build suggested context for article generation
        const suggestedContext = keyFindings.length > 0
            ? `Based on research: ${keyFindings.slice(0, 5).join('. ')}.`
            : textContent.slice(0, 500);

        return NextResponse.json({
            success: true,
            sources,
            keyFindings: keyFindings.slice(0, 10),
            suggestedContext,
            toolUsed: toolName
        });

    } catch (error) {
        console.error('[Research] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}
