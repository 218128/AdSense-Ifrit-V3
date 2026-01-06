/**
 * AI Providers Store
 * FSD: stores/aiProvidersStore.ts
 * 
 * Focused store for AI provider configuration:
 * - Provider API keys (multi-key support)
 * - Model selection per provider
 * - Provider enable/disable
 * 
 * Extracted from settingsStore.ts for better SoC
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isValidApiKeyFormat } from '@/lib/config/schemas';

// ============================================================================
// Types
// ============================================================================

export type ProviderId = 'gemini' | 'deepseek' | 'openrouter' | 'vercel' | 'perplexity';

export interface StoredKey {
    key: string;
    label?: string;
    validated?: boolean;
    validatedAt?: number;
    usageCount?: number;
    lastUsed?: number;
    failureCount?: number;
    lastFailure?: number;
}

export interface ProviderConfig {
    id: ProviderId;
    name: string;
    models: string[];
    defaultModel: string;
    keyPrefix?: string;
    docsUrl?: string;
}

// ============================================================================
// Provider Metadata
// ============================================================================

export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
        defaultModel: 'gemini-2.5-flash',
        keyPrefix: 'AIza',
        docsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        models: ['deepseek-chat', 'deepseek-coder'],
        defaultModel: 'deepseek-chat',
        keyPrefix: 'sk-',
        docsUrl: 'https://platform.deepseek.com/',
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro'],
        defaultModel: 'anthropic/claude-3.5-sonnet',
        keyPrefix: 'sk-or-',
        docsUrl: 'https://openrouter.ai/docs',
    },
    vercel: {
        id: 'vercel',
        name: 'Vercel AI',
        models: ['gpt-4o', 'claude-3-sonnet'],
        defaultModel: 'gpt-4o',
        docsUrl: 'https://vercel.com/docs/ai',
    },
    perplexity: {
        id: 'perplexity',
        name: 'Perplexity',
        models: ['sonar', 'sonar-pro'],
        defaultModel: 'sonar',
        keyPrefix: 'pplx-',
        docsUrl: 'https://docs.perplexity.ai/',
    },
};

// ============================================================================
// Store Interface
// ============================================================================

interface AIProvidersStore {
    // State
    providerKeys: Record<ProviderId, StoredKey[]>;
    enabledProviders: ProviderId[];
    selectedModels: Record<ProviderId, string>;

    // Key Management
    addKey: (provider: ProviderId, key: StoredKey) => boolean;
    removeKey: (provider: ProviderId, keyValue: string) => void;
    updateKey: (provider: ProviderId, keyValue: string, updates: Partial<StoredKey>) => void;
    getKeys: (provider: ProviderId) => StoredKey[];
    getFirstKey: (provider: ProviderId) => string | null;
    rotateKey: (provider: ProviderId) => string | null;

    // Provider Management
    toggleProvider: (provider: ProviderId) => void;
    enableProvider: (provider: ProviderId) => void;
    disableProvider: (provider: ProviderId) => void;
    isProviderEnabled: (provider: ProviderId) => boolean;
    hasValidKeys: (provider: ProviderId) => boolean;

    // Model Selection
    setModel: (provider: ProviderId, modelId: string) => void;
    getModel: (provider: ProviderId) => string;

    // Bulk Operations
    clearAllKeys: (provider: ProviderId) => void;
    importKeys: (provider: ProviderId, keys: StoredKey[]) => number;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_PROVIDER_KEYS: Record<ProviderId, StoredKey[]> = {
    gemini: [],
    deepseek: [],
    openrouter: [],
    vercel: [],
    perplexity: [],
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAIProvidersStore = create<AIProvidersStore>()(
    persist(
        (set, get) => ({
            // ============ State ============
            providerKeys: { ...DEFAULT_PROVIDER_KEYS },
            enabledProviders: ['gemini'],
            selectedModels: {} as Record<ProviderId, string>,

            // ============ Key Management ============

            addKey: (provider, key) => {
                if (!isValidApiKeyFormat(key.key)) {
                    console.warn(`[AIProviders] Invalid key format for ${provider}`);
                    return false;
                }

                const existing = get().providerKeys[provider] || [];
                if (existing.some(k => k.key === key.key)) {
                    return false; // Duplicate
                }

                set(state => ({
                    providerKeys: {
                        ...state.providerKeys,
                        [provider]: [...existing, { ...key, usageCount: 0, failureCount: 0 }]
                    }
                }));
                return true;
            },

            removeKey: (provider, keyValue) => set(state => ({
                providerKeys: {
                    ...state.providerKeys,
                    [provider]: (state.providerKeys[provider] || []).filter(k => k.key !== keyValue)
                }
            })),

            updateKey: (provider, keyValue, updates) => set(state => ({
                providerKeys: {
                    ...state.providerKeys,
                    [provider]: (state.providerKeys[provider] || []).map(k =>
                        k.key === keyValue ? { ...k, ...updates } : k
                    )
                }
            })),

            getKeys: (provider) => get().providerKeys[provider] || [],

            getFirstKey: (provider) => {
                const keys = get().providerKeys[provider] || [];
                return keys.length > 0 ? keys[0].key : null;
            },

            rotateKey: (provider) => {
                const keys = get().providerKeys[provider] || [];
                if (keys.length <= 1) return keys[0]?.key || null;

                // Find key with lowest failure count and usage
                const sorted = [...keys].sort((a, b) => {
                    const aScore = (a.failureCount || 0) * 10 + (a.usageCount || 0);
                    const bScore = (b.failureCount || 0) * 10 + (b.usageCount || 0);
                    return aScore - bScore;
                });

                return sorted[0]?.key || null;
            },

            // ============ Provider Management ============

            toggleProvider: (provider) => set(state => {
                const isEnabled = state.enabledProviders.includes(provider);
                return {
                    enabledProviders: isEnabled
                        ? state.enabledProviders.filter(p => p !== provider)
                        : [...state.enabledProviders, provider]
                };
            }),

            enableProvider: (provider) => set(state => ({
                enabledProviders: state.enabledProviders.includes(provider)
                    ? state.enabledProviders
                    : [...state.enabledProviders, provider]
            })),

            disableProvider: (provider) => set(state => ({
                enabledProviders: state.enabledProviders.filter(p => p !== provider)
            })),

            isProviderEnabled: (provider) => get().enabledProviders.includes(provider),

            hasValidKeys: (provider) => {
                const keys = get().providerKeys[provider] || [];
                return keys.length > 0 && keys.some(k => k.key && k.key.length > 10);
            },

            // ============ Model Selection ============

            setModel: (provider, modelId) => set(state => ({
                selectedModels: { ...state.selectedModels, [provider]: modelId },
                // Auto-enable provider when model is selected
                enabledProviders: state.enabledProviders.includes(provider)
                    ? state.enabledProviders
                    : [...state.enabledProviders, provider]
            })),

            getModel: (provider) => {
                const selected = get().selectedModels[provider];
                if (selected) return selected;
                return PROVIDER_CONFIGS[provider]?.defaultModel || '';
            },

            // ============ Bulk Operations ============

            clearAllKeys: (provider) => set(state => ({
                providerKeys: {
                    ...state.providerKeys,
                    [provider]: []
                }
            })),

            importKeys: (provider, keys) => {
                let imported = 0;
                const state = get();

                for (const key of keys) {
                    if (state.addKey(provider, key)) {
                        imported++;
                    }
                }

                return imported;
            },
        }),
        {
            name: 'ifrit_ai_providers',
            partialize: (state) => ({
                providerKeys: state.providerKeys,
                enabledProviders: state.enabledProviders,
                selectedModels: state.selectedModels,
            }),
        }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectEnabledProviders = (state: AIProvidersStore) => state.enabledProviders;

export const selectProviderWithKeys = (state: AIProvidersStore) =>
    state.enabledProviders.filter(p => state.hasValidKeys(p));

export const selectAllProviderKeys = (state: AIProvidersStore) => state.providerKeys;
