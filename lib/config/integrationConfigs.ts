/**
 * Integration Configurations
 * FSD: lib/config/integrationConfigs.ts
 * 
 * Centralized metadata for all third-party integrations.
 * Used by IntegrationsSection and other components that need integration info.
 */

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
// Helper Functions
// ============================================================================

export const getIntegrationsByCategory = (category: IntegrationCategory): IntegrationMeta[] =>
    INTEGRATIONS.filter(i => i.category === category);

export const getIntegrationById = (id: string): IntegrationMeta | undefined =>
    INTEGRATIONS.find(i => i.id === id);

export const getLegacyIntegrations = (): IntegrationMeta[] =>
    INTEGRATIONS.filter(i => i.deprecated);

export const getActiveIntegrations = (): IntegrationMeta[] =>
    INTEGRATIONS.filter(i => !i.deprecated);
