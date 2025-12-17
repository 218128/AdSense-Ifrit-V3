/**
 * Hunt Store Tests
 * 
 * Tests for Zustand store managing Hunt tab state.
 */

import { useHuntStore, AnalyzeCandidate } from '@/stores/huntStore';

// Reset store before each test
beforeEach(() => {
    useHuntStore.setState({
        analyzeQueue: [],
        purchaseQueue: [],
        watchlist: [],
        selectedDomains: new Set(),
    });
});

describe('Hunt Store', () => {
    describe('Analyze Queue', () => {
        const testDomain: AnalyzeCandidate = {
            domain: 'example.com',
            tld: '.com',
            score: 75,
            recommendation: 'buy',
            estimatedValue: 500,
        };

        it('should add domain to analyze queue', () => {
            const { addToAnalyze, analyzeQueue } = useHuntStore.getState();

            addToAnalyze([testDomain]);

            expect(useHuntStore.getState().analyzeQueue).toHaveLength(1);
            expect(useHuntStore.getState().analyzeQueue[0].domain).toBe('example.com');
        });

        it('should not add duplicate domains', () => {
            const { addToAnalyze } = useHuntStore.getState();

            addToAnalyze([testDomain]);
            addToAnalyze([testDomain]); // Try adding again

            expect(useHuntStore.getState().analyzeQueue).toHaveLength(1);
        });

        it('should remove domain from analyze queue', () => {
            const { addToAnalyze, removeFromAnalyze } = useHuntStore.getState();

            addToAnalyze([testDomain]);
            removeFromAnalyze('example.com');

            expect(useHuntStore.getState().analyzeQueue).toHaveLength(0);
        });

        it('should clear analyze queue', () => {
            const { addToAnalyze, clearAnalyzeQueue } = useHuntStore.getState();

            addToAnalyze([testDomain, { ...testDomain, domain: 'test.com' }]);
            clearAnalyzeQueue();

            expect(useHuntStore.getState().analyzeQueue).toHaveLength(0);
        });
    });

    describe('Purchase Queue', () => {
        const testDomain: AnalyzeCandidate = {
            domain: 'buy-me.com',
            tld: '.com',
            score: 85,
            recommendation: 'strong-buy',
            estimatedValue: 1000,
        };

        it('should add domain to purchase queue', () => {
            const { addToPurchase } = useHuntStore.getState();

            addToPurchase(testDomain);

            const queue = useHuntStore.getState().purchaseQueue;
            expect(queue).toHaveLength(1);
            expect(queue[0].domain).toBe('buy-me.com');
            expect(queue[0].addedAt).toBeDefined();
        });

        it('should remove from analyze queue when adding to purchase', () => {
            const { addToAnalyze, addToPurchase } = useHuntStore.getState();

            addToAnalyze([testDomain]);
            addToPurchase(testDomain);

            expect(useHuntStore.getState().analyzeQueue).toHaveLength(0);
            expect(useHuntStore.getState().purchaseQueue).toHaveLength(1);
        });

        it('should remove domain from purchase queue', () => {
            const { addToPurchase, removeFromPurchase } = useHuntStore.getState();

            addToPurchase(testDomain);
            removeFromPurchase('buy-me.com');

            expect(useHuntStore.getState().purchaseQueue).toHaveLength(0);
        });

        it('should mark domain as purchased', () => {
            const { addToPurchase, markAsPurchased } = useHuntStore.getState();

            addToPurchase(testDomain);
            markAsPurchased('buy-me.com');

            expect(useHuntStore.getState().purchaseQueue).toHaveLength(0);
        });
    });

    describe('Watchlist', () => {
        it('should add domain to watchlist', () => {
            const { addToWatchlist } = useHuntStore.getState();

            addToWatchlist({
                domain: 'watch.com',
                tld: '.com',
                source: 'manual',
                addedAt: Date.now(),
            });

            expect(useHuntStore.getState().watchlist).toHaveLength(1);
        });

        it('should check if domain is watched', () => {
            const { addToWatchlist, isWatched } = useHuntStore.getState();

            addToWatchlist({
                domain: 'watch.com',
                tld: '.com',
                source: 'manual',
                addedAt: Date.now(),
            });

            expect(useHuntStore.getState().isWatched('watch.com')).toBe(true);
            expect(useHuntStore.getState().isWatched('not-watched.com')).toBe(false);
        });
    });

    describe('Selection', () => {
        it('should toggle domain selection', () => {
            const { toggleSelection } = useHuntStore.getState();

            toggleSelection('select.com');
            expect(useHuntStore.getState().selectedDomains.has('select.com')).toBe(true);

            toggleSelection('select.com');
            expect(useHuntStore.getState().selectedDomains.has('select.com')).toBe(false);
        });

        it('should select all domains', () => {
            const { selectAll } = useHuntStore.getState();

            selectAll(['a.com', 'b.com', 'c.com']);

            expect(useHuntStore.getState().selectedDomains.size).toBe(3);
        });

        it('should deselect all domains', () => {
            const { selectAll, deselectAll } = useHuntStore.getState();

            selectAll(['a.com', 'b.com']);
            deselectAll();

            expect(useHuntStore.getState().selectedDomains.size).toBe(0);
        });
    });
});
