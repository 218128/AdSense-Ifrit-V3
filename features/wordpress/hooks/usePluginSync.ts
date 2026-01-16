'use client';

/**
 * usePluginSync Hook
 * FSD: features/wordpress/hooks/usePluginSync.ts
 * 
 * Hook for syncing and managing WordPress plugins with:
 * - Real-time status tracking via GlobalActionStatus
 * - Plugin detection via WP REST API
 * - Plugin installation via Hostinger MCP
 * 
 * @module wordpress/hooks/usePluginSync
 */

import { useState, useCallback } from 'react';
import { useGlobalActionStatus } from '@/lib/shared/hooks/useGlobalActionStatus';
import { deployPlugin } from '@/features/hosting/lib/hostingerMcp';
import type { WPSite } from '../model/wpSiteTypes';
import { useWPSitesStore } from '../model/wpSiteStore';

// Import types for local use (from server-safe types file)
import type {
    PluginInfo,
    DetectedFeatures,
    SyncResult,
    UsePluginSyncReturn,
} from './pluginSyncTypes';

// ============================================================================
// Hook Implementation
// ============================================================================



export function usePluginSync(site: WPSite): UsePluginSyncReturn {
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [detectedFeatures, setDetectedFeatures] = useState<DetectedFeatures | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
    const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);

    const { trackAction, clearOnNewAction } = useGlobalActionStatus();
    const updateSite = useWPSitesStore(state => state.updateSite);

    /**
     * Sync plugins from WordPress site
     */
    const syncPlugins = useCallback(async (): Promise<SyncResult | null> => {
        if (!site.url || !site.username || !site.appPassword) {
            console.warn('[PluginSync] Missing site credentials');
            return null;
        }

        setSyncing(true);
        clearOnNewAction();

        try {
            const result = await trackAction(
                `Sync Plugins: ${site.name}`,
                'wordpress',
                async (tracker) => {
                    tracker.step('Connecting to WordPress...');

                    const response = await fetch(`/api/wp-sites/${site.id}/sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            siteUrl: site.url,
                            username: site.username,
                            appPassword: site.appPassword,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Sync failed: ${response.status}`);
                    }

                    const data = await response.json() as SyncResult;

                    tracker.step(`Found ${data.plugins.length} plugins`);

                    // Update local state
                    setPlugins(data.plugins);
                    setDetectedFeatures(data.detectedFeatures);
                    setLastSyncedAt(data.syncedAt);

                    // Update WPSite store with detected plugin status
                    updateSite(site.id, {
                        seoPluginActive: data.detectedFeatures.hasRankMath || data.detectedFeatures.hasYoast,
                        cachePluginActive: data.detectedFeatures.hasCachePlugin,
                        // Add detected features to site record for future use
                        syncedAt: data.syncedAt,
                    });

                    tracker.complete(`Synced ${data.plugins.length} plugins`);
                    return data;
                }
            );

            return result;
        } catch (error) {
            console.error('[PluginSync] Sync failed:', error);
            return null;
        } finally {
            setSyncing(false);
        }
    }, [site, trackAction, clearOnNewAction, updateSite]);

    /**
     * Install a plugin via Hostinger MCP
     */
    const installPlugin = useCallback(async (
        slug: string,
        displayName: string
    ): Promise<boolean> => {
        // Check if we have Hostinger account ID
        if (!site.hostingerAccountId) {
            console.error('[PluginSync] No Hostinger account ID - cannot install plugin');
            return false;
        }

        setInstallingPlugin(slug);
        clearOnNewAction();

        try {
            const success = await trackAction(
                `Install ${displayName}`,
                'hosting',
                async (tracker) => {
                    tracker.step('Connecting to Hostinger...');

                    const result = await deployPlugin(site.hostingerAccountId!, slug);

                    if (!result.success) {
                        throw new Error(result.error || 'Plugin installation failed');
                    }

                    tracker.step('Verifying installation...');

                    // Re-sync to verify plugin was installed
                    await new Promise(r => setTimeout(r, 2000)); // Wait for WP to register
                    const syncResult = await syncPlugins();

                    const installed = syncResult?.plugins.some(
                        p => p.slug.toLowerCase().includes(slug.toLowerCase()) && p.active
                    );

                    if (installed) {
                        tracker.complete(`${displayName} installed and active`);
                        return true;
                    } else {
                        tracker.complete(`${displayName} installed - may need activation in WP admin`);
                        return true;
                    }
                }
            );

            return success;
        } catch (error) {
            console.error('[PluginSync] Install failed:', error);
            return false;
        } finally {
            setInstallingPlugin(null);
        }
    }, [site, trackAction, clearOnNewAction, syncPlugins]);

    return {
        plugins,
        detectedFeatures,
        syncing,
        lastSyncedAt,
        syncPlugins,
        installPlugin,
        installingPlugin,
    };
}

export default usePluginSync;
