/**
 * Search & Replace Engine
 * FSD: features/content/lib/searchReplace.ts
 * 
 * Powerful find/replace with regex support, rules, and transformations.
 */

// ============================================================================
// Types
// ============================================================================

export interface ReplaceRule {
    /** Unique identifier for the rule */
    id: string;
    /** Human-readable name */
    name: string;
    /** Pattern to search for */
    pattern: string;
    /** Replacement text (supports $1, $2 for capture groups) */
    replacement: string;
    /** Whether pattern is regex */
    isRegex: boolean;
    /** Case insensitive matching */
    caseInsensitive?: boolean;
    /** Apply to specific fields only */
    applyTo?: ('title' | 'content' | 'excerpt' | 'all')[];
    /** Whether rule is enabled */
    enabled: boolean;
    /** Rule priority (higher runs first) */
    priority?: number;
}

export interface ReplaceResult {
    /** Modified text */
    text: string;
    /** Number of replacements made */
    replacementCount: number;
    /** Rules that were applied */
    appliedRules: string[];
}

export interface RuleSet {
    id: string;
    name: string;
    rules: ReplaceRule[];
    enabled: boolean;
}

// ============================================================================
// Core Engine
// ============================================================================

/**
 * Apply a single replace rule to text
 */
export function applyRule(text: string, rule: ReplaceRule): ReplaceResult {
    if (!rule.enabled) {
        return { text, replacementCount: 0, appliedRules: [] };
    }

    let replacementCount = 0;
    let modifiedText = text;

    try {
        if (rule.isRegex) {
            const flags = rule.caseInsensitive ? 'gi' : 'g';
            const regex = new RegExp(rule.pattern, flags);
            modifiedText = text.replace(regex, (...args) => {
                replacementCount++;
                // Support $1, $2, etc. in replacement
                let result = rule.replacement;
                for (let i = 1; i < args.length - 2; i++) {
                    result = result.replace(new RegExp(`\\$${i}`, 'g'), args[i] || '');
                }
                return result;
            });
        } else {
            // Simple string replacement
            const searchPattern = rule.caseInsensitive
                ? new RegExp(escapeRegex(rule.pattern), 'gi')
                : new RegExp(escapeRegex(rule.pattern), 'g');
            modifiedText = text.replace(searchPattern, () => {
                replacementCount++;
                return rule.replacement;
            });
        }
    } catch (error) {
        console.error(`Rule "${rule.name}" failed:`, error);
        return { text, replacementCount: 0, appliedRules: [] };
    }

    return {
        text: modifiedText,
        replacementCount,
        appliedRules: replacementCount > 0 ? [rule.id] : [],
    };
}

/**
 * Apply multiple rules to text
 */
export function applyRules(text: string, rules: ReplaceRule[]): ReplaceResult {
    // Sort by priority (higher first)
    const sortedRules = [...rules].sort((a, b) =>
        (b.priority || 0) - (a.priority || 0)
    );

    let result = text;
    let totalReplacements = 0;
    const appliedRules: string[] = [];

    for (const rule of sortedRules) {
        const ruleResult = applyRule(result, rule);
        result = ruleResult.text;
        totalReplacements += ruleResult.replacementCount;
        appliedRules.push(...ruleResult.appliedRules);
    }

    return {
        text: result,
        replacementCount: totalReplacements,
        appliedRules,
    };
}

/**
 * Apply rule set to content object
 */
export function applyRuleSetToContent(
    content: { title?: string; body?: string; excerpt?: string },
    ruleSet: RuleSet
): { title?: string; body?: string; excerpt?: string; stats: Record<string, number> } {
    if (!ruleSet.enabled) {
        return { ...content, stats: {} };
    }

    const stats: Record<string, number> = {};
    const result = { ...content };

    for (const rule of ruleSet.rules) {
        const applyTo = rule.applyTo || ['all'];

        if (result.title && (applyTo.includes('title') || applyTo.includes('all'))) {
            const titleResult = applyRule(result.title, rule);
            result.title = titleResult.text;
            stats[rule.id] = (stats[rule.id] || 0) + titleResult.replacementCount;
        }

        if (result.body && (applyTo.includes('content') || applyTo.includes('all'))) {
            const bodyResult = applyRule(result.body, rule);
            result.body = bodyResult.text;
            stats[rule.id] = (stats[rule.id] || 0) + bodyResult.replacementCount;
        }

        if (result.excerpt && (applyTo.includes('excerpt') || applyTo.includes('all'))) {
            const excerptResult = applyRule(result.excerpt, rule);
            result.excerpt = excerptResult.text;
            stats[rule.id] = (stats[rule.id] || 0) + excerptResult.replacementCount;
        }
    }

    return { ...result, stats };
}

// ============================================================================
// Pre-built Rule Factories
// ============================================================================

