/**
 * Hunt Store - Zustand state management for Hunt tab
 * 
 * DUAL PURPOSE:
 * 1. Workflow state for Domain Acquire (find → analyze → purchase queues)
 * 2. Aggregation layer for WP Sites & Campaign (finalized selections)
 * 
 * Feature stores (trendStore, keywordStore, domainAcquireStore) manage LOCAL state.
 * huntStore aggregates FINALIZED data for downstream consumption.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/storage';
import type { KeywordItem } from '@/lib/keywords/types';
import type { TrendItem } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';
import type { DomainProfile } from '@/lib/domains/types';

// ============ WORKFLOW TYPES (Domain Acquire) ============

export interface AnalyzeCandidate {
    domain: string;
    tld: string;
    score: number;
    recommendation: string;
    estimatedValue?: number;
    spamzillaData?: {
        wasAdult?: boolean;
        wasCasino?: boolean;
        wasPBN?: boolean;
        hadSpam?: boolean;
        domainAge?: number;
        trustFlow?: number;
        citationFlow?: number;
        domainAuthority?: number;
        majesticTopics?: string;
    };
    keywordContext?: {
        keywords: string[];
        research: Record<string, string[]>;
        niche?: string;
    };
}

export interface QueuedDomain {
    domain: string;
    tld: string;
    score: number;
    recommendation: string;
    estimatedValue: number;
    addedAt: number;
    purchased?: boolean;  // Domain was purchased externally
    siteCreated?: boolean;  // WordPress site provisioned via Hostinger
    // Preserved enrichment data for profile generation
    spamzillaData?: {
        wasAdult?: boolean;
        wasCasino?: boolean;
        wasPBN?: boolean;
        hadSpam?: boolean;
        domainAge?: number;
        trustFlow?: number;
        citationFlow?: number;
        domainAuthority?: number;
        majesticTopics?: string;
    };
    keywordContext?: {
        keywords: string[];
        research: Record<string, string[]>;
        niche?: string;
    };
}

export interface WatchlistDomain {
    domain: string;
    tld: string;
    source: 'manual' | 'free' | 'premium';
    score?: { overall: number; recommendation: string };
    domainRating?: number;
    trustFlow?: number;
    domainAge?: number;
    addedAt: number;
    notes?: string;
}

// ============ AGGREGATION TYPES (for WP Sites & Campaign) ============

export type ProfileStatus = 'pending' | 'generating' | 'success' | 'failed';

// Re-export DomainProfile for convenience
export type { DomainProfile };

// Extended profile with generation metadata
export interface OwnedDomainProfile extends DomainProfile {
    generatedAt?: number;
}

export interface OwnedDomain {
    domain: string;
    tld: string;
    purchasedAt: number;
    score: number;
    estimatedValue: number;
    profileStatus: ProfileStatus;
    profile?: DomainProfile;  // Inline profile data
    profileError?: string;    // Error message if generation failed
    siteCreated?: boolean;
    associatedKeywords?: string[];
    associatedTrends?: string[];
}

// Legacy alias for backwards compatibility
export type PurchasedDomain = OwnedDomain;

export interface SelectedKeyword {
    keyword: string;
    niche?: string;
    cpc?: string;
    researchFindings?: string[];
    selectedAt: number;
}

export interface SelectedTrend {
    topic: string;
    source: string;
    cpcScore?: number;
    niche?: string;
    researchFindings?: string[];
    selectedAt: number;
}

// ============ STORE INTERFACE ============

interface HuntStore {
    // === WORKFLOW QUEUES (Domain Acquire tab) ===
    analyzeQueue: AnalyzeCandidate[];
    addToAnalyze: (domains: AnalyzeCandidate[]) => void;
    removeFromAnalyze: (domain: string) => void;
    clearAnalyzeQueue: () => void;

    purchaseQueue: QueuedDomain[];
    addToPurchase: (domain: AnalyzeCandidate) => void;
    removeFromPurchase: (domain: string) => void;
    clearPurchaseQueue: () => void;
    markAsPurchased: (domain: string) => void;
    markSiteCreated: (domain: string) => void;
    resetSiteCreated: (domain: string) => void;

    // === WATCHLIST ===
    watchlist: WatchlistDomain[];
    addToWatchlist: (domain: WatchlistDomain) => void;
    removeFromWatchlist: (domain: string) => void;
    isWatched: (domain: string) => boolean;
    clearWatchlist: () => void;

    // === SELECTION (bulk actions in Find step) ===
    selectedDomains: Set<string>;
    toggleSelection: (domain: string) => void;
    selectAll: (domains: string[]) => void;
    deselectAll: () => void;
    getSelectedCount: () => number;

    // === OWNED DOMAINS (purchased domains with profiles) ===
    ownedDomains: OwnedDomain[];
    purchaseAndGenerateProfile: (domain: string) => Promise<void>;  // Main trigger
    updateProfileStatus: (domain: string, status: ProfileStatus, profile?: DomainProfile, error?: string) => void;
    retryGenerateProfile: (domain: string) => Promise<void>;
    markOwnedSiteCreated: (domain: string) => void;
    removeOwnedDomain: (domain: string) => void;
    getOwnedDomains: () => OwnedDomain[];

    // Legacy aliases for backwards compatibility (use getOwnedDomains instead)
    addPurchasedDomain: (domain: OwnedDomain) => void;
    removePurchasedDomain: (domain: string) => void;
    getPurchasedDomains: () => OwnedDomain[];

    selectedKeywords: SelectedKeyword[];
    addSelectedKeywords: (keywords: SelectedKeyword[]) => void;
    clearSelectedKeywords: () => void;

    selectedTrends: SelectedTrend[];
    addSelectedTrends: (trends: SelectedTrend[]) => void;
    clearSelectedTrends: () => void;
}

// ============ STORE IMPLEMENTATION ============

export const useHuntStore = create<HuntStore>()(
    persist(
        (set, get) => ({
            // ============ ANALYZE QUEUE ============
            analyzeQueue: [],

            addToAnalyze: (domains) => set((state) => {
                const existing = new Set(state.analyzeQueue.map(d => d.domain));
                const newDomains = domains.filter(d => !existing.has(d.domain));
                return { analyzeQueue: [...state.analyzeQueue, ...newDomains] };
            }),

            removeFromAnalyze: (domain) => set((state) => ({
                analyzeQueue: state.analyzeQueue.filter(d => d.domain !== domain)
            })),

            clearAnalyzeQueue: () => set({ analyzeQueue: [] }),

            // ============ PURCHASE QUEUE ============
            purchaseQueue: [],

            addToPurchase: (domain) => set((state) => {
                if (state.purchaseQueue.some(d => d.domain === domain.domain)) {
                    return state;
                }
                return {
                    purchaseQueue: [...state.purchaseQueue, {
                        domain: domain.domain,
                        tld: domain.tld,
                        score: domain.score,
                        recommendation: domain.recommendation,
                        estimatedValue: domain.estimatedValue || 0,
                        addedAt: Date.now(),
                        // Preserve enrichment data for profile generation
                        spamzillaData: domain.spamzillaData,
                        keywordContext: domain.keywordContext,
                    }],
                    // Remove from analyze queue
                    analyzeQueue: state.analyzeQueue.filter(d => d.domain !== domain.domain)
                };
            }),

            removeFromPurchase: (domain) => set((state) => ({
                purchaseQueue: state.purchaseQueue.filter(d => d.domain !== domain)
            })),

            clearPurchaseQueue: () => set({ purchaseQueue: [] }),

            markAsPurchased: (domain) => set((state) => ({
                purchaseQueue: state.purchaseQueue.map(d =>
                    d.domain === domain ? { ...d, purchased: true } : d
                )
            })),

            markSiteCreated: (domain) => set((state) => ({
                purchaseQueue: state.purchaseQueue.map(d =>
                    d.domain === domain ? { ...d, siteCreated: true } : d
                )
            })),

            resetSiteCreated: (domain) => set((state) => ({
                purchaseQueue: state.purchaseQueue.map(d =>
                    d.domain === domain ? { ...d, siteCreated: false } : d
                )
            })),

            // ============ WATCHLIST ============
            watchlist: [],

            addToWatchlist: (domain) => set((state) => {
                if (state.watchlist.some(d => d.domain === domain.domain)) {
                    return state;
                }
                return { watchlist: [...state.watchlist, domain] };
            }),

            removeFromWatchlist: (domain) => set((state) => ({
                watchlist: state.watchlist.filter(d => d.domain !== domain)
            })),

            isWatched: (domain) => get().watchlist.some(d => d.domain === domain),

            clearWatchlist: () => set({ watchlist: [] }),

            // ============ SELECTION ============
            selectedDomains: new Set(),

            toggleSelection: (domain) => set((state) => {
                const next = new Set(state.selectedDomains);
                if (next.has(domain)) {
                    next.delete(domain);
                } else {
                    next.add(domain);
                }
                return { selectedDomains: next };
            }),

            selectAll: (domains) => set({ selectedDomains: new Set(domains) }),

            deselectAll: () => set({ selectedDomains: new Set() }),

            getSelectedCount: () => get().selectedDomains.size,

            // ============ OWNED DOMAINS ============
            // Purchased domains with profiles for WP Sites & Campaign

            ownedDomains: [],

            purchaseAndGenerateProfile: async (domainName) => {
                const state = get();
                const domainData = state.purchaseQueue.find(d => d.domain === domainName);
                if (!domainData) {
                    console.warn(`[HuntStore] Domain ${domainName} not found in purchase queue`);
                    return;
                }

                // Import service for business logic (SoC: store delegates to service)
                const { processDomainPurchase } = await import('../lib/huntService');

                // Delegate to service with callbacks for state updates
                await processDomainPurchase(domainData, {
                    onStarted: (ownedDomain) => {
                        set((state) => ({
                            purchaseQueue: state.purchaseQueue.filter(d => d.domain !== domainName),
                            ownedDomains: [...state.ownedDomains, ownedDomain],
                        }));
                    },
                    onProfileSuccess: (domain, profile) => {
                        get().updateProfileStatus(domain, 'success', profile);
                    },
                    onProfileFailed: (domain, error) => {
                        get().updateProfileStatus(domain, 'failed', undefined, error);
                    },
                });
            },

            updateProfileStatus: (domainName, status, profile, error) => set((state) => ({
                ownedDomains: state.ownedDomains.map(d =>
                    d.domain === domainName
                        ? { ...d, profileStatus: status, profile, profileError: error }
                        : d
                )
            })),

            retryGenerateProfile: async (domainName) => {
                // Set status to generating
                get().updateProfileStatus(domainName, 'generating');

                // Import service for business logic (SoC: store delegates to service)
                const { generateDomainProfileAsync } = await import('../lib/huntService');

                // Delegate profile generation to service
                const result = await generateDomainProfileAsync(domainName);

                // Update state based on result
                if (result.success && result.profile) {
                    get().updateProfileStatus(domainName, 'success', result.profile);
                } else {
                    get().updateProfileStatus(domainName, 'failed', undefined, result.error);
                }
            },

            markOwnedSiteCreated: (domainName) => set((state) => ({
                ownedDomains: state.ownedDomains.map(d =>
                    d.domain === domainName ? { ...d, siteCreated: true } : d
                )
            })),

            removeOwnedDomain: (domainName) => set((state) => ({
                ownedDomains: state.ownedDomains.filter(d => d.domain !== domainName)
            })),

            getOwnedDomains: () => get().ownedDomains,

            // Legacy aliases - these are computed from ownedDomains
            // Note: purchasedDomains is accessed via getOwnedDomains() or store subscription

            addPurchasedDomain: (domain) => set((state) => {
                if (state.ownedDomains.some(d => d.domain === domain.domain)) {
                    return state;
                }
                return { ownedDomains: [...state.ownedDomains, domain] };
            }),

            removePurchasedDomain: (domainName) => set((state) => ({
                ownedDomains: state.ownedDomains.filter(d => d.domain !== domainName)
            })),

            getPurchasedDomains: () => get().ownedDomains,

            selectedKeywords: [],

            addSelectedKeywords: (keywords) => set((state) => {
                const existing = new Set(state.selectedKeywords.map(k => k.keyword));
                const newKeywords = keywords.filter(k => !existing.has(k.keyword));
                return { selectedKeywords: [...state.selectedKeywords, ...newKeywords] };
            }),

            clearSelectedKeywords: () => set({ selectedKeywords: [] }),

            selectedTrends: [],

            addSelectedTrends: (trends) => set((state) => {
                const existing = new Set(state.selectedTrends.map(t => t.topic));
                const newTrends = trends.filter(t => !existing.has(t.topic));
                return { selectedTrends: [...state.selectedTrends, ...newTrends] };
            }),

            clearSelectedTrends: () => set({ selectedTrends: [] }),
        }),
        {
            name: STORAGE_KEYS.HUNT_ANALYZE_QUEUE,
            partialize: (state) => ({
                // Workflow state
                analyzeQueue: state.analyzeQueue,
                purchaseQueue: state.purchaseQueue,
                watchlist: state.watchlist,
                // Owned domains with profiles (for WP Sites & Campaign)
                ownedDomains: state.ownedDomains,
                selectedKeywords: state.selectedKeywords,
                selectedTrends: state.selectedTrends,
                // Don't persist: selectedDomains (ephemeral)
            }),
            // Handle Set serialization (SSR-safe)
            storage: {
                getItem: (name) => {
                    if (typeof window === 'undefined') return null;
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    return JSON.parse(str);
                },
                setItem: (name, value) => {
                    if (typeof window === 'undefined') return;
                    localStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => {
                    if (typeof window === 'undefined') return;
                    localStorage.removeItem(name);
                },
            },
            // Merge persisted state with initial state (ensures nested objects work)
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<HuntStore> || {};
                console.log('[HuntStore] Hydrating from localStorage:', {
                    ownedDomainsCount: persisted.ownedDomains?.length || 0,
                    analyzeQueueCount: persisted.analyzeQueue?.length || 0,
                    purchaseQueueCount: persisted.purchaseQueue?.length || 0,
                });
                return {
                    ...currentState,
                    ...persisted,
                    // Ensure arrays are properly restored
                    ownedDomains: persisted.ownedDomains || [],
                    analyzeQueue: persisted.analyzeQueue || [],
                    purchaseQueue: persisted.purchaseQueue || [],
                    watchlist: persisted.watchlist || [],
                    selectedKeywords: persisted.selectedKeywords || [],
                    selectedTrends: persisted.selectedTrends || [],
                };
            },
            // Debug hydration
            onRehydrateStorage: () => {
                console.log('[HuntStore] Starting hydration from localStorage...');
                return (state, error) => {
                    if (error) {
                        console.error('[HuntStore] Hydration error:', error);
                    } else {
                        console.log('[HuntStore] Hydration complete:', {
                            ownedDomains: state?.ownedDomains?.length || 0,
                        });
                    }
                };
            },
        }
    )
);

// ============ SELECTORS (for performance) ============

export const selectAnalyzeQueue = (state: HuntStore) => state.analyzeQueue;
export const selectPurchaseQueue = (state: HuntStore) => state.purchaseQueue;
export const selectWatchlist = (state: HuntStore) => state.watchlist;
export const selectSelectedDomains = (state: HuntStore) => state.selectedDomains;

// Aggregation selectors (for WP Sites & Campaign)
export const selectOwnedDomains = (state: HuntStore) => state.ownedDomains;
export const selectPurchasedDomains = selectOwnedDomains;  // Legacy alias
export const selectSelectedKeywords = (state: HuntStore) => state.selectedKeywords;
export const selectSelectedTrends = (state: HuntStore) => state.selectedTrends;
