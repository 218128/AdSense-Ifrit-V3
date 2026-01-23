/**
 * WP Sites Store
 * FSD: features/wordpress/model/wpSiteStore.ts
 * 
 * Zustand store for WordPress Sites using the new clean types.
 * Handles CRUD operations, sync, and persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    WPSite,
    WPArticle,
    WPSiteConfig,
    WPConnectionStatus,
    AdsenseStatus,
    WPCategory,
    WPTag,
    WPAuthor,
    HumanizationConfig,
    DEFAULT_HUMANIZATION_CONFIG,
} from './wpSiteTypes';

// ============================================================================
// Store State
// ============================================================================

interface WPSitesState {
    // Sites
    sites: Record<string, WPSite>;           // Keyed by site ID

    // Articles per site
    articles: Record<string, WPArticle[]>;   // Keyed by site ID

    // Active selections
    activeSiteId: string | null;
    activeArticleId: string | null;

    // Loading states
    isLoading: boolean;
    isSyncing: string | null;                // Site ID being synced

    // Errors
    lastError: string | null;
}

interface WPSitesActions {
    // ─────────────────────────────────────────────────────────────────────────
    // Site CRUD
    // ─────────────────────────────────────────────────────────────────────────
    addSite: (site: Omit<WPSite, 'id' | 'createdAt' | 'updatedAt'>) => WPSite;
    updateSite: (id: string, updates: Partial<WPSite>) => void;
    deleteSite: (id: string) => void;
    getSite: (id: string) => WPSite | undefined;
    getAllSites: () => WPSite[];

    // ─────────────────────────────────────────────────────────────────────────
    // Article CRUD
    // ─────────────────────────────────────────────────────────────────────────
    addArticle: (siteId: string, article: Omit<WPArticle, 'id' | 'createdAt' | 'updatedAt'>) => WPArticle;
    updateArticle: (siteId: string, articleId: string, updates: Partial<WPArticle>) => void;
    deleteArticle: (siteId: string, articleId: string) => void;
    getArticle: (siteId: string, articleId: string) => WPArticle | undefined;
    getArticles: (siteId: string) => WPArticle[];

    // ─────────────────────────────────────────────────────────────────────────
    // Site Status
    // ─────────────────────────────────────────────────────────────────────────
    updateConnectionStatus: (id: string, status: WPConnectionStatus, error?: string) => void;
    updateAdsenseStatus: (id: string, status: AdsenseStatus, publisherId?: string) => void;
    updateSiteStats: (id: string, stats: { articleCount?: number; publishedArticleCount?: number; totalWordCount?: number }) => void;

    // ─────────────────────────────────────────────────────────────────────────
    // Essential Pages
    // ─────────────────────────────────────────────────────────────────────────
    updateEssentialPages: (id: string, pages: {
        hasAboutPage?: boolean;
        hasContactPage?: boolean;
        hasPrivacyPolicy?: boolean;
        hasTermsOfService?: boolean;
        hasDisclaimer?: boolean;
    }) => void;

    // ─────────────────────────────────────────────────────────────────────────
    // Sync Data
    // ─────────────────────────────────────────────────────────────────────────
    syncSiteData: (id: string, data: {
        categories?: WPCategory[];
        tags?: WPTag[];
        authors?: WPAuthor[];
    }) => void;

    // ─────────────────────────────────────────────────────────────────────────
    // Hunt Artifact Consumption
    // ─────────────────────────────────────────────────────────────────────────
    loadHuntProfile: (siteId: string, domain: string) => Promise<boolean>;

    // ─────────────────────────────────────────────────────────────────────────
    // Selection
    // ─────────────────────────────────────────────────────────────────────────
    setActiveSite: (id: string | null) => void;
    setActiveArticle: (id: string | null) => void;

    // ─────────────────────────────────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────────────────────────────────
    setLoading: (loading: boolean) => void;
    setSyncing: (siteId: string | null) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: WPSitesState = {
    sites: {},
    articles: {},
    activeSiteId: null,
    activeArticleId: null,
    isLoading: false,
    isSyncing: null,
    lastError: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function now(): number {
    return Date.now();
}

// ============================================================================
// Store
// ============================================================================

export const useWPSitesStore = create<WPSitesState & WPSitesActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ─────────────────────────────────────────────────────────────────
            // Site CRUD
            // ─────────────────────────────────────────────────────────────────

            addSite: (siteData) => {
                const id = generateId('wpsite');
                const timestamp = now();

                const site: WPSite = {
                    ...siteData,
                    id,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };

                set((state) => ({
                    sites: { ...state.sites, [id]: site },
                    articles: { ...state.articles, [id]: [] },
                }));

                return site;
            },

            updateSite: (id, updates) => {
                set((state) => {
                    const existing = state.sites[id];
                    if (!existing) return state;

                    return {
                        sites: {
                            ...state.sites,
                            [id]: { ...existing, ...updates, updatedAt: now() },
                        },
                    };
                });
            },

            deleteSite: (id) => {
                set((state) => {
                    const { [id]: removed, ...remainingSites } = state.sites;
                    const { [id]: removedArticles, ...remainingArticles } = state.articles;

                    return {
                        sites: remainingSites,
                        articles: remainingArticles,
                        activeSiteId: state.activeSiteId === id ? null : state.activeSiteId,
                    };
                });
            },

            getSite: (id) => get().sites[id],

            getAllSites: () => Object.values(get().sites),

            // ─────────────────────────────────────────────────────────────────
            // Article CRUD
            // ─────────────────────────────────────────────────────────────────

            addArticle: (siteId, articleData) => {
                const id = generateId('wpart');
                const timestamp = now();

                const article: WPArticle = {
                    ...articleData,
                    id,
                    siteId,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };

                set((state) => ({
                    articles: {
                        ...state.articles,
                        [siteId]: [...(state.articles[siteId] || []), article],
                    },
                }));

                // Update site stats
                get().updateSiteStats(siteId, {
                    articleCount: (get().articles[siteId]?.length || 0),
                });

                return article;
            },

            updateArticle: (siteId, articleId, updates) => {
                set((state) => {
                    const siteArticles = state.articles[siteId];
                    if (!siteArticles) return state;

                    const updatedArticles = siteArticles.map((article) =>
                        article.id === articleId
                            ? { ...article, ...updates, updatedAt: now() }
                            : article
                    );

                    return {
                        articles: { ...state.articles, [siteId]: updatedArticles },
                    };
                });
            },

            deleteArticle: (siteId, articleId) => {
                set((state) => {
                    const siteArticles = state.articles[siteId];
                    if (!siteArticles) return state;

                    const filteredArticles = siteArticles.filter((a) => a.id !== articleId);

                    return {
                        articles: { ...state.articles, [siteId]: filteredArticles },
                        activeArticleId: state.activeArticleId === articleId ? null : state.activeArticleId,
                    };
                });

                // Update site stats
                get().updateSiteStats(siteId, {
                    articleCount: get().articles[siteId]?.length || 0,
                });
            },

            getArticle: (siteId, articleId) => {
                return get().articles[siteId]?.find((a) => a.id === articleId);
            },

            getArticles: (siteId) => get().articles[siteId] || [],

            // ─────────────────────────────────────────────────────────────────
            // Site Status
            // ─────────────────────────────────────────────────────────────────

            updateConnectionStatus: (id, status, error) => {
                get().updateSite(id, {
                    status,
                    lastError: error,
                    lastCheckedAt: now(),
                });
            },

            updateAdsenseStatus: (id, status, publisherId) => {
                get().updateSite(id, {
                    adsenseStatus: status,
                    adsensePublisherId: publisherId,
                });
            },

            updateSiteStats: (id, stats) => {
                const site = get().sites[id];
                if (!site) return;

                get().updateSite(id, {
                    articleCount: stats.articleCount ?? site.articleCount,
                    publishedArticleCount: stats.publishedArticleCount ?? site.publishedArticleCount,
                    totalWordCount: stats.totalWordCount ?? site.totalWordCount,
                });
            },

            // ─────────────────────────────────────────────────────────────────
            // Essential Pages
            // ─────────────────────────────────────────────────────────────────

            updateEssentialPages: (id, pages) => {
                const site = get().sites[id];
                if (!site) return;

                get().updateSite(id, {
                    hasAboutPage: pages.hasAboutPage ?? site.hasAboutPage,
                    hasContactPage: pages.hasContactPage ?? site.hasContactPage,
                    hasPrivacyPolicy: pages.hasPrivacyPolicy ?? site.hasPrivacyPolicy,
                    hasTermsOfService: pages.hasTermsOfService ?? site.hasTermsOfService,
                    hasDisclaimer: pages.hasDisclaimer ?? site.hasDisclaimer,
                });
            },

            // ─────────────────────────────────────────────────────────────────
            // Sync Data
            // ─────────────────────────────────────────────────────────────────

            syncSiteData: (id, data) => {
                get().updateSite(id, {
                    categories: data.categories,
                    tags: data.tags,
                    authors: data.authors,
                    syncedAt: now(),
                });
            },

            // ─────────────────────────────────────────────────────────────────
            // Hunt Artifact Consumption
            // ─────────────────────────────────────────────────────────────────

            loadHuntProfile: async (siteId, domain) => {
                const site = get().sites[siteId];
                if (!site) {
                    console.warn(`[WPSites] Site ${siteId} not found`);
                    return false;
                }

                // Delegate to service (SoC: store doesn't do cross-feature imports)
                const { loadHuntProfileForDomain } = await import('../lib/wpSiteService');
                const result = await loadHuntProfileForDomain(domain);

                if (!result.success || !result.profileData) {
                    console.warn(`[WPSites] ${result.error || 'No profile found'}`);
                    return false;
                }

                // Service returned data, store just updates state
                // NOTE: niche is now stored only in profileData, not as standalone field
                get().updateSite(siteId, {
                    profileData: result.profileData,
                });

                console.log(`[WPSites] Hunt profile loaded for ${domain}`);
                return true;
            },

            // ─────────────────────────────────────────────────────────────────
            // Selection
            // ─────────────────────────────────────────────────────────────────

            setActiveSite: (id) => set({ activeSiteId: id }),
            setActiveArticle: (id) => set({ activeArticleId: id }),

            // ─────────────────────────────────────────────────────────────────
            // Utility
            // ─────────────────────────────────────────────────────────────────

            setLoading: (loading) => set({ isLoading: loading }),
            setSyncing: (siteId) => set({ isSyncing: siteId }),
            setError: (error) => set({ lastError: error }),
            reset: () => set(initialState),
        }),
        {
            name: 'wp-sites-storage',
            version: 1,
            partialize: (state) => ({
                sites: state.sites,
                articles: state.articles,
            }),
        }
    )
);

// ============================================================================
// Selectors (for performance)
// ============================================================================

export const selectActiveSite = (state: WPSitesState) =>
    state.activeSiteId ? state.sites[state.activeSiteId] : null;

export const selectActiveArticle = (state: WPSitesState) => {
    if (!state.activeSiteId || !state.activeArticleId) return null;
    return state.articles[state.activeSiteId]?.find(a => a.id === state.activeArticleId) ?? null;
};

export const selectSitesByStatus = (state: WPSitesState, status: WPConnectionStatus) =>
    Object.values(state.sites).filter(s => s.status === status);

export const selectConnectedSites = (state: WPSitesState) =>
    selectSitesByStatus(state, 'connected');

export const selectSitesNeedingAdsense = (state: WPSitesState) =>
    Object.values(state.sites).filter(s => s.adsenseStatus === 'not-applied');

export const selectPublishedArticles = (state: WPSitesState, siteId: string) =>
    (state.articles[siteId] || []).filter(a => a.localStatus === 'published');

// Legacy-compatible: sites as array
export const selectSitesArray = (state: WPSitesState) => Object.values(state.sites);

// ============================================================================
// Hooks Shortcuts
// ============================================================================

export const useActiveSite = () => useWPSitesStore(selectActiveSite);
export const useActiveArticle = () => useWPSitesStore(selectActiveArticle);
export const useConnectedSites = () => useWPSitesStore(selectConnectedSites);

// ============================================================================
// Legacy-Compatible Hook (for migration)
// Returns { sites: WPSite[], ... } matching old useWordPressStore API
// ============================================================================

interface LegacySiteInput {
    name: string;
    url: string;
    username: string;
    appPassword: string;
    // Hunt data passthrough
    siteType?: 'authority' | 'affiliate' | 'magazine' | 'business' | 'general';
    hostingProvider?: 'hostinger' | 'other';
    provisionedVia?: 'hostinger-mcp' | 'manual';
}

export const useWPSitesLegacy = () => {
    const store = useWPSitesStore();

    // Wrap addSite to accept minimal input (like old store) and add defaults
    const addSiteLegacy = (input: LegacySiteInput): WPSite => {
        return store.addSite({
            name: input.name,
            url: input.url,
            username: input.username,
            appPassword: input.appPassword,
            status: 'pending',
            // Hunt data passthrough (niche is now in profileData only)
            siteType: input.siteType,
            hostingProvider: input.hostingProvider,
            provisionedVia: input.provisionedVia,
        });
    };

    return {
        sites: Object.values(store.sites),
        activeSiteId: store.activeSiteId,
        addSite: addSiteLegacy,
        updateSite: store.updateSite,
        removeSite: store.deleteSite,
        getSite: store.getSite,
        getActiveSite: () => store.activeSiteId ? store.sites[store.activeSiteId] : undefined,
        setActiveSite: store.setActiveSite,
        updateSiteStatus: (id: string, status: WPConnectionStatus, error?: string) =>
            store.updateConnectionStatus(id, status, error),
        updateSiteMetadata: (id: string, data: { categories?: WPCategory[]; tags?: WPTag[]; authors?: WPAuthor[] }) =>
            store.syncSiteData(id, data),
    };
};
