/**
 * Settings Store - Zustand state management for Settings tab
 * 
 * Centralizes state for:
 * - AI Provider keys and configuration
 * - Integration tokens (GitHub, Vercel)
 * - AdSense configuration
 * - MCP tools configuration
 * - Export/Import functionality
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isValidApiKeyFormat, isValidAdsensePublisherId } from '@/lib/config/schemas';
import type { ServiceHealth } from '@/lib/config/healthMonitor';

// ============ TYPES ============

export interface StoredKey {
    key: string;
    label?: string;
    validated?: boolean;
    validatedAt?: number;
}

export interface AdsenseConfig {
    publisherId: string;
    leaderboardSlot: string;
    articleSlot: string;
    multiplexSlot: string;
}

export interface IntegrationConfig {
    githubToken: string;
    githubUser: string;
    vercelToken: string;
    vercelUser: string;
    spamzillaKey: string;
    namecheapUser: string;
    namecheapKey: string;
    namecheapUsername: string;   // Additional namecheap field
    namecheapClientIp: string;   // Additional namecheap field
    cloudflareToken: string;     // Cloudflare API for domain management
    godaddyKey: string;          // GoDaddy API key for auctions
    godaddySecret: string;       // GoDaddy API secret
    unsplashKey: string;
    pexelsKey: string;
    braveApiKey: string;         // Brave Search API
    umamiId: string;             // Umami Website ID (for embedding script)
    umamiApiUrl: string;         // Umami API URL (e.g. https://analytics.example.com)
    umamiApiKey: string;         // Umami API Token for fetching stats
    devtoKey: string;            // Dev.to publishing
    youtubeApiKey: string;       // YouTube Data API v3 key
    twitterBearerToken: string;  // Twitter/X API v2 Bearer Token
    // Google Analytics 4
    ga4MeasurementId: string;    // GA4 Measurement ID (G-XXXXXXXXXX)
    ga4ApiSecret: string;        // GA4 Measurement Protocol API Secret
    factCheckApiKey: string;     // Google Fact Check API
}

export interface MCPServerConfig {
    enabled: string[];
    apiKeys: Record<string, string>;
}

// Capabilities config (synced with AIServices)
export interface CapabilitySettings {
    isEnabled: boolean;
    defaultHandlerId?: string;
    fallbackHandlerIds?: string[];
}

export interface CapabilitiesConfig {
    customCapabilities: Array<{
        id: string;
        name: string;
        description: string;
        icon?: string;
        isDefault: boolean;
        isEnabled: boolean;
        defaultHandlerId?: string;
    }>;
    capabilitySettings: Record<string, CapabilitySettings>;
    preferMCP: boolean;
    autoFallback: boolean;
    // Diagnostics settings
    verbosity: 'none' | 'basic' | 'standard' | 'verbose';
    logDiagnostics: boolean;
}

// Newsletter provider configuration (Phase 3)
export type NewsletterProvider = 'convertkit' | 'mailchimp' | 'buttondown';

export interface NewsletterConfig {
    provider: NewsletterProvider | null;
    apiKey: string;
    listId?: string;           // Mailchimp audience ID or ConvertKit form ID
}

// Syndication platform configuration (Phase 3)
export type SyndicationPlatform = 'medium' | 'devto' | 'hashnode';

export interface SyndicationConfig {
    platform: SyndicationPlatform;
    apiKey: string;
    publicationId?: string;    // Medium publication or Hashnode blog ID
    username?: string;         // Hashnode username
    enabled: boolean;
}

// AdSense OAuth configuration for live data (Phase 3)
export interface AdsenseOAuthConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    lastSync?: number;
}

// ProviderId imported from unified types (single source of truth)
import { ProviderId, ALL_PROVIDER_IDS } from '@/lib/ai/types/providers';
export type { ProviderId };

// Provider metadata for UI
export interface ProviderConfig {
    id: ProviderId;
    name: string;
    /** 
     * FALLBACK models for display before API validation.
     * Real models come from testKey() response and are stored in validatedModels.
     */
    models: string[];
    /** 
     * Default model used ONLY if user hasn't selected one.
     * User selection is stored in selectedModels and takes priority.
     */
    defaultModel: string;
    keyPrefix?: string;
    docsUrl?: string;
}

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

