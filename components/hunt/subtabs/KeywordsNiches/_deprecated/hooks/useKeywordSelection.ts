/**
 * useKeywordSelection Hook
 * 
 * Manages keyword selection state for analysis.
 */

import { useState, useCallback } from 'react';
import type { KeywordItem } from '@/lib/keywords/types';

// ============ TYPES ============

export interface UseKeywordSelectionReturn {
    // Selection state
    selectedKeywords: KeywordItem[];

    // Actions
    toggleSelect: (item: KeywordItem) => void;
    isSelected: (keyword: string) => boolean;
    clearSelection: () => void;
    selectAll: (items: KeywordItem[]) => void;

    // Bulk selection helpers
    selectedCount: number;
    hasSelection: boolean;
}

// ============ HOOK ============

export function useKeywordSelection(): UseKeywordSelectionReturn {
    const [selectedKeywords, setSelectedKeywords] = useState<KeywordItem[]>([]);

    const toggleSelect = useCallback((item: KeywordItem) => {
        setSelectedKeywords(prev => {
            const exists = prev.some(k => k.keyword === item.keyword);
            if (exists) {
                return prev.filter(k => k.keyword !== item.keyword);
            } else {
                return [...prev, item];
            }
        });
    }, []);

    const isSelected = useCallback((keyword: string) => {
        return selectedKeywords.some(k => k.keyword === keyword);
    }, [selectedKeywords]);

    const clearSelection = useCallback(() => {
        setSelectedKeywords([]);
    }, []);

    const selectAll = useCallback((items: KeywordItem[]) => {
        setSelectedKeywords(items);
    }, []);

    return {
        selectedKeywords,
        toggleSelect,
        isSelected,
        clearSelection,
        selectAll,
        selectedCount: selectedKeywords.length,
        hasSelection: selectedKeywords.length > 0,
    };
}
