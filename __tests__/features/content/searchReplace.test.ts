/**
 * Search & Replace Engine Tests
 * Enterprise-grade tests for find/replace rules and transformations.
 */

import {
    applyRule,
    applyRules,
    applyRuleSetToContent,
    createAffiliateLinkRule,
    createWordRule,
    createHtmlCleanupRule,
    createUrlRule,
    simpleRule,
    bulkRules,
    CLEANUP_RULES,
    SEO_RULES,
    type ReplaceRule,
    type RuleSet,
} from '@/features/content/lib/searchReplace';

describe('Search & Replace Engine', () => {
    // =========================================================================
    // applyRule
    // =========================================================================
    describe('applyRule', () => {
        it('should apply simple string replacement', () => {
            const rule: ReplaceRule = {
                id: 'test',
                name: 'Test',
                pattern: 'hello',
                replacement: 'hi',
                isRegex: false,
                enabled: true,
            };
            const result = applyRule('hello world', rule);
            expect(result.text).toBe('hi world');
            expect(result.replacementCount).toBe(1);
        });

        it('should apply regex replacement', () => {
            const rule: ReplaceRule = {
                id: 'test',
                name: 'Test',
                pattern: '\\d+',
                replacement: 'NUMBER',
                isRegex: true,
                enabled: true,
            };
            const result = applyRule('There are 5 apples and 3 oranges', rule);
            expect(result.text).toBe('There are NUMBER apples and NUMBER oranges');
            expect(result.replacementCount).toBe(2);
        });

        it('should support capture groups', () => {
            const rule: ReplaceRule = {
                id: 'test',
                name: 'Test',
                pattern: '(\\w+)@(\\w+)',
                replacement: '$1 at $2',
                isRegex: true,
                enabled: true,
            };
            const result = applyRule('Contact: john@example', rule);
            expect(result.text).toBe('Contact: john at example');
        });

        it('should respect case insensitive flag', () => {
            const rule: ReplaceRule = {
                id: 'test',
                name: 'Test',
                pattern: 'hello',
                replacement: 'hi',
                isRegex: false,
                caseInsensitive: true,
                enabled: true,
            };
            const result = applyRule('HELLO world', rule);
            expect(result.text).toBe('hi world');
        });

        it('should skip disabled rules', () => {
            const rule: ReplaceRule = {
                id: 'test',
                name: 'Test',
                pattern: 'hello',
                replacement: 'hi',
                isRegex: false,
                enabled: false,
            };
            const result = applyRule('hello world', rule);
            expect(result.text).toBe('hello world');
            expect(result.replacementCount).toBe(0);
        });

        it('should handle invalid regex gracefully', () => {
            const rule: ReplaceRule = {
                id: 'test',
                name: 'Test',
                pattern: '[invalid',
                replacement: 'hi',
                isRegex: true,
                enabled: true,
            };
            const result = applyRule('hello world', rule);
            expect(result.text).toBe('hello world'); // No crash
            expect(result.replacementCount).toBe(0);
        });
    });

    // =========================================================================
    // applyRules
    // =========================================================================
    describe('applyRules', () => {
        it('should apply multiple rules', () => {
            const rules: ReplaceRule[] = [
                simpleRule('hello', 'hi'),
                simpleRule('world', 'there'),
            ];
            const result = applyRules('hello world', rules);
            expect(result.text).toBe('hi there');
            expect(result.replacementCount).toBe(2);
        });

        it('should respect priority order', () => {
            const rules: ReplaceRule[] = [
                { ...simpleRule('a', 'b'), priority: 1 },
                { ...simpleRule('b', 'c'), priority: 2 }, // Higher runs first
            ];
            const result = applyRules('a', rules);
            // 'b' rule runs first (no effect), then 'a' rule: a -> b
            expect(result.text).toBe('b');
        });

        it('should chain replacements', () => {
            const rules: ReplaceRule[] = [
                { ...simpleRule('a', 'b'), priority: 2 },
                { ...simpleRule('b', 'c'), priority: 1 },
            ];
            const result = applyRules('a', rules);
            // a -> b (first), b -> c (second)
            expect(result.text).toBe('c');
        });
    });

    // =========================================================================
    // applyRuleSetToContent
    // =========================================================================
    describe('applyRuleSetToContent', () => {
        it('should apply rules to all fields by default', () => {
            const ruleSet: RuleSet = {
                id: 'test',
                name: 'Test',
                rules: [simpleRule('foo', 'bar')],
                enabled: true,
            };
            const content = { title: 'foo title', body: 'foo body', excerpt: 'foo excerpt' };
            const result = applyRuleSetToContent(content, ruleSet);
            expect(result.title).toBe('bar title');
            expect(result.body).toBe('bar body');
            expect(result.excerpt).toBe('bar excerpt');
        });

        it('should respect applyTo field targeting', () => {
            const ruleSet: RuleSet = {
                id: 'test',
                name: 'Test',
                rules: [{
                    ...simpleRule('foo', 'bar'),
                    applyTo: ['title'],
                }],
                enabled: true,
            };
            const content = { title: 'foo title', body: 'foo body' };
            const result = applyRuleSetToContent(content, ruleSet);
            expect(result.title).toBe('bar title');
            expect(result.body).toBe('foo body'); // Not changed
        });

        it('should skip disabled rule sets', () => {
            const ruleSet: RuleSet = {
                id: 'test',
                name: 'Test',
                rules: [simpleRule('foo', 'bar')],
                enabled: false,
            };
            const content = { title: 'foo title' };
            const result = applyRuleSetToContent(content, ruleSet);
            expect(result.title).toBe('foo title');
        });
    });

    // =========================================================================
    // Rule Factories
    // =========================================================================
    describe('createAffiliateLinkRule', () => {
        it('should create affiliate link rule', () => {
            const rule = createAffiliateLinkRule('iPhone', 'https://affiliate.link');
            const result = applyRule('Buy an iPhone today', rule);
            expect(result.text).toContain('<a href="https://affiliate.link"');
            expect(result.text).toContain('nofollow sponsored');
        });
    });

    describe('createWordRule', () => {
        it('should create word replacement rule', () => {
            const rule = createWordRule('hello', 'hi');
            const result = applyRule('hello world', rule);
            expect(result.text).toBe('hi world');
        });

        it('should match whole words only', () => {
            const rule = createWordRule('he', 'she');
            const result = applyRule('hello he here', rule);
            expect(result.text).toBe('hello she here'); // Only 'he' replaced
        });
    });

    describe('createHtmlCleanupRule', () => {
        it('should remove tags but keep content', () => {
            const rule = createHtmlCleanupRule('span', true);
            const result = applyRule('<span>text</span>', rule);
            expect(result.text).toBe('text');
        });

        it('should remove tags and content', () => {
            const rule = createHtmlCleanupRule('script', false);
            const result = applyRule('<script>alert("xss")</script>', rule);
            expect(result.text).toBe('');
        });
    });

    describe('createUrlRule', () => {
        it('should replace domain in URLs', () => {
            const rule = createUrlRule('old-domain.com', 'new-domain.com');
            const result = applyRule('Visit https://old-domain.com/page', rule);
            expect(result.text).toContain('https://new-domain.com');
        });
    });

    // =========================================================================
    // Utility Functions
    // =========================================================================
    describe('simpleRule', () => {
        it('should create simple rule', () => {
            const rule = simpleRule('find', 'replace');
            expect(rule.pattern).toBe('find');
            expect(rule.replacement).toBe('replace');
            expect(rule.isRegex).toBe(false);
            expect(rule.enabled).toBe(true);
        });
    });

    describe('bulkRules', () => {
        it('should create multiple rules from object', () => {
            const rules = bulkRules({ 'a': 'b', 'c': 'd' });
            expect(rules).toHaveLength(2);
        });
    });

    // =========================================================================
    // Pre-built Rule Sets
    // =========================================================================
    describe('CLEANUP_RULES', () => {
        it('should remove double spaces', () => {
            const doubleSpaceRule = CLEANUP_RULES.find(r => r.id === 'remove_double_spaces');
            expect(doubleSpaceRule).toBeDefined();
            const result = applyRule('hello  world', doubleSpaceRule!);
            expect(result.text).toBe('hello world');
        });

        it('should remove empty paragraphs', () => {
            const emptyPRule = CLEANUP_RULES.find(r => r.id === 'remove_empty_paragraphs');
            expect(emptyPRule).toBeDefined();
            const result = applyRule('<p>  </p>', emptyPRule!);
            expect(result.text).toBe('');
        });
    });

    describe('SEO_RULES', () => {
        it('should have SEO rules defined', () => {
            expect(SEO_RULES.length).toBeGreaterThan(0);
            expect(SEO_RULES.find(r => r.id === 'add_alt_to_images')).toBeDefined();
        });
    });
});