// User Profile - full state for backup/restore
export interface UserProfile {
    providerKeys: Record<ProviderId, StoredKey[]>;
    enabledProviders: ProviderId[];
    selectedModels: Record<ProviderId, string>;
    handlerModels: Record<string, string>;
    integrations: IntegrationConfig;
    adsenseConfig: AdsenseConfig;

    mcpServers: MCPServerConfig;
    capabilitiesConfig: CapabilitiesConfig;
}

export interface ExportedSettings {
    version: string;
    exportedAt: string;
    app: string;
    profile?: UserProfile;           // New format (v4+)
    settings?: Record<string, string>; // Legacy format (v3.x and earlier)
}

// ============ STORAGE KEYS ============

export const SETTINGS_STORAGE_KEYS = {
    SETTINGS_STORE: 'ifrit_settings_store',
    // Legacy keys for migration
    LEGACY_KEYS: [
        'ifrit_gemini_keys', 'ifrit_deepseek_keys', 'ifrit_openrouter_keys',
        'ifrit_vercel_keys', 'ifrit_perplexity_keys', 'ifrit_enabled_providers',
        'GEMINI_API_KEY', 'ifrit_gemini_key',
        'ifrit_github_token', 'ifrit_github_user', 'ifrit_vercel_token', 'ifrit_vercel_user',
        'ADSENSE_PUBLISHER_ID', 'ADSENSE_LEADERBOARD_SLOT', 'ADSENSE_ARTICLE_SLOT', 'ADSENSE_MULTIPLEX_SLOT',

        'ifrit_namecheap_user', 'ifrit_namecheap_key', 'ifrit_spamzilla_key',
        'ifrit_unsplash_key', 'ifrit_pexels_key',
    ]
} as const;

// ============ STORE INTERFACE ============

interface SettingsStore {
    // AI Providers
    providerKeys: Record<ProviderId, StoredKey[]>;
    enabledProviders: ProviderId[];
    selectedModels: Record<ProviderId, string>;
    // Handler-specific model selection (e.g., gemini-images uses different model than gemini-text)
    handlerModels: Record<string, string>;
    // Available models per provider (fetched from API, used for handler model dropdowns)
    availableModels: Record<ProviderId, string[]>;

    // Integrations
    integrations: IntegrationConfig;

    // AdSense
    adsenseConfig: AdsenseConfig;

    // MCP Tools
    mcpServers: MCPServerConfig;

    // Initialization flag
    initialized: boolean;

    // Health monitoring
    healthStatus: Record<string, ServiceHealth>;
    lastHealthCheck: number;

    // Capabilities (for AIServices)
    capabilitiesConfig: CapabilitiesConfig;

    // Distribution (Phase 3)
    newsletterConfig: NewsletterConfig;
    syndicationConfigs: SyndicationConfig[];
    adsenseOAuth: AdsenseOAuthConfig;

    // ==== AI Provider Actions ====
    addProviderKey: (provider: ProviderId, key: StoredKey) => void;
    removeProviderKey: (provider: ProviderId, keyValue: string) => void;
    updateProviderKey: (provider: ProviderId, keyValue: string, updates: Partial<StoredKey>) => void;
    toggleProvider: (provider: ProviderId) => void;
    setSelectedModel: (provider: ProviderId, modelId: string) => void;
    // Handler-specific model selection
    setHandlerModel: (handlerId: string, modelId: string) => void;
    getHandlerModel: (handlerId: string, fallbackProvider?: ProviderId) => string | undefined;
    getProviderKeys: (provider: ProviderId) => StoredKey[];
    // Store available models fetched from provider API
    setAvailableModels: (provider: ProviderId, models: string[]) => void;

