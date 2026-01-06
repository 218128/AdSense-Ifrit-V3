'use client';

/**
 * MCP Section
 * FSD: components/settings/sections/MCPSection.tsx
 * 
 * Dedicated tab for MCP (Model Context Protocol) tools:
 * - Server enable/disable
 * - API key configuration
 * - Tool listing
 * 
 * Extracted from AIKeyManager for better separation
 */

import { useState } from 'react';
import {
    Server, Wrench, Check, X, ExternalLink, Settings2,
    ChevronDown, ChevronRight, AlertCircle
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

// ============================================================================
// MCP Server Definitions
// ============================================================================

interface MCPServerDef {
    id: string;
    name: string;
    description: string;
    docsUrl?: string;
    tools: string[];
    requiresApiKey?: boolean;
    keyPlaceholder?: string;
}

const MCP_SERVERS: MCPServerDef[] = [
    {
        id: 'hostinger-mcp',
        name: 'Hostinger MCP',
        description: 'WordPress hosting, DNS, and site management',
        docsUrl: 'https://www.hostinger.com/',
        tools: [
            'create_wordpress_site',
            'list_websites',
            'deploy_plugin',
            'deploy_theme',
            'list_domains',
            'update_dns_records',
        ],
    },
    {
        id: 'github-mcp-server',
        name: 'GitHub MCP',
        description: 'Repository and code management',
        docsUrl: 'https://github.com/',
        tools: [
            'create_repository',
            'push_files',
            'create_pull_request',
            'list_repositories',
        ],
    },
    {
        id: 'perplexity-ask',
        name: 'Perplexity MCP',
        description: 'AI-powered search and research',
        docsUrl: 'https://www.perplexity.ai/',
        tools: ['perplexity_ask'],
        requiresApiKey: true,
        keyPlaceholder: 'pplx-...',
    },
];

// ============================================================================
// Server Card Component
// ============================================================================

interface ServerCardProps {
    server: MCPServerDef;
}

function ServerCard({ server }: ServerCardProps) {
    const [expanded, setExpanded] = useState(false);
    const { mcpServers, toggleMCPServer, setMCPApiKey } = useSettingsStore();

    const isEnabled = mcpServers.enabled.includes(server.id);
    const apiKey = mcpServers.apiKeys[server.id] || '';

    return (
        <div className={`
            border rounded-xl overflow-hidden transition-all
            ${isEnabled ? 'border-green-200 bg-white' : 'border-neutral-200 bg-neutral-50'}
        `}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
                <div className={`
                    p-2 rounded-lg
                    ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-neutral-200 text-neutral-500'}
                `}>
                    <Server className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-800">{server.name}</h3>
                        {server.docsUrl && (
                            <a
                                href={server.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neutral-400 hover:text-blue-500"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                    <p className="text-sm text-neutral-500">{server.description}</p>
                </div>

                <button
                    onClick={() => toggleMCPServer(server.id)}
                    className={`
                        relative w-11 h-6 rounded-full transition-colors
                        ${isEnabled ? 'bg-green-500' : 'bg-neutral-300'}
                    `}
                >
                    <span className={`
                        absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                        ${isEnabled ? 'left-5' : 'left-0.5'}
                    `} />
                </button>
            </div>

            {/* Tools List (Expandable) */}
            <div
                className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-t border-neutral-100 cursor-pointer hover:bg-neutral-100"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                )}
                <Wrench className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-600">
                    {server.tools.length} tools available
                </span>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-2 bg-neutral-50 border-t border-neutral-100">
                    {/* API Key (if required) */}
                    {server.requiresApiKey && (
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-neutral-600 mb-1">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setMCPApiKey(server.id, e.target.value)}
                                placeholder={server.keyPlaceholder || 'Enter API key...'}
                                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                        </div>
                    )}

                    {/* Tools List */}
                    <div className="grid grid-cols-2 gap-1">
                        {server.tools.map(tool => (
                            <div
                                key={tool}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-neutral-200 text-xs"
                            >
                                <Check className="w-3 h-3 text-green-500" />
                                <span className="text-neutral-700 truncate">{tool}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Section
// ============================================================================

export function MCPSection() {
    const { mcpServers } = useSettingsStore();
    const enabledCount = mcpServers.enabled.length;

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                <Settings2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-green-800">
                        MCP (Model Context Protocol) servers provide external tools that AI capabilities can use.
                        Enable servers to expand what your AI can do.
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span>
                    <span className="font-semibold text-neutral-800">{enabledCount}</span>
                    {' '}of{' '}
                    <span className="font-semibold text-neutral-800">{MCP_SERVERS.length}</span>
                    {' '}servers enabled
                </span>
            </div>

            {/* Server List */}
            <div className="space-y-4">
                {MCP_SERVERS.map(server => (
                    <ServerCard key={server.id} server={server} />
                ))}
            </div>

            {/* Note */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                    MCP servers are configured in your IDE settings. This panel shows which
                    servers are available and lets you enable/disable them for AI capabilities.
                </p>
            </div>
        </div>
    );
}

export default MCPSection;
