/**
 * Plugin Sync Types
 * FSD: features/wordpress/hooks/pluginSyncTypes.ts
 * 
 * Types and constants for plugin sync - separated to allow
 * server-safe imports without loading React hooks.
 */

// ============================================================================
// Types
// ============================================================================

export interface PluginInfo {
    slug: string;
    name: string;
    active: boolean;
    category?: string;
}

export interface DetectedFeatures {
    hasComplianz: boolean;
    hasRankMath: boolean;
    hasYoast: boolean;
    hasCachePlugin: boolean;
    hasSecurityPlugin: boolean;
    hasSiteKit: boolean;
}

export interface SyncResult {
    success: boolean;
    plugins: PluginInfo[];
    detectedFeatures: DetectedFeatures;
    stats: {
        postCount: number;
        pageCount: number;
    };
    syncedAt: number;
    error?: string;
}

export interface UsePluginSyncReturn {
    /** Current sync state */
    plugins: PluginInfo[];
    detectedFeatures: DetectedFeatures | null;
    syncing: boolean;
    lastSyncedAt: number | null;

    /** Actions */
    syncPlugins: () => Promise<SyncResult | null>;
    installPlugin: (slug: string, displayName: string) => Promise<boolean>;

    /** Install states */
    installingPlugin: string | null;
}

// ============================================================================
// Recommended Plugins
// ============================================================================

export const RECOMMENDED_PLUGINS = [
    {
        slug: 'complianz-gdpr',
        name: 'Complianz GDPR',
        category: 'gdpr',
        description: 'Cookie consent & privacy compliance',
        priority: 1,
    },
    {
        slug: 'seo-by-rank-math',
        name: 'Rank Math SEO',
        category: 'seo',
        description: 'SEO optimization & schema markup',
        priority: 2,
    },
    {
        slug: 'google-site-kit',
        name: 'Site Kit by Google',
        category: 'analytics',
        description: 'Google Analytics, Search Console, AdSense',
        priority: 3,
    },
    {
        slug: 'litespeed-cache',
        name: 'LiteSpeed Cache',
        category: 'cache',
        description: 'Page caching & performance optimization',
        priority: 4,
    },
];
