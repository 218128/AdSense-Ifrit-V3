'use client';

import { useState, useEffect } from 'react';
import { Wrench, Zap, Globe, Search, Github, FolderOpen, ChevronDown, Key, Loader2, CheckCircle, XCircle, PlayCircle } from 'lucide-react';

// MCP Server configurations (client-side subset)
interface MCPServerConfig {
    id: string;
    name: string;
    description: string;
    requiresApiKey: boolean;
    category: 'research' | 'seo' | 'integration' | 'utility';
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
        category: 'research'
    },
    {
        id: 'puppeteer',
        name: 'Web Scraper',
        description: 'Fetch and analyze web pages',
        requiresApiKey: false,
        category: 'research'
    },
    {
        id: 'fetch',
        name: 'URL Fetcher',
        description: 'Fetch content from URLs',
        requiresApiKey: false,
        category: 'seo'
    },
    {
        id: 'github',
        name: 'GitHub',
        description: 'Create repos, manage code',
        requiresApiKey: true,
        category: 'integration'
    },
    {
        id: 'filesystem',
        name: 'File System',
        description: 'Read and write local files',
        requiresApiKey: false,
        category: 'utility'
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
    const [enabledServers, setEnabledServers] = useState<Set<string>>(new Set());
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [expandedCategory, setExpandedCategory] = useState<string | null>('research');
    const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

    // Connection test states
    const [testingServer, setTestingServer] = useState<string | null>(null);
    const [connectionResults, setConnectionResults] = useState<Record<string, ConnectionResult>>({});

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

    // Load state from localStorage
    useEffect(() => {
        try {
            const enabled = localStorage.getItem(STORAGE_KEY);
            if (enabled) {
                setEnabledServers(new Set(JSON.parse(enabled)));
            }

            const keys = localStorage.getItem(API_KEYS_STORAGE);
            if (keys) {
                setApiKeys(JSON.parse(keys));
            }
        } catch {
            // Ignore
        }
    }, []);

    // Save state to localStorage
    const saveState = (enabled: Set<string>, keys: Record<string, string>) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabled]));
        localStorage.setItem(API_KEYS_STORAGE, JSON.stringify(keys));
    };

    const toggleServer = (serverId: string) => {
        const server = MCP_SERVERS.find(s => s.id === serverId);
        if (!server) return;

        // Check if API key is required and available
        if (server.requiresApiKey && !apiKeys[serverId] && !enabledServers.has(serverId)) {
            alert(`Please enter an API key for ${server.name} first.`);
            return;
        }

        const newEnabled = new Set(enabledServers);
        if (newEnabled.has(serverId)) {
            newEnabled.delete(serverId);
        } else {
            newEnabled.add(serverId);
        }
        setEnabledServers(newEnabled);
        saveState(newEnabled, apiKeys);
    };

    const updateApiKey = (serverId: string, key: string) => {
        const newKeys = { ...apiKeys, [serverId]: key };
        setApiKeys(newKeys);
        saveState(enabledServers, newKeys);
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
                                <div className="border-t bg-gray-50 divide-y">
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
                                                    </div>
                                                    <button
                                                        onClick={() => toggleServer(server.id)}
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
                                                    <div className="flex items-center gap-2">
                                                        <Key className="w-4 h-4 text-gray-400" />
                                                        <input
                                                            type={showApiKey[server.id] ? 'text' : 'password'}
                                                            value={apiKeys[server.id] || ''}
                                                            onChange={(e) => updateApiKey(server.id, e.target.value)}
                                                            placeholder="Enter API key..."
                                                            className="flex-1 px-2 py-1 text-sm border rounded"
                                                        />
                                                        <button
                                                            onClick={() => setShowApiKey({
                                                                ...showApiKey,
                                                                [server.id]: !showApiKey[server.id]
                                                            })}
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
                                                        <div className={`flex items-center gap-1 text-xs ${connectionResults[server.id].success
                                                                ? 'text-green-600'
                                                                : 'text-red-600'
                                                            }`}>
                                                            {connectionResults[server.id].success ? (
                                                                <>
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    {connectionResults[server.id].toolCount} tools found
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className="w-3 h-3" />
                                                                    {connectionResults[server.id].error || 'Failed'}
                                                                </>
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
