/**
 * Spintax Engine
 * FSD: features/content/lib/spintaxEngine.ts
 * 
 * Parses and expands spintax syntax: {word1|word2|word3}
 * Supports recursive nesting and multiple selection modes.
 */

// ============================================================================
// Types
// ============================================================================

export interface SpintaxOptions {
    /** Selection mode: 'random' picks randomly, 'sequential' cycles through */
    mode?: 'random' | 'sequential';
    /** Seed for reproducible random output */
    seed?: number;
    /** State for sequential mode - tracks current index per group */
    sequentialState?: Map<string, number>;
}

export interface SpintaxResult {
    /** The expanded text */
    text: string;
    /** Number of spin groups found */
    groupCount: number;
    /** Total possible variations */
    totalVariations: number;
}

// ============================================================================
// Core Engine
// ============================================================================

/**
 * Expand spintax syntax in text
 * 
 * @example
 * expandSpintax("{Hello|Hi} {world|there}!")
 * // Returns: "Hi world!" (random selection)
 */
export function expandSpintax(
    text: string,
    options: SpintaxOptions = {}
): SpintaxResult {
    const mode = options.mode || 'random';
    const state = options.sequentialState || new Map<string, number>();

    let groupCount = 0;
    let totalVariations = 1;

    // Create seeded random function if seed provided
    const random = options.seed !== undefined
        ? createSeededRandom(options.seed)
        : Math.random;

    // Process nested spintax from inside out
    let result = text;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    while (hasSpintax(result) && iterations < maxIterations) {
        result = result.replace(
            /\{([^{}]+)\}/g,
            (match, content) => {
                const options_arr = content.split('|');
                groupCount++;
                totalVariations *= options_arr.length;

                if (mode === 'sequential') {
                    const key = `group_${groupCount}`;
                    const currentIndex = state.get(key) || 0;
                    const selection = options_arr[currentIndex % options_arr.length];
                    state.set(key, currentIndex + 1);
                    return selection;
                } else {
                    // Random mode
                    const randomIndex = Math.floor(random() * options_arr.length);
                    return options_arr[randomIndex];
                }
            }
        );
        iterations++;
    }

    return {
        text: result,
        groupCount,
        totalVariations,
    };
}

/**
 * Check if text contains spintax
 */
export function hasSpintax(text: string): boolean {
    return /\{[^{}]*\|[^{}]*\}/.test(text);
}

/**
 * Count total possible variations in spintax text
 */
export function countVariations(text: string): number {
    let variations = 1;
    let depth = 0;
    let optionCount = 1;

    // Simple counting - doesn't handle all edge cases but good enough
    for (const char of text) {
        if (char === '{') {
            depth++;
            optionCount = 1;
        } else if (char === '}' && depth > 0) {
            depth--;
            variations *= optionCount;
            optionCount = 1;
        } else if (char === '|' && depth > 0) {
            optionCount++;
        }
    }

    return variations;
}

/**
 * Generate all possible variations of spintax text
 * Warning: Can be exponential! Use with caution.
 */
export function generateAllVariations(
    text: string,
    maxVariations: number = 100
): string[] {
    const variations: string[] = [];
    const total = countVariations(text);

    if (total > maxVariations) {
        console.warn(`Too many variations (${total}), limiting to ${maxVariations}`);
    }

    const limit = Math.min(total, maxVariations);
    const seen = new Set<string>();

    // Generate unique variations
    while (variations.length < limit && seen.size < limit * 10) {
        const result = expandSpintax(text);
        if (!seen.has(result.text)) {
            seen.add(result.text);
            variations.push(result.text);
        }
    }

    return variations;
}

/**
 * Create spintax from list of synonyms
 */
export function createSpintax(words: string[]): string {
    if (words.length === 0) return '';
    if (words.length === 1) return words[0];
    return `{${words.join('|')}}`;
}

/**
 * Extract all spin groups from text
 */
export function extractSpinGroups(text: string): string[][] {
    const groups: string[][] = [];
    const regex = /\{([^{}]+)\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        groups.push(match[1].split('|'));
    }

    return groups;
}

/**
 * Validate spintax syntax
 */
export function validateSpintax(text: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let depth = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth < 0) {
                errors.push(`Unexpected closing brace at position ${i}`);
            }
        }
    }

    if (depth > 0) {
        errors.push('Unclosed spintax brace');
    }

    // Check for empty groups
    if (/\{\}/.test(text)) {
        errors.push('Empty spintax group found');
    }

    // Check for single-option groups (valid but pointless)
    const singleOptionMatches = text.match(/\{[^|{}]+\}/g);
    if (singleOptionMatches) {
        errors.push(`Single-option groups found: ${singleOptionMatches.join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a seeded random number generator
 */
function createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

/**
 * Common synonym sets for content variation
 */
export const COMMON_SYNONYMS: Record<string, string[]> = {
    great: ['great', 'excellent', 'amazing', 'fantastic', 'wonderful', 'superb'],
    good: ['good', 'nice', 'fine', 'decent', 'solid', 'quality'],
    best: ['best', 'top', 'finest', 'premium', 'ultimate', 'leading'],
    buy: ['buy', 'purchase', 'get', 'acquire', 'order', 'grab'],
    cheap: ['cheap', 'affordable', 'budget', 'inexpensive', 'low-cost', 'economical'],
    fast: ['fast', 'quick', 'rapid', 'speedy', 'swift', 'instant'],
    easy: ['easy', 'simple', 'effortless', 'straightforward', 'hassle-free'],
    important: ['important', 'essential', 'crucial', 'vital', 'key', 'critical'],
    guide: ['guide', 'tutorial', 'walkthrough', 'how-to', 'manual'],
    review: ['review', 'analysis', 'evaluation', 'assessment', 'breakdown'],
};

/**
 * Auto-spin common words in text using synonym database
 */
export function autoSpin(text: string, synonyms: Record<string, string[]> = COMMON_SYNONYMS): string {
    let result = text;

    for (const [word, syns] of Object.entries(synonyms)) {
        // Case-insensitive word boundary match
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, (match) => {
            // Preserve original case for first letter
            const spinned = createSpintax(syns);
            return match[0] === match[0].toUpperCase()
                ? spinned.charAt(0).toUpperCase() + spinned.slice(1)
                : spinned;
        });
    }

    return result;
}
