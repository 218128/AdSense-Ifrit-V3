/**
 * Keyword Store - Zustand state management for Keyword Hunter
 * 
 * Centralizes state for:
 * - CSV imported keywords (with import history)
 * - Analyzed keywords with CPC data
 * - Research results (persisted)
 * - Analysis history
 * 
 * Uses persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KeywordItem, AnalyzedKeyword, AnalysisHistoryItem } from '@/lib/keywords/types';
import { analyzeKeywordsUseCase } from '@/lib/application/keywords/analyzeKeywordsUseCase';
import type { ActionStatus } from '@/lib/shared/types';
import { ActionStatusFactory } from '@/lib/shared/types';

// ============ CONSTANTS ============

const STORAGE_KEY = 'ifrit_keyword_store';
const MAX_HISTORY_ITEMS = 10;
const MAX_CSV_IMPORTS = 10;

// ============ TYPES ============

export interface ResearchResult {
    keyword: string;
    findings: string[];
    researchedAt: number;
}

export interface CSVImportRecord {
    id: string;
    filename: string;
    importedAt: number;
    keywordCount: number;
    keywords: string[]; // First 10 for preview
}

/**
 * Enriched keyword with research + analysis data
 * This is the full BI data that flows to Domain Acquire
 */
export interface EnrichedKeyword {
    id: string;
    keyword: string;
    source: string;
    niche?: string;
    research?: ResearchResult;
    analysis?: {
        keyword: string;
        niche: string;
        estimatedCPC: string;
        estimatedVolume: string;
        competition: string;
        score: number;
        intent: string;
        reasoning: string;
    };
    analyzedAt?: number;
}

/**
 * Saved analysis record for the persistent table
 */
