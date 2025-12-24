/**
 * useWatchlist Hook
 * 
 * Manages domain watchlist with localStorage persistence.
 * Extracted from ExpiredDomainFinder for reusability.
 */

import { useState, useCallback, useEffect } from 'react';
import type { DomainItem, WatchlistDomain } from '@/lib/domains/types';

// ============ CONSTANTS ============

const WATCHLIST_KEY = 'ifrit_domain_watchlist';

// ============ TYPES ============

export interface UseWatchlistReturn {
    watchlist: WatchlistDomain[];
    addToWatchlist: (domain: DomainItem, notes?: string) => void;
    removeFromWatchlist: (domainName: string) => void;
    isWatched: (domainName: string) => boolean;
    toggleWatchlist: (domain: DomainItem) => void;
    clearWatchlist: () => void;
    updateNotes: (domainName: string, notes: string) => void;
}

// ============ HOOK ============

export function useWatchlist(): UseWatchlistReturn {
    const [watchlist, setWatchlist] = useState<WatchlistDomain[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(WATCHLIST_KEY);
                if (saved) {
                    setWatchlist(JSON.parse(saved));
                }
            } catch (e) {
                console.error('Failed to load watchlist:', e);
            }
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (typeof window !== 'undefined' && watchlist.length > 0) {
            try {
                localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
            } catch (e) {
                console.error('Failed to save watchlist:', e);
            }
        }
    }, [watchlist]);

    const addToWatchlist = useCallback((domain: DomainItem, notes?: string) => {
        setWatchlist(prev => {
            if (prev.some(d => d.domain === domain.domain)) {
                return prev;
            }
            return [...prev, { ...domain, addedAt: Date.now(), notes }];
        });
    }, []);

    const removeFromWatchlist = useCallback((domainName: string) => {
        setWatchlist(prev => prev.filter(d => d.domain !== domainName));
    }, []);

    const isWatched = useCallback((domainName: string) => {
        return watchlist.some(d => d.domain === domainName);
    }, [watchlist]);

    const toggleWatchlist = useCallback((domain: DomainItem) => {
        if (watchlist.some(d => d.domain === domain.domain)) {
            removeFromWatchlist(domain.domain);
        } else {
            addToWatchlist(domain);
        }
    }, [watchlist, addToWatchlist, removeFromWatchlist]);

    const clearWatchlist = useCallback(() => {
        setWatchlist([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(WATCHLIST_KEY);
        }
    }, []);

    const updateNotes = useCallback((domainName: string, notes: string) => {
        setWatchlist(prev =>
            prev.map(d =>
                d.domain === domainName ? { ...d, notes } : d
            )
        );
    }, []);

    return {
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        isWatched,
        toggleWatchlist,
        clearWatchlist,
        updateNotes,
    };
}