    // ==== Integration Actions ====
    setIntegration: <K extends keyof IntegrationConfig>(key: K, value: string) => void;

    // ==== AdSense Actions ====
    setAdsenseConfig: (config: Partial<AdsenseConfig>) => void;

    // ==== MCP Actions ====
    toggleMCPServer: (serverId: string) => void;
    setMCPApiKey: (serverId: string, key: string) => void;

    // ==== Export/Import Actions ====
    exportSettings: () => ExportedSettings;
    importSettings: (data: ExportedSettings) => { success: boolean; restored: number };


    // ==== Migration ====
    migrateFromLegacy: () => void;
    initialize: () => void;

    // ==== Health Monitoring ====
    setHealthStatus: (serviceId: string, health: ServiceHealth) => void;
    clearHealthStatus: () => void;

    // ==== Capabilities Actions ====
    setCapabilitiesConfig: (config: Partial<CapabilitiesConfig>) => void;
    setCapabilitySetting: (capabilityId: string, settings: Partial<CapabilitySettings>) => void;

    // ==== Distribution Actions (Phase 3) ====
    setNewsletterConfig: (config: Partial<NewsletterConfig>) => void;
    addSyndicationPlatform: (config: SyndicationConfig) => void;
    updateSyndicationPlatform: (platform: SyndicationPlatform, updates: Partial<SyndicationConfig>) => void;
    removeSyndicationPlatform: (platform: SyndicationPlatform) => void;
    setAdsenseOAuth: (config: Partial<AdsenseOAuthConfig>) => void;
}

// ============ DEFAULT VALUES ============

const DEFAULT_PROVIDER_KEYS: Record<ProviderId, StoredKey[]> = {
    gemini: [],
    deepseek: [],
    openrouter: [],
    vercel: [],
    perplexity: [],
};

const DEFAULT_INTEGRATIONS: IntegrationConfig = {
    githubToken: '',
    githubUser: '',
    vercelToken: '',
    vercelUser: '',
    spamzillaKey: '',
    namecheapUser: '',
    namecheapKey: '',
    namecheapUsername: '',
    namecheapClientIp: '',
    cloudflareToken: '',
    godaddyKey: '',
    godaddySecret: '',
    unsplashKey: '',
    pexelsKey: '',
    braveApiKey: '',
    umamiId: '',
    umamiApiUrl: '',
    umamiApiKey: '',
    devtoKey: '',
    youtubeApiKey: '',
    twitterBearerToken: '',
    ga4MeasurementId: '',
    ga4ApiSecret: '',
    factCheckApiKey: '',
};

const DEFAULT_ADSENSE: AdsenseConfig = {
    publisherId: '',
    leaderboardSlot: '',
    articleSlot: '',
    multiplexSlot: '',
};

