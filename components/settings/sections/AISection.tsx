'use client';

import { useState } from 'react';
import { Zap, BarChart3 } from 'lucide-react';
import { AIKeyManager } from '../AIKeyManager';
import { AIUsagePanel } from '../AIUsagePanel';
import { UsageStatsPanel } from '../UsageStatsPanel';

type AISubsection = 'providers' | 'usage';

const subsections: { id: AISubsection; label: string; icon: React.ReactNode }[] = [
    { id: 'providers', label: 'AI Configuration', icon: <Zap className="w-4 h-4" /> },
    { id: 'usage', label: 'Usage & Costs', icon: <BarChart3 className="w-4 h-4" /> },
];

/**
 * AI Section - Unified AI configuration panel
 * 
 * The AIKeyManager component already includes:
 * - Provider keys management
 * - Model selection per provider
 * - Task model assignment (TaskModelsPanel)
 * - Capabilities configuration (CapabilitiesPanel)
 * - MCP tools configuration (MCPToolsPanel)
 * 
 * This section just wraps it with a usage tracking subsection.
 */
export function AISection() {
    const [activeSubsection, setActiveSubsection] = useState<AISubsection>('providers');

    return (
        <div className="space-y-4">
            {/* Subsection tabs */}
            <div className="flex gap-1 border-b border-neutral-200 pb-2 overflow-x-auto">
                {subsections.map((sub) => (
                    <button
                        key={sub.id}
                        onClick={() => setActiveSubsection(sub.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeSubsection === sub.id
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                    >
                        {sub.icon}
                        {sub.label}
                    </button>
                ))}
            </div>

            {/* Subsection content */}
            <div className="min-h-[400px]">
                {activeSubsection === 'providers' && (
                    <div>
                        <p className="text-sm text-neutral-500 mb-4">
                            Manage AI providers, keys, models, capabilities, and MCP tools.
                        </p>
                        {/* AIKeyManager includes: keys, models, TaskModelsPanel, CapabilitiesPanel, MCPToolsPanel */}
                        <AIKeyManager />
                    </div>
                )}

                {activeSubsection === 'usage' && (
                    <div className="space-y-6">
                        <p className="text-sm text-neutral-500 mb-4">
                            Track AI usage, token consumption, and estimated costs across all providers.
                        </p>
                        <AIUsagePanel />
                        <div className="border-t border-neutral-200 pt-6">
                            <UsageStatsPanel />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AISection;
