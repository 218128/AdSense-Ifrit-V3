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
    umamiId: string;             // Umami Website ID (for embedding script)
    umamiApiUrl: string;         // Umami API URL (e.g. https://analytics.example.com)
    umamiApiKey: string;         // Umami API Token for fetching stats
    devtoKey: string;            // Dev.to publishing
    youtubeApiKey: string;       // YouTube Data API v3 key
    twitterBearerToken: string;  // Twitter/X API v2 Bearer Token
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

export type ProviderId = 'gemini' | 'deepseek' | 'openrouter' | 'vercel' | 'perplexity';

// Provider metadata for UI
export interface ProviderConfig {
    id: ProviderId;
    name: string;
    models: string[];
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

export interface ExportedSettings {
    version: string;
    exportedAt: string;
    app: string;
    settings: Record<string, string>;
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
        'USER_BLOG_URL',
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

    // Integrations
    integrations: IntegrationConfig;

    // AdSense
    adsenseConfig: AdsenseConfig;

    // Blog
    blogUrl: string;

    // MCP Tools
    mcpServers: MCPServerConfig;

    // Initialization flag
    initialized: boolean;

    // Health monitoring
    healthStatus: Record<string, ServiceHealth>;
    lastHealthCheck: number;

    // Capabilities (for AIServices)
    capabilitiesConfig: CapabilitiesConfig;

    // ==== AI Provider Actions ====
    addProviderKey: (provider: ProviderId, key: StoredKey) => void;
    removeProviderKey: (provider: ProviderId, keyValue: string) => void;
    updateProviderKey: (provider: ProviderId, keyValue: string, updates: Partial<StoredKey>) => void;
    toggleProvider: (provider: ProviderId) => void;
    setSelectedModel: (provider: ProviderId, modelId: string) => void;
    getProviderKeys: (provider: ProviderId) => StoredKey[];

    // ==== Integration Actions ====
    setIntegration: <K extends keyof IntegrationConfig>(key: K, value: string) => void;

    // ==== AdSense Actions ====
    setAdsenseConfig: (config: Partial<AdsenseConfig>) => void;

    // ==== Blog Actions ====
    setBlogUrl: (url: string) => void;

    // ==== MCP Actions ====
    toggleMCPServer: (serverId: string) => void;
    setMCPApiKey: (serverId: string, key: string) => void;

    // ==== Export/Import Actions ====
    exportSettings: () => ExportedSettings;
    importSettings: (data: ExportedSettings) => { success: boolean; restored: number };

    // ==== Server Backup Actions ====
    backupToServer: () => Promise<boolean>;
    restoreFromServer: () => Promise<boolean>;

    // ==== Migration ====
    migrateFromLegacy: () => void;
    initialize: () => void;

    // ==== Health Monitoring ====
    setHealthStatus: (serviceId: string, health: ServiceHealth) => void;
    clearHealthStatus: () => void;

