/**
 * Content Variations Generator
 * FSD: features/content/lib/contentVariations.ts
 * 
 * Generate multiple unique versions of content for A/B testing and diversity.
 */

import { expandSpintax, createSpintax, COMMON_SYNONYMS } from './spintaxEngine';
import { applyRules, ReplaceRule, simpleRule } from './searchReplace';

// ============================================================================
// Types
// ============================================================================

export interface ContentPiece {
    title: string;
    content: string;
    excerpt?: string;
    meta?: {
        description?: string;
        keywords?: string[];
    };
}

export interface VariationOptions {
    /** Number of variations to generate */
    count: number;
    /** Variation strategies to apply */
    strategies: VariationStrategy[];
    /** Ensure all variations are unique */
    ensureUnique?: boolean;
    /** Custom synonyms for word replacement */
    customSynonyms?: Record<string, string[]>;
}

export type VariationStrategy =
    | 'spintax'           // Expand existing spintax
    | 'synonym-swap'      // Replace words with synonyms
    | 'sentence-shuffle'  // Reorder sentences
    | 'intro-variation'   // Vary introduction
    | 'heading-rephrase'  // Rephrase headings
    | 'cta-variation';    // Vary call-to-action

export interface ContentVariation {
    /** Variation index */
    index: number;
    /** The varied content */
    content: ContentPiece;
    /** Strategies that were applied */
    appliedStrategies: VariationStrategy[];
    /** Uniqueness hash */
    hash: string;
}

// ============================================================================
// Core Generator
// ============================================================================

/**
 * Generate content variations
 */
export function generateVariations(
    original: ContentPiece,
    options: VariationOptions
): ContentVariation[] {
    const variations: ContentVariation[] = [];
    const seenHashes = new Set<string>();
    const maxAttempts = options.count * 5;
    let attempts = 0;

    while (variations.length < options.count && attempts < maxAttempts) {
        attempts++;

        let varied = { ...original };
        const appliedStrategies: VariationStrategy[] = [];

        // Apply each strategy
        for (const strategy of options.strategies) {
            const result = applyStrategy(varied, strategy, options.customSynonyms);
            varied = result.content;
            if (result.applied) {
                appliedStrategies.push(strategy);
            }
        }

        const hash = simpleHash(varied.title + varied.content);

        // Skip duplicates if ensuring uniqueness
        if (options.ensureUnique && seenHashes.has(hash)) {
            continue;
        }

        seenHashes.add(hash);
        variations.push({
            index: variations.length,
            content: varied,
            appliedStrategies,
            hash,
        });
    }

    return variations;
}

/**
 * Apply a single variation strategy
 */
function applyStrategy(
    content: ContentPiece,
    strategy: VariationStrategy,
    customSynonyms?: Record<string, string[]>
): { content: ContentPiece; applied: boolean } {
    switch (strategy) {
        case 'spintax':
            return applySpintaxStrategy(content);
        case 'synonym-swap':
            return applySynonymStrategy(content, customSynonyms);
        case 'sentence-shuffle':
            return applySentenceShuffleStrategy(content);
        case 'intro-variation':
            return applyIntroVariationStrategy(content);
        case 'heading-rephrase':
            return applyHeadingRephraseStrategy(content);
        case 'cta-variation':
            return applyCtaVariationStrategy(content);
        default:
            return { content, applied: false };
    }
}

// ============================================================================
// Strategy Implementations
// ============================================================================

function applySpintaxStrategy(content: ContentPiece): { content: ContentPiece; applied: boolean } {
    const titleResult = expandSpintax(content.title);
    const contentResult = expandSpintax(content.content);

    const applied = titleResult.groupCount > 0 || contentResult.groupCount > 0;

    return {
        content: {
            ...content,
            title: titleResult.text,
            content: contentResult.text,
        },
        applied,
    };
}

function applySynonymStrategy(
    content: ContentPiece,
    customSynonyms?: Record<string, string[]>
): { content: ContentPiece; applied: boolean } {
    const synonyms = { ...COMMON_SYNONYMS, ...customSynonyms };
    const rules: ReplaceRule[] = [];

    // Pick random synonyms to swap
    for (const [word, syns] of Object.entries(synonyms)) {
        if (Math.random() > 0.3) continue; // Only apply to ~30% of words

        const randomSyn = syns[Math.floor(Math.random() * syns.length)];
        if (randomSyn !== word) {
            rules.push(simpleRule(word, randomSyn));
        }
    }

    if (rules.length === 0) {
        return { content, applied: false };
    }

    const titleResult = applyRules(content.title, rules);
    const contentResult = applyRules(content.content, rules);

    return {
        content: {
            ...content,
            title: titleResult.text,
            content: contentResult.text,
        },
        applied: titleResult.replacementCount + contentResult.replacementCount > 0,
    };
}

