'use client';

/**
 * AI Providers Section
 * FSD: components/settings/sections/AIProvidersSection.tsx
 * 
 * Focused UI for AI provider configuration:
 * - Provider cards with key management
 * - Model selection
 * - Task model assignments
 * 
 * Uses settingsStore for state (consolidated)
 */

import { useState, useCallback } from 'react';
import {
    Key, Eye, EyeOff, Plus, Trash2, Check, AlertCircle,
    Zap, Brain, Code, Sparkles, Globe, BarChart3
} from 'lucide-react';
import {
    useSettingsStore,
    PROVIDER_CONFIGS,
    type ProviderId,
    type StoredKey
} from '@/stores/settingsStore';
import { AIUsagePanel } from '../AIUsagePanel';
import { UsageStatsPanel } from '../UsageStatsPanel';

type AISubsection = 'providers' | 'usage';

// ============================================================================
// Provider Icons
// ============================================================================

const ProviderIcons: Record<ProviderId, React.ReactNode> = {
    gemini: <Sparkles className="w-5 h-5 text-blue-500" />,
    deepseek: <Brain className="w-5 h-5 text-purple-500" />,
    openrouter: <Globe className="w-5 h-5 text-green-500" />,
    vercel: <Zap className="w-5 h-5 text-black" />,
    perplexity: <Code className="w-5 h-5 text-orange-500" />,
};

// ============================================================================
// Key Input Component
// ============================================================================

interface KeyInputProps {
    storedKey: StoredKey;
    provider: ProviderId;
    onRemove: () => void;
    onUpdate: (updates: Partial<StoredKey>) => void;
}

