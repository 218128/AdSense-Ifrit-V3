'use client';

import { useState, useEffect } from 'react';
import { Wrench, Zap, Globe, Search, Github, FolderOpen, ChevronDown, Key, Loader2, CheckCircle, XCircle, PlayCircle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

// MCP Server configurations (client-side subset)
interface MCPServerConfig {
    id: string;
    name: string;
    description: string;
    requiresApiKey: boolean;
    category: 'research' | 'seo' | 'integration' | 'utility';
    endpoint?: string;  // What this MCP server connects to
}

interface ConnectionResult {
    success: boolean;
    toolCount?: number;
    tools?: Array<{ name: string; description?: string }>;
    error?: string;
    message?: string;
}

const MCP_SERVERS: MCPServerConfig[] = [
    {
        id: 'brave-search',
        name: 'Web Search (Brave)',
        description: 'Real-time web search for article research',
        requiresApiKey: true,
        category: 'research',
        endpoint: 'Brave Search API (cloud)',
    },
    {
        id: 'perplexity',
        name: 'AI Research (Perplexity)',
        description: 'Deep research, reasoning, and web search with AI',
        requiresApiKey: true,
        category: 'research',
        endpoint: 'Perplexity API (uses same key as AI Provider)',
    },
    {
        id: 'playwright',
        name: 'Browser Automation (Playwright)',
        description: 'Navigate, scrape, and automate web pages',
        requiresApiKey: false,
        category: 'research',
        endpoint: 'Microsoft Playwright MCP (npx @playwright/mcp@latest)',
    },
    {
        id: 'fetch',
        name: 'URL Fetcher',
        description: 'Fetch content from URLs',
        requiresApiKey: false,
        category: 'seo',
        endpoint: 'Local MCP Server (npx @modelcontextprotocol/server-fetch)',
    },
    {
        id: 'github',
        name: 'GitHub MCP',
        description: 'Create repos, manage code via MCP',
        requiresApiKey: true,
        category: 'integration',
        endpoint: 'GitHub API via MCP server',
    },
    {
        id: 'hostinger',
        name: 'Hostinger WordPress Hosting',
        description: 'Create WordPress sites, manage hosting, domains, SSL, DNS',
        requiresApiKey: true,
        category: 'integration',
        endpoint: 'Hostinger API (npx hostinger-api-mcp@latest)',
    },
    {
        id: 'filesystem',
        name: 'File System',
        description: 'Read and write local files',
        requiresApiKey: false,
        category: 'utility',
        endpoint: 'Local MCP Server (npx @modelcontextprotocol/server-filesystem)',
    }
];

const STORAGE_KEY = 'ifrit_mcp_enabled';
const API_KEYS_STORAGE = 'ifrit_mcp_api_keys';

const categoryIcons: Record<string, React.ReactNode> = {
    research: <Search className="w-4 h-4" />,
    seo: <Globe className="w-4 h-4" />,
    integration: <Github className="w-4 h-4" />,
    utility: <FolderOpen className="w-4 h-4" />
};

const categoryLabels: Record<string, string> = {
    research: 'Research & Web',
    seo: 'SEO Tools',
    integration: 'Integrations',
    utility: 'Utilities'
};

/**
 * MCP Tools Settings Panel
 * Allows users to enable/disable MCP servers and configure API keys
 */
export function MCPToolsPanel() {
    // Use settings store for MCP configuration
    const { mcpServers, toggleMCPServer, setMCPApiKey, initialize } = useSettingsStore();

    // Derive enabled servers from store
    const enabledServers = new Set(mcpServers.enabled || []);
    // Read API keys directly from the correct store path
    const apiKeys = mcpServers.apiKeys || {};

    const [expandedCategory, setExpandedCategory] = useState<string | null>('research');
    const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

    // Connection test states
    const [testingServer, setTestingServer] = useState<string | null>(null);
    const [connectionResults, setConnectionResults] = useState<Record<string, ConnectionResult>>({});

    // Initialize store on mount
    useEffect(() => {
        initialize();
    }, []);

    // Test connection function
    const testConnection = async (serverId: string) => {
        const server = MCP_SERVERS.find(s => s.id === serverId);
        if (!server) return;

        setTestingServer(serverId);
        setConnectionResults(prev => ({ ...prev, [serverId]: { success: false } }));

        try {
            const response = await fetch('/api/mcp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverId,
                    apiKey: apiKeys[serverId]
                })
            });

            const result: ConnectionResult = await response.json();
            setConnectionResults(prev => ({ ...prev, [serverId]: result }));
        } catch (error) {
            setConnectionResults(prev => ({
                ...prev,
                [serverId]: {
                    success: false,
                    error: error instanceof Error ? error.message : 'Connection failed'
                }
            }));
        } finally {
            setTestingServer(null);
        }
    };

    const handleToggleServer = (serverId: string) => {
        const server = MCP_SERVERS.find(s => s.id === serverId);
        if (!server) return;

        // Check if API key is required and available
        if (server.requiresApiKey && !apiKeys[serverId] && !enabledServers.has(serverId)) {
            alert(`Please enter an API key for ${server.name} first.`);
            return;
        }

        toggleMCPServer(serverId);
    };

    const handleUpdateApiKey = (serverId: string, key: string) => {
        setMCPApiKey(serverId, key);
    };

    const categories = ['research', 'seo', 'integration', 'utility'];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                <h3 className="text-lg font-semibold">MCP Tools</h3>
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Optional Enhancement
                </span>
            </div>

            <p className="text-sm text-gray-500">
                Enable AI tools for enhanced content generation. These work alongside your existing features.
            </p>

            {/* Info Banner */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <strong className="text-amber-800">AI-Discovered Keywords:</strong>
                        <span className="text-amber-700"> Enabled by default using Gemini. Enable Web Search for real-time data.</span>
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
                {categories.map(category => {
                    const servers = MCP_SERVERS.filter(s => s.category === category);
                    const isExpanded = expandedCategory === category;
                    const enabledCount = servers.filter(s => enabledServers.has(s.id)).length;

                    return (
                        <div key={category} className="border rounded-lg overflow-hidden">
                            {/* Category Header */}
                            <button
                                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {categoryIcons[category]}
                                    <span className="font-medium">{categoryLabels[category]}</span>
                                    {enabledCount > 0 && (
                                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                            {enabledCount} active
                                        </span>
                                    )}
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Servers */}
                            {isExpanded && (
                                <div
                                    className="border-t bg-gray-50 divide-y"
                                    onKeyDown={(e) => e.stopPropagation()}
                                >
                                    {servers.map(server => {
                                        const isEnabled = enabledServers.has(server.id);
                                        const hasApiKey = !!apiKeys[server.id];
                                        const needsKey = server.requiresApiKey && !hasApiKey;

                                        return (
                                            <div key={server.id} className="p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-sm">{server.name}</div>
                                                        <div className="text-xs text-gray-500">{server.description}</div>
                                                        {server.endpoint && (
                                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                                📡 {server.endpoint}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleServer(server.id)}
                                                        disabled={needsKey}
                                                        className={`
                                                            relative w-12 h-6 rounded-full transition-colors
                                                            ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}
                                                            ${needsKey ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                        `}
                                                    >
                                                        <div className={`
                                                            absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                                                            ${isEnabled ? 'right-1' : 'left-1'}
                                                        `} />
                                                    </button>
                                                </div>

                                                {/* API Key Input */}
                                                {server.requiresApiKey && (
                                                    <div
                                                        className="flex items-center gap-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Key className="w-4 h-4 text-gray-400" />
                                                        <input
                                                            type={showApiKey[server.id] ? 'text' : 'password'}
                                                            value={apiKeys[server.id] || ''}
                                                            onChange={(e) => handleUpdateApiKey(server.id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            onFocus={(e) => e.stopPropagation()}
                                                            placeholder="Enter API key..."
                                                            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            autoComplete="off"
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowApiKey({
                                                                    ...showApiKey,
                                                                    [server.id]: !showApiKey[server.id]
                                                                });
                                                            }}
                                                            className="text-xs text-blue-500 hover:underline"
                                                        >
                                                            {showApiKey[server.id] ? 'Hide' : 'Show'}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Test Connection Button */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => testConnection(server.id)}
                                                        disabled={testingServer === server.id || needsKey}
                                                        className={`
                                                            flex items-center gap-1 px-2 py-1 text-xs rounded
                                                            ${testingServer === server.id
                                                                ? 'bg-gray-200 text-gray-500'
                                                                : needsKey
                                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                            }
                                                        `}
                                                    >
                                                        {testingServer === server.id ? (
                                                            <>
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Testing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PlayCircle className="w-3 h-3" />
                                                                Test Connection
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Connection Result */}
                                                    {connectionResults[server.id] && (
                                                        <div className={`flex flex-col gap-1 text-xs ${connectionResults[server.id].success
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                            }`}>
                                                            {connectionResults[server.id].success ? (
                                                                <div className="flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    {connectionResults[server.id].toolCount} tools found
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex items-center gap-1">
                                                                        <XCircle className="w-3 h-3" />
                                                                        <span>Failed to connect to {server.name}</span>
                                                                    </div>
                                                                    {connectionResults[server.id].error && (
                                                                        <span className="text-red-500 ml-4 text-[10px]">
                                                                            {connectionResults[server.id].error}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Show discovered tools */}
                                                {connectionResults[server.id]?.success && connectionResults[server.id]?.tools && (
                                                    <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                                                        <div className="font-medium text-green-800 mb-1">Discovered Tools:</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {connectionResults[server.id].tools!.map(tool => (
                                                                <span key={tool.name} className="px-1.5 py-0.5 bg-green-200 text-green-800 rounded">
                                                                    {tool.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="text-xs text-gray-400 text-center">
                ℹ️ Legacy features work without any MCP tools enabled
            </div>
        </div>
    );
}
