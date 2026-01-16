'use client';

import { useState, useEffect } from 'react';
import { Settings, Lock, Zap, Brain, Server, Link2, DollarSign, Database, Users } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { syncToServer as syncToServerFn, restoreFromServer as restoreFromServerFn } from '@/lib/backup/settingsBackup';

// Section components - 7-tab structure
import { AIProvidersSection } from './sections/AIProvidersSection';
import CapabilitiesPanel from './CapabilitiesPanel';
import { MCPSection } from './sections/MCPSection';
import { IntegrationsSection } from './sections/IntegrationsSection';
import { MonetizationSection } from './sections/MonetizationSection';
import { DataSection } from './sections/DataSection';
import { AuthorManager } from '@/features/authors';

// ============ EXPORTED UTILITY FUNCTIONS ============
// These are kept for backwards compatibility with other components

/**
 * Safe localStorage getter that works with SSR
 */
function getStorageItem(key: string): string {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(key) || '';
    }
    return '';
}

export interface UserSettings {
    geminiKey: string;

    adsensePublisherId: string;
    adsenseLeaderboardSlot: string;
    adsenseArticleSlot: string;
    adsenseMultiplexSlot: string;
}

export function getUserSettings(): UserSettings {
    return {
        geminiKey: getStorageItem('GEMINI_API_KEY'),

        adsensePublisherId: getStorageItem('ADSENSE_PUBLISHER_ID'),
        adsenseLeaderboardSlot: getStorageItem('ADSENSE_LEADERBOARD_SLOT'),
        adsenseArticleSlot: getStorageItem('ADSENSE_ARTICLE_SLOT'),
        adsenseMultiplexSlot: getStorageItem('ADSENSE_MULTIPLEX_SLOT'),
    };
}

/**
 * Get all AI provider keys from localStorage
 */
export function getAIProviderKeys(): { gemini: string[]; deepseek: string[]; openrouter: string[]; vercel: string[]; perplexity: string[] } {
    const result = {
        gemini: [] as string[],
        deepseek: [] as string[],
        openrouter: [] as string[],
        vercel: [] as string[],
        perplexity: [] as string[],
    };

    if (typeof window === 'undefined') return result;

    const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'] as const;

    for (const provider of providers) {
        const stored = localStorage.getItem(`ifrit_${provider}_keys`);
        if (stored) {
            try {
                const keys = JSON.parse(stored);
                result[provider] = keys.map((k: { key: string }) => k.key);
            } catch {
                result[provider] = [];
            }
        }

        // Also check legacy single key format
        const legacyKey = localStorage.getItem(`ifrit_${provider}_key`);
        if (legacyKey && !result[provider].includes(legacyKey)) {
            result[provider].push(legacyKey);
        }

        // For Gemini, also check the original GEMINI_API_KEY
        if (provider === 'gemini') {
            const originalKey = localStorage.getItem('GEMINI_API_KEY');
            if (originalKey && !result.gemini.includes(originalKey)) {
                result.gemini.push(originalKey);
            }
        }
    }

    return result;
}

/**
 * Get list of enabled AI providers
 */
export function getEnabledProviders(): string[] {
    if (typeof window === 'undefined') return ['gemini']; // Default for SSR

    const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
    const enabled: string[] = [];

    for (const provider of providers) {
        const stored = localStorage.getItem(`ifrit_${provider}_enabled`);
        // Default: Only Gemini is enabled
        const isEnabled = stored !== null ? stored === 'true' : provider === 'gemini';
        if (isEnabled) {
            enabled.push(provider);
        }
    }

    return enabled;
}

/**
 * Get AI provider keys filtered by enabled status
 */
export function getEnabledProviderKeys(): { gemini: string[]; deepseek: string[]; openrouter: string[]; vercel: string[]; perplexity: string[] } {
    const allKeys = getAIProviderKeys();
    const enabledProviders = getEnabledProviders();

    return {
        gemini: enabledProviders.includes('gemini') ? allKeys.gemini : [],
        deepseek: enabledProviders.includes('deepseek') ? allKeys.deepseek : [],
        openrouter: enabledProviders.includes('openrouter') ? allKeys.openrouter : [],
        vercel: enabledProviders.includes('vercel') ? allKeys.vercel : [],
        perplexity: enabledProviders.includes('perplexity') ? allKeys.perplexity : [],
    };
}

