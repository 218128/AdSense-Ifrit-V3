/**
 * Capabilities Settings Panel
 * 
 * Comprehensive UI for managing AI capabilities:
 * - View/enable/disable capabilities
 * - Add custom capabilities
 * - Assign handlers (tools) to capabilities
 * - Configure fallback chains
 * - Set default handlers per capability
 * 
 * MIGRATION: Uses aiServices. Engine accessible via @/lib/core for future migration.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Save,
    RefreshCw,
    Sparkles,
    Search,
    Target,
    BarChart3,
    Globe,
    FileText,
    Languages,
    Image,
    Brain,
    Code,
    Zap,
    Check,
    AlertCircle,
    Info,
    ArrowUp,
    ArrowDown,
    GripVertical,
    // Additional icons for capabilities
    ShieldCheck,
    CheckCircle,
    Star,
    TrendingUp,
    Database,
    Link,
    Upload,
    UserCheck,
    Play,
} from 'lucide-react';
import {
    aiServices,
    Capability,
    CapabilityHandler,
    DEFAULT_CAPABILITIES,
} from '@/lib/ai/services';
import { useSettingsStore, type ProviderId } from '@/stores/settingsStore';

// Icon mapping for capabilities (all 17)
const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
    // Core Content
    generate: <Sparkles className="w-4 h-4" />,
    research: <Search className="w-4 h-4" />,
    keywords: <Target className="w-4 h-4" />,
    'keyword-analyze': <Target className="w-4 h-4" />,
    analyze: <BarChart3 className="w-4 h-4" />,
    scrape: <Globe className="w-4 h-4" />,
    summarize: <FileText className="w-4 h-4" />,
    translate: <Languages className="w-4 h-4" />,
    images: <Image className="w-4 h-4" />,
    reasoning: <Brain className="w-4 h-4" />,
    code: <Code className="w-4 h-4" />,
    // E-E-A-T & Quality
    'eeat-scoring': <ShieldCheck className="w-4 h-4" />,
    'fact-check': <CheckCircle className="w-4 h-4" />,
    'quality-review': <Star className="w-4 h-4" />,
    // SEO
    'seo-optimize': <TrendingUp className="w-4 h-4" />,
    'schema-generate': <Database className="w-4 h-4" />,
    'internal-link': <Link className="w-4 h-4" />,
    // Publishing
    'wp-publish': <Upload className="w-4 h-4" />,
    'author-match': <UserCheck className="w-4 h-4" />,
    'campaign-run': <Play className="w-4 h-4" />,
};

const getIconForCapability = (id: string): React.ReactNode => {
    return CAPABILITY_ICONS[id] || <Zap className="w-4 h-4" />;
};

export default function CapabilitiesPanel() {
    // State
    const [capabilities, setCapabilities] = useState<Capability[]>([]);
    const [handlers, setHandlers] = useState<CapabilityHandler[]>([]);
    const [expandedCap, setExpandedCap] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Settings store for verbosity/diagnostics AND handler model selection
    const capabilitiesConfig = useSettingsStore(state => state.capabilitiesConfig);
    const setCapabilitiesConfig = useSettingsStore(state => state.setCapabilitiesConfig);
    // Handler-specific model selection (from Settings store)
    const availableModels = useSettingsStore(state => state.availableModels);
    const handlerModels = useSettingsStore(state => state.handlerModels);
    const setHandlerModel = useSettingsStore(state => state.setHandlerModel);
    // Provider keys for key status indicator
    const providerKeys = useSettingsStore(state => state.providerKeys);

    // Check if a provider has valid API keys configured
    const hasKeyForProvider = (providerId: string | undefined): boolean => {
        if (!providerId) return true; // Non-provider handlers don't need keys
        const keys = providerKeys[providerId as ProviderId] || [];
        return keys.some(k => k.key && k.key.length > 10);
    };

    // Load capabilities and handlers
    const loadData = useCallback(() => {
        setCapabilities(aiServices.getCapabilities());
        setHandlers(aiServices.getHandlers());
        setLoading(false);
    }, []);

    // Sync settings to server (for API routes to access)
    const syncToServer = useCallback(async () => {
        try {
            const config = aiServices.getConfig() as { capabilities?: Record<string, { fallbackHandlerIds?: string[]; defaultHandlerId?: string; isEnabled?: boolean }> };
            const capSettings = config.capabilities || {};

            // Get provider keys and convert to simple format
            const providerKeysMap: Record<string, string> = {};
            const providers = ['gemini', 'perplexity', 'deepseek', 'openrouter'] as const;
            for (const p of providers) {
                const keys = providerKeys[p];
                if (keys?.length && keys[0]?.key) {
                    providerKeysMap[p] = keys[0].key;
                }
            }

            await fetch('/api/settings/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capabilitySettings: capSettings,
                    handlerModels: handlerModels,
                    providerKeys: providerKeysMap,
                }),
            });
        } catch (e) {
            console.warn('[CapabilitiesPanel] Failed to sync to server:', e);
        }
    }, [handlerModels, providerKeys]);

    useEffect(() => {
        // Initialize if needed
        aiServices.initialize().then(() => {
            loadData();
        });

        // Subscribe to updates
        const unsubscribe = aiServices.subscribe((event) => {
            if (
                event.type === 'capability-added' ||
                event.type === 'capability-removed' ||
                event.type === 'handler-registered' ||
                event.type === 'handler-removed' ||
                event.type === 'config-updated'
            ) {
                loadData();
            }
        });

        return unsubscribe;
    }, [loadData]);

    // Toggle capability enabled
    const toggleCapability = (id: string, enabled: boolean) => {
        aiServices.updateCapabilitySettings(id, { isEnabled: enabled });
        loadData();
        syncToServer();
    };

    // Set default handler
    const setDefaultHandler = (capId: string, handlerId: string | undefined) => {
        aiServices.updateCapabilitySettings(capId, { defaultHandlerId: handlerId });
        loadData();
        syncToServer();
    };

    // NOTE: addCapability/removeCapability functions removed (custom capabilities purged)

    // Get handlers for a capability
    const getHandlersForCapability = (capId: string): CapabilityHandler[] => {
        return handlers.filter(h => h.capabilities.includes(capId));
    };

    // Get ordered handlers (respects user-defined order via fallbackHandlerIds)
    const getOrderedHandlers = (capId: string): CapabilityHandler[] => {
        const capHandlers = getHandlersForCapability(capId);
        // Read fallback order from aiServices config (where updateCapabilitySettings saves it)
        const config = aiServices.getConfig();
        const capSettings = (config as any).capabilities?.[capId];
        const customOrder = capSettings?.fallbackHandlerIds || [];

        if (customOrder.length === 0) {
            // No custom order - sort by priority
            return [...capHandlers].sort((a, b) => b.priority - a.priority);
        }

        // Sort by custom order, then by priority for unlisted handlers
        return [...capHandlers].sort((a, b) => {
            const aIdx = customOrder.indexOf(a.id);
            const bIdx = customOrder.indexOf(b.id);

            // Both in custom order - use that order
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            // Only a is in custom order - a comes first
            if (aIdx !== -1) return -1;
            // Only b is in custom order - b comes first
            if (bIdx !== -1) return 1;
            // Neither in custom order - use priority
            return b.priority - a.priority;
        });
    };

    // Move handler up/down in priority order
    const moveHandler = (capId: string, handlerId: string, direction: 'up' | 'down') => {
        const orderedHandlers = getOrderedHandlers(capId);
        const currentIdx = orderedHandlers.findIndex(h => h.id === handlerId);

        if (currentIdx === -1) return;
        if (direction === 'up' && currentIdx === 0) return;
        if (direction === 'down' && currentIdx === orderedHandlers.length - 1) return;

        const newOrder = orderedHandlers.map(h => h.id);
        const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;

        // Swap positions
        [newOrder[currentIdx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[currentIdx]];

        // Update via AIServices
        aiServices.updateCapabilitySettings(capId, { fallbackHandlerIds: newOrder });
        loadData();
        syncToServer();
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-100">AI Capabilities</h2>
                        <p className="text-sm text-gray-400">
                            Configure which AI tasks are available and how they&apos;re handled
                        </p>
                    </div>
                </div>
                {/* Add Capability button removed - custom capabilities feature purged */}
            </div>

            {/* Info Banner - Essential Guidance */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">How Capabilities Work</p>
                    <p className="text-blue-300/80">
                        Capabilities define what AI tasks your app can perform. Each capability can have
                        multiple handlers (AI providers or MCP tools). When you request a capability,
                        the system tries handlers in priority order with automatic fallback.
                    </p>
                </div>
            </div>

            {/* Tips Section - AI Landscape Guidance (Dec 2025) */}
            <div className="p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-lg">
                <h4 className="font-medium text-purple-200 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Configuration Tips (Dec 2025)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <p className="font-medium text-gray-200 mb-1">🎯 Capability Assignment</p>
                        <p className="text-gray-400">
                            Assign <strong className="text-purple-300">Gemini</strong> for general tasks,{' '}
                            <strong className="text-purple-300">Perplexity</strong> for research (has web search),{' '}
                            <strong className="text-purple-300">DeepSeek</strong> for complex reasoning.
                        </p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <p className="font-medium text-gray-200 mb-1">⚡ MCP Tools Priority</p>
                        <p className="text-gray-400">
                            MCP tools (when available) get priority over AI providers.
                            Configure tools like <strong className="text-purple-300">Brave Search</strong> or{' '}
                            <strong className="text-purple-300">Firecrawl</strong> for web scraping.
                        </p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <p className="font-medium text-gray-200 mb-1">🔄 Fallback Chains</p>
                        <p className="text-gray-400">
                            Set up fallback handlers so if one fails (rate limits), the system
                            automatically tries the next handler. Essential for high availability.
                        </p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <p className="font-medium text-gray-200 mb-1">🌐 Evolving Landscape</p>
                        <p className="text-gray-400">
                            AI models and MCP servers are updated frequently. Check provider dashboards
                            for new models and the MCP registry for new tools.
                        </p>
                    </div>
                </div>
            </div>

            {/* Capabilities List */}
            <div className="space-y-3">
                {capabilities.map((cap) => {
                    const capHandlers = getHandlersForCapability(cap.id);
                    const isExpanded = expandedCap === cap.id;
                    const defaultHandler = capHandlers.find(h => h.id === cap.defaultHandlerId);

                    return (
                        <div
                            key={cap.id}
                            className={`border rounded-lg transition-colors ${cap.isEnabled
                                ? 'border-gray-700 bg-gray-800/50'
                                : 'border-gray-800 bg-gray-900/50 opacity-60'
                                }`}
                        >
                            {/* Capability Header */}
                            <div className="p-4 flex items-center gap-4">
                                {/* Icon */}
                                <div className={`p-2 rounded-lg ${cap.isEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-500'
                                    }`}>
                                    {getIconForCapability(cap.id)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-gray-100">{cap.name}</h3>
                                        {cap.isDefault && (
                                            <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                                                Built-in
                                            </span>
                                        )}
                                        {!cap.isDefault && (
                                            <span className="px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-400">
                                                Custom
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">{cap.description}</p>
                                </div>

                                {/* Handlers count */}
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-gray-100">{capHandlers.length}</div>
                                    <div className="text-xs text-gray-500">handlers</div>
                                </div>

                                {/* Enable toggle */}
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cap.isEnabled}
                                        onChange={(e) => toggleCapability(cap.id, e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>

                                {/* Expand/Collapse */}
                                <button
                                    onClick={() => setExpandedCap(isExpanded ? null : cap.id)}
                                    className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-5 h-5" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5" />
                                    )}
                                </button>

                                {/* Delete button removed - custom capabilities feature purged */}
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-gray-700/50 pt-4">
                                    <div className="space-y-4">
                                        {/* Default Handler Selector */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Default Handler
                                            </label>
                                            <select
                                                value={cap.defaultHandlerId || ''}
                                                onChange={(e) => setDefaultHandler(cap.id, e.target.value || undefined)}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            >
                                                <option value="">Auto (priority-based)</option>
                                                {capHandlers.map(h => (
                                                    <option key={h.id} value={h.id}>
                                                        {h.name} ({h.source})
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-gray-500">
                                                The default handler will be tried first. If it fails, others are tried in priority order.
                                            </p>
                                        </div>

                                        {/* Available Handlers - Ordered with Priority Controls */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center justify-between">
                                                <span>Handler Priority Order</span>
                                                <span className="text-xs text-gray-500 font-normal">Use arrows to reorder • Top = tried first</span>
                                            </label>
                                            {capHandlers.length === 0 ? (
                                                <div className="text-sm text-gray-500 italic">
                                                    No handlers available for this capability
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {getOrderedHandlers(cap.id).map((h, idx, arr) => {
                                                        // Get provider's available models for this handler
                                                        const providerModels = h.providerId ? (availableModels[h.providerId as keyof typeof availableModels] || []) : [];
                                                        // Composite key: capability:handler for isolation
                                                        const handlerModelKey = `${cap.id}:${h.id}`;
                                                        const currentHandlerModel = handlerModels[handlerModelKey] || '';
                                                        const isFirst = idx === 0;
                                                        const isLast = idx === arr.length - 1;
                                                        return (
                                                            <div
                                                                key={h.id}
                                                                className={`p-3 rounded-lg ${h.id === cap.defaultHandlerId
                                                                    ? 'bg-purple-500/10 border border-purple-500/30'
                                                                    : 'bg-gray-700/50'
                                                                    }`}
                                                            >
                                                                {/* Handler Info Row */}
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-3">
                                                                        {/* Position & Reorder Controls */}
                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                            <button
                                                                                onClick={() => moveHandler(cap.id, h.id, 'up')}
                                                                                disabled={isFirst}
                                                                                className={`p-0.5 rounded transition-colors ${isFirst ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'}`}
                                                                                title="Move up (higher priority)"
                                                                            >
                                                                                <ArrowUp className="w-3 h-3" />
                                                                            </button>
                                                                            <span className="text-xs font-bold text-gray-400 w-4 text-center">{idx + 1}</span>
                                                                            <button
                                                                                onClick={() => moveHandler(cap.id, h.id, 'down')}
                                                                                disabled={isLast}
                                                                                className={`p-0.5 rounded transition-colors ${isLast ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'}`}
                                                                                title="Move down (lower priority)"
                                                                            >
                                                                                <ArrowDown className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <div className={`w-2 h-2 rounded-full ${h.isAvailable ? 'bg-green-500' : 'bg-gray-500'}`}
                                                                                title={h.isAvailable ? 'Handler available' : 'Handler unavailable'} />
                                                                            {h.providerId && !hasKeyForProvider(h.providerId) && (
                                                                                <span className="text-amber-500 text-xs" title="Missing API key">⚠️</span>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium text-gray-100">
                                                                                    {h.name}
                                                                                </span>
                                                                                {h.id === cap.defaultHandlerId && (
                                                                                    <Check className="w-4 h-4 text-purple-400" />
                                                                                )}
                                                                            </div>
                                                                            <span className="text-xs text-gray-500">
                                                                                {h.source} • base priority {h.priority}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setDefaultHandler(cap.id, h.id)}
                                                                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${h.id === cap.defaultHandlerId
                                                                            ? 'text-purple-400 cursor-default'
                                                                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                                                                            }`}
                                                                        disabled={h.id === cap.defaultHandlerId}
                                                                    >
                                                                        {h.id === cap.defaultHandlerId ? 'Default' : 'Set Default'}
                                                                    </button>
                                                                </div>
                                                                {/* Model Selection Row */}
                                                                {providerModels.length > 0 && (
                                                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-600/50">
                                                                        <span className="text-xs text-gray-400">Model:</span>
                                                                        <select
                                                                            value={currentHandlerModel}
                                                                            onChange={(e) => setHandlerModel(handlerModelKey, e.target.value)}
                                                                            className="flex-1 px-2 py-1 text-xs bg-gray-600 border border-gray-500 rounded text-gray-100 focus:ring-2 focus:ring-purple-500"
                                                                        >
                                                                            <option value="">Provider default</option>
                                                                            {providerModels.map(model => (
                                                                                <option key={model} value={model}>{model}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                                {providerModels.length === 0 && h.providerId && (
                                                                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-600/50">
                                                                        Refresh models in AI Providers section
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Capability Modal */}
            {/* Add Capability modal removed - custom capabilities feature purged */}

            {/* Diagnostics Settings */}
            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg space-y-4">
                <h4 className="font-medium text-gray-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    Diagnostics Settings
                </h4>

                <div className="grid grid-cols-2 gap-4">
                    {/* Verbosity Level */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Verbosity Level
                        </label>
                        <select
                            value={capabilitiesConfig.verbosity}
                            onChange={(e) => setCapabilitiesConfig({
                                verbosity: e.target.value as 'none' | 'basic' | 'standard' | 'verbose'
                            })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100"
                        >
                            <option value="none">None - No logging</option>
                            <option value="basic">Basic - Success/fail only</option>
                            <option value="standard">Standard - Include latency</option>
                            <option value="verbose">Verbose - Full diagnostics</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Controls how much detail is logged for each capability execution
                        </p>
                    </div>

                    {/* Log Diagnostics Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Log Diagnostics
                        </label>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={capabilitiesConfig.logDiagnostics}
                                    onChange={(e) => setCapabilitiesConfig({
                                        logDiagnostics: e.target.checked
                                    })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                            <span className="text-sm text-gray-400">
                                {capabilitiesConfig.logDiagnostics ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Track latency, tokens, and errors for provider fine-tuning
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{capabilities.length}</div>
                    <div className="text-sm text-gray-400">Total Capabilities</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                        {capabilities.filter(c => c.isEnabled).length}
                    </div>
                    <div className="text-sm text-gray-400">Enabled</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{handlers.length}</div>
                    <div className="text-sm text-gray-400">Handlers Available</div>
                </div>
            </div>
        </div>
    );
}
