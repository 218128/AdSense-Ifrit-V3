/**
 * Workflow Tests - Domain Hunting Flow
 * Phase 6: Enterprise Consolidation
 * 
 * Tests the domain hunting and acquisition workflow
 */

import { useHuntStore } from '@/stores/huntStore';
import { useDomainAcquireStore } from '@/stores/domainAcquireStore';

// Reset stores before each test
beforeEach(() => {
    useHuntStore.setState({
        analyzeQueue: [],
        purchaseQueue: [],
        watchlist: [],
        selectedDomains: new Set(),
    });
});

describe('Domain Hunting Workflow', () => {
    describe('Domain Discovery to Analysis', () => {
        it('should add discovered domains to analyze queue', () => {
            const { addToAnalyze } = useHuntStore.getState();

            const domains = [
                { domain: 'tech-blog.com', tld: '.com', score: 75, recommendation: 'buy' as const, estimatedValue: 500 },
                { domain: 'cooking-tips.net', tld: '.net', score: 60, recommendation: 'consider' as const, estimatedValue: 200 },
            ];

            addToAnalyze(domains);

            const { analyzeQueue } = useHuntStore.getState();
            expect(analyzeQueue).toHaveLength(2);
        });

        it('should prevent duplicate domain entries', () => {
            const { addToAnalyze } = useHuntStore.getState();

            const domain = { domain: 'unique.com', tld: '.com', score: 80, recommendation: 'strong-buy' as const, estimatedValue: 1000 };

            addToAnalyze([domain]);
            addToAnalyze([domain]); // Duplicate

            const { analyzeQueue } = useHuntStore.getState();
            expect(analyzeQueue).toHaveLength(1);
        });
    });

    describe('Analysis to Purchase Queue', () => {
        it('should move domain from analyze to purchase queue', () => {
            const { addToAnalyze, addToPurchase } = useHuntStore.getState();

            const domain = { domain: 'purchase-me.com', tld: '.com', score: 90, recommendation: 'strong-buy' as const, estimatedValue: 2000 };

            addToAnalyze([domain]);
            addToPurchase(domain);

            const state = useHuntStore.getState();
            expect(state.analyzeQueue).toHaveLength(0);
            expect(state.purchaseQueue).toHaveLength(1);
            expect(state.purchaseQueue[0].addedAt).toBeDefined();
        });
    });

    describe('Purchase to Completion', () => {
        it('should mark domain as purchased with flag', () => {
            const { addToPurchase, markAsPurchased } = useHuntStore.getState();

            const domain = { domain: 'bought.com', tld: '.com', score: 85, recommendation: 'buy' as const, estimatedValue: 800 };

            addToPurchase(domain);
            markAsPurchased('bought.com');

            const { purchaseQueue } = useHuntStore.getState();
            expect(purchaseQueue[0].purchased).toBe(true);
        });
    });

    describe('Watchlist Management', () => {
        it('should add domain to watchlist', () => {
            const { addToWatchlist, isWatched } = useHuntStore.getState();

            addToWatchlist({
                domain: 'watch-me.com',
                tld: '.com',
                source: 'manual',
                addedAt: Date.now(),
            });

            expect(useHuntStore.getState().isWatched('watch-me.com')).toBe(true);
        });

        it('should check watchlist status correctly', () => {
            const { isWatched } = useHuntStore.getState();

            expect(isWatched('not-watched.com')).toBe(false);
        });
    });

    describe('Selection Workflow', () => {
        it('should toggle domain selection', () => {
            const { toggleSelection } = useHuntStore.getState();

            toggleSelection('select.com');
            expect(useHuntStore.getState().selectedDomains.has('select.com')).toBe(true);

            toggleSelection('select.com');
            expect(useHuntStore.getState().selectedDomains.has('select.com')).toBe(false);
        });

        it('should select all domains', () => {
            const { selectAll, deselectAll } = useHuntStore.getState();

            selectAll(['a.com', 'b.com', 'c.com']);
            expect(useHuntStore.getState().selectedDomains.size).toBe(3);

            deselectAll();
            expect(useHuntStore.getState().selectedDomains.size).toBe(0);
        });
    });
});
