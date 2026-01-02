/**
 * Filter Engine
 * FSD: features/campaigns/lib/filterEngine.ts
 * 
 * Rule-based content filtering for campaign automation.
 * Includes/excludes content based on configurable criteria.
 */

// ============================================================================
// Types
// ============================================================================

export interface FilterRule {
    id: string;
    name: string;
    type: FilterType;
    field: FilterField;
    operator: FilterOperator;
    value: string | number | string[] | number[];
    enabled: boolean;
    action: 'include' | 'exclude';
}

export type FilterType =
    | 'text'
    | 'number'
    | 'date'
    | 'list';

export type FilterField =
    | 'title'
    | 'content'
    | 'excerpt'
    | 'author'
    | 'source'
    | 'url'
    | 'wordCount'
    | 'price'
    | 'rating'
    | 'date'
    | 'custom';

export type FilterOperator =
    | 'contains'
    | 'notContains'
    | 'equals'
    | 'notEquals'
    | 'startsWith'
    | 'endsWith'
    | 'matches'        // Regex
    | 'greaterThan'
    | 'lessThan'
    | 'between'
    | 'inList'
    | 'notInList'
    | 'isEmpty'
    | 'isNotEmpty';

export interface FilterableContent {
    title?: string;
    content?: string;
    excerpt?: string;
    author?: string;
    source?: string;
    url?: string;
    wordCount?: number;
    price?: number;
    rating?: number;
    date?: Date | string;
    [key: string]: unknown;  // Custom fields
}

export interface FilterResult {
    passed: boolean;
    matchedRules: string[];
    failedRules: string[];
    action: 'include' | 'exclude' | 'none';
}

export interface FilterSet {
    id: string;
    name: string;
    rules: FilterRule[];
    mode: 'all' | 'any';  // All rules must match vs any rule
    enabled: boolean;
}

// ============================================================================
// Core Engine
// ============================================================================

/**
 * Evaluate a single filter rule against content
 */
export function evaluateRule(content: FilterableContent, rule: FilterRule): boolean {
    if (!rule.enabled) return true;

    const fieldValue = getFieldValue(content, rule.field);

    switch (rule.type) {
        case 'text':
            return evaluateTextRule(fieldValue as string, rule);
        case 'number':
            return evaluateNumberRule(fieldValue as number, rule);
        case 'date':
            return evaluateDateRule(fieldValue as Date | string, rule);
        case 'list':
            return evaluateListRule(fieldValue, rule);
        default:
            return true;
    }
}

/**
 * Apply filter set to content
 */
export function applyFilters(content: FilterableContent, filterSet: FilterSet): FilterResult {
    if (!filterSet.enabled) {
        return { passed: true, matchedRules: [], failedRules: [], action: 'none' };
    }

    const matchedRules: string[] = [];
    const failedRules: string[] = [];

    for (const rule of filterSet.rules) {
        if (!rule.enabled) continue;

        const passed = evaluateRule(content, rule);

        if (passed) {
            matchedRules.push(rule.id);
        } else {
            failedRules.push(rule.id);
        }
    }

    let overallPassed: boolean;

    if (filterSet.mode === 'all') {
        overallPassed = failedRules.length === 0;
    } else {
        overallPassed = matchedRules.length > 0;
    }

    // Determine final action
    const inclusionRules = filterSet.rules.filter(r => r.action === 'include' && r.enabled);
    const exclusionRules = filterSet.rules.filter(r => r.action === 'exclude' && r.enabled);

    // Check if any exclusion rule matched
    const excludedBy = exclusionRules.find(r => matchedRules.includes(r.id));
    if (excludedBy) {
        return { passed: false, matchedRules, failedRules, action: 'exclude' };
    }

    // Check if required inclusion rules passed
    if (inclusionRules.length > 0) {
        const allInclusionsPassed = inclusionRules.every(r => matchedRules.includes(r.id));
        if (!allInclusionsPassed) {
            return { passed: false, matchedRules, failedRules, action: 'include' };
        }
    }

    return { passed: overallPassed, matchedRules, failedRules, action: 'none' };
}

/**
 * Filter array of content items
 */
export function filterContent<T extends FilterableContent>(
    items: T[],
    filterSet: FilterSet
): { passed: T[]; filtered: T[]; stats: Record<string, number> } {
    const passed: T[] = [];
    const filtered: T[] = [];
    const stats: Record<string, number> = {};

    for (const item of items) {
        const result = applyFilters(item, filterSet);

        if (result.passed) {
            passed.push(item);
        } else {
            filtered.push(item);
            for (const ruleId of result.failedRules) {
                stats[ruleId] = (stats[ruleId] || 0) + 1;
            }
        }
    }

    return { passed, filtered, stats };
}

