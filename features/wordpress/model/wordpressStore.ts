/**
 * @legacy WordPress Feature - Zustand Store
 * FSD: features/wordpress/model/wordpressStore.ts
 * 
 * DEPRECATION NOTICE: This store is maintained for backward compatibility.
 * New code should use `useWPSitesStore` from `wpSiteStore.ts` instead.
 * 
 * The new store provides:
 * - Full CRUD for sites AND articles
 * - AdSense readiness fields
 * - Hostinger integration fields
 * - Essential pages tracking
 * - Better selectors and hooks
 * 
 * Migration:
 *   import { useWordPressStore } from './wordpressStore';  // OLD
 *   import { useWPSitesStore } from './wpSiteStore';       // NEW
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WPSite, WPCategory, WPTag, WPAuthor } from './types';

// ============================================================================
// Store Interface
// ============================================================================

interface WordPressStore {
    // State
    sites: WPSite[];
    activeSiteId: string | null;

    // Site CRUD
    addSite: (site: Omit<WPSite, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => WPSite;
    updateSite: (id: string, updates: Partial<WPSite>) => void;
    removeSite: (id: string) => void;

    // Getters
    getSite: (id: string) => WPSite | undefined;
    getActiveSite: () => WPSite | undefined;
    setActiveSite: (id: string | null) => void;

    // Sync operations
    updateSiteStatus: (id: string, status: WPSite['status'], error?: string) => void;
    updateSiteMetadata: (id: string, data: {
        categories?: WPCategory[];
        tags?: WPTag[];
        authors?: WPAuthor[];
    }) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useWordPressStore = create<WordPressStore>()(
    persist(
        (set, get) => ({
            sites: [],
            activeSiteId: null,

            addSite: (siteData) => {
                const newSite: WPSite = {
                    id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    ...siteData,
                    status: 'pending',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set((state) => ({
                    sites: [...state.sites, newSite]
                }));

                return newSite;
            },

            updateSite: (id, updates) => {
                set((state) => ({
                    sites: state.sites.map((site) =>
                        site.id === id
                            ? { ...site, ...updates, updatedAt: Date.now() }
                            : site
                    )
                }));
            },

            removeSite: (id) => {
                set((state) => ({
                    sites: state.sites.filter((site) => site.id !== id),
                    activeSiteId: state.activeSiteId === id ? null : state.activeSiteId
                }));
            },

            getSite: (id) => {
                return get().sites.find((site) => site.id === id);
            },

            getActiveSite: () => {
                const { sites, activeSiteId } = get();
                return activeSiteId ? sites.find((s) => s.id === activeSiteId) : undefined;
            },

            setActiveSite: (id) => {
                set({ activeSiteId: id });
            },

            updateSiteStatus: (id, status, error) => {
                set((state) => ({
                    sites: state.sites.map((site) =>
                        site.id === id
                            ? {
                                ...site,
                                status,
                                lastError: error,
                                updatedAt: Date.now()
                            }
                            : site
                    )
                }));
            },

            updateSiteMetadata: (id, data) => {
                set((state) => ({
                    sites: state.sites.map((site) =>
                        site.id === id
                            ? {
                                ...site,
                                ...data,
                                syncedAt: Date.now(),
                                updatedAt: Date.now()
                            }
                            : site
                    )
                }));
            },
        }),
        {
            name: 'ifrit-wordpress-store',
        }
    )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useWPSites = () => useWordPressStore((s) => s.sites);
export const useActiveSite = () => useWordPressStore((s) => s.getActiveSite());
export const useConnectedSites = () =>
    useWordPressStore((s) => s.sites.filter((site) => site.status === 'connected'));
