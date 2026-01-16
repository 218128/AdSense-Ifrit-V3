/**
 * MediaAssetLibrary - Persisted Image Asset Store
 * FSD: features/campaigns/lib/mediaAssetLibrary.ts
 * 
 * Stores ALL collected images (both AI-generated and stock search results)
 * for A/B testing, post refresh, and future use.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface MediaAsset {
    id: string;
    url: string;
    alt: string;
    source: 'ai' | 'unsplash' | 'pexels' | 'brave' | 'serper' | 'perplexity';
    score: number;
    width?: number;
    height?: number;
    photographer?: string;
    photographerUrl?: string;
    license?: string;
    /** WordPress media ID (only set after upload) */
    wpMediaId?: number;
    /** Status: url = not uploaded, uploaded = in WP, used = active on post */
    status: 'url' | 'uploaded' | 'used' | 'archived';
    /** How it's currently used */
    usedAs?: 'cover' | 'inline' | 'og-image' | 'twitter-card';
    createdAt: number;
}

export interface PostMediaLibrary {
    postId?: number;
    campaignId: string;
    topic: string;
    assets: MediaAsset[];
    selectedCoverId?: string;
    selectedInlineIds: string[];
    abTestVariants?: {
        variantId: string;
        coverId: string;
        assignedAt: number;
        impressions?: number;
        clicks?: number;
    }[];
    createdAt: number;
    updatedAt: number;
}

interface MediaAssetLibraryState {
    /** Libraries keyed by `${campaignId}:${topic}` */
    libraries: Record<string, PostMediaLibrary>;

    // ========================================
    // Actions
    // ========================================

    /** Persist all collected assets from a pipeline run */
    persistAssets: (
        campaignId: string,
        topic: string,
        assets: Array<Omit<MediaAsset, 'status' | 'createdAt'>>,
        selectedCoverId?: string,
        selectedInlineIds?: string[]
    ) => void;

    /** Get assets for a post (for retry/refresh) */
    getAssetsForPost: (campaignId: string, topic: string) => MediaAsset[];

    /** Get library record */
    getLibrary: (campaignId: string, topic: string) => PostMediaLibrary | undefined;

    /** Update selected cover */
    selectCover: (campaignId: string, topic: string, assetId: string) => void;

    /** Update selected inline images */
    selectInline: (campaignId: string, topic: string, assetIds: string[]) => void;

    /** Update asset status after WordPress upload */
    markAsUploaded: (campaignId: string, topic: string, assetId: string, wpMediaId: number) => void;

    /** Get alternative images for A/B testing */
    getAlternativesForABTest: (campaignId: string, topic: string, count?: number) => MediaAsset[];

    /** Link library to WordPress post ID */
    linkToPost: (campaignId: string, topic: string, postId: number) => void;

