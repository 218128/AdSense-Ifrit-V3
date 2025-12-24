/**
 * Trend Store - Zustand state management for TrendScanner
 * 
 * Centralizes state for:
 * - Scanned trends from multiple sources
 * - Source status tracking
 * - Trend selection for analysis
 * - UI state (visibility, tips)
 * 
 * Uses persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrendItem, SourceStatus } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';

// ============ CONSTANTS ============

const STORAGE_KEY = 'ifrit_trend_store';

// ============ STORE INTERFACE ============

interface TrendStore {
    // Trends Data
    trends: TrendItem[];
    sources: Record<string, SourceStatus>;
    lastScanTime: number | null;

    // Loading/Error
    isScanning: boolean;
    error: string | null;

    // Selection
    selectedTrends: Set<string>;
    toggleTrendSelection: (topic: string) => void;
    selectAllTrends: () => void;
    clearTrendSelection: () => void;
    getSelectedCount: () => number;
    isTrendSelected: (topic: string) => boolean;
    getSelectedTopics: () => string[];

    // API Action
    scanTrends: (braveApiKey?: string | null) => Promise<void>;
    clearTrends: () => void;

    // UI State
    visibleCount: number;
    showMore: () => void;
    resetVisibility: () => void;
    showTips: boolean;
    toggleTips: () => void;
}

// ============ STORE IMPLEMENTATION ============

export const useTrendStore = create<TrendStore>()(
    persist(
        (set, get) => ({
            // Trends Data
            trends: [],
            sources: {},
            lastScanTime: null,

            // Loading/Error
            isScanning: false,
            error: null,

            // Selection
            selectedTrends: new Set(),

            toggleTrendSelection: (topic) => set((state) => {
                const next = new Set(state.selectedTrends);
                if (next.has(topic)) {
                    next.delete(topic);
                } else {
                    next.add(topic);
                }
                return { selectedTrends: next };
            }),

            selectAllTrends: () => set((state) => ({
                selectedTrends: new Set(state.trends.map(t => t.topic))
            })),

            clearTrendSelection: () => set({ selectedTrends: new Set() }),

            getSelectedCount: () => get().selectedTrends.size,

            isTrendSelected: (topic) => get().selectedTrends.has(topic),

            getSelectedTopics: () => Array.from(get().selectedTrends),

            // API Action
            scanTrends: async (braveApiKey) => {
                set({
                    isScanning: true,
                    error: null,
                    selectedTrends: new Set(),
                });

                try {
                    const response = await fetch('/api/trends/multi-source', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            braveApiKey,
                            categories: ['technology', 'business', 'finance', 'health'],
                            useAIAnalysis: false
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        set({
                            trends: data.trends || [],
                            sources: data.sources || {},
                            lastScanTime: Date.now(),
                            error: data.trends?.length === 0 ? 'No trends found. Try again in a few minutes.' : null,
                            visibleCount: 10,
                        });
                    } else {
                        set({ error: data.error || 'Failed to scan trends' });
                    }
                } catch (err) {
                    set({ error: 'Failed to connect to trend scanner' });
                    console.error('Trend scan error:', err);
                } finally {
                    set({ isScanning: false });
                }
            },

            clearTrends: () => set({
                trends: [],
                sources: {},
                selectedTrends: new Set(),
                error: null,
            }),

            // UI State
            visibleCount: 10,

            showMore: () => set((state) => ({
                visibleCount: Math.min(state.visibleCount + 10, state.trends.length)
            })),

            resetVisibility: () => set({ visibleCount: 10 }),

            showTips: true,

            toggleTips: () => set((state) => ({ showTips: !state.showTips })),
        }),
        {
            name: STORAGE_KEY,
            partialize: (state) => ({
                // Only persist UI preferences, not trends data
                showTips: state.showTips,
                // Don't persist: trends, sources, selection (ephemeral)
            }),
        }
    )
);

// ============ SELECTORS ============

export const selectTrends = (state: TrendStore) => state.trends;
export const selectSources = (state: TrendStore) => state.sources;
export const selectIsScanning = (state: TrendStore) => state.isScanning;
export const selectError = (state: TrendStore) => state.error;