// Legacy import helper for v3.x and earlier backup files
function legacyImport(
    settings: Record<string, string>,
    get: () => SettingsStore,
    set: (state: Partial<SettingsStore>) => void
): { success: boolean; restored: number } {
    let restored = 0;

    // Import provider keys
    const newProviderKeys = { ...DEFAULT_PROVIDER_KEYS };
    const newEnabledProviders: ProviderId[] = [];
    const newSelectedModels: Record<ProviderId, string> = {} as Record<ProviderId, string>;

    for (const provider of ALL_PROVIDER_IDS) {
        const keysJson = settings[`ifrit_${provider}_keys`];
        if (keysJson) {
            try {
                newProviderKeys[provider] = JSON.parse(keysJson);
                restored++;
            } catch { /* ignore */ }
        }
        if (settings[`ifrit_${provider}_enabled`] === 'true') {
            newEnabledProviders.push(provider);
        }
        if (settings[`ifrit_${provider}_model`]) {
            newSelectedModels[provider] = settings[`ifrit_${provider}_model`];
        }
    }

    // Import integrations
    const newIntegrations: IntegrationConfig = {
        githubToken: settings['ifrit_github_token'] || '',
        githubUser: settings['ifrit_github_user'] || '',
        vercelToken: settings['ifrit_vercel_token'] || '',
        vercelUser: settings['ifrit_vercel_user'] || '',
        spamzillaKey: settings['ifrit_spamzilla_key'] || '',
        namecheapUser: settings['ifrit_namecheap_user'] || '',
        namecheapKey: settings['ifrit_namecheap_key'] || '',
        namecheapUsername: settings['ifrit_namecheap_username'] || '',
        namecheapClientIp: settings['ifrit_namecheap_client_ip'] || '',
        cloudflareToken: settings['ifrit_cloudflare_token'] || '',
        godaddyKey: settings['ifrit_godaddy_key'] || '',
        godaddySecret: settings['ifrit_godaddy_secret'] || '',
        unsplashKey: settings['ifrit_unsplash_key'] || '',
        pexelsKey: settings['ifrit_pexels_key'] || '',
        braveApiKey: settings['ifrit_brave_api_key'] || '',
        umamiId: settings['UMAMI_WEBSITE_ID'] || '',
        umamiApiUrl: settings['ifrit_umami_api_url'] || '',
        umamiApiKey: settings['ifrit_umami_api_key'] || '',
        devtoKey: settings['ifrit_devto_api_key'] || settings['devto_api_key'] || '',
        youtubeApiKey: settings['ifrit_youtube_api_key'] || '',
        twitterBearerToken: settings['ifrit_twitter_bearer_token'] || '',
        ga4MeasurementId: settings['ifrit_ga4_measurement_id'] || '',
        ga4ApiSecret: settings['ifrit_ga4_api_secret'] || '',
        factCheckApiKey: settings['ifrit_fact_check_api_key'] || '',
    };
    restored += Object.values(newIntegrations).filter(Boolean).length;

    // Import AdSense
    const newAdsenseConfig: AdsenseConfig = {
        publisherId: settings['ADSENSE_PUBLISHER_ID'] || '',
        leaderboardSlot: settings['ADSENSE_LEADERBOARD_SLOT'] || '',
        articleSlot: settings['ADSENSE_ARTICLE_SLOT'] || '',
        multiplexSlot: settings['ADSENSE_MULTIPLEX_SLOT'] || '',
    };
    restored += Object.values(newAdsenseConfig).filter(Boolean).length;



    // Import MCP servers
    let newMcpServers = { enabled: [] as string[], apiKeys: {} as Record<string, string> };
    if (settings['ifrit_mcp_servers']) {
        try {
            newMcpServers = JSON.parse(settings['ifrit_mcp_servers']);
            restored++;
        } catch { /* ignore */ }
    }

    // Import capabilities
    let newCapabilitiesConfig: CapabilitiesConfig = {
        customCapabilities: [],
        capabilitySettings: {},
        preferMCP: true,
        autoFallback: true,
        verbosity: 'standard',
        logDiagnostics: true,
    };
    if (settings['ifrit_capabilities_config']) {
        try {
            newCapabilitiesConfig = { ...newCapabilitiesConfig, ...JSON.parse(settings['ifrit_capabilities_config']) };
            restored++;
        } catch { /* ignore */ }
    }

    set({
        providerKeys: newProviderKeys,
        enabledProviders: newEnabledProviders.length ? newEnabledProviders : ['gemini'],
        selectedModels: newSelectedModels,
        integrations: newIntegrations,
        adsenseConfig: newAdsenseConfig,

        mcpServers: newMcpServers,
        capabilitiesConfig: newCapabilitiesConfig,
    });

    return { success: true, restored };
}