// ============================================================================
// Rule Evaluators
// ============================================================================

function evaluateTextRule(value: string | undefined, rule: FilterRule): boolean {
    const textValue = (value || '').toLowerCase();
    const ruleValue = String(rule.value).toLowerCase();

    switch (rule.operator) {
        case 'contains':
            return textValue.includes(ruleValue);
        case 'notContains':
            return !textValue.includes(ruleValue);
        case 'equals':
            return textValue === ruleValue;
        case 'notEquals':
            return textValue !== ruleValue;
        case 'startsWith':
            return textValue.startsWith(ruleValue);
        case 'endsWith':
            return textValue.endsWith(ruleValue);
        case 'matches':
            try {
                return new RegExp(String(rule.value), 'i').test(value || '');
            } catch {
                return false;
            }
        case 'isEmpty':
            return !textValue || textValue.trim() === '';
        case 'isNotEmpty':
            return !!textValue && textValue.trim() !== '';
        default:
            return true;
    }
}

function evaluateNumberRule(value: number | undefined, rule: FilterRule): boolean {
    const numValue = value ?? 0;
    const ruleValue = Number(rule.value);

    switch (rule.operator) {
        case 'equals':
            return numValue === ruleValue;
        case 'notEquals':
            return numValue !== ruleValue;
        case 'greaterThan':
            return numValue > ruleValue;
        case 'lessThan':
            return numValue < ruleValue;
        case 'between':
            if (Array.isArray(rule.value) && rule.value.length >= 2) {
                return numValue >= Number(rule.value[0]) && numValue <= Number(rule.value[1]);
            }
            return true;
        default:
            return true;
    }
}

function evaluateDateRule(value: Date | string | undefined, rule: FilterRule): boolean {
    if (!value) return rule.operator === 'isEmpty';

    const dateValue = new Date(value).getTime();
    const ruleDate = new Date(String(rule.value)).getTime();

    switch (rule.operator) {
        case 'equals':
            return dateValue === ruleDate;
        case 'greaterThan':
            return dateValue > ruleDate;
        case 'lessThan':
            return dateValue < ruleDate;
        case 'between':
            if (Array.isArray(rule.value) && rule.value.length >= 2) {
                const start = new Date(String(rule.value[0])).getTime();
                const end = new Date(String(rule.value[1])).getTime();
                return dateValue >= start && dateValue <= end;
            }
            return true;
        default:
            return true;
    }
}

function evaluateListRule(value: unknown, rule: FilterRule): boolean {
    const ruleList = Array.isArray(rule.value) ? rule.value : [rule.value];
    const valueStr = String(value).toLowerCase();

    switch (rule.operator) {
        case 'inList':
            return ruleList.some(item => String(item).toLowerCase() === valueStr);
        case 'notInList':
            return !ruleList.some(item => String(item).toLowerCase() === valueStr);
        default:
            return true;
    }
}

// ============================================================================
// Helpers
// ============================================================================

function getFieldValue(content: FilterableContent, field: FilterField): unknown {
    switch (field) {
        case 'wordCount':
            return content.wordCount ?? countWords(content.content || '');
        case 'custom':
            return content;
        default:
            return content[field];
    }
}

function countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

// ============================================================================
// Rule Factories
// ============================================================================

export function createMinWordCountRule(minWords: number): FilterRule {
    return {
        id: `min_words_${minWords}`,
        name: `Minimum ${minWords} words`,
        type: 'number',
        field: 'wordCount',
        operator: 'greaterThan',
        value: minWords - 1,
        enabled: true,
        action: 'include',
    };
}

export function createMaxWordCountRule(maxWords: number): FilterRule {
    return {
        id: `max_words_${maxWords}`,
        name: `Maximum ${maxWords} words`,
        type: 'number',
        field: 'wordCount',
        operator: 'lessThan',
        value: maxWords + 1,
        enabled: true,
        action: 'include',
    };
}

export function createPriceRangeRule(min: number, max: number): FilterRule {
    return {
        id: `price_${min}_${max}`,
        name: `Price $${min} - $${max}`,
        type: 'number',
        field: 'price',
        operator: 'between',
        value: [min, max],
        enabled: true,
        action: 'include',
    };
}

export function createExcludeKeywordsRule(keywords: string[]): FilterRule {
    return {
        id: 'exclude_keywords',
        name: 'Exclude keywords',
        type: 'list',
        field: 'content',
        operator: 'notInList',
        value: keywords,
        enabled: true,
        action: 'exclude',
    };
}

export function createExcludeDomainsRule(domains: string[]): FilterRule {
    return {
        id: 'exclude_domains',
        name: 'Exclude domains',
        type: 'list',
        field: 'url',
        operator: 'notInList',
        value: domains,
        enabled: true,
        action: 'exclude',
    };
}
