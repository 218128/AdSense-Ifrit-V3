/**
 * useTrendScanner Hook
 * 
 * Custom hook that combines trendStore state with handler functions.
 * Provides a clean API for the TrendScanner component.
 * 
 * @module TrendScanner/hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { useTrendStore } from '@/stores/trendStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
    createHandleScan,
    createHandleSendToAnalysis,
    createHandleResearchTrends,
} from '../handlers';

/**
 * Return type for useTrendScanner hook
 */
export interface UseTrendScannerReturn {
    // State
    trends: ReturnType<typeof useTrendStore.getState>['trends'];
    filteredTrends: ReturnType<typeof useTrendStore.getState>['trends'];
    sources: ReturnType<typeof useTrendStore.getState>['sources'];
    lastScanTime: number | null;
    isScanning: boolean;
    isLoadingMore: boolean;
    error: string | null;
    selectedCount: number;
    visibleCount: number;
    activeSource: string | null;
    showTips: boolean;
    researching: boolean;
    braveApiKey: string | null;

    // Store methods
    scanTrends: (apiKey?: string | null) => Promise<void>;
    loadMoreTrends: (apiKey?: string | null) => Promise<void>;
    toggleTrendSelection: (topic: string) => void;
    selectAllTrends: () => void;
    clearTrendSelection: () => void;
    isTrendSelected: (topic: string) => boolean;
    getSelectedTopics: () => string[];
    setActiveSource: (source: string | null) => void;
    showMore: () => void;
    toggleTips: () => void;
    addResearchResult: (topic: string, findings: string[]) => void;
    researchResults: Record<string, unknown>;

    // Handlers
    handleScan: () => void;
    handleSendToAnalysis: () => void;
    handleResearchTrends: () => Promise<void>;
}

/**
 * Props for useTrendScanner
 */
export interface UseTrendScannerProps {
    /** Callback when keywords are selected for analysis */
    onSelectKeywords?: (keywords: string[]) => void;
}

/**
 * Custom hook for TrendScanner component
 * 
 * @param props - Hook configuration
 * @returns State and handlers for TrendScanner
 * 
 * @example
 * const { trends, handleScan, isScanning } = useTrendScanner({ onSelectKeywords });
 */
export function useTrendScanner({ onSelectKeywords }: UseTrendScannerProps = {}): UseTrendScannerReturn {
    // Store state
    const store = useTrendStore();
    const {
        trends,
        sources,
        lastScanTime,
        isScanning,
        isLoadingMore,
        error,
        selectedTrends,
        toggleTrendSelection,
        selectAllTrends,
        clearTrendSelection,
        getSelectedCount,
        isTrendSelected,
        getSelectedTopics,
        scanTrends,
        loadMoreTrends,
        visibleCount,
        showMore,
        activeSource,
        setActiveSource,
        getFilteredTrends,
        showTips,
        toggleTips,
        researchResults,
        addResearchResult,
    } = store;

    // Local state
    const [braveApiKey, setBraveApiKey] = useState<string | null>(null);
    const [researching, setResearching] = useState(false);

    // Get Brave API key from settings
    const braveApiKeyFromStore = useSettingsStore(state => {
        const braveKey = state.mcpServers.apiKeys?.['brave-search'];
        if (typeof braveKey === 'string') return braveKey;
        if (braveKey && typeof braveKey === 'object') {
            return (braveKey as { key?: string }).key || '';
        }
        return '';
    });

    // Sync API key
    useEffect(() => {
        if (braveApiKeyFromStore) {
            setBraveApiKey(braveApiKeyFromStore);
        }
    }, [braveApiKeyFromStore]);

    // Computed values
    const selectedCount = getSelectedCount();
    const filteredTrends = getFilteredTrends();

    // Create handlers
    const handleScan = useCallback(
        createHandleScan({ braveApiKey, scanTrends }),
        [braveApiKey, scanTrends]
    );

    const handleSendToAnalysis = useCallback(
        createHandleSendToAnalysis({ onSelectKeywords, selectedCount, getSelectedTopics }),
        [onSelectKeywords, selectedCount, getSelectedTopics]
    );

    const handleResearchTrends = useCallback(
        createHandleResearchTrends({
            selectedCount,
            getSelectedTopics,
            addResearchResult,
            setResearching,
        }),
        [selectedCount, getSelectedTopics, addResearchResult]
    );

    return {
        // State
        trends,
        filteredTrends,
        sources,
        lastScanTime,
        isScanning,
        isLoadingMore,
        error,
        selectedCount,
        visibleCount,
        activeSource,
        showTips,
        researching,
        braveApiKey,
        researchResults,

        // Store methods
        scanTrends,
        loadMoreTrends,
        toggleTrendSelection,
        selectAllTrends,
        clearTrendSelection,
        isTrendSelected,
        getSelectedTopics,
        setActiveSource,
        showMore,
        toggleTips,
        addResearchResult,

        // Handlers
        handleScan,
        handleSendToAnalysis,
        handleResearchTrends,
    };
}
