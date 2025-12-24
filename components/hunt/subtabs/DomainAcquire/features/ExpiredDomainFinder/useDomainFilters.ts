/**
 * useDomainFilters Hook
 * 
 * Manages domain filtering and sorting state.
 * Now includes SpamZilla-based affinity scoring for keyword-domain matching.
 */

import { useState, useMemo, useCallback } from 'react';
import type { DomainItem, QualityTier, DomainSource } from '@/lib/domains/types';
import { matchKeywordsToDomains, type AffinityScore } from '@/lib/domains/keywordAffinityMatcher';

// ============ TYPES ============

export interface DomainFilters {
    keyword: string;
    sourceFilter: DomainSource | 'all';
    tierFilter: QualityTier | 'all';
    minScore: number;
    showEnrichedOnly: boolean;
    sortByAffinity: boolean;  // NEW: Sort by keyword affinity
}

export interface UseDomainFiltersReturn {
    filters: DomainFilters;
    setKeyword: (keyword: string) => void;
    setSourceFilter: (source: DomainSource | 'all') => void;
    setTierFilter: (tier: QualityTier | 'all') => void;
    setMinScore: (score: number) => void;
    setShowEnrichedOnly: (show: boolean) => void;
    setSortByAffinity: (sort: boolean) => void;
    resetFilters: () => void;
    filteredDomains: DomainItem[];
    affinityScores: Map<string, AffinityScore>;  // NEW: Affinity scores map
    hasKeywords: boolean;
}

// ============ CONSTANTS ============

const DEFAULT_FILTERS: DomainFilters = {
    keyword: '',
    sourceFilter: 'all',
    tierFilter: 'all',
    minScore: 0,
    showEnrichedOnly: false,
    sortByAffinity: true,  // Default ON when keywords present
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

    const setSortByAffinity = useCallback((sortByAffinity: boolean) => {
        setFilters(prev => ({ ...prev, sortByAffinity }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
    }, []);

    // Parse keywords from filter string
    const keywords = useMemo(() => {
        return filters.keyword
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
    }, [filters.keyword]);

    const hasKeywords = keywords.length > 0;

    // Calculate affinity scores for all domains
    const affinityResult = useMemo(() => {
        if (!hasKeywords || domains.length === 0) {
            return { matched: [], unmatched: [], averageScore: 0 };
        }
        return matchKeywordsToDomains(keywords, domains);
    }, [domains, keywords, hasKeywords]);

    // Create affinity scores map for quick lookup
    const affinityScores = useMemo(() => {
        const map = new Map<string, AffinityScore>();
        for (const score of affinityResult.matched) {
            map.set(score.domain, score);
        }
        return map;
    }, [affinityResult.matched]);

    // Apply filters to domains
    const filteredDomains = useMemo(() => {
        let result = [...domains];

        // Filter by keyword (using affinity matching if keywords present)
        if (hasKeywords) {
            // Use affinity-based filtering: only show domains with score > 0
            const matchedDomains = new Set(affinityResult.matched.map(s => s.domain));
            result = result.filter(d => matchedDomains.has(d.domain));
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

        // Sort: by affinity if keywords present and enabled, otherwise by quality score
        if (hasKeywords && filters.sortByAffinity) {
            result.sort((a, b) => {
                const aScore = affinityScores.get(a.domain)?.totalScore || 0;
                const bScore = affinityScores.get(b.domain)?.totalScore || 0;
                return bScore - aScore;
            });
        } else {
            result.sort((a, b) => (b.score?.overall || 0) - (a.score?.overall || 0));
        }

        return result;
    }, [domains, filters, hasKeywords, affinityResult.matched, affinityScores]);

    return {
        filters,
        setKeyword,
        setSourceFilter,
        setTierFilter,
        setMinScore,
        setShowEnrichedOnly,
        setSortByAffinity,
        resetFilters,
        filteredDomains,
        affinityScores,
        hasKeywords,
    };
}
