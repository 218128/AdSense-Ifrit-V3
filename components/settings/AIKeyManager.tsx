'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Key,
    Plus,
    Trash2,
    Check,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    Zap,
    Download,
    Upload,
    Shield
} from 'lucide-react';
// Archived: UsageStatsPanel (usage tracking replaced by external dashboard links)
import { TaskModelsPanel } from './TaskModelsPanel';
import { MCPToolsPanel } from './MCPToolsPanel';
import CapabilitiesPanel from './CapabilitiesPanel';
import { useSettingsStore, type StoredKey, type ProviderId } from '@/stores/settingsStore';

interface ProviderInfo {
    id: string;
    name: string;
    description: string;
    signupUrl: string;
    pricing: string;
    features: string[];
    models: string[];
}

export function AIKeyManager() {
    // Use settings store for all key management
    const store = useSettingsStore();
    const {
        providerKeys,
        enabledProviders,
        selectedModels,
        addProviderKey,
        removeProviderKey,
        updateProviderKey,
        toggleProvider,
        setSelectedModel,
        getProviderKeys,
        exportSettings,
        importSettings,
        backupToServer,
        restoreFromServer,
        initialize
    } = store;

    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingKey, setTestingKey] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{
        providerId: string;
        key: string;
        success: boolean;
        message: string;
    } | null>(null);
    const [newKeyInputs, setNewKeyInputs] = useState<Record<string, string>>({});
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
    // V4: Available models from validation
    const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});

    const PROVIDER_IDS: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];

    // Convert store's enabledProviders array to a Record for easier UI access
    const enabled = PROVIDER_IDS.reduce((acc, id) => {
        acc[id] = enabledProviders.includes(id);
        return acc;
    }, {} as Record<string, boolean>);

    const loadProviders = async () => {
        try {
            const res = await fetch('/api/ai-providers');
            const data = await res.json();
            if (data.success && Array.isArray(data.providers)) {
                const safeProviders = data.providers.map((p: Partial<ProviderInfo>) => ({
                    id: p.id || 'unknown',
                    name: p.name || p.id || 'Unknown Provider',
                    description: p.description || '',
                    signupUrl: p.signupUrl || '#',
                    pricing: p.pricing || 'See provider website',
                    features: Array.isArray(p.features) ? p.features : [],
                    models: Array.isArray(p.models) ? p.models : []
                }));
                setProviders(safeProviders);
            }
        } catch (error) {
            console.error('Failed to load providers:', error);
        }
        setLoading(false);
    };

    // Load available models from localStorage (set during validation)
    const loadAvailableModels = () => {
        const savedAvailable: Record<string, string[]> = {};
        for (const id of PROVIDER_IDS) {
            const available = localStorage.getItem(`ifrit_${id}_available_models`);
            if (available) {
                try {
                    savedAvailable[id] = JSON.parse(available);
                } catch {
                    savedAvailable[id] = [];
                }
            }
        }
        setAvailableModels(savedAvailable);
    };

    // V4: Save model selection AND auto-enable provider
    const selectModel = (providerId: ProviderId, modelId: string) => {
        setSelectedModel(providerId, modelId);
        // Backup is handled automatically by the store's persist middleware
    };

    const handleToggleEnabled = (providerId: ProviderId) => {
        // V4 Hard Rule: Cannot enable provider without a model selected
        if (!enabled[providerId] && !selectedModels[providerId]) {
            alert(`⚠️ Cannot enable ${providerId.toUpperCase()}!\n\nModel not selected. Please select a model first.`);
            return;
        }
        toggleProvider(providerId);
    };

    // Load providers and restore on mount
    useEffect(() => {
        initialize();
        loadProviders();
        loadAvailableModels();
        // Try to restore from server if store is empty
        const hasAnyKeys = PROVIDER_IDS.some(id => getProviderKeys(id).length > 0);
        if (!hasAnyKeys) {
            restoreFromServer();
        }
    }, []);

    // File input ref for import
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle export - downloads a JSON file
    const handleExportSettings = () => {
        const exportData = exportSettings();
        if (Object.keys(exportData.settings).length === 0) {
            alert('No settings to export.');
            return;
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ifrit-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Handle import - reads a JSON file
    const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                const result = importSettings(data);
                if (result.success) {
                    await backupToServer();
                    alert(`Imported ${result.restored} settings! Refresh to see all changes.`);
                } else {
                    alert('Invalid settings file');
                }
            } catch {
                alert('Failed to parse settings file');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addKey = (providerId: ProviderId) => {
        const newKey = newKeyInputs[providerId]?.trim();
        if (!newKey) return;

        const currentKeys = getProviderKeys(providerId);
        if (currentKeys.some(k => k.key === newKey)) {
            alert('This key already exists');
            return;
        }

        const label = `Key ${currentKeys.length + 1}`;
        addProviderKey(providerId, { key: newKey, label });
        setNewKeyInputs(prev => ({ ...prev, [providerId]: '' }));
    };

    const handleRemoveKey = (providerId: ProviderId, keyToRemove: string) => {
        removeProviderKey(providerId, keyToRemove);
    };

    const testKey = async (providerId: string, key: string) => {
        setTestingKey(`${providerId}:${key}`);
        setTestResult(null);

        try {
            const res = await fetch('/api/ai-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: providerId, key })
            });

            const data = await res.json();

            if (data.valid) {
                // Update key as validated using store
                const validationTime = Date.now();
                updateProviderKey(providerId as ProviderId, key, {
                    validated: true,
                    validatedAt: validationTime
                });

                // V4: Save available models (user MUST select one manually)
                if (data.models?.length > 0) {
                    localStorage.setItem(`ifrit_${providerId}_available_models`, JSON.stringify(data.models));
                    setAvailableModels(prev => ({ ...prev, [providerId]: data.models }));
                }

                // Build models message with warning if no model selected
                const noModelWarning = !selectedModels[providerId as ProviderId]
                    ? '\n⚠️ AI Provider is disabled, Model not selected!'
                    : '';
                const modelsText = data.models?.length > 0
                    ? `Available: ${data.models.slice(0, 5).join(', ')}${data.models.length > 5 ? ` +${data.models.length - 5} more` : ''}`
                    : 'Models available';

                setTestResult({
                    providerId,
                    key,
                    success: true,
                    message: `✅ Key valid! (${data.responseTime}ms)\n${modelsText}${noModelWarning}`
                });
            } else {
                setTestResult({
                    providerId,
                    key,
                    success: false,
                    message: `❌ ${data.error?.substring(0, 120) || 'Key validation failed'}`
                });
            }
        } catch (error) {
            setTestResult({
                providerId,
                key,
                success: false,
                message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }

        setTestingKey(null);

        // Keep result visible for 15 seconds (longer for reading models)
        setTimeout(() => setTestResult(null), 15000);
    };

    const maskKey = (key: string): string => {
        if (key.length <= 8) return '••••••••';
        return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
    };

    const getProviderColor = (providerId: string): string => {
        const colors: Record<string, string> = {
            gemini: '#4285f4',
            deepseek: '#00d4aa',
            openrouter: '#ff6b35',
            vercel: '#000000',
            perplexity: '#20b2aa'
        };
        return colors[providerId] || '#666666';
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading providers...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Export/Import */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">AI Provider Keys</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportSettings}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        title="Export all settings to JSON file"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        title="Import settings from JSON file"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Import
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportSettings}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Info message with server backup indicator */}
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>Keys auto-sync to server backup. Your settings survive browser data clearing.</span>
            </div>

            <p className="text-sm text-gray-500 mb-4">
                Add multiple API keys per provider for rotation. Export your settings regularly as additional backup.
            </p>

            {providers.map(provider => {
                const providerKeys = getProviderKeys(provider.id as ProviderId);
                const isExpanded = expandedProvider === provider.id;

                return (
                    <div
                        key={provider.id}
                        className="border rounded-lg overflow-hidden"
                        style={{ borderColor: getProviderColor(provider.id) + '40' }}
                    >
                        {/* Provider Header */}
                        <div
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    setExpandedProvider(isExpanded ? null : provider.id);
                                }
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getProviderColor(provider.id) }}
                                />
                                <div className="text-left">
                                    <div className="font-medium flex items-center gap-2">
                                        {provider.name}
                                        {/* Status badges */}
                                        {providerKeys.filter(k => k.validated).length > 0 && (
                                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                                Key ✓
                                            </span>
                                        )}
                                        {selectedModels[provider.id as ProviderId] && (
                                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                                Model ✓
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">{provider.pricing}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {providerKeys.length > 0 && (
                                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                        {providerKeys.length} key{providerKeys.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {/* Enable/Disable Toggle */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleEnabled(provider.id as ProviderId);
                                    }}
                                    disabled={!selectedModels[provider.id as ProviderId]}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${!selectedModels[provider.id as ProviderId]
                                        ? 'bg-gray-200 cursor-not-allowed opacity-50'
                                        : enabled[provider.id]
                                            ? 'bg-green-500'
                                            : 'bg-gray-300'
                                        }`}
                                    title={!selectedModels[provider.id as ProviderId]
                                        ? 'Test key and select model first'
                                        : enabled[provider.id]
                                            ? 'Enabled - click to disable'
                                            : 'Disabled - click to enable'}
                                >
                                    <span
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${enabled[provider.id] ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                                <span className="text-gray-400">
                                    {isExpanded ? '▼' : '▶'}
                                </span>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                            <div className="p-4 pt-0 space-y-3">
                                {/* Provider Info */}
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{provider.description}</span>
                                    <a
                                        href={provider.signupUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-blue-500 hover:underline"
                                    >
                                        Get Key <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                {/* Features */}
                                <div className="flex flex-wrap gap-1">
                                    {provider.features.map(feature => (
                                        <span
                                            key={feature}
                                            className="px-2 py-0.5 bg-gray-100 rounded-full text-xs"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                </div>

                                {/* V4: Model Selection */}
                                {availableModels[provider.id]?.length > 0 && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <label className="block text-xs font-medium text-blue-800 mb-1">
                                            Default Model for Generation
                                        </label>
                                        <select
                                            value={selectedModels[provider.id as ProviderId] || ''}
                                            onChange={(e) => selectModel(provider.id as ProviderId, e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="" disabled>⚠️ Select a model to enable provider...</option>
                                            {availableModels[provider.id].map(model => (
                                                <option key={model} value={model}>
                                                    {model}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-blue-600 mt-1">
                                            {selectedModels[provider.id as ProviderId]
                                                ? '✓ Model selected - provider can be enabled'
                                                : '⚠️ Select a model to enable this provider'}
                                        </p>
                                    </div>
                                )}

                                {/* Existing Keys */}
                                {providerKeys.length > 0 && (
                                    <div className="space-y-2">
                                        {providerKeys.map((storedKey, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                                            >
                                                <code className="flex-1 text-sm font-mono">
                                                    {maskKey(storedKey.key)}
                                                </code>
                                                {storedKey.validated && (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                )}
                                                <button
                                                    onClick={() => testKey(provider.id, storedKey.key)}
                                                    disabled={testingKey === `${provider.id}:${storedKey.key}`}
                                                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                                    title="Test key"
                                                >
                                                    {testingKey === `${provider.id}:${storedKey.key}`
                                                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                        : <Zap className="w-4 h-4" />
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveKey(provider.id as ProviderId, storedKey.key)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    title="Remove key"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Test Result Notification */}
                                {testResult && testResult.providerId === provider.id && (
                                    <div className={`p-3 rounded-lg text-sm whitespace-pre-line ${testResult.success
                                        ? 'bg-green-50 border border-green-200 text-green-800'
                                        : 'bg-red-50 border border-red-200 text-red-800'
                                        }`}>
                                        {testResult.message}
                                    </div>
                                )}

                                {/* Add New Key */}
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={newKeyInputs[provider.id] || ''}
                                        onChange={(e) => setNewKeyInputs(prev => ({
                                            ...prev,
                                            [provider.id]: e.target.value
                                        }))}
                                        placeholder={`Paste ${provider.name} API key...`}
                                        className="flex-1 px-3 py-2 border rounded text-sm"
                                    />
                                    <button
                                        onClick={() => addKey(provider.id as ProviderId)}
                                        disabled={!newKeyInputs[provider.id]?.trim()}
                                        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>

                                {/* Rate Limit Warning */}
                                {provider.id === 'gemini' && providerKeys.length === 1 && (
                                    <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                        <span className="text-yellow-800">
                                            Add more keys to avoid rate limits (15 RPM per key)
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                        }
                    </div>
                );
            })}

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Quick Stats</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>
                        <span className="text-gray-500">Total Keys:</span>{' '}
                        {PROVIDER_IDS.reduce((sum, id) => sum + getProviderKeys(id).length, 0)}
                    </div>
                    <div>
                        <span className="text-gray-500">Validated:</span>{' '}
                        {PROVIDER_IDS.reduce((sum, id) => sum + getProviderKeys(id).filter(k => k.validated).length, 0)}
                    </div>
                    <div>
                        <span className="text-gray-500">Providers:</span>{' '}
                        {PROVIDER_IDS.filter(id => getProviderKeys(id).length > 0).length}/5
                    </div>
                </div>
            </div>

            {/* Divider */}
            <hr className="my-6 border-gray-200" />

            {/* Task Model Assignments */}
            <TaskModelsPanel
                availableModels={availableModels}
                selectedModels={selectedModels}
            />

            {/* Divider */}
            <hr className="my-6 border-gray-200" />

            {/* AI Capabilities */}
            <CapabilitiesPanel />

            {/* Divider */}
            <hr className="my-6 border-gray-200" />

            {/* MCP Tools (Optional Enhancement) */}
            <MCPToolsPanel />

            {/* Divider */}
            <hr className="my-6 border-gray-200" />

            {/* Usage Statistics - External Dashboard Links */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <h4 className="font-semibold text-neutral-800 mb-3">📊 View Usage on Provider Dashboards</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border hover:bg-neutral-100 text-sm text-neutral-700">
                        <ExternalLink className="w-3 h-3" /> Gemini
                    </a>
                    <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border hover:bg-neutral-100 text-sm text-neutral-700">
                        <ExternalLink className="w-3 h-3" /> DeepSeek
                    </a>
                    <a href="https://openrouter.ai/usage" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border hover:bg-neutral-100 text-sm text-neutral-700">
                        <ExternalLink className="w-3 h-3" /> OpenRouter
                    </a>
                    <a href="https://www.perplexity.ai/settings" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border hover:bg-neutral-100 text-sm text-neutral-700">
                        <ExternalLink className="w-3 h-3" /> Perplexity
                    </a>
                    <a href="https://vercel.com/account/usage" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border hover:bg-neutral-100 text-sm text-neutral-700">
                        <ExternalLink className="w-3 h-3" /> Vercel
                    </a>
                </div>
            </div>
        </div >
    );
}
