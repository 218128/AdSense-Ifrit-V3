/**
 * Domain Acquire Store - Zustand state management
 * 
 * Centralizes state for the Domain Acquire workflow:
 * - Domain import (manual, CSV, SpamZilla, free sources)
 * - Domain filtering and sorting
 * - Watchlist management
 * - Analyze queue
 * - Purchase queue
 * 
 * Uses persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DomainItem, DomainProfile, ActionRequired } from '@/lib/domains/types';
import type { SpamZillaImportResult } from '@/lib/domains/spamzillaParser';
import type { ActionStatus } from '@/lib/shared/types/actionStatus';
import { generateProfileUseCase } from '@/lib/application/domains/generateProfileUseCase';
import { useGlobalActionStatusStore } from '@/stores/globalActionStatusStore';

// ============ CONSTANTS ============

const STORAGE_KEY = 'ifrit_domain_acquire_store';

// ============ TYPES ============

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
    };
}

export interface QueuedDomain {
    domain: string;
    tld: string;
    score: number;
    recommendation: string;
    estimatedValue: number;
    addedAt: number;
}

export interface FilterState {
    minScore: number;
    maxPrice: number;
    tldFilter: string;
    sortBy: 'score' | 'price' | 'age' | 'domain';
    sortOrder: 'asc' | 'desc';
    qualityTier: 'all' | 'gold' | 'silver' | 'bronze';
}

// ============ STORE INTERFACE ============

interface DomainAcquireStore {
    // === IMPORT STATE ===
    manualDomains: DomainItem[];
    freeDomains: DomainItem[];
    spamzillaDomains: DomainItem[];
    manualInput: string;

    // Loading/Error
    isParsingManual: boolean;
    freeLoading: boolean;
    freeError: string | null;
    freeActionRequired: ActionRequired | null;

    // SpamZilla stats
    spamzillaImportStats: SpamZillaImportResult['stats'] | null;
    spamzillaPreset: string;

    // Import actions
    setManualInput: (value: string) => void;
    addManualDomains: (domains: DomainItem[]) => void;
    clearManualDomains: () => void;
    addFreeDomains: (domains: DomainItem[]) => void;
    addSpamzillaDomains: (domains: DomainItem[], stats: SpamZillaImportResult['stats'], preset: string) => void;
    setFreeLoading: (loading: boolean) => void;
    setFreeError: (error: string | null, actionRequired?: ActionRequired | null) => void;
    setParsingManual: (parsing: boolean) => void;

    // === FILTERS ===
    filters: FilterState;
    setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
    resetFilters: () => void;

    // === WATCHLIST ===
    watchlist: Set<string>;
    toggleWatchlist: (domain: string) => void;
    isWatched: (domain: string) => boolean;
    clearWatchlist: () => void;

    // === ANALYZE QUEUE ===
    analyzeQueue: AnalyzeCandidate[];
    addToAnalyzeQueue: (candidate: AnalyzeCandidate) => void;
    removeFromAnalyzeQueue: (domain: string) => void;
    clearAnalyzeQueue: () => void;

    // === PURCHASE QUEUE ===
    purchaseQueue: QueuedDomain[];
    addToPurchaseQueue: (domain: QueuedDomain) => void;
    removeFromPurchaseQueue: (domain: string) => void;
    markPurchased: (domain: string) => void;
    clearPurchaseQueue: () => void;

    // === COMPUTED ===
    getAllDomains: () => DomainItem[];
    getFilteredDomains: () => DomainItem[];

    // === PROFILE GENERATION ===
    generatedProfiles: Record<string, DomainProfile>;
    profileGenerating: string | null;
    profileActionStatus: ActionStatus | null;
    generateProfile: (options: {
        domain: string;
        sessionId?: string;
        keywordContext?: { keywords: string[]; research: Record<string, string[]> };
        domainScore?: { overall: number; recommendation: string; risks: Array<{ description: string }> };
    }) => Promise<void>;
    getProfile: (domain: string) => DomainProfile | undefined;
    downloadProfile: (domain: string) => void;
}

// ============ DEFAULT FILTERS ============

const DEFAULT_FILTERS: FilterState = {
    minScore: 0,
    maxPrice: 9999,
    tldFilter: 'all',
    sortBy: 'score',
    sortOrder: 'desc',
    qualityTier: 'all',
};

// ============ STORE IMPLEMENTATION ============

export const useDomainAcquireStore = create<DomainAcquireStore>()(
    persist(
        (set, get) => ({
            // === IMPORT STATE ===
            manualDomains: [],
            freeDomains: [],
            spamzillaDomains: [],
            manualInput: '',
            isParsingManual: false,
            freeLoading: false,
            freeError: null,
            freeActionRequired: null,
            spamzillaImportStats: null,
            spamzillaPreset: '',

            // Import actions
            setManualInput: (value) => set({ manualInput: value }),

            addManualDomains: (domains) => set((state) => {
                const existing = new Set(state.manualDomains.map(d => d.domain));
                const newDomains = domains.filter(d => !existing.has(d.domain));
                return { manualDomains: [...state.manualDomains, ...newDomains] };
            }),

            clearManualDomains: () => set({ manualDomains: [], manualInput: '' }),

            addFreeDomains: (domains) => set({ freeDomains: domains }),

            addSpamzillaDomains: (domains, stats, preset) => set((state) => {
                const existing = new Set(state.spamzillaDomains.map(d => d.domain));
                const newDomains = domains.filter(d => !existing.has(d.domain));
                return {
                    spamzillaDomains: [...state.spamzillaDomains, ...newDomains],
                    spamzillaImportStats: stats,
                    spamzillaPreset: preset,
                };
            }),

            setFreeLoading: (loading) => set({ freeLoading: loading }),
            setFreeError: (error, actionRequired = null) => set({ freeError: error, freeActionRequired: actionRequired }),
            setParsingManual: (parsing) => set({ isParsingManual: parsing }),

            // === FILTERS ===
            filters: DEFAULT_FILTERS,

            setFilter: (key, value) => set((state) => ({
                filters: { ...state.filters, [key]: value }
            })),

            resetFilters: () => set({ filters: DEFAULT_FILTERS }),

            // === WATCHLIST ===
            watchlist: new Set(),

            toggleWatchlist: (domain) => set((state) => {
                const next = new Set(state.watchlist);
                if (next.has(domain)) {
                    next.delete(domain);
                } else {
                    next.add(domain);
                }
                return { watchlist: next };
            }),

            isWatched: (domain) => get().watchlist.has(domain),

            clearWatchlist: () => set({ watchlist: new Set() }),

            // === ANALYZE QUEUE ===
            analyzeQueue: [],

            addToAnalyzeQueue: (candidate) => set((state) => {
                if (state.analyzeQueue.find(c => c.domain === candidate.domain)) return state;
                return { analyzeQueue: [...state.analyzeQueue, candidate] };
            }),

            removeFromAnalyzeQueue: (domain) => set((state) => ({
                analyzeQueue: state.analyzeQueue.filter(c => c.domain !== domain)
            })),

            clearAnalyzeQueue: () => set({ analyzeQueue: [] }),

            // === PURCHASE QUEUE ===
            purchaseQueue: [],

            addToPurchaseQueue: (domain) => set((state) => {
                if (state.purchaseQueue.find(d => d.domain === domain.domain)) return state;
                return { purchaseQueue: [...state.purchaseQueue, domain] };
            }),

            removeFromPurchaseQueue: (domain) => set((state) => ({
                purchaseQueue: state.purchaseQueue.filter(d => d.domain !== domain)
            })),

            markPurchased: (domain) => set((state) => ({
                purchaseQueue: state.purchaseQueue.filter(d => d.domain !== domain)
            })),

            clearPurchaseQueue: () => set({ purchaseQueue: [] }),

            // === COMPUTED ===
            getAllDomains: () => {
                const state = get();
                return [...state.manualDomains, ...state.freeDomains, ...state.spamzillaDomains];
            },

            getFilteredDomains: () => {
                const state = get();
                const all = state.getAllDomains();
                const { minScore, maxPrice, tldFilter, sortBy, sortOrder, qualityTier } = state.filters;

                const filtered = all.filter(d => {
                    if (d.score?.overall && d.score.overall < minScore) return false;
                    if (d.price && Number(d.price) > maxPrice) return false;
                    if (tldFilter !== 'all' && d.tld !== tldFilter) return false;
                    if (qualityTier !== 'all' && d.qualityTier !== qualityTier) return false;
                    return true;
                });

                filtered.sort((a, b) => {
                    let comparison = 0;
                    switch (sortBy) {
                        case 'score':
                            comparison = (a.score?.overall || 0) - (b.score?.overall || 0);
                            break;
                        case 'price':
                            comparison = (Number(a.price) || 0) - (Number(b.price) || 0);
                            break;
                        case 'age':
                            comparison = (a.domainAge || 0) - (b.domainAge || 0);
                            break;
                        case 'domain':
                            comparison = a.domain.localeCompare(b.domain);
                            break;
                    }
                    return sortOrder === 'desc' ? -comparison : comparison;
                });

                return filtered;
            },

            // === PROFILE GENERATION ===
            generatedProfiles: {},
            profileGenerating: null,
            profileActionStatus: null,

            generateProfile: async (options) => {
                const { domain, sessionId, keywordContext, domainScore } = options;
                set({ profileGenerating: domain });

                // Track in global action status for UI visibility
                const globalActions = useGlobalActionStatusStore.getState();
                const actionId = globalActions.startAction(`Generate Profile: ${domain}`, 'domain', true);

                const result = await generateProfileUseCase(
                    { domain, sessionId, keywordContext, domainScore },
                    (status) => {
                        set({ profileActionStatus: status });
                        // Also update global action
                        globalActions.updateAction(actionId, status.message);
                    }
                );

                if (result.success && result.profile) {
                    globalActions.completeAction(actionId, `Profile generated for ${domain}`);
                    set((state) => ({
                        generatedProfiles: {
                            ...state.generatedProfiles,
                            [domain]: result.profile!,
                        },
                        profileGenerating: null,
                    }));
                } else {
                    globalActions.failAction(actionId, result.error || 'Profile generation failed');
                    set({ profileGenerating: null });
                }
            },

            getProfile: (domain) => get().generatedProfiles[domain],

            downloadProfile: (domain) => {
                const profile = get().generatedProfiles[domain];
                if (!profile) return;

                const dataStr = JSON.stringify(profile, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${domain}_profile.json`;
                a.click();
                URL.revokeObjectURL(url);
            },
        }),
        {
            name: STORAGE_KEY,
            partialize: (state) => ({
                // Persist queues and watchlist
                watchlist: Array.from(state.watchlist),
                analyzeQueue: state.analyzeQueue,
                purchaseQueue: state.purchaseQueue,
                filters: state.filters,
                // Don't persist: domains (ephemeral), loading states
            }),
            merge: (persisted, current) => ({
                ...current,
                ...persisted as Partial<DomainAcquireStore>,
                watchlist: new Set((persisted as { watchlist?: string[] })?.watchlist || []),
            }),
        }
    )
);