    // ==== Capabilities Actions ====
    setCapabilitiesConfig: (config: Partial<CapabilitiesConfig>) => void;
    setCapabilitySetting: (capabilityId: string, settings: Partial<CapabilitySettings>) => void;
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
    umamiId: '',
    umamiApiUrl: '',
    umamiApiKey: '',
    devtoKey: '',
    youtubeApiKey: '',
    twitterBearerToken: '',
};

const DEFAULT_ADSENSE: AdsenseConfig = {
    publisherId: '',
    leaderboardSlot: '',
    articleSlot: '',
    multiplexSlot: '',
};

// ============ STORE IMPLEMENTATION ============

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set, get) => ({
            // ============ STATE ============
            providerKeys: { ...DEFAULT_PROVIDER_KEYS },
            enabledProviders: ['gemini'],
            selectedModels: {} as Record<ProviderId, string>,
            integrations: { ...DEFAULT_INTEGRATIONS },
            adsenseConfig: { ...DEFAULT_ADSENSE },
            blogUrl: '',
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

            getProviderKeys: (provider) => get().providerKeys[provider] || [],

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

            // ============ BLOG ACTIONS ============

            setBlogUrl: (url) => set({ blogUrl: url }),

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
                const settings: Record<string, string> = {};

                // Export provider keys
                const providers: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
                for (const provider of providers) {
                    const keys = state.providerKeys[provider];
                    if (keys?.length) {
                        settings[`ifrit_${provider}_keys`] = JSON.stringify(keys);
                    }
                    if (state.enabledProviders.includes(provider)) {
                        settings[`ifrit_${provider}_enabled`] = 'true';
                    }
                    if (state.selectedModels[provider]) {
                        settings[`ifrit_${provider}_model`] = state.selectedModels[provider];
                    }
                }

                // Export integrations (ALL fields from IntegrationConfig)
                const { integrations } = state;
                if (integrations.githubToken) settings['ifrit_github_token'] = integrations.githubToken;
                if (integrations.githubUser) settings['ifrit_github_user'] = integrations.githubUser;
                if (integrations.vercelToken) settings['ifrit_vercel_token'] = integrations.vercelToken;
                if (integrations.vercelUser) settings['ifrit_vercel_user'] = integrations.vercelUser;
                if (integrations.spamzillaKey) settings['ifrit_spamzilla_key'] = integrations.spamzillaKey;
                if (integrations.namecheapUser) settings['ifrit_namecheap_user'] = integrations.namecheapUser;
                if (integrations.namecheapKey) settings['ifrit_namecheap_key'] = integrations.namecheapKey;
                if (integrations.namecheapUsername) settings['ifrit_namecheap_username'] = integrations.namecheapUsername;
                if (integrations.namecheapClientIp) settings['ifrit_namecheap_client_ip'] = integrations.namecheapClientIp;
                if (integrations.cloudflareToken) settings['ifrit_cloudflare_token'] = integrations.cloudflareToken;
                if (integrations.godaddyKey) settings['ifrit_godaddy_key'] = integrations.godaddyKey;
                if (integrations.godaddySecret) settings['ifrit_godaddy_secret'] = integrations.godaddySecret;
                if (integrations.unsplashKey) settings['ifrit_unsplash_key'] = integrations.unsplashKey;
                if (integrations.pexelsKey) settings['ifrit_pexels_key'] = integrations.pexelsKey;
                if (integrations.umamiId) settings['UMAMI_WEBSITE_ID'] = integrations.umamiId;
                if (integrations.umamiApiUrl) settings['ifrit_umami_api_url'] = integrations.umamiApiUrl;
                if (integrations.umamiApiKey) settings['ifrit_umami_api_key'] = integrations.umamiApiKey;
                if (integrations.devtoKey) settings['ifrit_devto_api_key'] = integrations.devtoKey;

                // Export AdSense
                const { adsenseConfig } = state;
                if (adsenseConfig.publisherId) settings['ADSENSE_PUBLISHER_ID'] = adsenseConfig.publisherId;
                if (adsenseConfig.leaderboardSlot) settings['ADSENSE_LEADERBOARD_SLOT'] = adsenseConfig.leaderboardSlot;
                if (adsenseConfig.articleSlot) settings['ADSENSE_ARTICLE_SLOT'] = adsenseConfig.articleSlot;
                if (adsenseConfig.multiplexSlot) settings['ADSENSE_MULTIPLEX_SLOT'] = adsenseConfig.multiplexSlot;

                // Export blog
                if (state.blogUrl) settings['USER_BLOG_URL'] = state.blogUrl;

                // Export MCP servers configuration
                if (state.mcpServers.enabled.length > 0 || Object.keys(state.mcpServers.apiKeys).length > 0) {
                    settings['ifrit_mcp_servers'] = JSON.stringify(state.mcpServers);
                }

                // Export capabilities configuration
                if (Object.keys(state.capabilitiesConfig.capabilitySettings).length > 0 ||
                    state.capabilitiesConfig.customCapabilities.length > 0) {
                    settings['ifrit_capabilities_config'] = JSON.stringify(state.capabilitiesConfig);
                }

                return {
                    version: '3.1.0',  // Updated version for new fields
                    exportedAt: new Date().toISOString(),
                    app: 'AdSense Ifrit V3',
                    settings,
                };
            },

            importSettings: (data) => {
                if (!data.settings || !data.version) {
                    return { success: false, restored: 0 };
                }

                const { settings } = data;
                let restored = 0;

                // Import provider keys
                const providers: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
                const newProviderKeys = { ...DEFAULT_PROVIDER_KEYS };
                const newEnabledProviders: ProviderId[] = [];
                const newSelectedModels: Record<ProviderId, string> = {} as Record<ProviderId, string>;

                for (const provider of providers) {
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
                    umamiId: settings['UMAMI_WEBSITE_ID'] || '',
                    umamiApiUrl: settings['ifrit_umami_api_url'] || '',
                    umamiApiKey: settings['ifrit_umami_api_key'] || '',
                    devtoKey: settings['ifrit_devto_api_key'] || settings['devto_api_key'] || '',
                    youtubeApiKey: settings['ifrit_youtube_api_key'] || '',
                    twitterBearerToken: settings['ifrit_twitter_bearer_token'] || '',
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

                // Import blog
                const newBlogUrl = settings['USER_BLOG_URL'] || '';
                if (newBlogUrl) restored++;

                // Import MCP servers configuration
                let newMcpServers = { enabled: [] as string[], apiKeys: {} as Record<string, string> };
                if (settings['ifrit_mcp_servers']) {
                    try {
                        newMcpServers = JSON.parse(settings['ifrit_mcp_servers']);
                        restored++;
                    } catch { /* ignore */ }
                }

                // Import capabilities configuration
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
                    blogUrl: newBlogUrl,
                    mcpServers: newMcpServers,
                    capabilitiesConfig: newCapabilitiesConfig,
                });

                return { success: true, restored };
            },

            // ============ SERVER BACKUP ACTIONS ============

            backupToServer: async () => {
                try {
                    const exportData = get().exportSettings();
                    const res = await fetch('/api/settings/backup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ settings: exportData.settings }),
                    });
                    return res.ok;
                } catch {
                    console.error('Failed to backup settings to server');
                    return false;
                }
            },

            restoreFromServer: async () => {
                try {
                    const res = await fetch('/api/settings/backup');
                    const data = await res.json();
                    if (data.success && data.hasBackup && data.backup?.settings) {
                        get().importSettings({
                            version: '2.0.0',
                            exportedAt: new Date().toISOString(),
                            app: 'AdSense Ifrit V3',
                            settings: data.backup.settings,
                        });
                        return true;
                    }
                    return false;
                } catch {
                    console.error('Failed to restore settings from server');
                    return false;
                }
            },

            // ============ MIGRATION ============

            migrateFromLegacy: () => {
                if (typeof window === 'undefined') return;

                const providers: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
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
                    umamiId: localStorage.getItem('UMAMI_WEBSITE_ID') || '',
                    umamiApiUrl: localStorage.getItem('ifrit_umami_api_url') || '',
                    umamiApiKey: localStorage.getItem('ifrit_umami_api_key') || '',
                    devtoKey: localStorage.getItem('ifrit_devto_api_key') || localStorage.getItem('devto_api_key') || '',
                    youtubeApiKey: localStorage.getItem('ifrit_youtube_api_key') || '',
                    twitterBearerToken: localStorage.getItem('ifrit_twitter_bearer_token') || '',
                };

                // Migrate AdSense
                const newAdsenseConfig: AdsenseConfig = {
                    publisherId: localStorage.getItem('ADSENSE_PUBLISHER_ID') || '',
                    leaderboardSlot: localStorage.getItem('ADSENSE_LEADERBOARD_SLOT') || '',
                    articleSlot: localStorage.getItem('ADSENSE_ARTICLE_SLOT') || '',
                    multiplexSlot: localStorage.getItem('ADSENSE_MULTIPLEX_SLOT') || '',
                };

                // Migrate blog
                const newBlogUrl = localStorage.getItem('USER_BLOG_URL') || '';

                set({
                    providerKeys: newProviderKeys,
                    enabledProviders: newEnabledProviders.length ? newEnabledProviders : ['gemini'],
                    selectedModels: newSelectedModels,
                    integrations: newIntegrations,
                    adsenseConfig: newAdsenseConfig,
                    blogUrl: newBlogUrl,
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
        }),
        {
            name: SETTINGS_STORAGE_KEYS.SETTINGS_STORE,
            partialize: (state) => ({
                providerKeys: state.providerKeys,
                enabledProviders: state.enabledProviders,
                selectedModels: state.selectedModels,
                integrations: state.integrations,
                adsenseConfig: state.adsenseConfig,
                blogUrl: state.blogUrl,
                mcpServers: state.mcpServers,
                initialized: state.initialized,
                capabilitiesConfig: state.capabilitiesConfig,
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
export const selectBlogUrl = (state: SettingsStore) => state.blogUrl;
export const selectMCPServers = (state: SettingsStore) => state.mcpServers;
