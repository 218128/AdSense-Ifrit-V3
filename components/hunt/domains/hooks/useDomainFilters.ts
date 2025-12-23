/**
 * useDomainFilters Hook
 * 
 * Manages domain filtering and sorting state.
 * Extracted from ExpiredDomainFinder for reusability.
 */

import { useState, useMemo, useCallback } from 'react';
import type { DomainItem, QualityTier, DomainSource } from '@/lib/domains/types';

// ============ TYPES ============

export interface DomainFilters {
    keyword: string;
    sourceFilter: DomainSource | 'all';
    tierFilter: QualityTier | 'all';
    minScore: number;
    showEnrichedOnly: boolean;
}

export interface UseDomainFiltersReturn {
    filters: DomainFilters;
    setKeyword: (keyword: string) => void;
    setSourceFilter: (source: DomainSource | 'all') => void;
    setTierFilter: (tier: QualityTier | 'all') => void;
    setMinScore: (score: number) => void;
    setShowEnrichedOnly: (show: boolean) => void;
    resetFilters: () => void;
    filteredDomains: DomainItem[];
}

// ============ CONSTANTS ============

const DEFAULT_FILTERS: DomainFilters = {
    keyword: '',
    sourceFilter: 'all',
    tierFilter: 'all',
    minScore: 0,
    showEnrichedOnly: false,
};

// ============ HOOK ============

export function useDomainFilters(
    domains: DomainItem[],
    initialKeyword?: string
): UseDomainFiltersReturn {
    const [filters, setFilters] = useState<DomainFilters>({
        ...DEFAULT_FILTERS,
        keyword: initialKeyword || '',
    });

    const setKeyword = useCallback((keyword: string) => {
        setFilters(prev => ({ ...prev, keyword }));
    }, []);

    const setSourceFilter = useCallback((sourceFilter: DomainSource | 'all') => {
        setFilters(prev => ({ ...prev, sourceFilter }));
    }, []);

    const setTierFilter = useCallback((tierFilter: QualityTier | 'all') => {
        setFilters(prev => ({ ...prev, tierFilter }));
    }, []);

    const setMinScore = useCallback((minScore: number) => {
        setFilters(prev => ({ ...prev, minScore }));
    }, []);

    const setShowEnrichedOnly = useCallback((showEnrichedOnly: boolean) => {
        setFilters(prev => ({ ...prev, showEnrichedOnly }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
    }, []);

    // Apply filters to domains
    const filteredDomains = useMemo(() => {
        let result = [...domains];

        // Filter by keyword
        if (filters.keyword.trim()) {
            const keywords = filters.keyword.toLowerCase().split(',').map(k => k.trim());
            result = result.filter(d =>
                keywords.some(kw => d.domain.toLowerCase().includes(kw))
            );
        }

        // Filter by source
        if (filters.sourceFilter !== 'all') {
            result = result.filter(d => d.source === filters.sourceFilter);
        }

        // Filter by tier
        if (filters.tierFilter !== 'all') {
            result = result.filter(d => d.qualityTier === filters.tierFilter);
        }

        // Filter by minimum score
        if (filters.minScore > 0) {
            result = result.filter(d => (d.score?.overall || 0) >= filters.minScore);
        }

        // Filter enriched only
        if (filters.showEnrichedOnly) {
            result = result.filter(d => d.enriched);
        }

        // Sort by score descending
        result.sort((a, b) => (b.score?.overall || 0) - (a.score?.overall || 0));

        return result;
    }, [domains, filters]);

    return {
        filters,
        setKeyword,
        setSourceFilter,
        setTierFilter,
        setMinScore,
        setShowEnrichedOnly,
        resetFilters,
        filteredDomains,
    };
}
