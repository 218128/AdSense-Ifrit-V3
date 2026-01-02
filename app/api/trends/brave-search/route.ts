/**
 * Brave Search Trends API
 * Server-side Brave Search using MCP client
 * 
 * Updated 2026-01-01: Fixed to handle MCP v2 response format
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const dynamic = 'force-dynamic';

// MCP client cache
const mcpClientCache = new Map<string, { client: Client; transport: StdioClientTransport; lastUsed: number }>();
const MCP_CACHE_TTL = 60000;

async function getBraveMCPClient(apiKey: string): Promise<Client> {
    const cacheKey = `brave-search-${apiKey.substring(0, 8)}`;

    const cached = mcpClientCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUsed < MCP_CACHE_TTL) {
        cached.lastUsed = Date.now();
        return cached.client;
    }

    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@brave/brave-search-mcp-server', '--brave-api-key', apiKey],
        env: { ...process.env as Record<string, string>, BRAVE_API_KEY: apiKey }
    });

    const client = new Client({
        name: 'ifrit-brave-search',
        version: '1.0.0'
    });

    await client.connect(transport);
    mcpClientCache.set(cacheKey, { client, transport, lastUsed: Date.now() });

    // Clean old entries
    for (const [key, val] of mcpClientCache.entries()) {
        if (Date.now() - val.lastUsed > MCP_CACHE_TTL) {
            try { await val.client.close(); } catch { /* ignore */ }
            mcpClientCache.delete(key);
        }
    }

    return client;
}

/**
 * Extract search results from MCP response
 * Handles both JSON and text/markdown formats
 * Also detects error responses from Brave API
 */
function extractResultsFromText(textContent: string): {
    results: Array<{ title: string; url: string; description: string }>;
    error?: string;
} {
    const results: Array<{ title: string; url: string; description: string }> = [];

    // Handle responses with status code prefix like "422\n{...}"
    let jsonContent = textContent;
    const statusMatch = textContent.match(/^(\d{3})\s*\n/);
    if (statusMatch) {
        jsonContent = textContent.substring(statusMatch[0].length);
    }

    // First, try JSON parsing
    try {
        const parsed = JSON.parse(jsonContent);

        // Check if this is an error response from Brave API
        if (parsed.error || parsed.type === 'ErrorResponse') {
            const errorDetail = parsed.error?.detail || parsed.error?.message || parsed.error?.code || 'Unknown API error';
            return {
                results: [],
                error: errorDetail
            };
        }

        // Handle different JSON structures for success responses
        let webResults: Array<{ title?: string; url?: string; description?: string; snippet?: string }> = [];

        if (parsed.web?.results) {
            webResults = parsed.web.results;
        } else if (parsed.results) {
            webResults = parsed.results;
        } else if (Array.isArray(parsed)) {
            webResults = parsed;
        } else if (parsed.title && parsed.url) {
            // It's a single result object
            webResults = [parsed];
        }

        // Sometimes the MCP returns a custom wrapper like { "0": {...}, "1": {...} } or similar
        // If webResults is still empty, try to see if values are results
        if (webResults.length === 0 && typeof parsed === 'object' && parsed !== null) {
            const values = Object.values(parsed);
            if (values.length > 0 &&
                ((values[0] as any)?.title && (values[0] as any)?.url ||
                    (values[0] as any)?.web?.results)) {
                // Might be array-like object or specific wrapper
                webResults = values as any;
            }
        }

        for (const r of webResults) {
            if (r.title || r.url) {
                results.push({
                    title: r.title || '',
                    url: r.url || '',
                    description: r.description || r.snippet || ''
                });
            }
        }

        if (results.length > 0) {
            return { results };
        }
    } catch {
        // Not valid JSON, try text parsing
    }

    // Try markdown link format: [title](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(textContent)) !== null) {
        results.push({
            title: match[1],
            url: match[2],
            description: ''
        });
    }

    if (results.length > 0) {
        return { results };
    }

    // Try numbered list with URLs
    const lines = textContent.split('\n').filter(l => l.trim());
    const urlRegex = /https?:\/\/[^\s<>"]+/g;

    for (const line of lines) {
        // Match numbered items like "1. Title - description" or bullet points
        const titleMatch = line.match(/^(?:\d+\.\s*|\*\s*|-\s*)(.+?)(?:\s*[-–—]\s*(.+))?$/);
        const urlMatches = line.match(urlRegex);

        if (titleMatch && titleMatch[1]) {
            results.push({
                title: titleMatch[1].trim().replace(/\*\*/g, ''), // Remove markdown bold
                url: urlMatches?.[0] || '',
                description: titleMatch[2]?.trim() || ''
            });
        }
    }

    return { results };
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json().catch(() => ({}));
        const apiKey = body.apiKey;
        const query = body.query; // Direct query support
        const freshness = body.freshness; // Optional freshness
        const maxItems = body.maxItems;
        const offset = body.offset;

        // Debug: log API key info (masked)
        console.log(`[BraveAPI] Received API key: ${apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NONE'}`);

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'Brave Search API key required. Add your API key in Settings.',
                latencyMs: Date.now() - startTime,
            }, { status: 400 });
        }

        const client = await getBraveMCPClient(apiKey);
        const trends: Array<{ topic: string; context: string; source: string; sourceType: string; url: string; niche: string }> = [];

        // Execute single query if provided, or default fallback
        // The handler should have ensured a query logic exists (e.g. from settings)
        // If no query, we fallback to a safe default to avoid errors
        const searchQuery = query || 'trending technology news';

        try {
            const args: any = {
                query: searchQuery,
                count: maxItems || 10,
                offset: offset || 0
            };

            const result = await client.callTool({
                name: 'brave_web_search',
                arguments: args
            });

            const content = result.content as Array<{ type: string; text?: string }>;

            if (content && content.length > 0) {
                // The MCP tool returns one text block per result (JSON object)
                // We iterate through all blocks to extract results

                for (const part of content) {
                    if (part.type === 'text' && part.text) {
                        const text = part.text;

                        // Try to parse as single JSON result first
                        try {
                            const parsed = JSON.parse(text);
                            if (parsed.title && parsed.url) { // Valid single result
                                trends.push({
                                    topic: parsed.title,
                                    context: parsed.description || '',
                                    source: 'Brave Search',
                                    sourceType: 'search',
                                    url: parsed.url,
                                    niche: 'general',
                                });
                                continue; // Success for this block
                            }
                        } catch {
                            // Valid JSON parse failed, ignore
                        }

                        // Use fallback extractor for this block (e.g. if it's markdown or a list)
                        const parseResult = extractResultsFromText(text);
                        if (!parseResult.error && parseResult.results.length > 0) {
                            for (const r of parseResult.results) {
                                if (r.title) {
                                    trends.push({
                                        topic: r.title,
                                        context: r.description || '',
                                        source: 'Brave Search',
                                        sourceType: 'search',
                                        url: r.url || '',
                                        niche: 'general',
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error(`[BraveAPI] error:`, e);
            return NextResponse.json({
                success: false,
                error: errorMsg,
                latencyMs: Date.now() - startTime,
            }, { status: 500 });
        }

        return NextResponse.json({
            success: trends.length > 0,
            data: trends,
            latencyMs: Date.now() - startTime,
        });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Brave Search failed';
        return NextResponse.json({
            success: false,
            error: errorMsg,
            latencyMs: Date.now() - startTime,
        }, { status: 500 });
    }
}
