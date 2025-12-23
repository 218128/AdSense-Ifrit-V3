/**
 * Tests for useDomainFilters Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useDomainFilters } from '@/components/hunt/domains/hooks/useDomainFilters';
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
    },
    {
        domain: 'finance-news.net',
        tld: 'net',
        source: 'manual',
        status: 'unknown',
        qualityTier: 'silver',
        enriched: false,
        fetchedAt: Date.now(),
        score: { overall: 65, recommendation: 'buy', riskLevel: 'medium', estimatedValue: 200 },
    },
    {
        domain: 'cheap-stuff.xyz',
        tld: 'xyz',
        source: 'free',
        status: 'unknown',
        qualityTier: 'bronze',
        enriched: false,
        fetchedAt: Date.now(),
        score: { overall: 35, recommendation: 'consider', riskLevel: 'high', estimatedValue: 50 },
    },
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

        expect(result.current.filteredDomains).toHaveLength(1);
        expect(result.current.filteredDomains[0].domain).toBe('tech-blog.com');
    });

    it('filters by source', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setSourceFilter('spamzilla');
        });

        expect(result.current.filteredDomains).toHaveLength(1);
        expect(result.current.filteredDomains[0].source).toBe('spamzilla');
    });

    it('filters by tier', () => {
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
        result.current.filteredDomains.forEach(d => {
            expect(d.score!.overall).toBeGreaterThanOrEqual(60);
        });
    });

    it('filters enriched only', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setShowEnrichedOnly(true);
        });

        expect(result.current.filteredDomains).toHaveLength(1);
        expect(result.current.filteredDomains[0].enriched).toBe(true);
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

    it('resets filters', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        act(() => {
            result.current.setKeyword('tech');
            result.current.setMinScore(90);
        });

        expect(result.current.filteredDomains).toHaveLength(0);

        act(() => {
            result.current.resetFilters();
        });

        expect(result.current.filteredDomains).toHaveLength(3);
    });

    it('sorts by score descending', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains));

        const scores = result.current.filteredDomains.map(d => d.score!.overall);
        expect(scores).toEqual([85, 65, 35]);
    });

    it('accepts initial keyword', () => {
        const { result } = renderHook(() => useDomainFilters(mockDomains, 'finance'));

        expect(result.current.filters.keyword).toBe('finance');
        expect(result.current.filteredDomains).toHaveLength(1);
    });
});