/**
 * Create affiliate link insertion rule
 */
export function createAffiliateLinkRule(
    keyword: string,
    affiliateUrl: string,
    options: { maxOccurrences?: number; caseInsensitive?: boolean } = {}
): ReplaceRule {
    return {
        id: `affiliate_${keyword.toLowerCase().replace(/\s+/g, '_')}`,
        name: `Affiliate: ${keyword}`,
        pattern: options.caseInsensitive
            ? `\\b(${escapeRegex(keyword)})\\b`
            : `\\b(${escapeRegex(keyword)})\\b`,
        replacement: `<a href="${affiliateUrl}" target="_blank" rel="nofollow sponsored">$1</a>`,
        isRegex: true,
        caseInsensitive: options.caseInsensitive ?? true,
        enabled: true,
        priority: 10,
    };
}

/**
 * Create word-to-word replacement rule
 */
export function createWordRule(
    fromWord: string,
    toWord: string,
    caseInsensitive = true
): ReplaceRule {
    return {
        id: `word_${fromWord.toLowerCase()}_to_${toWord.toLowerCase()}`,
        name: `Replace: ${fromWord} → ${toWord}`,
        pattern: `\\b${escapeRegex(fromWord)}\\b`,
        replacement: toWord,
        isRegex: true,
        caseInsensitive,
        enabled: true,
        priority: 5,
    };
}

/**
 * Create HTML cleanup rule
 */
export function createHtmlCleanupRule(
    tagToRemove: string,
    keepContent = true
): ReplaceRule {
    return {
        id: `remove_${tagToRemove}_tag`,
        name: `Remove <${tagToRemove}> tags`,
        pattern: keepContent
            ? `<${tagToRemove}[^>]*>(.*?)</${tagToRemove}>`
            : `<${tagToRemove}[^>]*>.*?</${tagToRemove}>`,
        replacement: keepContent ? '$1' : '',
        isRegex: true,
        caseInsensitive: true,
        enabled: true,
        priority: 20,
    };
}

/**
 * Create URL replacement rule
 */
export function createUrlRule(
    fromDomain: string,
    toDomain: string
): ReplaceRule {
    return {
        id: `url_${fromDomain.replace(/\./g, '_')}`,
        name: `URL: ${fromDomain} → ${toDomain}`,
        pattern: `https?://(www\\.)?${escapeRegex(fromDomain)}`,
        replacement: `https://${toDomain}`,
        isRegex: true,
        caseInsensitive: true,
        enabled: true,
        priority: 15,
    };
}

// ============================================================================
// Pre-built Rule Sets
// ============================================================================

export const CLEANUP_RULES: ReplaceRule[] = [
    {
        id: 'remove_double_spaces',
        name: 'Remove double spaces',
        pattern: '  +',
        replacement: ' ',
        isRegex: true,
        enabled: true,
        priority: 100,
    },
    {
        id: 'remove_empty_paragraphs',
        name: 'Remove empty paragraphs',
        pattern: '<p>\\s*</p>',
        replacement: '',
        isRegex: true,
        caseInsensitive: true,
        enabled: true,
        priority: 90,
    },
    {
        id: 'fix_quotes',
        name: 'Fix smart quotes',
        pattern: '[""]',
        replacement: '"',
        isRegex: true,
        enabled: true,
        priority: 80,
    },
    {
        id: 'fix_apostrophes',
        name: 'Fix smart apostrophes',
        pattern: '[\u2018\u2019]',
        replacement: "'",
        isRegex: true,
        enabled: true,
        priority: 80,
    },
];

export const SEO_RULES: ReplaceRule[] = [
    {
        id: 'add_alt_to_images',
        name: 'Add alt to images without',
        pattern: '<img([^>]*?)(?<!alt=")>',
        replacement: '<img$1 alt="">',
        isRegex: true,
        enabled: true,
        priority: 50,
    },
    {
        id: 'external_links_nofollow',
        name: 'Add nofollow to external links',
        pattern: '<a([^>]*href="https?://(?!yourdomain)[^"]+")([^>]*)>',
        replacement: '<a$1 rel="nofollow noopener"$2>',
        isRegex: true,
        caseInsensitive: true,
        enabled: false, // Enable and customize
        priority: 40,
    },
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Escape special regex characters in string
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a rule from simple find/replace
 */
export function simpleRule(find: string, replace: string): ReplaceRule {
    return {
        id: `simple_${Date.now()}`,
        name: `${find.slice(0, 20)} → ${replace.slice(0, 20)}`,
        pattern: find,
        replacement: replace,
        isRegex: false,
        enabled: true,
    };
}

/**
 * Bulk create rules from object
 */
export function bulkRules(replacements: Record<string, string>): ReplaceRule[] {
    return Object.entries(replacements).map(([find, replace]) =>
        simpleRule(find, replace)
    );
}
