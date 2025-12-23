/**
 * useKeywordAnalysis Hook
 * 
 * Manages CPC analysis with history persistence.
 */

import { useState, useCallback, useEffect } from 'react';
import type { KeywordItem, AnalyzedKeyword, AnalysisHistoryItem, CPCAnalysis } from '@/lib/keywords/types';

// ============ CONSTANTS ============

const HISTORY_STORAGE_KEY = 'ifrit_keyword_analysis_history';
const MAX_HISTORY_ITEMS = 10;

// ============ TYPES ============

export interface UseKeywordAnalysisReturn {
    // Analysis state
    analyzedKeywords: AnalyzedKeyword[];
    isAnalyzing: boolean;
    analysisError: string | null;

    // History
    history: AnalysisHistoryItem[];
    loadHistoryItem: (item: AnalysisHistoryItem) => void;
    clearHistory: () => void;

    // Actions
    runAnalysis: (keywords: KeywordItem[]) => Promise<void>;
    clearResults: () => void;
}

// ============ HOOK ============

export function useKeywordAnalysis(): UseKeywordAnalysisReturn {
    const [analyzedKeywords, setAnalyzedKeywords] = useState<AnalyzedKeyword[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

    // Load history on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
                if (saved) {
                    setHistory(JSON.parse(saved));
                }
            } catch (e) {
                console.error('Failed to load analysis history:', e);
            }
        }
    }, []);

    // Save history
    const saveToHistory = useCallback((keywords: AnalyzedKeyword[]) => {
        const newItem: AnalysisHistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            keywords,
        };

        setHistory(prev => {
            const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
            if (typeof window !== 'undefined') {
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
            }
            return updated;
        });
    }, []);

    const runAnalysis = useCallback(async (keywords: KeywordItem[]) => {
        if (keywords.length === 0) return;

        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const response = await fetch('/api/keywords/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: keywords.map(k => k.keyword) }),
            });

            const data = await response.json();

            if (data.success && data.analyses) {
                const analyzed: AnalyzedKeyword[] = keywords.map((kw, i) => ({
                    ...kw,
                    analysis: data.analyses[i] || {
                        keyword: kw.keyword,
                        niche: kw.niche || 'General',
                        estimatedCPC: '$0.50-2.00',
                        estimatedVolume: '1K-10K',
                        competition: 'Medium',
                        score: 50,
                        intent: 'informational',
                        reasoning: 'Analysis pending',
                    },
                }));
                setAnalyzedKeywords(analyzed);
                saveToHistory(analyzed);
            } else {
                // Fallback analysis
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
                        reasoning: data.error || 'Fallback analysis used',
                    },
                }));
                setAnalyzedKeywords(fallback);
                saveToHistory(fallback);
            }
        } catch (error) {
            setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
            // Provide fallback
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
            setAnalyzedKeywords(fallback);
        } finally {
            setIsAnalyzing(false);
        }
    }, [saveToHistory]);

    const loadHistoryItem = useCallback((item: AnalysisHistoryItem) => {
        setAnalyzedKeywords(item.keywords);
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(HISTORY_STORAGE_KEY);
        }
    }, []);

    const clearResults = useCallback(() => {
        setAnalyzedKeywords([]);
        setAnalysisError(null);
    }, []);

    return {
        analyzedKeywords,
        isAnalyzing,
        analysisError,
        history,
        loadHistoryItem,
        clearHistory,
        runAnalysis,
        clearResults,
    };
}
