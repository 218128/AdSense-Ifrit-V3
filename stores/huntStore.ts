/**
 * Hunt Store - Zustand state management for Hunt tab
 * 
 * Centralizes state for:
 * - Domain acquisition workflow (find → analyze → purchase)
 * - Keyword hunting
 * - Domain watchlist
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/storage';

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

// ============ STORE INTERFACE ============

interface HuntStore {
    // Analyze Queue (Find → Analyze)
    analyzeQueue: AnalyzeCandidate[];
    addToAnalyze: (domains: AnalyzeCandidate[]) => void;
    removeFromAnalyze: (domain: string) => void;
    clearAnalyzeQueue: () => void;

    // Purchase Queue (Analyze → Purchase)
    purchaseQueue: QueuedDomain[];
    addToPurchase: (domain: AnalyzeCandidate) => void;
    removeFromPurchase: (domain: string) => void;
    clearPurchaseQueue: () => void;
    markAsPurchased: (domain: string) => void;

    // Watchlist
    watchlist: WatchlistDomain[];
    addToWatchlist: (domain: WatchlistDomain) => void;
    removeFromWatchlist: (domain: string) => void;
    isWatched: (domain: string) => boolean;
    clearWatchlist: () => void;

    // Selection (for bulk actions in Find step)
    selectedDomains: Set<string>;
    toggleSelection: (domain: string) => void;
    selectAll: (domains: string[]) => void;
    deselectAll: () => void;
    getSelectedCount: () => number;
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
                        addedAt: Date.now()
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
                purchaseQueue: state.purchaseQueue.filter(d => d.domain !== domain)
                // TODO: Could add to a "purchased" history
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
        }),
        {
            name: STORAGE_KEYS.HUNT_ANALYZE_QUEUE,
            partialize: (state) => ({
                analyzeQueue: state.analyzeQueue,
                purchaseQueue: state.purchaseQueue,
                watchlist: state.watchlist,
                // Don't persist selectedDomains (ephemeral)
            }),
            // Handle Set serialization
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    return JSON.parse(str);
                },
                setItem: (name, value) => {
                    localStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => localStorage.removeItem(name),
            },
        }
    )
);

// ============ SELECTORS (for performance) ============

export const selectAnalyzeQueue = (state: HuntStore) => state.analyzeQueue;
export const selectPurchaseQueue = (state: HuntStore) => state.purchaseQueue;
export const selectWatchlist = (state: HuntStore) => state.watchlist;
export const selectSelectedDomains = (state: HuntStore) => state.selectedDomains;
