/**
 * Tests for useWatchlist Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useWatchlist } from '@/components/hunt/domains/hooks/useWatchlist';
import type { DomainItem } from '@/lib/domains/types';

// Mock localStorage
const localStorageMock = {
    store: {} as Record<string, string>,
    getItem: jest.fn((key: string) => localStorageMock.store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
        localStorageMock.store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
        delete localStorageMock.store[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.store = {};
    }),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockDomain: DomainItem = {
    domain: 'test-domain.com',
    tld: 'com',
    source: 'manual',
    status: 'unknown',
    fetchedAt: Date.now(),
};

const mockDomain2: DomainItem = {
    domain: 'another-site.net',
    tld: 'net',
    source: 'spamzilla',
    status: 'available',
    fetchedAt: Date.now(),
};

describe('useWatchlist', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    it('starts with empty watchlist', () => {
        const { result } = renderHook(() => useWatchlist());
        expect(result.current.watchlist).toEqual([]);
    });

    it('adds domain to watchlist', () => {
        const { result } = renderHook(() => useWatchlist());

        act(() => {
            result.current.addToWatchlist(mockDomain);
        });

        expect(result.current.watchlist).toHaveLength(1);
        expect(result.current.watchlist[0].domain).toBe('test-domain.com');
        expect(result.current.watchlist[0].addedAt).toBeDefined();
    });

    it('adds domain with notes', () => {
        const { result } = renderHook(() => useWatchlist());

        act(() => {
            result.current.addToWatchlist(mockDomain, 'Great for tech blog');
        });

        expect(result.current.watchlist[0].notes).toBe('Great for tech blog');
    });

    it('removes domain from watchlist', () => {
        const { result } = renderHook(() => useWatchlist());

        act(() => {
            result.current.addToWatchlist(mockDomain);
            result.current.addToWatchlist(mockDomain2);
        });

        expect(result.current.watchlist).toHaveLength(2);

        act(() => {
            result.current.removeFromWatchlist('test-domain.com');
        });

        expect(result.current.watchlist).toHaveLength(1);
        expect(result.current.watchlist[0].domain).toBe('another-site.net');
    });

    it('checks if domain is watched', () => {
        const { result } = renderHook(() => useWatchlist());

        act(() => {
            result.current.addToWatchlist(mockDomain);
        });

        expect(result.current.isWatched('test-domain.com')).toBe(true);
        expect(result.current.isWatched('not-watched.com')).toBe(false);
    });

    it('toggles watchlist status', () => {
        const { result } = renderHook(() => useWatchlist());

        // Add
        act(() => {
            result.current.toggleWatchlist(mockDomain);
        });
        expect(result.current.isWatched('test-domain.com')).toBe(true);

        // Remove
        act(() => {
            result.current.toggleWatchlist(mockDomain);
        });
        expect(result.current.isWatched('test-domain.com')).toBe(false);
    });

    it('clears entire watchlist', () => {
        const { result } = renderHook(() => useWatchlist());

        act(() => {
            result.current.addToWatchlist(mockDomain);
            result.current.addToWatchlist(mockDomain2);
        });

        expect(result.current.watchlist).toHaveLength(2);

        act(() => {
            result.current.clearWatchlist();
        });

        expect(result.current.watchlist).toHaveLength(0);
    });

    it('updates notes for domain', () => {
        const { result } = renderHook(() => useWatchlist());

        act(() => {
            result.current.addToWatchlist(mockDomain, 'Initial note');
        });

        act(() => {
            result.current.updateNotes('test-domain.com', 'Updated note');
        });

        expect(result.current.watchlist[0].notes).toBe('Updated note');
    });

    it('prevents duplicate domains', () => {
        const { result } = renderHook(() => useWatchlist());

        act(() => {
            result.current.addToWatchlist(mockDomain);
            result.current.addToWatchlist(mockDomain);
            result.current.addToWatchlist(mockDomain);
        });

        expect(result.current.watchlist).toHaveLength(1);
    });
});
