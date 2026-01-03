/**
 * Trend Store - Zustand state management for TrendScanner
 * 
 * Centralizes state for:
 * - Scanned trends from multiple sources (persisted until refresh)
 * - Research results (persisted)
 * - Scan history for comparison
 * - Source status tracking
 * - Trend selection for analysis
 * 
 * Uses persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrendItem, SourceStatus } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';
import type { ActionStatus, SourceActionStatus } from '@/lib/shared/types';
import { ActionStatusFactory } from '@/lib/shared/types';

// ============ CONSTANTS ============

const STORAGE_KEY = 'ifrit_trend_store';
const MAX_SCAN_HISTORY = 5;

// ============ TYPES ============

export interface ResearchResult {
    topic: string;
    findings: string[];
    researchedAt: number;
}

export interface ScanHistoryItem {
    id: string;
    scannedAt: number;
    trendCount: number;
    topTrends: string[]; // First 5 topic names for preview
}

// ============ STORE INTERFACE ============

interface TrendStore {
    // Trends Data (now persisted until refresh)
    trends: TrendItem[];
    sources: Record<string, SourceStatus>;
    lastScanTime: number | null;

    // Source filtering
    activeSource: string | null;  // null = all sources
    setActiveSource: (source: string | null) => void;
    getFilteredTrends: () => TrendItem[];

    // Items per source setting
    maxItemsPerSource: number;
    setMaxItemsPerSource: (n: number) => void;

    // Source Constants
    defaultSourceSettings: Record<string, any>;

    // Source Settings (persisted)
    sourceSettings: Record<string, any>;
    setSourceSettings: (sourceId: string, settings: any) => void;

    // Research Results (persisted)
    researchResults: Record<string, ResearchResult>;
    addResearchResult: (topic: string, findings: string[]) => void;
    getResearchForTopic: (topic: string) => ResearchResult | null;
    clearResearchResults: () => void;

    // Scan History
    scanHistory: ScanHistoryItem[];

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

    // Get selected trends with full data (not just strings)
    getSelectedTrendItems: () => TrendItem[];

    // API Actions
    scanTrends: (braveApiKey?: string | null) => Promise<void>;
    loadMoreTrends: (braveApiKey?: string | null) => Promise<void>;
    clearTrends: () => void;
    isLoadingMore: boolean;
    scanPage: number;

    // UI State
    visibleCount: number;
    showMore: () => void;
    resetVisibility: () => void;
    showTips: boolean;
    toggleTips: () => void;

    // Action Status (real-time feedback)
    actionStatus: ActionStatus;
    setActionStatus: (status: ActionStatus) => void;
}

// ============ STORE IMPLEMENTATION ============

export const useTrendStore = create<TrendStore>()(
    persist(
        (set, get) => ({
            // Trends Data
            trends: [],
            sources: {},
            lastScanTime: null,

            // Source filtering
            activeSource: null,
            setActiveSource: (source) => set({ activeSource: source, visibleCount: 10 }),
            getFilteredTrends: () => {
                const { trends, activeSource } = get();
                if (!activeSource) return trends;
                return trends.filter(t => {
                    // Match by source name or handler id
                    const sourceLower = t.source?.toLowerCase() || '';
                    const activeSourceLower = activeSource.toLowerCase();
                    return sourceLower.includes(activeSourceLower.replace('-trends', '').replace('news', ' news'));
                });
            },

            // Items per source setting
            maxItemsPerSource: 10,
            setMaxItemsPerSource: (n) => set({ maxItemsPerSource: n }),

            // Default Constants
            defaultSourceSettings: {
                'brave-search-trends': { query: '', timeframe: 'week' }, // Empty query = no search
                'googlenews-trends': { topic: '' }, // Empty topic = global top stories
                // HN/PH have no filtering settings per refactor
            },

            // Source Settings
            sourceSettings: {},
            setSourceSettings: (sourceId, settings) => set((state) => ({
                sourceSettings: {
                    ...state.sourceSettings,
                    [sourceId]: { ...(state.sourceSettings[sourceId] || {}), ...settings }
                }
            })),

            // Research Results
            researchResults: {},

            addResearchResult: (topic, findings) => set((state) => ({
                researchResults: {
                    ...state.researchResults,
                    [topic]: {
                        topic,
                        findings,
                        researchedAt: Date.now(),
                    }
                }
            })),

            getResearchForTopic: (topic) => get().researchResults[topic] || null,

            clearResearchResults: () => set({ researchResults: {} }),

            // Scan History
            scanHistory: [],

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

            // Get full TrendItem objects for selected trends
            getSelectedTrendItems: () => {
                const { trends, selectedTrends } = get();
                return trends.filter(t => selectedTrends.has(t.topic));
            },

            // Pagination
            scanPage: 1,

            // API Action - Uses Capabilities System
            scanTrends: async (braveApiKey) => {
                const { maxItemsPerSource, setActionStatus, sourceSettings } = get();

                set({
                    isScanning: true,
                    error: null,
                    selectedTrends: new Set(),
                    activeSource: null,
                    scanPage: 1, // Reset pagination
                });

                try {
                    // Use the scanTrendsUseCase from application layer
                    const { scanTrendsUseCase } = await import('@/lib/application/trends');

                    // Pass entire sourceSettings map to UseCase
                    // The UseCase will distribute specific settings to specific handlers
                    const result = await scanTrendsUseCase(
                        (status) => setActionStatus(status),
                        {
                            maxItemsPerSource,
                            braveApiKey,
                            sourceSettings,
                            page: 1, // Pass initial page
                        }
                    );

                    const scanTime = Date.now();
                    const historyItem: ScanHistoryItem = {
                        id: `scan_${scanTime}`,
                        scannedAt: scanTime,
                        trendCount: result.trends.length,
                        topTrends: result.trends.slice(0, 5).map((t: TrendItem) => t.topic),
                    };

                    set((state) => ({
                        trends: result.trends,
                        sources: result.sources,
                        lastScanTime: scanTime,
                        error: null,
                        visibleCount: 10,
                        scanHistory: [historyItem, ...state.scanHistory].slice(0, MAX_SCAN_HISTORY),
                    }));
                } catch (err) {
                    set({ error: 'Failed to connect to trend scanner' });
                    console.error('Trend scan error:', err);
                } finally {
                    set({ isScanning: false });
                }
            },

            // Load MORE trends - fetch new data and append
            isLoadingMore: false,
            loadMoreTrends: async (braveApiKey) => {
                const { maxItemsPerSource, trends: existingTrends, sourceSettings, scanPage } = get();
                const nextPage = scanPage + 1;

                set({ isLoadingMore: true, error: null });

                try {
                    const { aiServices } = await import('@/lib/ai/services');

                    // Construct prompt from Active Source settings if defined
                    // If no specific active source, just use general "trending"
                    const prompt = 'trending';

                    const result = await aiServices.executeAggregate({
                        capability: 'trend-scan',
                        prompt,
                        context: {
                            maxItems: maxItemsPerSource,
                            apiKey: braveApiKey || undefined,
                            sourceSettings,
                            page: nextPage, // Pass next page
                        },
                    });

                    if (result.success) {
                        set({ scanPage: nextPage }); // Update page state on success
                    }

                    if (result.success && result.data) {
                        const newTrends = result.data as TrendItem[];

                        // Get existing topic keys to filter duplicates
                        const existingKeys = new Set(existingTrends.map(t => t.topic.toLowerCase()));

                        // Filter out duplicates
                        const uniqueNewTrends = newTrends.filter(t =>
                            !existingKeys.has(t.topic.toLowerCase())
                        );

                        if (uniqueNewTrends.length > 0) {
                            set((state) => ({
                                trends: [...state.trends, ...uniqueNewTrends],
                                visibleCount: state.visibleCount + uniqueNewTrends.length,
                            }));
                        }

                        // Update source counts
                        const sourceData = (result.metadata?.sources as Record<string, { success: boolean; count: number }>) || {};
                        const sources: Record<string, SourceStatus> = {};
                        for (const [id, status] of Object.entries(sourceData)) {
                            sources[id] = {
                                success: status.success,
                                count: status.count,
                                error: (status as Record<string, unknown>).error as string | undefined
                            };
                        }
                        set({ sources });
                    }
                } catch (err) {
                    console.error('Load more error:', err);
                } finally {
                    set({ isLoadingMore: false });
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

            // Action Status (real-time feedback)
            actionStatus: ActionStatusFactory.idle(),
            setActionStatus: (status) => set({ actionStatus: status }),
        }),
        {
            name: STORAGE_KEY,
            partialize: (state) => ({
                // Persist trends until next scan (not ephemeral anymore)
                trends: state.trends,
                sources: state.sources,
                lastScanTime: state.lastScanTime,
                // Persist research results
                researchResults: state.researchResults,
                // Persist scan history
                scanHistory: state.scanHistory,
                // Persist UI preferences
                showTips: state.showTips,
                // Don't persist: selection, loading states (ephemeral)
            }),
        }
    )
);

// ============ SELECTORS ============

export const selectTrends = (state: TrendStore) => state.trends;
export const selectSources = (state: TrendStore) => state.sources;
export const selectIsScanning = (state: TrendStore) => state.isScanning;
export const selectError = (state: TrendStore) => state.error;
export const selectResearchResults = (state: TrendStore) => state.researchResults;
export const selectScanHistory = (state: TrendStore) => state.scanHistory;