export interface SavedAnalysis {
    id: string;
    keywords: EnrichedKeyword[];
    savedAt: number;
    name?: string; // User can name it
}

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
    addCSVKeywords: (keywords: KeywordItem[], filename?: string) => void;
    clearCSVKeywords: () => void;

    // CSV Import History
    csvImportHistory: CSVImportRecord[];

    // Analyzed Keywords
    analyzedKeywords: AnalyzedKeyword[];
    setAnalyzedKeywords: (keywords: AnalyzedKeyword[]) => void;
    clearAnalyzedKeywords: () => void;

    // Research Results (persisted)
    researchResults: Record<string, ResearchResult>;
    addResearchResult: (keyword: string, findings: string[]) => void;
    getResearchForKeyword: (keyword: string) => ResearchResult | null;
    clearResearchResults: () => void;

    // Analysis State
    // Analysis State
    isAnalyzing: boolean;
    actionStatus: ActionStatus | null;
    runAnalysis: (keywords: KeywordItem[]) => Promise<void>;

    // Selection
    selectedKeywords: Set<string>;
    toggleSelect: (keyword: string) => void;
    selectMultiple: (keywords: string[]) => void;
    clearSelection: () => void;
    getSelectedCount: () => number;
    isSelected: (keyword: string) => boolean;

    // Get selected with full data
    getSelectedKeywordItems: () => KeywordItem[];

    // History
    history: AnalysisHistoryItem[];
    addToHistory: (keywords: AnalyzedKeyword[]) => void;
    loadHistoryItem: (item: AnalysisHistoryItem) => void;
    clearHistory: () => void;

    // Analyzed cards selection (for multi-select)
    selectedAnalyzedIds: Set<string>;
    toggleAnalyzedSelect: (id: string) => void;
    selectAllAnalyzed: () => void;
    clearAnalyzedSelection: () => void;
    isAnalyzedSelected: (id: string) => boolean;
    getSelectedAnalyzedCount: () => number;
    getSelectedAnalyzedKeywords: () => AnalyzedKeyword[];

    // Saved Analyses (persistent table)
    savedAnalyses: SavedAnalysis[];
    saveCurrentAnalysis: (name?: string) => void;
    deleteSavedAnalysis: (id: string) => void;
    loadSavedAnalysis: (id: string) => void;

    // Convert analyzed keywords to enriched format for Domain Acquire
    getEnrichedKeywords: (ids?: string[]) => EnrichedKeyword[];

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

            addCSVKeywords: (keywords, filename) => set((state) => {
                const existing = new Set(state.csvKeywords.map(k => k.keyword));
                const newKeywords = keywords.filter(k => !existing.has(k.keyword));

                // Add to import history if filename provided
                const importRecord: CSVImportRecord | null = filename ? {
                    id: `csv_${Date.now()}`,
                    filename,
                    importedAt: Date.now(),
                    keywordCount: keywords.length,
                    keywords: keywords.slice(0, 10).map(k => k.keyword),
                } : null;

                return {
                    csvKeywords: [...state.csvKeywords, ...newKeywords],
                    csvImportHistory: importRecord
                        ? [importRecord, ...state.csvImportHistory].slice(0, MAX_CSV_IMPORTS)
                        : state.csvImportHistory,
                };
            }),

            clearCSVKeywords: () => set({ csvKeywords: [] }),

            // CSV Import History
            csvImportHistory: [],

            // Analyzed Keywords
            analyzedKeywords: [],

            setAnalyzedKeywords: (keywords) => set({ analyzedKeywords: keywords }),

            clearAnalyzedKeywords: () => set({ analyzedKeywords: [] }),

            // Research Results
            researchResults: {},

            addResearchResult: (keyword, findings) => set((state) => ({
                researchResults: {
                    ...state.researchResults,
                    [keyword]: {
                        keyword,
                        findings,
                        researchedAt: Date.now(),
                    }
                }
            })),

            getResearchForKeyword: (keyword) => get().researchResults[keyword] || null,

            clearResearchResults: () => set({ researchResults: {} }),

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

            // Get full KeywordItem objects for selected keywords
            getSelectedKeywordItems: () => {
                const state = get();
                const allKeywords = state.getAllKeywords();
                return allKeywords.filter(k => state.selectedKeywords.has(k.keyword));
            },

            // Analysis State
            isAnalyzing: false,

            actionStatus: null,

            runAnalysis: async (keywords) => {
                if (keywords.length === 0) return;

                set({ isAnalyzing: true, actionStatus: ActionStatusFactory.running('Starting analysis...') });

                try {
                    // Gather research data for each keyword from store
                    const state = get();
                    const researchData: Record<string, string[]> = {};

                    console.log('[Analyze] Looking for research data for keywords:', keywords.map(k => k.keyword));
                    console.log('[Analyze] Available research keys:', Object.keys(state.researchResults));

                    for (const kw of keywords) {
                        const research = state.researchResults[kw.keyword];
                        if (research && research.findings.length > 0) {
                            researchData[kw.keyword] = research.findings;
                            console.log(`[Analyze] Found ${research.findings.length} findings for "${kw.keyword}"`);
                        }
                    }

                    const hasResearchContext = Object.keys(researchData).length > 0;
                    console.log(`[Analyze] Using research context: ${hasResearchContext ? 'YES' : 'NO'}`);

                    // Use Clean Architecture UseCase with research context
                    const result = await analyzeKeywordsUseCase(
                        keywords,
                        (status) => set({ actionStatus: status }),
                        { sortByCPC: true, researchData }
                    );

                    // Add to history and set results
                    get().addToHistory(result.keywords);

                    set({
                        analyzedKeywords: result.keywords,
                        actionStatus: ActionStatusFactory.success(`Analysis complete. Found ${result.highValueCount} high-value keywords.`, result.highValueCount)
                    });

                    // Clear status after delay
                    setTimeout(() => set({ isAnalyzing: false, actionStatus: null }), 3000);

                } catch (error) {
                    console.error('Analysis failed:', error);
                    set({
                        actionStatus: ActionStatusFactory.error('Analysis failed', 'Using fallback data')
                    });

                    // Fallback logic
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

                    setTimeout(() => set({ isAnalyzing: false, actionStatus: null }), 3000);
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

            // Analyzed cards selection
            selectedAnalyzedIds: new Set<string>(),

            toggleAnalyzedSelect: (id) => set((state) => {
                const newSelected = new Set(state.selectedAnalyzedIds);
                if (newSelected.has(id)) {
                    newSelected.delete(id);
                } else {
                    newSelected.add(id);
                }
                return { selectedAnalyzedIds: newSelected };
            }),

            selectAllAnalyzed: () => set((state) => ({
                selectedAnalyzedIds: new Set(state.analyzedKeywords.map(k => k.keyword))
            })),

            clearAnalyzedSelection: () => set({ selectedAnalyzedIds: new Set() }),

            isAnalyzedSelected: (id) => get().selectedAnalyzedIds.has(id),

            getSelectedAnalyzedCount: () => get().selectedAnalyzedIds.size,

            getSelectedAnalyzedKeywords: () => {
                const state = get();
                return state.analyzedKeywords.filter(k => state.selectedAnalyzedIds.has(k.keyword));
            },

            // Saved Analyses
            savedAnalyses: [],

            saveCurrentAnalysis: (name) => set((state) => {
                const selected = state.getSelectedAnalyzedKeywords();
                const keywordsToSave = selected.length > 0 ? selected : state.analyzedKeywords;

                if (keywordsToSave.length === 0) return state;

                // Convert to EnrichedKeyword format
                const enriched: EnrichedKeyword[] = keywordsToSave.map(kw => ({
                    id: `${kw.keyword}_${Date.now()}`,
                    keyword: kw.keyword,
                    source: kw.source,
                    niche: kw.niche,
                    research: state.researchResults[kw.keyword] || undefined,
                    analysis: kw.analysis,
                    analyzedAt: Date.now(),
                }));

                const newSaved: SavedAnalysis = {
                    id: crypto.randomUUID(),
                    keywords: enriched,
                    savedAt: Date.now(),
                    name: name || `Analysis ${new Date().toLocaleDateString()}`,
                };

                return {
                    savedAnalyses: [newSaved, ...state.savedAnalyses],
                    selectedAnalyzedIds: new Set(), // Clear selection after save
                };
            }),

            deleteSavedAnalysis: (id) => set((state) => ({
                savedAnalyses: state.savedAnalyses.filter(s => s.id !== id)
            })),

            loadSavedAnalysis: (id) => {
                const state = get();
                const saved = state.savedAnalyses.find(s => s.id === id);
                if (!saved) return;

                // Convert EnrichedKeyword back to AnalyzedKeyword for display
                const analyzed: AnalyzedKeyword[] = saved.keywords.map(ek => ({
                    keyword: ek.keyword,
                    source: ek.source as 'csv' | 'live' | 'evergreen' | 'ai' | 'trend_scan',
                    niche: ek.niche,
                    analysis: ek.analysis || {
                        keyword: ek.keyword,
                        niche: ek.niche || 'General',
                        estimatedCPC: '$0.50-2.00',
                        estimatedVolume: '1K-10K',
                        competition: 'Medium',
                        score: 50,
                        intent: 'informational',
                        reasoning: 'Loaded from saved analysis',
                    },
                }));
                set({ analyzedKeywords: analyzed });
            },

            // Get enriched keywords for Domain Acquire
            getEnrichedKeywords: (ids) => {
                const state = get();
                const keywords = ids
                    ? state.analyzedKeywords.filter(k => ids.includes(k.keyword))
                    : state.getSelectedAnalyzedKeywords();

                return keywords.map(kw => ({
                    id: `${kw.keyword}_${Date.now()}`,
                    keyword: kw.keyword,
                    source: kw.source,
                    niche: kw.niche,
                    research: state.researchResults[kw.keyword] || undefined,
                    analysis: kw.analysis,
                    analyzedAt: Date.now(),
                }));
            },

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
                csvImportHistory: state.csvImportHistory,
                analyzedKeywords: state.analyzedKeywords,
                researchResults: state.researchResults,
                history: state.history,
                savedAnalyses: state.savedAnalyses, // Persist saved analyses
                // Don't persist selection (ephemeral)
            }),
        }
    )
);

// ============ SELECTORS ============

export const selectCSVKeywords = (state: KeywordStore) => state.csvKeywords;
export const selectAnalyzedKeywords = (state: KeywordStore) => state.analyzedKeywords;
export const selectHistory = (state: KeywordStore) => state.history;
export const selectResearchResults = (state: KeywordStore) => state.researchResults;
export const selectCSVImportHistory = (state: KeywordStore) => state.csvImportHistory;

