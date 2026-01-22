'use client';

/**
 * Capabilities Section
 * FSD: components/settings/sections/CapabilitiesSection.tsx
 * 
 * Dedicated tab for AI capabilities configuration:
 * - Enable/disable capabilities
 * - Handler assignment
 * - Global settings (MCP preference, fallback, diagnostics)
 * 
 * Uses useCapabilities helper that wraps settingsStore
 */

import { useState } from 'react';
import {
    Search, PenLine, Target, FileText, Languages, Image, Brain, Code,
    ChevronDown, ChevronRight, Settings2, Check, X, Info
} from 'lucide-react';
import { useCapabilities, DEFAULT_CAPABILITIES } from '@/lib/config/capabilitiesHelpers';
import { useHandlersForCapability } from '@/lib/config/handlersHelpers';

// ============================================================================
// Capability Icons
// ============================================================================

const CapabilityIcons: Record<string, React.ReactNode> = {
    research: <Search className="w-4 h-4" />,
    generate: <PenLine className="w-4 h-4" />,
    'keyword-analyze': <Target className="w-4 h-4" />,
    summarize: <FileText className="w-4 h-4" />,
    translate: <Languages className="w-4 h-4" />,
    images: <Image className="w-4 h-4" />,
    reasoning: <Brain className="w-4 h-4" />,
    code: <Code className="w-4 h-4" />,
};

// ============================================================================
// Capability Card Component
// ============================================================================

interface CapabilityCardProps {
    id: string;
    name: string;
    description: string;
    isCustom?: boolean;
}

function CapabilityCard({ id, name, description, isCustom }: CapabilityCardProps) {
    const [expanded, setExpanded] = useState(false);
    const {
        isCapabilityEnabled,
        toggleCapability,
        getDefaultHandler,
        setDefaultHandler,
        getFallbackHandlers,
    } = useCapabilities();

    // Get registered handlers for this capability (from Engine)
    const availableHandlers = useHandlersForCapability(id);

    const enabled = isCapabilityEnabled(id);
    const defaultHandler = getDefaultHandler(id);
    const fallbacks = getFallbackHandlers(id);

    return (
        <div className={`
            border rounded-lg transition-all overflow-hidden
            ${enabled ? 'border-blue-200 bg-white' : 'border-neutral-200 bg-neutral-50'}
        `}>
            {/* Header */}
            <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`
                    p-2 rounded-lg
                    ${enabled ? 'bg-blue-100 text-blue-600' : 'bg-neutral-200 text-neutral-500'}
                `}>
                    {CapabilityIcons[id] || <Settings2 className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-800">{name}</span>
                        {isCustom && (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-600 rounded">
                                Custom
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-neutral-500 truncate">{description}</p>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleCapability(id);
                    }}
                    className={`
                        relative w-10 h-5 rounded-full transition-colors
                        ${enabled ? 'bg-blue-500' : 'bg-neutral-300'}
                    `}
                >
                    <span className={`
                        absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                        ${enabled ? 'left-5' : 'left-0.5'}
                    `} />
                </button>

                {expanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                )}
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-3 pb-3 pt-1 border-t border-neutral-100 space-y-3">
                    {/* Default Handler */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Default Handler
                        </label>
                        <select
                            value={defaultHandler || ''}
                            onChange={(e) => setDefaultHandler(id, e.target.value || undefined)}
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Auto (best available)</option>
                            {availableHandlers.length > 0 ? (
                                availableHandlers.map(h => (
                                    <option key={h.id} value={h.id}>
                                        {h.name} (p:{h.priority})
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No handlers registered</option>
                            )}
                        </select>
                    </div>

                    {/* Fallback Info */}
                    {fallbacks.length > 0 && (
                        <div className="text-xs text-neutral-500">
                            <span className="font-medium">Fallbacks:</span>{' '}
                            {fallbacks.join(' → ')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Global Settings Component
// ============================================================================

function GlobalSettings() {
    const {
        preferMCP,
        autoFallback,
        verbosity,
        logDiagnostics,
        setPreferMCP,
        setAutoFallback,
        setVerbosity,
        setLogDiagnostics,
    } = useCapabilities();

    return (
        <div className="bg-neutral-50 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Global Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prefer MCP */}
                <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200">
                    <div>
                        <span className="text-sm font-medium text-neutral-700">Prefer MCP Tools</span>
                        <p className="text-xs text-neutral-500">Use MCP when available</p>
                    </div>
                    <button
                        onClick={() => setPreferMCP(!preferMCP)}
                        className={`
                            relative w-10 h-5 rounded-full transition-colors
                            ${preferMCP ? 'bg-blue-500' : 'bg-neutral-300'}
                        `}
                    >
                        <span className={`
                            absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                            ${preferMCP ? 'left-5' : 'left-0.5'}
                        `} />
                    </button>
                </label>

                {/* Auto Fallback */}
                <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200">
                    <div>
                        <span className="text-sm font-medium text-neutral-700">Auto Fallback</span>
                        <p className="text-xs text-neutral-500">Try other handlers on failure</p>
                    </div>
                    <button
                        onClick={() => setAutoFallback(!autoFallback)}
                        className={`
                            relative w-10 h-5 rounded-full transition-colors
                            ${autoFallback ? 'bg-blue-500' : 'bg-neutral-300'}
                        `}
                    >
                        <span className={`
                            absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                            ${autoFallback ? 'left-5' : 'left-0.5'}
                        `} />
                    </button>
                </label>

                {/* Verbosity */}
                <div className="p-3 bg-white rounded-lg border border-neutral-200">
                    <span className="text-sm font-medium text-neutral-700">Log Verbosity</span>
                    <select
                        value={verbosity}
                        onChange={(e) => setVerbosity(e.target.value as typeof verbosity)}
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="none">None</option>
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="verbose">Verbose</option>
                    </select>
                </div>

                {/* Log Diagnostics */}
                <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200">
                    <div>
                        <span className="text-sm font-medium text-neutral-700">Log Diagnostics</span>
                        <p className="text-xs text-neutral-500">Console debug output</p>
                    </div>
                    <button
                        onClick={() => setLogDiagnostics(!logDiagnostics)}
                        className={`
                            relative w-10 h-5 rounded-full transition-colors
                            ${logDiagnostics ? 'bg-blue-500' : 'bg-neutral-300'}
                        `}
                    >
                        <span className={`
                            absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                            ${logDiagnostics ? 'left-5' : 'left-0.5'}
                        `} />
                    </button>
                </label>
            </div>
        </div>
    );
}

// ============================================================================
// Main Section
// ============================================================================

export function CapabilitiesSection() {
    const { getAllCapabilities, getEnabledCapabilities } = useCapabilities();

    const allCapabilities = getAllCapabilities();
    const enabledCount = getEnabledCapabilities().length;

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-blue-800">
                        Capabilities determine how AI tasks are routed to different providers.
                        Each capability can have a default handler and fallback chain.
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span>
                    <span className="font-semibold text-neutral-800">{enabledCount}</span>
                    {' '}of{' '}
                    <span className="font-semibold text-neutral-800">{allCapabilities.length}</span>
                    {' '}capabilities enabled
                </span>
            </div>

            {/* Capability Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allCapabilities.map(cap => (
                    <CapabilityCard
                        key={cap.id}
                        id={cap.id}
                        name={cap.name}
                        description={cap.description}
                        isCustom={cap.isCustom}
                    />
                ))}
            </div>

            {/* Global Settings */}
            <GlobalSettings />
        </div>
    );
}

export default CapabilitiesSection;
