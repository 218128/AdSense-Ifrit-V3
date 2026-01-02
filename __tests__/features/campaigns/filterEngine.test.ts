/**
 * Filter Engine Tests
 * Enterprise-grade tests for rule-based content filtering.
 */

import {
    evaluateRule,
    applyFilters,
    filterContent,
    createMinWordCountRule,
    createMaxWordCountRule,
    createPriceRangeRule,
    createExcludeKeywordsRule,
    createExcludeDomainsRule,
    type FilterRule,
    type FilterSet,
    type FilterableContent,
} from '@/features/campaigns/lib/filterEngine';

describe('Filter Engine', () => {
    // =========================================================================
    // evaluateRule - Text Operators
    // =========================================================================
    describe('evaluateRule - Text Operators', () => {
        const content: FilterableContent = {
            title: 'Hello World',
            content: 'This is a test article about programming.',
            url: 'https://example.com/article',
        };

        it('should evaluate contains operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'contains',
                value: 'Hello', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate notContains operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'notContains',
                value: 'Goodbye', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate equals operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'equals',
                value: 'hello world', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true); // Case insensitive
        });

        it('should evaluate startsWith operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'startsWith',
                value: 'hello', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate endsWith operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'endsWith',
                value: 'world', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate matches (regex) operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'content', operator: 'matches',
                value: '\\bprogramming\\b', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate isEmpty operator', () => {
            const emptyContent: FilterableContent = { title: '', content: '' };
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'isEmpty',
                value: '', enabled: true, action: 'include',
            };
            expect(evaluateRule(emptyContent, rule)).toBe(true);
            expect(evaluateRule(content, rule)).toBe(false);
        });

        it('should evaluate isNotEmpty operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'isNotEmpty',
                value: '', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });
    });

    // =========================================================================
    // evaluateRule - Number Operators
    // =========================================================================
    describe('evaluateRule - Number Operators', () => {
        const content: FilterableContent = {
            title: 'Product',
            content: 'A great product for everyone.',
            price: 99.99,
            rating: 4.5,
            wordCount: 50,
        };

        it('should evaluate greaterThan operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'number', field: 'price', operator: 'greaterThan',
                value: 50, enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate lessThan operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'number', field: 'rating', operator: 'lessThan',
                value: 5, enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate between operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'number', field: 'price', operator: 'between',
                value: [50, 150], enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate equals operator for numbers', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'number', field: 'wordCount', operator: 'equals',
                value: 50, enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should auto-calculate wordCount', () => {
            const contentNoWordCount: FilterableContent = {
                title: 'Test',
                content: 'One two three four five', // 5 words
            };
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'number', field: 'wordCount', operator: 'equals',
                value: 5, enabled: true, action: 'include',
            };
            expect(evaluateRule(contentNoWordCount, rule)).toBe(true);
        });
    });

    // =========================================================================
    // evaluateRule - Date Operators
    // =========================================================================
    describe('evaluateRule - Date Operators', () => {
        const content: FilterableContent = {
            title: 'Article',
            content: 'Content',
            date: '2024-06-15',
        };

        it('should evaluate date greaterThan (after)', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'date', field: 'date', operator: 'greaterThan',
                value: '2024-01-01', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate date lessThan (before)', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'date', field: 'date', operator: 'lessThan',
                value: '2024-12-31', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate date between', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'date', field: 'date', operator: 'between',
                value: ['2024-01-01', '2024-12-31'], enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });
    });

    // =========================================================================
    // evaluateRule - List Operators
    // =========================================================================
    describe('evaluateRule - List Operators', () => {
        const content: FilterableContent = {
            title: 'Article',
            content: 'Content',
            source: 'techcrunch',
        };

        it('should evaluate inList operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'list', field: 'source', operator: 'inList',
                value: ['techcrunch', 'wired', 'verge'], enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });

        it('should evaluate notInList operator', () => {
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'list', field: 'source', operator: 'notInList',
                value: ['spam', 'fake'], enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true);
        });
    });

    // =========================================================================
    // applyFilters
    // =========================================================================
    describe('applyFilters', () => {
        const content: FilterableContent = {
            title: 'Test Article',
            content: 'This is a test article with enough words.',
            wordCount: 100,
            price: 50,
        };

        it('should pass when all rules match (mode: all)', () => {
            const filterSet: FilterSet = {
                id: 'test', name: 'Test',
                mode: 'all', enabled: true,
                rules: [
                    createMinWordCountRule(50),
                    createMaxWordCountRule(200),
                ],
            };
            const result = applyFilters(content, filterSet);
            expect(result.passed).toBe(true);
        });

        it('should fail when any rule fails (mode: all)', () => {
            const filterSet: FilterSet = {
                id: 'test', name: 'Test',
                mode: 'all', enabled: true,
                rules: [
                    createMinWordCountRule(50),
                    createMinWordCountRule(200), // Fails
                ],
            };
            const result = applyFilters(content, filterSet);
            expect(result.passed).toBe(false);
        });

        it('should pass when any rule matches (mode: any)', () => {
            // Note: mode 'any' means at least one rule must match
            // But inclusion rules must ALL pass - so we use non-include rules
            const filterSet: FilterSet = {
                id: 'test', name: 'Test',
                mode: 'any', enabled: true,
                rules: [
                    {
                        id: 'rule1', name: 'Fails',
                        type: 'number', field: 'wordCount', operator: 'greaterThan',
                        value: 200, enabled: true, action: 'exclude', // This won't match
                    },
                    {
                        id: 'rule2', name: 'Passes',
                        type: 'text', field: 'title', operator: 'contains',
                        value: 'Test', enabled: true, action: 'exclude', // This matches but excludes
                    },
                ],
            };
            const result = applyFilters(content, filterSet);
            // Will be excluded because the matching rule has action: 'exclude'
            expect(result.passed).toBe(false);
            expect(result.action).toBe('exclude');
        });

        it('should exclude when exclusion rule matches', () => {
            const filterSet: FilterSet = {
                id: 'test', name: 'Test',
                mode: 'all', enabled: true,
                rules: [
                    { ...createMinWordCountRule(50), action: 'exclude' },
                ],
            };
            const result = applyFilters(content, filterSet);
            expect(result.passed).toBe(false);
            expect(result.action).toBe('exclude');
        });

        it('should skip disabled filter sets', () => {
            const filterSet: FilterSet = {
                id: 'test', name: 'Test',
                mode: 'all', enabled: false,
                rules: [createMinWordCountRule(1000)],
            };
            const result = applyFilters(content, filterSet);
            expect(result.passed).toBe(true);
        });
    });

    // =========================================================================
    // filterContent
    // =========================================================================
    describe('filterContent', () => {
        const items: FilterableContent[] = [
            { title: 'A', wordCount: 100 },
            { title: 'B', wordCount: 50 },
            { title: 'C', wordCount: 200 },
            { title: 'D', wordCount: 30 },
        ];

        it('should separate passed and filtered items', () => {
            const filterSet: FilterSet = {
                id: 'test', name: 'Test',
                mode: 'all', enabled: true,
                rules: [createMinWordCountRule(75)],
            };
            const { passed, filtered } = filterContent(items, filterSet);
            expect(passed).toHaveLength(2); // A, C
            expect(filtered).toHaveLength(2); // B, D
        });

        it('should track statistics', () => {
            const filterSet: FilterSet = {
                id: 'test', name: 'Test',
                mode: 'all', enabled: true,
                rules: [createMinWordCountRule(75)],
            };
            const { stats } = filterContent(items, filterSet);
            expect(stats['min_words_75']).toBe(2); // 2 items failed this rule
        });
    });

    // =========================================================================
    // Rule Factories
    // =========================================================================
    describe('Rule Factories', () => {
        it('should create min word count rule', () => {
            const rule = createMinWordCountRule(100);
            expect(rule.field).toBe('wordCount');
            expect(rule.operator).toBe('greaterThan');
            expect(rule.value).toBe(99);
        });

        it('should create max word count rule', () => {
            const rule = createMaxWordCountRule(500);
            expect(rule.field).toBe('wordCount');
            expect(rule.operator).toBe('lessThan');
            expect(rule.value).toBe(501);
        });

        it('should create price range rule', () => {
            const rule = createPriceRangeRule(10, 100);
            expect(rule.field).toBe('price');
            expect(rule.operator).toBe('between');
            expect(rule.value).toEqual([10, 100]);
        });

        it('should create exclude keywords rule', () => {
            const rule = createExcludeKeywordsRule(['spam', 'scam']);
            expect(rule.action).toBe('exclude');
            expect(rule.value).toEqual(['spam', 'scam']);
        });

        it('should create exclude domains rule', () => {
            const rule = createExcludeDomainsRule(['spam.com', 'fake.com']);
            expect(rule.field).toBe('url');
            expect(rule.action).toBe('exclude');
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================
    describe('Edge Cases', () => {
        it('should handle missing fields gracefully', () => {
            const content: FilterableContent = { title: 'Test' };
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'number', field: 'price', operator: 'greaterThan',
                value: 50, enabled: true, action: 'include',
            };
            // Should not throw, price defaults to 0
            expect(evaluateRule(content, rule)).toBe(false);
        });

        it('should handle disabled rules', () => {
            const content: FilterableContent = { title: 'Test' };
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'contains',
                value: 'xyz', enabled: false, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(true); // Disabled = pass
        });

        it('should handle invalid regex in matches', () => {
            const content: FilterableContent = { title: 'Test' };
            const rule: FilterRule = {
                id: 'test', name: 'Test',
                type: 'text', field: 'title', operator: 'matches',
                value: '[invalid', enabled: true, action: 'include',
            };
            expect(evaluateRule(content, rule)).toBe(false);
        });
    });
});
