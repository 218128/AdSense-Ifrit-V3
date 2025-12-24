/**
 * Keyword Store - Zustand state management for Keyword Hunter
 * 
 * Centralizes state for:
 * - CSV imported keywords
 * - Analyzed keywords with CPC data
 * - Analysis history
 * 
 * Uses persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KeywordItem, AnalyzedKeyword, AnalysisHistoryItem } from '@/lib/keywords/types';

// ============ CONSTANTS ============

const STORAGE_KEY = 'ifrit_keyword_store';
const MAX_HISTORY_ITEMS = 10;

// ============ EVERGREEN KEYWORDS ============

const EVERGREEN_KEYWORDS: KeywordItem[] = [
    { keyword: 'best credit cards', source: 'evergreen', niche: 'Finance' },
    { keyword: 'cheap car insurance', source: 'evergreen', niche: 'Insurance' },
    { keyword: 'personal injury lawyer', source: 'evergreen', niche: 'Legal' },
    { keyword: 'mortgage refinance rates', source: 'evergreen', niche: 'Finance' },
    { keyword: 'online MBA programs', source: 'evergreen', niche: 'Education' },
    { keyword: 'web hosting reviews', source: 'evergreen', niche: 'Technology' },
    { keyword: 'VPN comparison', source: 'evergreen', niche: 'Technology' },
    { keyword: 'weight loss supplements', source: 'evergreen', niche: 'Health' },
];

// ============ STORE INTERFACE ============

interface KeywordStore {
    // CSV Imports
    csvKeywords: KeywordItem[];
    addCSVKeywords: (keywords: KeywordItem[]) => void;
    clearCSVKeywords: () => void;

    // Analyzed Keywords
    analyzedKeywords: AnalyzedKeyword[];
    setAnalyzedKeywords: (keywords: AnalyzedKeyword[]) => void;
    clearAnalyzedKeywords: () => void;

    // Analysis State
    isAnalyzing: boolean;
    runAnalysis: (keywords: KeywordItem[]) => Promise<void>;

    // Selection
    selectedKeywords: Set<string>;
    toggleSelect: (keyword: string) => void;
    selectMultiple: (keywords: string[]) => void;
    clearSelection: () => void;
    getSelectedCount: () => number;
    isSelected: (keyword: string) => boolean;

    // History
    history: AnalysisHistoryItem[];
    addToHistory: (keywords: AnalyzedKeyword[]) => void;
    loadHistoryItem: (item: AnalysisHistoryItem) => void;
    clearHistory: () => void;

    // Computed
    getAllKeywords: () => KeywordItem[];
    getEvergreenKeywords: () => KeywordItem[];
}

// ============ STORE IMPLEMENTATION ============

export const useKeywordStore = create<KeywordStore>()(
    persist(
        (set, get) => ({
            // CSV Keywords
            csvKeywords: [],

            addCSVKeywords: (keywords) => set((state) => {
                const existing = new Set(state.csvKeywords.map(k => k.keyword));
                const newKeywords = keywords.filter(k => !existing.has(k.keyword));
                return { csvKeywords: [...state.csvKeywords, ...newKeywords] };
            }),

            clearCSVKeywords: () => set({ csvKeywords: [] }),

            // Analyzed Keywords
            analyzedKeywords: [],

            setAnalyzedKeywords: (keywords) => set({ analyzedKeywords: keywords }),

            clearAnalyzedKeywords: () => set({ analyzedKeywords: [] }),

            // Selection
            selectedKeywords: new Set(),

            toggleSelect: (keyword) => set((state) => {
                const next = new Set(state.selectedKeywords);
                if (next.has(keyword)) {
                    next.delete(keyword);
                } else {
                    next.add(keyword);
                }
                return { selectedKeywords: next };
            }),

            selectMultiple: (keywords) => set((state) => ({
                selectedKeywords: new Set([...state.selectedKeywords, ...keywords])
            })),

            clearSelection: () => set({ selectedKeywords: new Set() }),

            getSelectedCount: () => get().selectedKeywords.size,

            isSelected: (keyword) => get().selectedKeywords.has(keyword),

            // Analysis State
            isAnalyzing: false,

            runAnalysis: async (keywords) => {
                if (keywords.length === 0) return;

                set({ isAnalyzing: true });

                try {
                    const response = await fetch('/api/keywords/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ keywords: keywords.map(k => k.keyword) }),
                    });

                    const data = await response.json();

                    const analyzed: AnalyzedKeyword[] = keywords.map((kw, i) => ({
                        ...kw,
                        analysis: data.success && data.analyses?.[i] ? data.analyses[i] : {
                            keyword: kw.keyword,
                            niche: kw.niche || 'General',
                            estimatedCPC: '$0.50-2.00',
                            estimatedVolume: '1K-10K',
                            competition: 'Medium',
                            score: 50,
                            intent: 'informational',
                            reasoning: data.error || 'Fallback analysis used',
                        },
                    }));

                    // Add to history and set results
                    get().addToHistory(analyzed);
                } catch (error) {
                    // Fallback analysis on network error
                    const fallback: AnalyzedKeyword[] = keywords.map(kw => ({
                        ...kw,
                        analysis: {
                            keyword: kw.keyword,
                            niche: kw.niche || 'General',
                            estimatedCPC: '$0.50-2.00',
                            estimatedVolume: '1K-10K',
                            competition: 'Medium',
                            score: 50,
                            intent: 'informational',
                            reasoning: 'Network error - using fallback',
                        },
                    }));
                    get().addToHistory(fallback);
                } finally {
                    set({ isAnalyzing: false });
                }
            },

            // History
            history: [],

            addToHistory: (keywords) => set((state) => {
                const newItem: AnalysisHistoryItem = {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    keywords,
                };
                return {
                    history: [newItem, ...state.history].slice(0, MAX_HISTORY_ITEMS),
                    analyzedKeywords: keywords,
                };
            }),

            loadHistoryItem: (item) => set({
                analyzedKeywords: item.keywords,
            }),

            clearHistory: () => set({ history: [] }),

            // Computed
            getAllKeywords: () => {
                const state = get();
                return [...state.csvKeywords, ...EVERGREEN_KEYWORDS];
            },

            getEvergreenKeywords: () => EVERGREEN_KEYWORDS,
        }),
        {
            name: STORAGE_KEY,
            partialize: (state) => ({
                csvKeywords: state.csvKeywords,
                analyzedKeywords: state.analyzedKeywords,
                history: state.history,
                // Don't persist selection (ephemeral)
            }),
        }
    )
);

// ============ SELECTORS ============

export const selectCSVKeywords = (state: KeywordStore) => state.csvKeywords;
export const selectAnalyzedKeywords = (state: KeywordStore) => state.analyzedKeywords;
export const selectHistory = (state: KeywordStore) => state.history;
