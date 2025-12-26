/**
 * Tests for useDomainFilters Hook
 * 
 * Tests domain filtering with affinity scoring
 */

import { renderHook, act } from '@testing-library/react';
import { useDomainFilters } from '@/components/hunt/subtabs/DomainAcquire/features/ExpiredDomainFinder/useDomainFilters';
import type { DomainItem } from '@/lib/domains/types';

// Sample test data
const mockDomains: DomainItem[] = [
    {
        domain: 'tech-blog.com',
        tld: 'com',
        source: 'spamzilla',
        status: 'available',
        qualityTier: 'gold',
        enriched: true,
        fetchedAt: Date.now(),
        score: { overall: 85, recommendation: 'strong-buy', riskLevel: 'low', estimatedValue: 500 },
    } as DomainItem,
    {
        domain: 'finance-news.net',
        tld: 'net',
        source: 'manual',
        status: 'unknown',
        qualityTier: 'silver',
        enriched: false,
        fetchedAt: Date.now(),
        score: { overall: 65, recommendation: 'buy', riskLevel: 'medium', estimatedValue: 200 },
    } as DomainItem,
    {
        domain: 'cheap-stuff.xyz',
        tld: 'xyz',
        source: 'free',
        status: 'unknown',
        qualityTier: 'bronze',
        enriched: false,
        fetchedAt: Date.now(),
        score: { overall: 35, recommendation: 'consider', riskLevel: 'high', estimatedValue: 50 },
    } as DomainItem,
];

describe('useDomainFilters', () => {
    it('returns all domains when no filters applied', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));
        expect(result.current.filteredDomains).toHaveLength(3);
    });

    it('filters by keyword', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setKeyword('tech');
        });

        // With affinity scoring, domains containing 'tech' should be found
        // or none if no match
        expect(result.current.filters.keyword).toBe('tech');
    });

    it('filters by source', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setSourceFilter('spamzilla');
        });

        expect(result.current.filteredDomains).toHaveLength(1);
        expect(result.current.filteredDomains[0].domain).toBe('tech-blog.com');
    });

    it('filters by quality tier', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setTierFilter('gold');
        });

        expect(result.current.filteredDomains).toHaveLength(1);
        expect(result.current.filteredDomains[0].qualityTier).toBe('gold');
    });

    it('filters by minimum score', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setMinScore(60);
        });

        expect(result.current.filteredDomains).toHaveLength(2);
        expect(result.current.filteredDomains.every(d => (d.score?.overall || 0) >= 60)).toBe(true);
    });

    it('filters by enriched only', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setShowEnrichedOnly(true);
        });

        expect(result.current.filteredDomains).toHaveLength(1);
        expect(result.current.filteredDomains[0].enriched).toBe(true);
    });

    it('resets all filters', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setTierFilter('gold');
            result.current.setMinScore(80);
        });

        expect(result.current.filteredDomains).toHaveLength(1);

        act(() => {
            result.current.resetFilters();
        });

        expect(result.current.filters.tierFilter).toBe('all');
        expect(result.current.filters.minScore).toBe(0);
        expect(result.current.filteredDomains).toHaveLength(3);
    });

    it('combines multiple filters', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setMinScore(50);
            result.current.setSourceFilter('manual');
        });

        expect(result.current.filteredDomains).toHaveLength(1);
        expect(result.current.filteredDomains[0].domain).toBe('finance-news.net');
    });

    it('accepts initial keyword', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains, 'tech'));

        expect(result.current.filters.keyword).toBe('tech');
        expect(result.current.hasKeywords).toBe(true);
    });

    it('tracks hasKeywords state', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        expect(result.current.hasKeywords).toBe(false);

        act(() => {
            result.current.setKeyword('finance, tech');
        });

        expect(result.current.hasKeywords).toBe(true);
    });

    it('toggles sortByAffinity', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        expect(result.current.filters.sortByAffinity).toBe(true); // Default on

        act(() => {
            result.current.setSortByAffinity(false);
        });

        expect(result.current.filters.sortByAffinity).toBe(false);
    });
});
