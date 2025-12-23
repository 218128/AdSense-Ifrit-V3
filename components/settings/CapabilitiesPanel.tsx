/**
 * Capabilities Settings Panel
 * 
 * Comprehensive UI for managing AI capabilities:
 * - View/enable/disable capabilities
 * - Add custom capabilities
 * - Assign handlers (tools) to capabilities
 * - Configure fallback chains
 * - Set default handlers per capability
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
} from 'lucide-react';
import {
    aiServices,
    Capability,
    CapabilityHandler,
    DEFAULT_CAPABILITIES,
} from '@/lib/ai/services';

// Icon mapping for capabilities
const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
    generate: <Sparkles className="w-4 h-4" />,
    research: <Search className="w-4 h-4" />,
    keywords: <Target className="w-4 h-4" />,
    analyze: <BarChart3 className="w-4 h-4" />,
    scrape: <Globe className="w-4 h-4" />,
    summarize: <FileText className="w-4 h-4" />,
    translate: <Languages className="w-4 h-4" />,
    images: <Image className="w-4 h-4" />,
    reasoning: <Brain className="w-4 h-4" />,
    code: <Code className="w-4 h-4" />,
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
    const [showAddModal, setShowAddModal] = useState(false);

    // New capability form
    const [newCapId, setNewCapId] = useState('');
    const [newCapName, setNewCapName] = useState('');
    const [newCapDesc, setNewCapDesc] = useState('');

    // Load capabilities and handlers
    const loadData = useCallback(() => {
        setCapabilities(aiServices.getCapabilities());
        setHandlers(aiServices.getHandlers());
        setLoading(false);
    }, []);

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
    };

    // Set default handler
    const setDefaultHandler = (capId: string, handlerId: string | undefined) => {
        aiServices.updateCapabilitySettings(capId, { defaultHandlerId: handlerId });
        loadData();
    };

    // Add custom capability
    const addCapability = () => {
        if (!newCapId || !newCapName) return;

        aiServices.addCapability({
            id: newCapId.toLowerCase().replace(/\s+/g, '-'),
            name: newCapName,
            description: newCapDesc || `Custom capability: ${newCapName}`,
            isEnabled: true,
        });

        setNewCapId('');
        setNewCapName('');
        setNewCapDesc('');
        setShowAddModal(false);
    };

    // Remove custom capability
    const removeCapability = (id: string) => {
        if (confirm(`Remove capability "${id}"? This cannot be undone.`)) {
            aiServices.removeCapability(id);
        }
    };

    // Get handlers for a capability
    const getHandlersForCapability = (capId: string): CapabilityHandler[] => {
        return handlers.filter(h => h.capabilities.includes(capId));
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
                            Configure which AI tasks are available and how they're handled
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Capability
                </button>
            </div>

            {/* Info Banner */}
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

                                {/* Delete (custom only) */}
                                {!cap.isDefault && (
                                    <button
                                        onClick={() => removeCapability(cap.id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
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

                                        {/* Available Handlers */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Available Handlers
                                            </label>
                                            {capHandlers.length === 0 ? (
                                                <div className="text-sm text-gray-500 italic">
                                                    No handlers available for this capability
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {capHandlers
                                                        .sort((a, b) => b.priority - a.priority)
                                                        .map(h => (
                                                            <div
                                                                key={h.id}
                                                                className={`flex items-center justify-between p-3 rounded-lg ${h.id === cap.defaultHandlerId
                                                                        ? 'bg-purple-500/10 border border-purple-500/30'
                                                                        : 'bg-gray-700/50'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-2 h-2 rounded-full ${h.isAvailable ? 'bg-green-500' : 'bg-gray-500'
                                                                        }`} />
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
                                                                            {h.source} • priority {h.priority}
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
                                                        ))}
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
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-100 mb-4">Add Custom Capability</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Capability ID
                                </label>
                                <input
                                    type="text"
                                    value={newCapId}
                                    onChange={(e) => setNewCapId(e.target.value)}
                                    placeholder="e.g., sentiment-analysis"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">Unique identifier, lowercase with hyphens</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={newCapName}
                                    onChange={(e) => setNewCapName(e.target.value)}
                                    placeholder="e.g., Sentiment Analysis"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newCapDesc}
                                    onChange={(e) => setNewCapDesc(e.target.value)}
                                    placeholder="What does this capability do?"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addCapability}
                                disabled={!newCapId || !newCapName}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Capability
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