/**
 * V4: Get selected model for a provider (used by content generation)
 */
export function getSelectedModel(provider: string = 'gemini'): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem(`ifrit_${provider}_model`) || undefined;
}

// ============ SETTINGS COMPONENT ============

type SettingsSection = 'ai-providers' | 'capabilities' | 'mcp' | 'integrations' | 'monetization' | 'data' | 'authors';

interface SettingsModalProps {
    inline?: boolean;
}

const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'ai-providers', label: 'AI Providers', icon: <Zap className="w-4 h-4" /> },
    { id: 'capabilities', label: 'Capabilities', icon: <Brain className="w-4 h-4" /> },
    { id: 'mcp', label: 'MCP & Tools', icon: <Server className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> },
    { id: 'monetization', label: 'Monetization', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'authors', label: 'Authors', icon: <Users className="w-4 h-4" /> },
    { id: 'data', label: 'Data & System', icon: <Database className="w-4 h-4" /> },
];

export default function SettingsModal({ inline = false }: SettingsModalProps) {
    const [isOpen, setIsOpen] = useState(inline);
    const [activeSection, setActiveSection] = useState<SettingsSection>('ai-providers');

    const store = useSettingsStore();
    const { initialize, integrations, adsenseConfig } = store;

    // Initialize store and restore from server on mount
    useEffect(() => {
        initialize();
        // Try server restore if store is empty
        if (!integrations.githubToken && !adsenseConfig.publisherId) {
            restoreFromServerFn();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async () => {
        await syncToServerFn();
        if (!inline) {
            setIsOpen(false);
        }
        alert('Settings saved!');
    };

    // Render section content based on new 6-tab structure
    const renderSectionContent = () => {
        switch (activeSection) {
            case 'ai-providers':
                return <AIProvidersSection />;
            case 'capabilities':
                return <CapabilitiesPanel />;
            case 'mcp':
                return <MCPSection />;
            case 'integrations':
                return <IntegrationsSection />;
            case 'monetization':
                return <MonetizationSection />;
            case 'authors':
                return <AuthorManager />;
            case 'data':
                return <DataSection />;
            default:
                return null;
        }
    };

    // Render inline version (no floating button or modal wrapper)
    if (inline) {
        return (
            <div className="space-y-4">
                {/* Section tabs */}
                <div className="flex gap-1 border-b">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeSection === section.id
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            {section.icon}
                            <span className="text-sm font-medium">{section.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="py-4">
                    {renderSectionContent()}
                </div>

                {/* Save Button - hidden on data section when in templates subsection */}
                {activeSection !== 'data' && (
                    <div className="flex justify-end pt-4 border-t">
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Save Settings
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Modal version with floating button
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-3 bg-white rounded-full shadow-lg border border-neutral-200 hover:bg-neutral-50 transition-colors z-50"
                aria-label="Settings"
            >
                <Settings className="w-6 h-6 text-neutral-600" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm overflow-y-auto py-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl m-4 max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center gap-2 p-6 pb-0 text-blue-600">
                            <Lock className="w-5 h-5" />
                            <h2 className="text-xl font-bold">Settings</h2>
                        </div>

                        {/* Section tabs */}
                        <div className="flex gap-1 p-4 border-b">
                            {sections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-neutral-600 hover:bg-neutral-100'
                                        }`}
                                >
                                    {section.icon}
                                    {section.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {renderSectionContent()}
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-4 border-t">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-neutral-500 hover:text-neutral-700"
                                >
                                    {activeSection === 'data' ? 'Close' : 'Cancel'}
                                </button>
                                {activeSection !== 'data' && (
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        Save Settings
                                    </button>
                                )}
                            </div>
                            <p className="mt-4 text-xs text-neutral-400 text-center">
                                All settings are stored locally in your browser + backed up to server.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