    /** Get stats */
    getStats: () => {
        totalLibraries: number;
        totalAssets: number;
        bySource: Record<string, number>;
    };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useMediaAssetLibrary = create<MediaAssetLibraryState>()(
    persist(
        (set, get) => ({
            libraries: {},

            persistAssets: (campaignId, topic, assets, selectedCoverId, selectedInlineIds = []) => {
                const key = `${campaignId}:${topic}`;
                const now = Date.now();

                const fullAssets: MediaAsset[] = assets.map(asset => ({
                    ...asset,
                    status: asset.id === selectedCoverId || selectedInlineIds?.includes(asset.id)
                        ? 'used' as const
                        : 'url' as const,
                    usedAs: asset.id === selectedCoverId
                        ? 'cover' as const
                        : selectedInlineIds?.includes(asset.id)
                            ? 'inline' as const
                            : undefined,
                    createdAt: now,
                }));

                set(state => ({
                    libraries: {
                        ...state.libraries,
                        [key]: {
                            campaignId,
                            topic,
                            assets: fullAssets,
                            selectedCoverId: selectedCoverId || fullAssets[0]?.id,
                            selectedInlineIds: selectedInlineIds || fullAssets.slice(1, 3).map(a => a.id),
                            createdAt: now,
                            updatedAt: now,
                        },
                    },
                }));

                console.log(`[MediaAssetLibrary] Persisted ${fullAssets.length} assets for "${topic}"`);
            },

            getAssetsForPost: (campaignId, topic) => {
                const key = `${campaignId}:${topic}`;
                return get().libraries[key]?.assets || [];
            },

            getLibrary: (campaignId, topic) => {
                const key = `${campaignId}:${topic}`;
                return get().libraries[key];
            },

            selectCover: (campaignId, topic, assetId) => {
                const key = `${campaignId}:${topic}`;
                set(state => {
                    const lib = state.libraries[key];
                    if (!lib) return state;

                    // Update used status
                    const updatedAssets = lib.assets.map(a => ({
                        ...a,
                        status: a.id === assetId ? 'used' as const : (a.status === 'used' && a.usedAs === 'cover' ? 'url' as const : a.status),
                        usedAs: a.id === assetId ? 'cover' as const : (a.usedAs === 'cover' ? undefined : a.usedAs),
                    }));

                    return {
                        libraries: {
                            ...state.libraries,
                            [key]: {
                                ...lib,
                                selectedCoverId: assetId,
                                assets: updatedAssets,
                                updatedAt: Date.now(),
                            },
                        },
                    };
                });
            },

            selectInline: (campaignId, topic, assetIds) => {
                const key = `${campaignId}:${topic}`;
                set(state => {
                    const lib = state.libraries[key];
                    if (!lib) return state;

                    const updatedAssets = lib.assets.map(a => ({
                        ...a,
                        status: assetIds.includes(a.id) ? 'used' as const : (a.usedAs === 'inline' ? 'url' as const : a.status),
                        usedAs: assetIds.includes(a.id) ? 'inline' as const : (a.usedAs === 'inline' ? undefined : a.usedAs),
                    }));

                    return {
                        libraries: {
                            ...state.libraries,
                            [key]: {
                                ...lib,
                                selectedInlineIds: assetIds,
                                assets: updatedAssets,
                                updatedAt: Date.now(),
                            },
                        },
                    };
                });
            },

            markAsUploaded: (campaignId, topic, assetId, wpMediaId) => {
                const key = `${campaignId}:${topic}`;
                set(state => {
                    const lib = state.libraries[key];
                    if (!lib) return state;

                    const updatedAssets = lib.assets.map(a =>
                        a.id === assetId
                            ? { ...a, status: 'uploaded' as const, wpMediaId }
                            : a
                    );

                    return {
                        libraries: {
                            ...state.libraries,
                            [key]: { ...lib, assets: updatedAssets, updatedAt: Date.now() },
                        },
                    };
                });
            },

            getAlternativesForABTest: (campaignId, topic, count = 3) => {
                const key = `${campaignId}:${topic}`;
                const lib = get().libraries[key];
                if (!lib) return [];

                // Get unused high-scoring images
                return lib.assets
                    .filter(a => a.status !== 'used' && a.status !== 'archived')
                    .sort((a, b) => b.score - a.score)
                    .slice(0, count);
            },

            linkToPost: (campaignId, topic, postId) => {
                const key = `${campaignId}:${topic}`;
                set(state => {
                    const lib = state.libraries[key];
                    if (!lib) return state;

                    return {
                        libraries: {
                            ...state.libraries,
                            [key]: { ...lib, postId, updatedAt: Date.now() },
                        },
                    };
                });
            },

            getStats: () => {
                const libs = Object.values(get().libraries);
                const bySource: Record<string, number> = {};

                let totalAssets = 0;
                for (const lib of libs) {
                    for (const asset of lib.assets) {
                        totalAssets++;
                        bySource[asset.source] = (bySource[asset.source] || 0) + 1;
                    }
                }

                return {
                    totalLibraries: libs.length,
                    totalAssets,
                    bySource,
                };
            },
        }),
        {
            name: 'ifrit-media-asset-library',
            version: 1,
        }
    )
);

// ============================================================================
// Integration Helper
// ============================================================================

/**
 * Persist assets from pipeline context after image generation
 * Call this after generateImagesEnhanced in the pipeline
 */
export async function persistPipelineAssets(
    campaignId: string,
    topic: string,
    allAssets: Array<{
        id: string;
        url: string;
        alt: string;
        source: 'ai' | 'unsplash' | 'pexels' | 'brave' | 'serper' | 'perplexity';
        score: number;
        width?: number;
        height?: number;
        photographer?: string;
    }>,
    selectedCover?: { url: string; alt: string },
    selectedInline?: Array<{ url: string; alt: string }>
): Promise<void> {
    const store = useMediaAssetLibrary.getState();

    // Find IDs of selected images
    const selectedCoverId = selectedCover
        ? allAssets.find(a => a.url === selectedCover.url)?.id
        : undefined;

    const selectedInlineIds = selectedInline
        ? selectedInline
            .map(sel => allAssets.find(a => a.url === sel.url)?.id)
            .filter((id): id is string => !!id)
        : [];

    store.persistAssets(campaignId, topic, allAssets, selectedCoverId, selectedInlineIds);
}
