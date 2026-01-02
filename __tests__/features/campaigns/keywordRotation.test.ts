/**
 * Keyword Rotation Tests
 * Enterprise-grade tests for keyword selection and rotation strategies.
 */

import {
    createRotator,
    getNextKeyword,
    peekNextKeyword,
    addKeyword,
    removeKeyword,
    setKeywordWeight,
    toggleKeyword,
    resetRotator,
    getRotatorStats,
    type KeywordRotator,
} from '@/features/campaigns/lib/keywordRotation';

describe('Keyword Rotation', () => {
    // =========================================================================
    // createRotator
    // =========================================================================
    describe('createRotator', () => {
        it('should create rotator with keywords', () => {
            const rotator = createRotator('Test', ['keyword1', 'keyword2', 'keyword3']);
            expect(rotator.name).toBe('Test');
            expect(rotator.keywords).toHaveLength(3);
            expect(rotator.mode).toBe('sequential');
        });

        it('should initialize keywords with correct structure', () => {
            const rotator = createRotator('Test', ['kw1']);
            expect(rotator.keywords[0]).toMatchObject({
                text: 'kw1',
                weight: 1,
                usage: 0,
                enabled: true,
            });
        });

        it('should allow custom mode', () => {
            const rotator = createRotator('Test', ['kw1'], 'random');
            expect(rotator.mode).toBe('random');
        });
    });

    // =========================================================================
    // getNextKeyword - Sequential Mode
    // =========================================================================
    describe('getNextKeyword - Sequential Mode', () => {
        it('should cycle through keywords in order', () => {
            const rotator = createRotator('Test', ['A', 'B', 'C'], 'sequential');

            const result1 = getNextKeyword(rotator);
            const result2 = getNextKeyword(rotator);
            const result3 = getNextKeyword(rotator);
            const result4 = getNextKeyword(rotator);

            expect(result1?.keyword.text).toBe('A');
            expect(result2?.keyword.text).toBe('B');
            expect(result3?.keyword.text).toBe('C');
            expect(result4?.keyword.text).toBe('A'); // Wraps around
        });

        it('should track usage count', () => {
            const rotator = createRotator('Test', ['A', 'B'], 'sequential');

            getNextKeyword(rotator);
            getNextKeyword(rotator);
            getNextKeyword(rotator);

            expect(rotator.keywords[0].usage).toBe(2); // A used twice
            expect(rotator.keywords[1].usage).toBe(1); // B used once
        });

        it('should update lastUsed timestamp', () => {
            const rotator = createRotator('Test', ['A'], 'sequential');
            const before = Date.now();

            getNextKeyword(rotator);

            expect(rotator.keywords[0].lastUsed).toBeDefined();
            expect(rotator.keywords[0].lastUsed!.getTime()).toBeGreaterThanOrEqual(before);
        });

        it('should return null for empty rotator', () => {
            const rotator = createRotator('Test', [], 'sequential');
            expect(getNextKeyword(rotator)).toBeNull();
        });
    });

    // =========================================================================
    // getNextKeyword - Random Mode
    // =========================================================================
    describe('getNextKeyword - Random Mode', () => {
        it('should return random keywords', () => {
            const rotator = createRotator('Test', ['A', 'B', 'C', 'D', 'E'], 'random');

            const results = new Set<string>();
            for (let i = 0; i < 50; i++) {
                const result = getNextKeyword(rotator);
                if (result) results.add(result.keyword.text);
            }

            // With 50 iterations, should get multiple different keywords
            expect(results.size).toBeGreaterThan(1);
        });
    });

    // =========================================================================
    // getNextKeyword - Weighted Mode
    // =========================================================================
    describe('getNextKeyword - Weighted Mode', () => {
        it('should favor higher-weighted keywords', () => {
            const rotator = createRotator('Test', ['low', 'high'], 'weighted');
            rotator.keywords[0].weight = 1;
            rotator.keywords[1].weight = 100;

            const counts = { low: 0, high: 0 };
            for (let i = 0; i < 100; i++) {
                const result = getNextKeyword(rotator);
                if (result) counts[result.keyword.text as 'low' | 'high']++;
            }

            // High-weighted should be picked much more often
            expect(counts.high).toBeGreaterThan(counts.low);
        });
    });

    // =========================================================================
    // getNextKeyword - Least-Used Mode
    // =========================================================================
    describe('getNextKeyword - Least-Used Mode', () => {
        it('should pick least used keyword', () => {
            const rotator = createRotator('Test', ['A', 'B', 'C'], 'least-used');
            rotator.keywords[0].usage = 5;
            rotator.keywords[1].usage = 2;
            rotator.keywords[2].usage = 8;

            const result = getNextKeyword(rotator);
            expect(result?.keyword.text).toBe('B'); // Least used
        });
    });

    // =========================================================================
    // getNextKeyword - Exhaust-First Mode
    // =========================================================================
    describe('getNextKeyword - Exhaust-First Mode', () => {
        it('should use each keyword once before repeating', () => {
            const rotator = createRotator('Test', ['A', 'B', 'C'], 'exhaust-first');

            const firstCycle: string[] = [];
            for (let i = 0; i < 3; i++) {
                const result = getNextKeyword(rotator);
                if (result) firstCycle.push(result.keyword.text);
            }

            // All keywords should be used once
            expect(new Set(firstCycle).size).toBe(3);
            expect(firstCycle).toContain('A');
            expect(firstCycle).toContain('B');
            expect(firstCycle).toContain('C');
        });

        it('should reset after exhausting all keywords', () => {
            const rotator = createRotator('Test', ['A', 'B'], 'exhaust-first');

            // First cycle
            getNextKeyword(rotator);
            getNextKeyword(rotator);

            // Should reset and continue
            const result = getNextKeyword(rotator);
            expect(result).not.toBeNull();
        });
    });

    // =========================================================================
    // peekNextKeyword
    // =========================================================================
    describe('peekNextKeyword', () => {
        it('should preview next keyword without consuming', () => {
            const rotator = createRotator('Test', ['A', 'B'], 'sequential');

            const peek1 = peekNextKeyword(rotator);
            const peek2 = peekNextKeyword(rotator);

            expect(peek1?.text).toBe(peek2?.text); // Same because not consumed
        });

        it('should return undefined for random mode', () => {
            const rotator = createRotator('Test', ['A', 'B'], 'random');
            expect(peekNextKeyword(rotator)).toBeUndefined();
        });
    });

    // =========================================================================
    // Rotator Management
    // =========================================================================
    describe('addKeyword', () => {
        it('should add keyword to rotator', () => {
            const rotator = createRotator('Test', ['A']);
            const added = addKeyword(rotator, 'B', 2);

            expect(rotator.keywords).toHaveLength(2);
            expect(added.text).toBe('B');
            expect(added.weight).toBe(2);
        });
    });

    describe('removeKeyword', () => {
        it('should remove keyword from rotator', () => {
            const rotator = createRotator('Test', ['A', 'B']);
            const kwId = rotator.keywords[0].id;

            const result = removeKeyword(rotator, kwId);

            expect(result).toBe(true);
            expect(rotator.keywords).toHaveLength(1);
        });

        it('should return false for non-existent keyword', () => {
            const rotator = createRotator('Test', ['A']);
            expect(removeKeyword(rotator, 'nonexistent')).toBe(false);
        });
    });

    describe('setKeywordWeight', () => {
        it('should update keyword weight', () => {
            const rotator = createRotator('Test', ['A']);
            const kwId = rotator.keywords[0].id;

            setKeywordWeight(rotator, kwId, 5);

            expect(rotator.keywords[0].weight).toBe(5);
        });

        it('should not allow negative weights', () => {
            const rotator = createRotator('Test', ['A']);
            const kwId = rotator.keywords[0].id;

            setKeywordWeight(rotator, kwId, -5);

            expect(rotator.keywords[0].weight).toBe(0);
        });
    });

    describe('toggleKeyword', () => {
        it('should toggle keyword enabled state', () => {
            const rotator = createRotator('Test', ['A']);
            const kwId = rotator.keywords[0].id;

            expect(rotator.keywords[0].enabled).toBe(true);
            toggleKeyword(rotator, kwId);
            expect(rotator.keywords[0].enabled).toBe(false);
            toggleKeyword(rotator, kwId);
            expect(rotator.keywords[0].enabled).toBe(true);
        });

        it('should allow explicit enabled value', () => {
            const rotator = createRotator('Test', ['A']);
            const kwId = rotator.keywords[0].id;

            toggleKeyword(rotator, kwId, false);
            expect(rotator.keywords[0].enabled).toBe(false);
        });
    });

    describe('resetRotator', () => {
        it('should reset all state', () => {
            const rotator = createRotator('Test', ['A', 'B'], 'sequential');

            getNextKeyword(rotator);
            getNextKeyword(rotator);
            getNextKeyword(rotator);

            resetRotator(rotator);

            expect(rotator.state.currentIndex).toBe(0);
            expect(rotator.state.history).toHaveLength(0);
            expect(rotator.keywords[0].usage).toBe(0);
            expect(rotator.keywords[0].lastUsed).toBeUndefined();
        });
    });

    // =========================================================================
    // getRotatorStats
    // =========================================================================
    describe('getRotatorStats', () => {
        it('should calculate stats correctly', () => {
            const rotator = createRotator('Test', ['A', 'B', 'C'], 'sequential');

            getNextKeyword(rotator);
            getNextKeyword(rotator);
            getNextKeyword(rotator);
            getNextKeyword(rotator);
            getNextKeyword(rotator);

            const stats = getRotatorStats(rotator);

            expect(stats.totalUsage).toBe(5);
            expect(stats.distribution).toEqual({ 'A': 2, 'B': 2, 'C': 1 });
            expect(stats.leastUsed?.text).toBe('C');
            expect(['A', 'B']).toContain(stats.mostUsed?.text); // Both have 2, either is valid
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================
    describe('Edge Cases', () => {
        it('should skip disabled keywords', () => {
            const rotator = createRotator('Test', ['A', 'B', 'C'], 'sequential');
            toggleKeyword(rotator, rotator.keywords[1].id, false); // Disable B

            const result1 = getNextKeyword(rotator);
            const result2 = getNextKeyword(rotator);

            expect(result1?.keyword.text).toBe('A');
            expect(result2?.keyword.text).toBe('C'); // Skips B
        });

        it('should return null when all keywords disabled', () => {
            const rotator = createRotator('Test', ['A', 'B'], 'sequential');
            toggleKeyword(rotator, rotator.keywords[0].id, false);
            toggleKeyword(rotator, rotator.keywords[1].id, false);

            expect(getNextKeyword(rotator)).toBeNull();
        });

        it('should maintain history within limits', () => {
            const rotator = createRotator('Test', ['A'], 'sequential');

            // Generate more than 1000 history entries
            for (let i = 0; i < 1100; i++) {
                getNextKeyword(rotator);
            }

            // History should be trimmed
            expect(rotator.state.history.length).toBeLessThanOrEqual(1000);
        });
    });
});