function applySentenceShuffleStrategy(content: ContentPiece): { content: ContentPiece; applied: boolean } {
    // Split into paragraphs, shuffle middle ones, keep intro and outro
    const paragraphs = content.content.split(/\n\n+/);

    if (paragraphs.length < 4) {
        return { content, applied: false };
    }

    const intro = paragraphs[0];
    const outro = paragraphs[paragraphs.length - 1];
    const middle = paragraphs.slice(1, -1);

    // Fisher-Yates shuffle for middle paragraphs
    for (let i = middle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [middle[i], middle[j]] = [middle[j], middle[i]];
    }

    return {
        content: {
            ...content,
            content: [intro, ...middle, outro].join('\n\n'),
        },
        applied: true,
    };
}

function applyIntroVariationStrategy(content: ContentPiece): { content: ContentPiece; applied: boolean } {
    const introVariants = [
        'In this article, we explore',
        'Today we\'ll dive into',
        'Let\'s take a closer look at',
        'This guide covers everything about',
        'Here\'s what you need to know about',
        'Discover the secrets of',
        'Ready to learn about',
        'Everything you need to know about',
    ];

    const paragraphs = content.content.split(/\n\n+/);
    if (paragraphs.length === 0) {
        return { content, applied: false };
    }

    // Try to detect and replace common intro patterns
    const introPattern = /^(In this (article|guide|post)|Today we|Let's|Here's|Discover|Ready to|Everything you)/i;

    if (introPattern.test(paragraphs[0])) {
        const newIntro = introVariants[Math.floor(Math.random() * introVariants.length)];
        paragraphs[0] = paragraphs[0].replace(introPattern, newIntro);

        return {
            content: {
                ...content,
                content: paragraphs.join('\n\n'),
            },
            applied: true,
        };
    }

    return { content, applied: false };
}

function applyHeadingRephraseStrategy(content: ContentPiece): { content: ContentPiece; applied: boolean } {
    // Vary heading structure
    const headingPatterns = [
        { from: /^(#+)\s*How to/gm, to: '$1 Guide:' },
        { from: /^(#+)\s*Guide:/gm, to: '$1 How to' },
        { from: /^(#+)\s*Top (\d+)/gm, to: '$1 Best $2' },
        { from: /^(#+)\s*Best (\d+)/gm, to: '$1 Top $2' },
        { from: /^(#+)\s*Why/gm, to: '$1 Reasons' },
        { from: /^(#+)\s*What is/gm, to: '$1 Understanding' },
    ];

    let modified = content.content;
    let applied = false;

    for (const pattern of headingPatterns) {
        if (pattern.from.test(modified) && Math.random() > 0.5) {
            modified = modified.replace(pattern.from, pattern.to);
            applied = true;
        }
    }

    return {
        content: { ...content, content: modified },
        applied,
    };
}

function applyCtaVariationStrategy(content: ContentPiece): { content: ContentPiece; applied: boolean } {
    const ctaVariants = [
        'Check it out now',
        'Get started today',
        'Learn more',
        'Discover more',
        'See for yourself',
        'Take action now',
        'Don\'t miss out',
        'Grab yours today',
        'Click here to learn more',
        'Find out more',
    ];

    const ctaPattern = /(Check it out|Get started|Learn more|Discover|See for yourself|Take action|Don't miss|Grab yours|Click here|Find out)/gi;

    const newContent = content.content.replace(ctaPattern, () => {
        return ctaVariants[Math.floor(Math.random() * ctaVariants.length)];
    });

    return {
        content: { ...content, content: newContent },
        applied: newContent !== content.content,
    };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Simple hash for uniqueness checking
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

/**
 * Quick variation generator with default settings
 */
export function quickVariations(content: ContentPiece, count: number = 5): ContentVariation[] {
    return generateVariations(content, {
        count,
        strategies: ['spintax', 'synonym-swap', 'cta-variation'],
        ensureUnique: true,
    });
}

/**
 * Create A/B test variants
 */
export function createABTestVariants(
    content: ContentPiece
): { control: ContentPiece; variant: ContentPiece } {
    const variants = generateVariations(content, {
        count: 1,
        strategies: ['synonym-swap', 'intro-variation', 'heading-rephrase'],
        ensureUnique: true,
    });

    return {
        control: content,
        variant: variants[0]?.content || content,
    };
}
