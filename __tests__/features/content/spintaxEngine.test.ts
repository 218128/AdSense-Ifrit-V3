/**
 * Spintax Engine Tests
 * Enterprise-grade tests for spintax parsing and expansion.
 */

import {
    expandSpintax,
    hasSpintax,
    countVariations,
    generateAllVariations,
    createSpintax,
    extractSpinGroups,
    validateSpintax,
    autoSpin,
    COMMON_SYNONYMS,
} from '@/features/content/lib/spintaxEngine';

describe('Spintax Engine', () => {
    // =========================================================================
    // expandSpintax
    // =========================================================================
    describe('expandSpintax', () => {
        it('should expand simple spintax', () => {
            const result = expandSpintax('{Hello|Hi} world');
            expect(['Hello world', 'Hi world']).toContain(result.text);
            expect(result.groupCount).toBe(1);
            expect(result.totalVariations).toBe(2);
        });

        it('should expand multiple groups', () => {
            const result = expandSpintax('{Hello|Hi} {world|there}');
            expect(result.groupCount).toBe(2);
            expect(result.totalVariations).toBe(4);
        });

        it('should handle nested spintax', () => {
            const result = expandSpintax('{{A|B}|C}');
            expect(['A', 'B', 'C']).toContain(result.text);
        });

        it('should return original text if no spintax', () => {
            const result = expandSpintax('No spintax here');
            expect(result.text).toBe('No spintax here');
            expect(result.groupCount).toBe(0);
        });

        it('should use sequential mode correctly', () => {
            const state = new Map<string, number>();
            const result1 = expandSpintax('{A|B|C}', { mode: 'sequential', sequentialState: state });
            const result2 = expandSpintax('{A|B|C}', { mode: 'sequential', sequentialState: state });
            const result3 = expandSpintax('{A|B|C}', { mode: 'sequential', sequentialState: state });

            // Sequential should cycle through options
            expect([result1.text, result2.text, result3.text]).toEqual(['A', 'B', 'C']);
        });

        it('should use seeded random for reproducibility', () => {
            const result1 = expandSpintax('{A|B|C|D|E}', { seed: 12345 });
            const result2 = expandSpintax('{A|B|C|D|E}', { seed: 12345 });
            expect(result1.text).toBe(result2.text);
        });
    });

    // =========================================================================
    // hasSpintax
    // =========================================================================
    describe('hasSpintax', () => {
        it('should detect spintax', () => {
            expect(hasSpintax('{word1|word2}')).toBe(true);
            expect(hasSpintax('Hello {world|there}')).toBe(true);
        });

        it('should return false for no spintax', () => {
            expect(hasSpintax('No spintax')).toBe(false);
            expect(hasSpintax('{single}')).toBe(false); // No pipe
            expect(hasSpintax('{ | }')).toBe(true); // Empty options still valid
        });
    });

    // =========================================================================
    // countVariations
    // =========================================================================
    describe('countVariations', () => {
        it('should count simple variations', () => {
            expect(countVariations('{A|B}')).toBe(2);
            expect(countVariations('{A|B|C}')).toBe(3);
        });

        it('should multiply multiple groups', () => {
            expect(countVariations('{A|B} {C|D}')).toBe(4);
            expect(countVariations('{A|B} {C|D|E}')).toBe(6);
        });

        it('should return 1 for no spintax', () => {
            expect(countVariations('No spintax')).toBe(1);
        });
    });

    // =========================================================================
    // generateAllVariations
    // =========================================================================
    describe('generateAllVariations', () => {
        it('should generate all variations', () => {
            const variations = generateAllVariations('{A|B} {X|Y}');
            expect(variations).toHaveLength(4);
            expect(variations).toContain('A X');
            expect(variations).toContain('A Y');
            expect(variations).toContain('B X');
            expect(variations).toContain('B Y');
        });

        it('should respect max limit', () => {
            const variations = generateAllVariations('{A|B|C|D|E} {1|2|3|4|5}', 5);
            expect(variations.length).toBeLessThanOrEqual(5);
        });

        it('should return unique variations', () => {
            const variations = generateAllVariations('{A|B}');
            const unique = new Set(variations);
            expect(unique.size).toBe(variations.length);
        });
    });

    // =========================================================================
    // createSpintax
    // =========================================================================
    describe('createSpintax', () => {
        it('should create spintax from words', () => {
            expect(createSpintax(['hello', 'hi', 'hey'])).toBe('{hello|hi|hey}');
        });

        it('should return single word without braces', () => {
            expect(createSpintax(['hello'])).toBe('hello');
        });

        it('should return empty string for empty array', () => {
            expect(createSpintax([])).toBe('');
        });
    });

    // =========================================================================
    // extractSpinGroups
    // =========================================================================
    describe('extractSpinGroups', () => {
        it('should extract spin groups', () => {
            const groups = extractSpinGroups('{A|B} and {X|Y|Z}');
            expect(groups).toHaveLength(2);
            expect(groups[0]).toEqual(['A', 'B']);
            expect(groups[1]).toEqual(['X', 'Y', 'Z']);
        });

        it('should return empty array for no groups', () => {
            expect(extractSpinGroups('No groups')).toEqual([]);
        });
    });

    // =========================================================================
    // validateSpintax
    // =========================================================================
    describe('validateSpintax', () => {
        it('should validate correct spintax', () => {
            const result = validateSpintax('{A|B} text {C|D}');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect unclosed braces', () => {
            const result = validateSpintax('{A|B text');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unclosed spintax brace');
        });

        it('should detect unexpected closing braces', () => {
            const result = validateSpintax('A|B} text');
            expect(result.valid).toBe(false);
        });

        it('should detect empty groups', () => {
            const result = validateSpintax('text {} more');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Empty spintax group found');
        });

        it('should warn about single-option groups', () => {
            const result = validateSpintax('{single}');
            expect(result.valid).toBe(false);
        });
    });

    // =========================================================================
    // autoSpin
    // =========================================================================
    describe('autoSpin', () => {
        it('should auto-spin common words', () => {
            const result = autoSpin('This is a great product');
            expect(hasSpintax(result)).toBe(true);
            expect(result).toContain('{great|');
        });

        it('should preserve case', () => {
            const result = autoSpin('Great product');
            expect(result.startsWith('{')).toBe(true);
        });

        it('should use custom synonyms', () => {
            const customSynonyms = { test: ['test', 'exam', 'quiz'] };
            const result = autoSpin('Take a test', customSynonyms);
            expect(result).toContain('{test|exam|quiz}');
        });
    });

    // =========================================================================
    // COMMON_SYNONYMS
    // =========================================================================
    describe('COMMON_SYNONYMS', () => {
        it('should have common word synonyms', () => {
            expect(COMMON_SYNONYMS.great).toBeDefined();
            expect(COMMON_SYNONYMS.great.length).toBeGreaterThan(1);
            expect(COMMON_SYNONYMS.good).toBeDefined();
            expect(COMMON_SYNONYMS.best).toBeDefined();
        });
    });
});