// ============ STORE IMPLEMENTATION ============

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set, get) => ({
            // ============ STATE ============
            providerKeys: { ...DEFAULT_PROVIDER_KEYS },
            enabledProviders: ['gemini'],
            selectedModels: {} as Record<ProviderId, string>,
            // Handler-specific models (e.g., 'gemini-images' -> 'gemini-2.5-pro-image')
            handlerModels: {} as Record<string, string>,
            // Available models per provider (fetched from API via testKey)
            availableModels: {} as Record<ProviderId, string[]>,
            integrations: { ...DEFAULT_INTEGRATIONS },
            adsenseConfig: { ...DEFAULT_ADSENSE },

            mcpServers: { enabled: [], apiKeys: {} },
            initialized: false,
            healthStatus: {},
            lastHealthCheck: 0,
            capabilitiesConfig: {
                customCapabilities: [],
                capabilitySettings: {},
                preferMCP: true,
                autoFallback: true,
                verbosity: 'standard',
                logDiagnostics: true,
            },

            // Distribution (Phase 3)
            newsletterConfig: {
                provider: null,
                apiKey: '',
            },
            syndicationConfigs: [],
            adsenseOAuth: {
                clientId: '',
                clientSecret: '',
                refreshToken: '',
            },

            // ============ AI PROVIDER ACTIONS ============

            addProviderKey: (provider, key) => set((state) => {
                // Validate key format
                if (!isValidApiKeyFormat(key.key)) {
                    console.warn(`Invalid API key format for ${provider}`);
                    return state;
                }
                const existing = state.providerKeys[provider] || [];
                if (existing.some(k => k.key === key.key)) return state;
                return {
                    providerKeys: {
                        ...state.providerKeys,
                        [provider]: [...existing, key]
                    }
                };
            }),

            removeProviderKey: (provider, keyValue) => set((state) => ({
                providerKeys: {
                    ...state.providerKeys,
                    [provider]: (state.providerKeys[provider] || []).filter(k => k.key !== keyValue)
                }
            })),

            updateProviderKey: (provider, keyValue, updates) => set((state) => ({
                providerKeys: {
                    ...state.providerKeys,
                    [provider]: (state.providerKeys[provider] || []).map(k =>
                        k.key === keyValue ? { ...k, ...updates } : k
                    )
                }
            })),

            toggleProvider: (provider) => set((state) => {
                const isEnabled = state.enabledProviders.includes(provider);
                return {
                    enabledProviders: isEnabled
                        ? state.enabledProviders.filter(p => p !== provider)
                        : [...state.enabledProviders, provider]
                };
            }),

            setSelectedModel: (provider, modelId) => set((state) => ({
                selectedModels: { ...state.selectedModels, [provider]: modelId },
                // Auto-enable provider when model is selected
                enabledProviders: state.enabledProviders.includes(provider)
                    ? state.enabledProviders
                    : [...state.enabledProviders, provider]
            })),

            // Handler-specific model selection (e.g., gemini-images vs gemini-text)
            setHandlerModel: (handlerId, modelId) => set((state) => ({
                handlerModels: { ...state.handlerModels, [handlerId]: modelId }
            })),

            getHandlerModel: (handlerId, fallbackProvider) => {
                const state = get();
                // First check handler-specific model
                if (state.handlerModels[handlerId]) {
                    return state.handlerModels[handlerId];
                }
                // Fall back to provider's default model if provided
                if (fallbackProvider && state.selectedModels[fallbackProvider]) {
                    return state.selectedModels[fallbackProvider];
                }
                return undefined;
            },

            getProviderKeys: (provider) => get().providerKeys[provider] || [],

            // Store available models fetched from provider API
            setAvailableModels: (provider, models) => set((state) => ({
                availableModels: { ...state.availableModels, [provider]: models }
            })),

            // ============ INTEGRATION ACTIONS ============

            setIntegration: (key, value) => set((state) => ({
                integrations: { ...state.integrations, [key]: value }
            })),

            // ============ ADSENSE ACTIONS ============

            setAdsenseConfig: (config) => set((state) => {
                // Allow any input - validation happens at save/use time, not during typing
                return {
                    adsenseConfig: { ...state.adsenseConfig, ...config }
                };
            }),



            // ============ MCP ACTIONS ============

            toggleMCPServer: (serverId) => set((state) => {
                const isEnabled = state.mcpServers.enabled.includes(serverId);
                return {
                    mcpServers: {
                        ...state.mcpServers,
                        enabled: isEnabled
                            ? state.mcpServers.enabled.filter(s => s !== serverId)
                            : [...state.mcpServers.enabled, serverId]
                    }
                };
            }),

            setMCPApiKey: (serverId, key) => set((state) => ({
                mcpServers: {
                    ...state.mcpServers,
                    apiKeys: { ...state.mcpServers.apiKeys, [serverId]: key }
                }
            })),

            // ============ EXPORT/IMPORT ACTIONS ============

            exportSettings: () => {
                const state = get();
                // Serialize entire user profile (all config state)
                const profile: UserProfile = {
                    providerKeys: state.providerKeys,
                    enabledProviders: state.enabledProviders,
                    selectedModels: state.selectedModels,
                    handlerModels: state.handlerModels,
                    integrations: state.integrations,
                    adsenseConfig: state.adsenseConfig,

                    mcpServers: state.mcpServers,
                    capabilitiesConfig: state.capabilitiesConfig,
                };
                return {
                    version: '4.0.0',
                    exportedAt: new Date().toISOString(),
                    app: 'AdSense Ifrit V3',
                    profile,
                };
            },

            importSettings: (data) => {
                // Handle new format (v4+)
                if (data.profile) {
                    const p = data.profile;
                    set({
                        providerKeys: p.providerKeys ?? get().providerKeys,
                        enabledProviders: p.enabledProviders ?? get().enabledProviders,
                        selectedModels: p.selectedModels ?? get().selectedModels,
                        handlerModels: p.handlerModels ?? get().handlerModels,
                        integrations: { ...DEFAULT_INTEGRATIONS, ...p.integrations },
                        adsenseConfig: { ...DEFAULT_ADSENSE, ...p.adsenseConfig },

                        mcpServers: p.mcpServers ?? { enabled: [], apiKeys: {} },
                        capabilitiesConfig: {
                            // Defaults first, imported config overrides
                            customCapabilities: p.capabilitiesConfig?.customCapabilities ?? [],
                            capabilitySettings: p.capabilitiesConfig?.capabilitySettings ?? {},
                            preferMCP: p.capabilitiesConfig?.preferMCP ?? true,
                            autoFallback: p.capabilitiesConfig?.autoFallback ?? true,
                            verbosity: p.capabilitiesConfig?.verbosity ?? 'standard',
                            logDiagnostics: p.capabilitiesConfig?.logDiagnostics ?? true,
                        },
                    });
                    return { success: true, restored: Object.keys(p).length };
                }

                // Handle legacy format (v3.x and earlier)
                if (data.settings) {
                    return legacyImport(data.settings, get, set);
                }

                return { success: false, restored: 0 };
            },

            // ============ MIGRATION ============

            migrateFromLegacy: () => {
                if (typeof window === 'undefined') return;

                const providers = ALL_PROVIDER_IDS;
                const newProviderKeys = { ...DEFAULT_PROVIDER_KEYS };
                const newEnabledProviders: ProviderId[] = [];
                const newSelectedModels: Record<ProviderId, string> = {} as Record<ProviderId, string>;

                for (const provider of providers) {
                    // Migrate keys
                    const stored = localStorage.getItem(`ifrit_${provider}_keys`);
                    if (stored) {
                        try {
                            newProviderKeys[provider] = JSON.parse(stored);
                        } catch { /* ignore */ }
                    }

                    // Check legacy single key format
                    const legacyKey = localStorage.getItem(`ifrit_${provider}_key`);
                    if (legacyKey && !newProviderKeys[provider].some(k => k.key === legacyKey)) {
                        newProviderKeys[provider].push({ key: legacyKey });
                    }

                    // Gemini: also check GEMINI_API_KEY
                    if (provider === 'gemini') {
                        const originalKey = localStorage.getItem('GEMINI_API_KEY');
                        if (originalKey && !newProviderKeys.gemini.some(k => k.key === originalKey)) {
                            newProviderKeys.gemini.push({ key: originalKey });
                        }
                    }

                    // Migrate enabled status
                    const enabledStored = localStorage.getItem(`ifrit_${provider}_enabled`);
                    const isEnabled = enabledStored !== null ? enabledStored === 'true' : provider === 'gemini';
                    if (isEnabled) newEnabledProviders.push(provider);

                    // Migrate model selection
                    const modelStored = localStorage.getItem(`ifrit_${provider}_model`);
                    if (modelStored) newSelectedModels[provider] = modelStored;
                }

                // Migrate integrations
                const newIntegrations: IntegrationConfig = {
                    githubToken: localStorage.getItem('ifrit_github_token') || '',
                    githubUser: localStorage.getItem('ifrit_github_user') || '',
                    vercelToken: localStorage.getItem('ifrit_vercel_token') || '',
                    vercelUser: localStorage.getItem('ifrit_vercel_user') || '',
                    spamzillaKey: localStorage.getItem('ifrit_spamzilla_key') || '',
                    namecheapUser: localStorage.getItem('ifrit_namecheap_user') || '',
                    namecheapKey: localStorage.getItem('ifrit_namecheap_key') || '',
                    namecheapUsername: localStorage.getItem('ifrit_namecheap_username') || '',
                    namecheapClientIp: localStorage.getItem('ifrit_namecheap_client_ip') || '',
                    cloudflareToken: localStorage.getItem('ifrit_cloudflare_token') || '',
                    godaddyKey: localStorage.getItem('ifrit_godaddy_key') || '',
                    godaddySecret: localStorage.getItem('ifrit_godaddy_secret') || '',
                    unsplashKey: localStorage.getItem('ifrit_unsplash_key') || '',
                    pexelsKey: localStorage.getItem('ifrit_pexels_key') || '',
                    braveApiKey: localStorage.getItem('ifrit_brave_api_key') || '',
                    umamiId: localStorage.getItem('UMAMI_WEBSITE_ID') || '',
                    umamiApiUrl: localStorage.getItem('ifrit_umami_api_url') || '',
                    umamiApiKey: localStorage.getItem('ifrit_umami_api_key') || '',
                    devtoKey: localStorage.getItem('ifrit_devto_api_key') || localStorage.getItem('devto_api_key') || '',
                    youtubeApiKey: localStorage.getItem('ifrit_youtube_api_key') || '',
                    twitterBearerToken: localStorage.getItem('ifrit_twitter_bearer_token') || '',
                    // GA4 and FactCheck (new properties)
                    ga4MeasurementId: localStorage.getItem('ifrit_ga4_measurement_id') || '',
                    ga4ApiSecret: localStorage.getItem('ifrit_ga4_api_secret') || '',
                    factCheckApiKey: localStorage.getItem('ifrit_fact_check_api_key') || '',
                };

                // Migrate AdSense
                const newAdsenseConfig: AdsenseConfig = {
                    publisherId: localStorage.getItem('ADSENSE_PUBLISHER_ID') || '',
                    leaderboardSlot: localStorage.getItem('ADSENSE_LEADERBOARD_SLOT') || '',
                    articleSlot: localStorage.getItem('ADSENSE_ARTICLE_SLOT') || '',
                    multiplexSlot: localStorage.getItem('ADSENSE_MULTIPLEX_SLOT') || '',
                };

                set({
                    providerKeys: newProviderKeys,
                    enabledProviders: newEnabledProviders.length ? newEnabledProviders : ['gemini'],
                    selectedModels: newSelectedModels,
                    integrations: newIntegrations,
                    adsenseConfig: newAdsenseConfig,
                    initialized: true,
                });
            },

            initialize: () => {
                const state = get();
                if (!state.initialized) {
                    state.migrateFromLegacy();
                }
            },

            // ============ HEALTH MONITORING ============

            setHealthStatus: (serviceId, health) => set((state) => ({
                healthStatus: { ...state.healthStatus, [serviceId]: health },
                lastHealthCheck: Date.now(),
            })),

            clearHealthStatus: () => set({ healthStatus: {}, lastHealthCheck: 0 }),

            // ============ CAPABILITIES ACTIONS ============

            setCapabilitiesConfig: (config) => set((state) => ({
                capabilitiesConfig: { ...state.capabilitiesConfig, ...config },
            })),

            setCapabilitySetting: (capabilityId, settings) => set((state) => ({
                capabilitiesConfig: {
                    ...state.capabilitiesConfig,
                    capabilitySettings: {
                        ...state.capabilitiesConfig.capabilitySettings,
                        [capabilityId]: {
                            ...state.capabilitiesConfig.capabilitySettings[capabilityId],
                            ...settings,
                        },
                    },
                },
            })),

            // ============ DISTRIBUTION ACTIONS (Phase 3) ============

            setNewsletterConfig: (config) => set((state) => ({
                newsletterConfig: { ...state.newsletterConfig, ...config },
            })),

            addSyndicationPlatform: (config) => set((state) => {
                const existing = state.syndicationConfigs.find(c => c.platform === config.platform);
                if (existing) {
                    // Update existing
                    return {
                        syndicationConfigs: state.syndicationConfigs.map(c =>
                            c.platform === config.platform ? { ...c, ...config } : c
                        ),
                    };
                }
                return {
                    syndicationConfigs: [...state.syndicationConfigs, config],
                };
            }),

            updateSyndicationPlatform: (platform, updates) => set((state) => ({
                syndicationConfigs: state.syndicationConfigs.map(c =>
                    c.platform === platform ? { ...c, ...updates } : c
                ),
            })),

            removeSyndicationPlatform: (platform) => set((state) => ({
                syndicationConfigs: state.syndicationConfigs.filter(c => c.platform !== platform),
            })),

            setAdsenseOAuth: (config) => set((state) => ({
                adsenseOAuth: { ...state.adsenseOAuth, ...config },
            })),
        }),
        {
            name: SETTINGS_STORAGE_KEYS.SETTINGS_STORE,
            partialize: (state) => ({
                providerKeys: state.providerKeys,
                enabledProviders: state.enabledProviders,
                selectedModels: state.selectedModels,
                // Handler-specific models (e.g., 'generate:gemini' -> 'gemini-2.5-pro')
                handlerModels: state.handlerModels,
                // Available models per provider (fetched from API)
                availableModels: state.availableModels,
                integrations: state.integrations,
                adsenseConfig: state.adsenseConfig,

                mcpServers: state.mcpServers,
                initialized: state.initialized,
                capabilitiesConfig: state.capabilitiesConfig,
                // Distribution (Phase 3)
                newsletterConfig: state.newsletterConfig,
                syndicationConfigs: state.syndicationConfigs,
                adsenseOAuth: state.adsenseOAuth,
            }),
        }
    )
);

// ============ SELECTORS ============

export const selectProviderKeys = (provider: ProviderId) =>
    (state: SettingsStore) => state.providerKeys[provider] || [];
export const selectEnabledProviders = (state: SettingsStore) => state.enabledProviders;
export const selectSelectedModels = (state: SettingsStore) => state.selectedModels;
export const selectIntegrations = (state: SettingsStore) => state.integrations;
export const selectAdsenseConfig = (state: SettingsStore) => state.adsenseConfig;

export const selectMCPServers = (state: SettingsStore) => state.mcpServers;
