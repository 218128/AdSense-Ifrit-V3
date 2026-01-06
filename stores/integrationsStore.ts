/**
 * Integrations Store
 * FSD: stores/integrationsStore.ts
 * 
 * Focused store for third-party service integrations:
 * - Grouped by purpose (Hosting, Domains, Media, Analytics, Legacy)
 * - Token validation
 * - Connection status tracking
 * 
 * Extracted from settingsStore.ts for better SoC
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type IntegrationCategory = 'hosting' | 'domains' | 'media' | 'analytics' | 'social' | 'legacy';

export interface IntegrationMeta {
    id: string;
    name: string;
    category: IntegrationCategory;
    description: string;
    docsUrl?: string;
    fields: IntegrationField[];
    deprecated?: boolean;
}

export interface IntegrationField {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    placeholder?: string;
    required?: boolean;
}

export interface ConnectionStatus {
    connected: boolean;
    lastChecked: number;
    error?: string;
}

// ============================================================================
// Integration Definitions
// ============================================================================

export const INTEGRATIONS: IntegrationMeta[] = [
    // Hosting
    {
        id: 'hostinger',
        name: 'Hostinger',
        category: 'hosting',
        description: 'WordPress hosting and site management',
        docsUrl: 'https://www.hostinger.com/cpanel-login',
        fields: [], // Uses MCP, no direct keys needed
    },

    // Domain Registrars
    {
        id: 'namecheap',
        name: 'Namecheap',
        category: 'domains',
        description: 'Domain registration and management',
        docsUrl: 'https://www.namecheap.com/support/api/',
        fields: [
            { key: 'namecheapUser', label: 'API User', type: 'text', required: true },
            { key: 'namecheapKey', label: 'API Key', type: 'password', required: true },
            { key: 'namecheapUsername', label: 'Username', type: 'text' },
            { key: 'namecheapClientIp', label: 'Whitelisted IP', type: 'text' },
        ],
    },
    {
        id: 'godaddy',
        name: 'GoDaddy',
        category: 'domains',
        description: 'Domain registration and auctions',
        docsUrl: 'https://developer.godaddy.com/',
        fields: [
            { key: 'godaddyKey', label: 'API Key', type: 'password', required: true },
            { key: 'godaddySecret', label: 'API Secret', type: 'password', required: true },
        ],
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        category: 'domains',
        description: 'DNS and CDN management',
        docsUrl: 'https://developers.cloudflare.com/api/',
        fields: [
            { key: 'cloudflareToken', label: 'API Token', type: 'password', required: true },
        ],
    },
    {
        id: 'spamzilla',
        name: 'SpamZilla',
        category: 'domains',
        description: 'Expired domain research',
        docsUrl: 'https://spamzilla.io/',
        fields: [
            { key: 'spamzillaKey', label: 'API Key', type: 'password', required: true },
        ],
    },

    // Media Services
    {
        id: 'unsplash',
        name: 'Unsplash',
        category: 'media',
        description: 'Stock photos',
        docsUrl: 'https://unsplash.com/developers',
        fields: [
            { key: 'unsplashKey', label: 'Access Key', type: 'password', required: true },
        ],
    },
    {
        id: 'pexels',
        name: 'Pexels',
        category: 'media',
        description: 'Stock photos and videos',
        docsUrl: 'https://www.pexels.com/api/',
        fields: [
            { key: 'pexelsKey', label: 'API Key', type: 'password', required: true },
        ],
    },

    // Analytics
    {
        id: 'umami',
        name: 'Umami',
        category: 'analytics',
        description: 'Privacy-focused analytics',
        docsUrl: 'https://umami.is/docs',
        fields: [
            { key: 'umamiId', label: 'Website ID', type: 'text', required: true },
            { key: 'umamiApiUrl', label: 'API URL', type: 'url' },
            { key: 'umamiApiKey', label: 'API Token', type: 'password' },
        ],
    },

    // Social / Content
    {
        id: 'devto',
        name: 'Dev.to',
        category: 'social',
        description: 'Cross-post articles to Dev.to',
        docsUrl: 'https://developers.forem.com/api/',
        fields: [
            { key: 'devtoKey', label: 'API Key', type: 'password', required: true },
        ],
    },
    {
        id: 'youtube',
        name: 'YouTube',
        category: 'social',
        description: 'YouTube Data API for video research',
        docsUrl: 'https://developers.google.com/youtube/v3',
        fields: [
            { key: 'youtubeApiKey', label: 'API Key', type: 'password', required: true },
        ],
    },
    {
        id: 'twitter',
        name: 'X (Twitter)',
        category: 'social',
        description: 'Social media trends and posting',
        docsUrl: 'https://developer.x.com/',
        fields: [
            { key: 'twitterBearerToken', label: 'Bearer Token', type: 'password', required: true },
        ],
    },

    // Content Quality APIs
    {
        id: 'googleFactCheck',
        name: 'Google Fact Check',
        category: 'analytics',
        description: 'Verify claims using Google Fact Check API (free tier available)',
        docsUrl: 'https://developers.google.com/fact-check/tools/api',
        fields: [
            { key: 'factCheckApiKey', label: 'API Key', type: 'password', required: true, placeholder: 'AIza...' },
        ],
    },

    // Legacy (GitHub/Vercel - deprecated)
    {
        id: 'github',
        name: 'GitHub',
        category: 'legacy',
        description: 'Repository management for Legacy Websites',
        deprecated: true,
        docsUrl: 'https://docs.github.com/en/rest',
        fields: [
            { key: 'githubToken', label: 'Personal Access Token', type: 'password', required: true },
            { key: 'githubUser', label: 'Username', type: 'text' },
        ],
    },
    {
        id: 'vercel',
        name: 'Vercel',
        category: 'legacy',
        description: 'Deployment for Legacy Websites',
        deprecated: true,
        docsUrl: 'https://vercel.com/docs/rest-api',
        fields: [
            { key: 'vercelToken', label: 'API Token', type: 'password', required: true },
            { key: 'vercelUser', label: 'Team/User', type: 'text' },
        ],
    },
];

// ============================================================================
// Store Interface
// ============================================================================

interface IntegrationsStore {
    // Token Storage (all fields)
    tokens: Record<string, string>;

    // Connection Status
    connectionStatus: Record<string, ConnectionStatus>;

    // Token Management
    setToken: (key: string, value: string) => void;
    getToken: (key: string) => string;
    clearToken: (key: string) => void;
    hasToken: (key: string) => boolean;

    // Integration Helpers
    getIntegrationTokens: (integrationId: string) => Record<string, string>;
    isIntegrationConfigured: (integrationId: string) => boolean;
    getConfiguredIntegrations: () => string[];
    getIntegrationsByCategory: (category: IntegrationCategory) => IntegrationMeta[];

    // Connection Status
    setConnectionStatus: (integrationId: string, status: ConnectionStatus) => void;
    getConnectionStatus: (integrationId: string) => ConnectionStatus | undefined;

    // Bulk Operations
    importTokens: (tokens: Record<string, string>) => number;
    exportTokens: () => Record<string, string>;
    clearAllTokens: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useIntegrationsStore = create<IntegrationsStore>()(
    persist(
        (set, get) => ({
            // ============ State ============
            tokens: {},
            connectionStatus: {},

            // ============ Token Management ============

            setToken: (key, value) => set(state => ({
                tokens: { ...state.tokens, [key]: value }
            })),

            getToken: (key) => get().tokens[key] || '',

            clearToken: (key) => set(state => {
                const { [key]: _, ...rest } = state.tokens;
                return { tokens: rest };
            }),

            hasToken: (key) => {
                const token = get().tokens[key];
                return !!token && token.length > 0;
            },

            // ============ Integration Helpers ============

            getIntegrationTokens: (integrationId) => {
                const integration = INTEGRATIONS.find(i => i.id === integrationId);
                if (!integration) return {};

                const tokens: Record<string, string> = {};
                for (const field of integration.fields) {
                    tokens[field.key] = get().tokens[field.key] || '';
                }
                return tokens;
            },

            isIntegrationConfigured: (integrationId) => {
                const integration = INTEGRATIONS.find(i => i.id === integrationId);
                if (!integration) return false;

                const requiredFields = integration.fields.filter(f => f.required);
                return requiredFields.every(f => get().hasToken(f.key));
            },

            getConfiguredIntegrations: () => {
                return INTEGRATIONS
                    .filter(i => get().isIntegrationConfigured(i.id))
                    .map(i => i.id);
            },

            getIntegrationsByCategory: (category) => {
                return INTEGRATIONS.filter(i => i.category === category);
            },

            // ============ Connection Status ============

            setConnectionStatus: (integrationId, status) => set(state => ({
                connectionStatus: { ...state.connectionStatus, [integrationId]: status }
            })),

            getConnectionStatus: (integrationId) => get().connectionStatus[integrationId],

            // ============ Bulk Operations ============

            importTokens: (tokens) => {
                let count = 0;
                for (const [key, value] of Object.entries(tokens)) {
                    if (value && value.length > 0) {
                        get().setToken(key, value);
                        count++;
                    }
                }
                return count;
            },

            exportTokens: () => ({ ...get().tokens }),

            clearAllTokens: () => set({ tokens: {}, connectionStatus: {} }),
        }),
        {
            name: 'ifrit_integrations',
            partialize: (state) => ({
                tokens: state.tokens,
            }),
        }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIntegrationsByCategory = (category: IntegrationCategory) =>
    INTEGRATIONS.filter(i => i.category === category);

export const selectActiveIntegrations = (state: IntegrationsStore) =>
    INTEGRATIONS.filter(i => state.isIntegrationConfigured(i.id) && !i.deprecated);

export const selectLegacyIntegrations = () =>
    INTEGRATIONS.filter(i => i.deprecated);
