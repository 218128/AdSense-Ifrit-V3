/**
 * useKeywordHunter Hook
 * 
 * Custom hook combining keywordStore state with handler functions.
 * Provides clean API for KeywordHunter component.
 * 
 * @module KeywordHunter/hooks
 */

import { useState, useCallback } from 'react';
import { useKeywordStore } from '@/stores/keywordStore';
import {
    createHandleCSVImport,
    createHandleAnalyze,
    createHandleResearchTrends,
    createHandleUseKeyword,
    createHandleHuntDomains,
} from '../handlers';
import type { KeywordSelectData } from '../handlers';
import type { AnalyzedKeyword, KeywordItem, AnalysisHistoryItem } from '@/lib/keywords/types';

/**
 * Props for useKeywordHunter
 */
export interface UseKeywordHunterProps {
    /** Callback when keyword is selected for use */
    onSelect?: (data: KeywordSelectData) => void;
    /** Callback to navigate to domains tab */
    onNavigateToDomains?: (keywords: string[]) => void;
}

/**
 * Return type for useKeywordHunter hook
 */
export interface UseKeywordHunterReturn {
    // State
    allKeywords: KeywordItem[];
    csvKeywords: KeywordItem[];
    analyzedKeywords: AnalyzedKeyword[];
    selectedKeywords: Set<string>;
    selectedCount: number;
    isAnalyzing: boolean;
    researching: boolean;
    history: AnalysisHistoryItem[];

    // Store methods
    toggleSelect: (keyword: string) => void;
    selectMultiple: (keywords: string[]) => void;
    clearSelection: () => void;
    isSelected: (keyword: string) => boolean;
    loadHistoryItem: (item: AnalysisHistoryItem) => void;

    // Handlers
    handleCSVImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleAnalyze: () => Promise<void>;
    handleResearchTrends: () => Promise<void>;
    handleUseKeyword: (kw: AnalyzedKeyword) => void;
    handleHuntDomains: () => void;
}

/**
 * Custom hook for KeywordHunter component
 * 
 * @param props - Hook configuration
 * @returns State and handlers
 */
export function useKeywordHunter({
    onSelect,
    onNavigateToDomains,
}: UseKeywordHunterProps = {}): UseKeywordHunterReturn {
    // Store state
    const store = useKeywordStore();
    const {
        csvKeywords,
        analyzedKeywords,
        selectedKeywords,
        isAnalyzing,
        history,
        toggleSelect,
        selectMultiple,
        clearSelection,
        isSelected,
        getSelectedCount,
        getAllKeywords,
        addCSVKeywords,
        runAnalysis,
        addResearchResult,
        loadHistoryItem,
    } = store;

    // Local state
    const [researching, setResearching] = useState(false);

    // Computed
    const selectedCount = getSelectedCount();
    const allKeywords = getAllKeywords();

    // Create handlers
    const handleCSVImport = useCallback(
        createHandleCSVImport({ addCSVKeywords }),
        [addCSVKeywords]
    );

    const handleAnalyze = useCallback(
        createHandleAnalyze({
            selectedCount,
            allKeywords,
            selectedKeywords,
            runAnalysis,
            clearSelection,
        }),
        [selectedCount, allKeywords, selectedKeywords, runAnalysis, clearSelection]
    );

    const handleResearchTrends = useCallback(
        createHandleResearchTrends({
            selectedCount,
            selectedKeywords,
            addResearchResult,
            setResearching,
        }),
        [selectedCount, selectedKeywords, addResearchResult]
    );

    const handleUseKeyword = useCallback(
        createHandleUseKeyword({ onSelect }),
        [onSelect]
    );

    const handleHuntDomains = useCallback(
        createHandleHuntDomains({ onNavigateToDomains, analyzedKeywords }),
        [onNavigateToDomains, analyzedKeywords]
    );

    return {
        // State
        allKeywords,
        csvKeywords,
        analyzedKeywords,
        selectedKeywords,
        selectedCount,
        isAnalyzing,
        researching,
        history,

        // Store methods
        toggleSelect,
        selectMultiple,
        clearSelection,
        isSelected,
        loadHistoryItem,

        // Handlers
        handleCSVImport,
        handleAnalyze,
        handleResearchTrends,
        handleUseKeyword,
        handleHuntDomains,
    };
}