function KeyInput({ storedKey, provider, onRemove, onUpdate }: KeyInputProps) {
    const [visible, setVisible] = useState(false);
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState(storedKey.label || '');

    const masked = storedKey.key.slice(0, 6) + '•'.repeat(Math.min(20, storedKey.key.length - 10)) + storedKey.key.slice(-4);

    return (
        <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <Key className="w-4 h-4 text-neutral-400 flex-shrink-0" />

            <div className="flex-1 min-w-0">
                {editing ? (
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={() => {
                            onUpdate({ label });
                            setEditing(false);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        placeholder="Key label (e.g., Production)"
                        className="w-full text-sm bg-white border border-neutral-300 rounded px-2 py-1"
                        autoFocus
                    />
                ) : (
                    <div
                        className="text-sm cursor-pointer hover:text-blue-600"
                        onClick={() => setEditing(true)}
                    >
                        <span className="font-medium">
                            {storedKey.label || 'Unnamed Key'}
                        </span>
                        <span className="text-neutral-400 ml-2">
                            {visible ? storedKey.key : masked}
                        </span>
                    </div>
                )}

                {storedKey.validated && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                        <Check className="w-3 h-3" />
                        Validated
                    </div>
                )}
            </div>

            <button
                onClick={() => setVisible(!visible)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded"
                title={visible ? 'Hide key' : 'Show key'}
            >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
                onClick={onRemove}
                className="p-1.5 text-red-400 hover:text-red-600 rounded"
                title="Remove key"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

// ============================================================================
// Provider Card Component
// ============================================================================

interface ProviderCardProps {
    providerId: ProviderId;
}

function ProviderCard({ providerId }: ProviderCardProps) {
    const config = PROVIDER_CONFIGS[providerId];
    const {
        providerKeys,
        enabledProviders,
        selectedModels,
        addProviderKey,
        removeProviderKey,
        updateProviderKey,
        toggleProvider,
        setSelectedModel,
    } = useSettingsStore();

    const [newKey, setNewKey] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    const keys = providerKeys[providerId] || [];
    const isEnabled = enabledProviders.includes(providerId);
    const currentModel = selectedModels[providerId] || config.defaultModel;
    const hasValidKeys = keys.length > 0 && keys.some(k => k.key && k.key.length > 10);

    const handleAddKey = useCallback(() => {
        if (!newKey.trim()) return;

        addProviderKey(providerId, {
            key: newKey.trim(),
            label: `Key ${keys.length + 1}`,
        });

        setNewKey('');
        setShowAdd(false);
    }, [newKey, providerId, keys.length, addProviderKey]);

    return (
        <div className={`
            border rounded-xl p-4 transition-all
            ${isEnabled ? 'border-blue-200 bg-white' : 'border-neutral-200 bg-neutral-50'}
        `}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {ProviderIcons[providerId]}
                    <div>
                        <h3 className="font-semibold text-neutral-800">{config.name}</h3>
                        {config.docsUrl && (
                            <a
                                href={config.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline"
                            >
                                Documentation →
                            </a>
                        )}
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-neutral-500">
                        {isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                        onClick={() => toggleProvider(providerId)}
                        className={`
                            relative w-11 h-6 rounded-full transition-colors
                            ${isEnabled ? 'bg-blue-500' : 'bg-neutral-300'}
                        `}
                    >
                        <span className={`
                            absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                            ${isEnabled ? 'left-5' : 'left-0.5'}
                        `} />
                    </button>
                </label>
            </div>

            {/* Keys */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-600">API Keys</span>
                    {!hasValidKeys && keys.length === 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="w-3 h-3" />
                            No keys configured
                        </span>
                    )}
                </div>

                {keys.map((key, index) => (
                    <KeyInput
                        key={key.key.slice(0, 10) + index}
                        storedKey={key}
                        provider={providerId}
                        onRemove={() => removeProviderKey(providerId, key.key)}
                        onUpdate={(updates) => updateProviderKey(providerId, key.key, updates)}
                    />
                ))}

                {showAdd ? (
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                            placeholder={`Enter ${config.keyPrefix || ''}...`}
                            className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <button
                            onClick={handleAddKey}
                            className="px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => { setShowAdd(false); setNewKey(''); }}
                            className="px-3 py-2 text-neutral-600 text-sm font-medium rounded-lg hover:bg-neutral-100"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 w-full p-2 text-sm text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-neutral-300"
                    >
                        <Plus className="w-4 h-4" />
                        Add API Key
                    </button>
                )}
            </div>

            {/* Model Selection */}
            <div>
                <label className="block text-sm font-medium text-neutral-600 mb-2">
                    Default Model
                </label>
                <select
                    value={currentModel}
                    onChange={(e) => setSelectedModel(providerId, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {config.models.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

// ============================================================================
// Main Section
// ============================================================================

export function AIProvidersSection() {
    const [activeSubsection, setActiveSubsection] = useState<AISubsection>('providers');
    const providers = Object.keys(PROVIDER_CONFIGS) as ProviderId[];
    const { enabledProviders, providerKeys } = useSettingsStore();

    const hasValidKeysForProvider = (p: ProviderId) => {
        const keys = providerKeys[p] || [];
        return keys.length > 0 && keys.some(k => k.key && k.key.length > 10);
    };
    const configuredCount = providers.filter(p => hasValidKeysForProvider(p)).length;
    const enabledCount = enabledProviders.length;

    return (
        <div className="space-y-4">
            {/* Subsection tabs */}
            <div className="flex gap-1 border-b border-neutral-200 pb-2">
                <button
                    onClick={() => setActiveSubsection('providers')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubsection === 'providers'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Providers
                </button>
                <button
                    onClick={() => setActiveSubsection('usage')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubsection === 'usage'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Usage & Costs
                </button>
            </div>

            {/* Provider Grid */}
            {activeSubsection === 'providers' && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                        <span>
                            <span className="font-semibold text-neutral-800">{configuredCount}</span>
                            {' '}providers configured
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span>
                            <span className="font-semibold text-neutral-800">{enabledCount}</span>
                            {' '}enabled
                        </span>
                    </div>

                    {/* Provider Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {providers.map(providerId => (
                            <ProviderCard key={providerId} providerId={providerId} />
                        ))}
                    </div>
                </div>
            )}

            {/* Usage & Costs */}
            {activeSubsection === 'usage' && (
                <div className="space-y-6">
                    <p className="text-sm text-neutral-500">
                        Track AI usage, token consumption, and estimated costs across all providers.
                    </p>
                    <AIUsagePanel />
                    <div className="border-t border-neutral-200 pt-6">
                        <UsageStatsPanel />
                    </div>
                </div>
            )}
        </div>
    );
}

export default AIProvidersSection;
