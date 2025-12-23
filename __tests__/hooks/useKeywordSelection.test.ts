/**
 * Tests for useKeywordSelection Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useKeywordSelection } from '@/components/hunt/keywords/hooks/useKeywordSelection';
import type { KeywordItem } from '@/lib/keywords/types';

const mockKeyword1: KeywordItem = {
    keyword: 'best vpn service',
    source: 'evergreen',
    niche: 'VPN',
};

const mockKeyword2: KeywordItem = {
    keyword: 'cheap hosting',
    source: 'csv',
    niche: 'Tech',
};

describe('useKeywordSelection', () => {
    it('starts with empty selection', () => {
        const { result } = renderHook(() => useKeywordSelection());
        expect(result.current.selectedKeywords).toEqual([]);
        expect(result.current.hasSelection).toBe(false);
    });

    it('toggles keyword selection on', () => {
        const { result } = renderHook(() => useKeywordSelection());

        act(() => {
            result.current.toggleSelect(mockKeyword1);
        });

        expect(result.current.selectedKeywords).toHaveLength(1);
        expect(result.current.isSelected('best vpn service')).toBe(true);
    });

    it('toggles keyword selection off', () => {
        const { result } = renderHook(() => useKeywordSelection());

        act(() => {
            result.current.toggleSelect(mockKeyword1);
        });

        expect(result.current.selectedCount).toBe(1);

        act(() => {
            result.current.toggleSelect(mockKeyword1);
        });

        expect(result.current.selectedCount).toBe(0);
        expect(result.current.isSelected('best vpn service')).toBe(false);
    });

    it('clears all selections', () => {
        const { result } = renderHook(() => useKeywordSelection());

        act(() => {
            result.current.toggleSelect(mockKeyword1);
            result.current.toggleSelect(mockKeyword2);
        });

        expect(result.current.selectedCount).toBe(2);

        act(() => {
            result.current.clearSelection();
        });

        expect(result.current.selectedCount).toBe(0);
    });

    it('selects all provided items', () => {
        const { result } = renderHook(() => useKeywordSelection());

        act(() => {
            result.current.selectAll([mockKeyword1, mockKeyword2]);
        });

        expect(result.current.selectedCount).toBe(2);
        expect(result.current.hasSelection).toBe(true);
    });
});
