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
    CloudUpload,
    Shield
} from 'lucide-react';

interface ProviderInfo {
    id: string;
    name: string;
    description: string;
    signupUrl: string;
    pricing: string;
    features: string[];
    models: string[];
}

interface StoredKey {
    key: string;
    label?: string;
    validated?: boolean;
    validatedAt?: number;
}

type ProviderKeys = Record<string, StoredKey[]>;

export function AIKeyManager() {
    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [keys, setKeys] = useState<ProviderKeys>({});
    const [enabled, setEnabled] = useState<Record<string, boolean>>({});
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
    // V4: Model selection state
    const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
    const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});

    // Functions defined before useEffect to avoid access-before-declaration

    const loadProviders = async () => {
        try {
            const res = await fetch('/api/ai-providers');
            const data = await res.json();
            if (data.success) {
                setProviders(data.providers);
            }
        } catch (error) {
            console.error('Failed to load providers:', error);
        }
        setLoading(false);
    };

    const loadKeys = () => {
        const storedKeys: ProviderKeys = {};
        const providerIds = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];

        // Legacy key mappings - the OLD format before ifrit_* prefix
        const legacyKeyMappings: Record<string, string> = {
            gemini: 'GEMINI_API_KEY',
            deepseek: 'DEEPSEEK_API_KEY',
            openrouter: 'OPENROUTER_API_KEY',
            vercel: 'VERCEL_AI_KEY',
            perplexity: 'PERPLEXITY_API_KEY'
        };

        for (const id of providerIds) {
            storedKeys[id] = [];

            // 1. Check new format: ifrit_{provider}_keys (JSON array)
            const stored = localStorage.getItem(`ifrit_${id}_keys`);
            if (stored) {
                try {
                    storedKeys[id] = JSON.parse(stored);
                } catch {
                    storedKeys[id] = [];
                }
            }

            // 2. Check intermediate format: ifrit_{provider}_key (single string)
            const legacyIfritKey = localStorage.getItem(`ifrit_${id}_key`);
            if (legacyIfritKey && !storedKeys[id].some(k => k.key === legacyIfritKey)) {
                storedKeys[id].push({ key: legacyIfritKey, label: 'Migrated' });
            }

            // 3. Check OLD format: GEMINI_API_KEY, DEEPSEEK_API_KEY, etc.
            const oldFormatKey = legacyKeyMappings[id];
            if (oldFormatKey) {
                const oldKey = localStorage.getItem(oldFormatKey);
                if (oldKey && !storedKeys[id].some(k => k.key === oldKey)) {
                    storedKeys[id].push({ key: oldKey, label: 'Legacy (Original)' });
                    // Auto-migrate: save to new format so it persists
                    localStorage.setItem(`ifrit_${id}_keys`, JSON.stringify(storedKeys[id]));
                    console.log(`[AIKeyManager] Migrated ${oldFormatKey} to ifrit_${id}_keys`);
                }
            }
        }

        setKeys(storedKeys);
    };

    const loadEnabled = () => {
        const providerIds = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
        const enabledState: Record<string, boolean> = {};

        for (const id of providerIds) {
            const stored = localStorage.getItem(`ifrit_${id}_enabled`);
            // Default: Only Gemini is enabled
            enabledState[id] = stored !== null ? stored === 'true' : id === 'gemini';
        }

        setEnabled(enabledState);
    };

    // V4: Load saved model selections
    const loadSelectedModels = () => {
        const providerIds = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
        const savedModels: Record<string, string> = {};
        const savedAvailable: Record<string, string[]> = {};

        for (const id of providerIds) {
            const model = localStorage.getItem(`ifrit_${id}_model`);
            if (model) savedModels[id] = model;

            const available = localStorage.getItem(`ifrit_${id}_available_models`);
            if (available) {
                try {
                    savedAvailable[id] = JSON.parse(available);
                } catch {
                    savedAvailable[id] = [];
                }
            }
        }

        setSelectedModels(savedModels);
        setAvailableModels(savedAvailable);
    };

    // V4: Save model selection
    const selectModel = (providerId: string, modelId: string) => {
        localStorage.setItem(`ifrit_${providerId}_model`, modelId);
        setSelectedModels(prev => ({ ...prev, [providerId]: modelId }));
        setTimeout(() => backupToServer(), 100);
    };

    const toggleEnabled = (providerId: string) => {
        const newValue = !enabled[providerId];
        localStorage.setItem(`ifrit_${providerId}_enabled`, String(newValue));
        setEnabled(prev => ({ ...prev, [providerId]: newValue }));
        // Auto-backup after change
        setTimeout(() => backupToServer(), 100);
    };

    // Load providers and keys on mount (useEffect after function definitions)
    useEffect(() => {
        loadProviders();
        loadKeys();
        loadEnabled();
        loadSelectedModels(); // V4: Load saved model selections
        // Try to restore from server if localStorage is empty
        restoreFromServerIfNeeded();
    }, []);

    // Auto-backup all settings to server
    const backupToServer = async () => {
        try {
            const settings = {
                aiProviders: {} as Record<string, { keys: StoredKey[]; enabled: boolean }>,
                integrations: {
                    githubToken: localStorage.getItem('ifrit_github_token'),
                    githubUser: localStorage.getItem('ifrit_github_user'),
                    vercelToken: localStorage.getItem('ifrit_vercel_token'),
                    vercelUser: localStorage.getItem('ifrit_vercel_user'),
                },
                blog: {
                    url: localStorage.getItem('USER_BLOG_URL'),
                },
                adsense: {
                    publisherId: localStorage.getItem('ADSENSE_PUBLISHER_ID'),
                    leaderboardSlot: localStorage.getItem('ADSENSE_LEADERBOARD_SLOT'),
                    articleSlot: localStorage.getItem('ADSENSE_ARTICLE_SLOT'),
                    multiplexSlot: localStorage.getItem('ADSENSE_MULTIPLEX_SLOT'),
                }
            };

            const providerIds = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
            for (const id of providerIds) {
                const stored = localStorage.getItem(`ifrit_${id}_keys`);
                const enabledStr = localStorage.getItem(`ifrit_${id}_enabled`);
                settings.aiProviders[id] = {
                    keys: stored ? JSON.parse(stored) : [],
                    enabled: enabledStr === 'true'
                };
            }

            await fetch('/api/settings/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });
            console.log('[AIKeyManager] Settings backed up to server');
        } catch (error) {
            console.warn('[AIKeyManager] Failed to backup to server:', error);
        }
    };

    // Restore from server if localStorage is empty
    const restoreFromServerIfNeeded = async () => {
        const hasAnyKeys = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'].some(
            id => localStorage.getItem(`ifrit_${id}_keys`)
        );

        if (hasAnyKeys) return; // localStorage has data, don't overwrite

        try {
            const res = await fetch('/api/settings/backup');
            const data = await res.json();

            if (data.success && data.hasBackup && data.backup?.settings) {
                const { settings } = data.backup;

                // Restore AI provider keys
                if (settings.aiProviders) {
                    for (const [id, provider] of Object.entries(settings.aiProviders)) {
                        const p = provider as { keys: StoredKey[]; enabled: boolean };
                        if (p.keys?.length > 0) {
                            localStorage.setItem(`ifrit_${id}_keys`, JSON.stringify(p.keys));
                        }
                        localStorage.setItem(`ifrit_${id}_enabled`, String(p.enabled));
                    }
                }

                // Restore integrations
                if (settings.integrations) {
                    const { githubToken, githubUser, vercelToken, vercelUser } = settings.integrations;
                    if (githubToken) localStorage.setItem('ifrit_github_token', githubToken);
                    if (githubUser) localStorage.setItem('ifrit_github_user', githubUser);
                    if (vercelToken) localStorage.setItem('ifrit_vercel_token', vercelToken);
                    if (vercelUser) localStorage.setItem('ifrit_vercel_user', vercelUser);
                }

                console.log('[AIKeyManager] Restored settings from server backup');
                loadKeys();
                loadEnabled();
            }
        } catch (error) {
            console.warn('[AIKeyManager] Failed to restore from server:', error);
        }
    };

    // Export all settings to JSON file
    const exportSettings = () => {
        const settings = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            aiProviders: {} as Record<string, { keys: StoredKey[]; enabled: boolean }>,
            integrations: {
                githubToken: localStorage.getItem('ifrit_github_token'),
                githubUser: localStorage.getItem('ifrit_github_user'),
                vercelToken: localStorage.getItem('ifrit_vercel_token'),
                vercelUser: localStorage.getItem('ifrit_vercel_user'),
            }
        };

        const providerIds = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
        for (const id of providerIds) {
            const stored = localStorage.getItem(`ifrit_${id}_keys`);
            const enabledStr = localStorage.getItem(`ifrit_${id}_enabled`);
            settings.aiProviders[id] = {
                keys: stored ? JSON.parse(stored) : [],
                enabled: enabledStr === 'true'
            };
        }

        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ifrit-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import settings from JSON file
    const fileInputRef = useRef<HTMLInputElement>(null);

    const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target?.result as string);

                if (!settings.aiProviders) {
                    alert('Invalid settings file');
                    return;
                }

                // Import AI provider keys
                for (const [id, provider] of Object.entries(settings.aiProviders)) {
                    const p = provider as { keys: StoredKey[]; enabled: boolean };
                    if (p.keys?.length > 0) {
                        localStorage.setItem(`ifrit_${id}_keys`, JSON.stringify(p.keys));
                    }
                    localStorage.setItem(`ifrit_${id}_enabled`, String(p.enabled));
                }

                // Import integrations
                if (settings.integrations) {
                    const { githubToken, githubUser, vercelToken, vercelUser } = settings.integrations;
                    if (githubToken) localStorage.setItem('ifrit_github_token', githubToken);
                    if (githubUser) localStorage.setItem('ifrit_github_user', githubUser);
                    if (vercelToken) localStorage.setItem('ifrit_vercel_token', vercelToken);
                    if (vercelUser) localStorage.setItem('ifrit_vercel_user', vercelUser);
                }

                // Reload state
                loadKeys();
                loadEnabled();

                // Backup to server
                backupToServer();

                alert('Settings imported successfully! Refresh to see all changes.');
            } catch (error) {
                alert('Failed to parse settings file');
            }
        };
        reader.readAsText(file);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const saveKeys = (providerId: string, newKeys: StoredKey[]) => {
        localStorage.setItem(`ifrit_${providerId}_keys`, JSON.stringify(newKeys));
        setKeys(prev => ({ ...prev, [providerId]: newKeys }));
        // Auto-backup after saving
        setTimeout(() => backupToServer(), 100);
    };

    const addKey = (providerId: string) => {
        const newKey = newKeyInputs[providerId]?.trim();
        if (!newKey) return;

        const currentKeys = keys[providerId] || [];
        if (currentKeys.some(k => k.key === newKey)) {
            alert('This key already exists');
            return;
        }

        const label = `Key ${currentKeys.length + 1}`;
        saveKeys(providerId, [...currentKeys, { key: newKey, label }]);
        setNewKeyInputs(prev => ({ ...prev, [providerId]: '' }));
    };

    const removeKey = (providerId: string, keyToRemove: string) => {
        const currentKeys = keys[providerId] || [];
        saveKeys(providerId, currentKeys.filter(k => k.key !== keyToRemove));
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
                // Update key as validated
                const currentKeys = keys[providerId] || [];
                const updatedKeys = currentKeys.map(k =>
                    k.key === key
                        ? { ...k, validated: true, validatedAt: Date.now() }
                        : k
                );
                saveKeys(providerId, updatedKeys);

                // V4: Save available models
                if (data.models?.length > 0) {
                    localStorage.setItem(`ifrit_${providerId}_available_models`, JSON.stringify(data.models));
                    setAvailableModels(prev => ({ ...prev, [providerId]: data.models }));

                    // Auto-select first model if none selected
                    if (!selectedModels[providerId]) {
                        selectModel(providerId, data.models[0]);
                    }
                }

                // Build models message
                const modelsText = data.models?.length > 0
                    ? `Available: ${data.models.slice(0, 5).join(', ')}${data.models.length > 5 ? ` +${data.models.length - 5} more` : ''}`
                    : 'Models available';

                setTestResult({
                    providerId,
                    key,
                    success: true,
                    message: `✅ Key valid! (${data.responseTime}ms)\n${modelsText}`
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
                        onClick={exportSettings}
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
                        onChange={importSettings}
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
                const providerKeys = keys[provider.id] || [];
                const isExpanded = expandedProvider === provider.id;
                const validatedCount = providerKeys.filter(k => k.validated).length;

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
                                    <div className="font-medium">{provider.name}</div>
                                    <div className="text-xs text-gray-500">{provider.pricing}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {providerKeys.length > 0 && (
                                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                        {providerKeys.length} key{providerKeys.length !== 1 ? 's' : ''}
                                        {validatedCount > 0 && (
                                            <span className="text-green-600 ml-1">
                                                ({validatedCount} ✓)
                                            </span>
                                        )}
                                    </span>
                                )}
                                {/* Enable/Disable Toggle */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleEnabled(provider.id);
                                    }}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${enabled[provider.id]
                                        ? 'bg-green-500'
                                        : 'bg-gray-300'
                                        }`}
                                    title={enabled[provider.id] ? 'Enabled - click to disable' : 'Disabled - click to enable'}
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
                                            value={selectedModels[provider.id] || ''}
                                            onChange={(e) => selectModel(provider.id, e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {availableModels[provider.id].map(model => (
                                                <option key={model} value={model}>
                                                    {model}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Selected model will be used for article generation
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
                                                    onClick={() => removeKey(provider.id, storedKey.key)}
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
                                        onClick={() => addKey(provider.id)}
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
                        )}
                    </div>
                );
            })}

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Quick Stats</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>
                        <span className="text-gray-500">Total Keys:</span>{' '}
                        {Object.values(keys).flat().length}
                    </div>
                    <div>
                        <span className="text-gray-500">Validated:</span>{' '}
                        {Object.values(keys).flat().filter(k => k.validated).length}
                    </div>
                    <div>
                        <span className="text-gray-500">Providers:</span>{' '}
                        {Object.entries(keys).filter(([_providerId, ks]) => ks.length > 0).length}/5
                    </div>
                </div>
            </div>
        </div>
    );
}
