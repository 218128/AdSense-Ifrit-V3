/**
 * Content Humanizer
 * FSD: features/campaigns/lib/humanizer.ts
 * 
 * Transforms AI-generated content into human-like writing by:
 * - Removing common AI patterns and phrases
 * - Adding conversational elements
 * - Varying sentence structure
 * - Injecting reader engagement hooks
 */

// ============================================================================
// AI Patterns to Remove/Replace
// ============================================================================

const AI_PATTERNS: Array<{ pattern: RegExp; replacement: string | ((match: string) => string) }> = [
    // Over-formal starters
    { pattern: /^Certainly[,!]?\s*/gmi, replacement: '' },
    { pattern: /^Indeed[,!]?\s*/gmi, replacement: '' },
    { pattern: /^Absolutely[,!]?\s*/gmi, replacement: '' },
    { pattern: /^Of course[,!]?\s*/gmi, replacement: '' },

    // Filler phrases
    { pattern: /It('s| is) important to (note|understand|remember) that\s*/gi, replacement: '' },
    { pattern: /It('s| is) worth (noting|mentioning|pointing out) that\s*/gi, replacement: '' },
    { pattern: /As (we|you) (may|might|can) (see|notice|observe),?\s*/gi, replacement: '' },
    { pattern: /In (this|the) (article|guide|post),?\s*/gi, replacement: '' },

    // Robotic conclusions
    { pattern: /In conclusion,\s*/gi, replacement: 'So, ' },
    { pattern: /To summarize,\s*/gi, replacement: 'Here\'s the thing: ' },
    { pattern: /To sum up,\s*/gi, replacement: 'Bottom line: ' },
    { pattern: /All in all,\s*/gi, replacement: '' },

    // Overused transitions
    { pattern: /Furthermore,\s*/gi, replacement: 'Plus, ' },
    { pattern: /Moreover,\s*/gi, replacement: 'And ' },
    { pattern: /Additionally,\s*/gi, replacement: 'Also, ' },
    { pattern: /Subsequently,\s*/gi, replacement: 'Then, ' },

    // Passive voice markers (simple cases)
    { pattern: /It can be observed that\s*/gi, replacement: 'You\'ll notice ' },
    { pattern: /It should be noted that\s*/gi, replacement: '' },
    { pattern: /It is (widely |generally )?believed that\s*/gi, replacement: 'Many people think ' },

    // Overly formal language
    { pattern: /utilize/gi, replacement: 'use' },
    { pattern: /implement/gi, replacement: 'set up' },
    { pattern: /subsequently/gi, replacement: 'then' },
    { pattern: /commence/gi, replacement: 'start' },
    { pattern: /terminate/gi, replacement: 'end' },
    { pattern: /obtain/gi, replacement: 'get' },
    { pattern: /sufficient/gi, replacement: 'enough' },
    { pattern: /regarding/gi, replacement: 'about' },
    { pattern: /in order to/gi, replacement: 'to' },

    // Remove double spaces
    { pattern: /\s{2,}/g, replacement: ' ' },
];

// ============================================================================
// Human Touch Injections
// ============================================================================

const CONVERSATIONAL_HOOKS = [
    "Here's the thing: ",
    "Let me explain: ",
    "Here's what I've found: ",
    "The truth is, ",
    "Look, ",
    "Honestly, ",
];

const ENGAGEMENT_PHRASES = [
    "You might be wondering",
    "Here's where it gets interesting",
    "But wait, there's more",
    "What surprised me was",
    "The game-changer here is",
];

const OPINION_STARTERS = [
    "In my experience, ",
    "I've found that ",
    "What works best is ",
    "My recommendation: ",
    "After testing this, ",
];

// ============================================================================
// Main Humanizer Functions
// ============================================================================

export interface HumanizerOptions {
    removeAIPatterns?: boolean;
    addConversationalHooks?: boolean;
    varySentenceLength?: boolean;
    addContractions?: boolean;
    injectOpinions?: boolean;
    intensityLevel?: 'light' | 'moderate' | 'heavy';
}

const DEFAULT_OPTIONS: HumanizerOptions = {
    removeAIPatterns: true,
    addConversationalHooks: true,
    varySentenceLength: true,
    addContractions: true,
    injectOpinions: true,
    intensityLevel: 'moderate',
};

/**
 * Main humanization function - transforms AI content to human-like
 */
export function humanizeContent(content: string, options: HumanizerOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let result = content;

    // Pass 1: Remove AI patterns
    if (opts.removeAIPatterns) {
        result = removeAIPatterns(result);
    }

    // Pass 2: Add contractions
    if (opts.addContractions) {
        result = addContractions(result);
    }

    // Pass 3: Add conversational hooks (sparingly)
    if (opts.addConversationalHooks) {
        result = addConversationalHooks(result, opts.intensityLevel || 'moderate');
    }

    // Pass 4: Vary sentence structure
    if (opts.varySentenceLength) {
        result = varySentenceStructure(result);
    }

    return result.trim();
}

/**
 * Remove common AI patterns and phrases
 */
function removeAIPatterns(content: string): string {
    let result = content;

    for (const { pattern, replacement } of AI_PATTERNS) {
        if (typeof replacement === 'string') {
            result = result.replace(pattern, replacement);
        } else {
            result = result.replace(pattern, replacement);
        }
    }

    return result;
}

/**
 * Convert formal language to contractions
 */
function addContractions(content: string): string {
    // Simple string replacements (use array of [pattern, replacement] tuples)
    const simpleContractions: Array<[RegExp, string]> = [
        [/\b(I|you|we|they) will\b/gi, "$1'll"],
        [/\b(I|you|we|they) would\b/gi, "$1'd"],
        [/\b(I|you|we|they) have\b/gi, "$1've"],
        [/\b(he|she|it) will\b/gi, "$1'll"],
        [/\b(he|she|it) would\b/gi, "$1'd"],
        [/\b(he|she|it) has\b/gi, "$1's"],
        [/\bit is\b/gi, "it's"],
        [/\bthat is\b/gi, "that's"],
        [/\bwhat is\b/gi, "what's"],
        [/\bthere is\b/gi, "there's"],
        [/\bhere is\b/gi, "here's"],
    ];

    let result = content;

    // Apply simple replacements
    for (const [pattern, replacement] of simpleContractions) {
        result = result.replace(pattern, replacement);
    }

    // Handle "not" contractions separately (need function)
    result = result.replace(/\b(do|does) not\b/gi, (m) => m.replace(' not', "n't"));
    result = result.replace(/\b(is|are|was|were) not\b/gi, (m) => m.replace(' not', "n't"));
    result = result.replace(/\b(have|has|had) not\b/gi, (m) => m.replace(' not', "n't"));
    result = result.replace(/\b(can|could|would|should) not\b/gi, (m) => m.replace(' not', "n't"));

    return result;
}

/**
 * Add conversational hooks at strategic points
 */
function addConversationalHooks(content: string, intensity: 'light' | 'moderate' | 'heavy'): string {
    const paragraphs = content.split(/\n\n+/);
    const hookFrequency = intensity === 'light' ? 6 : intensity === 'moderate' ? 4 : 2;

    const result = paragraphs.map((para, idx) => {
        // Skip headings and short paragraphs
        if (para.startsWith('#') || para.length < 100) {
            return para;
        }

        // Add hook to every Nth paragraph
        if (idx > 0 && idx % hookFrequency === 0) {
            const hook = CONVERSATIONAL_HOOKS[Math.floor(Math.random() * CONVERSATIONAL_HOOKS.length)];
            // Only add if paragraph doesn't already start with a hook-like phrase
            if (!/^(here's|let me|look,|honestly)/i.test(para)) {
                return hook + para.charAt(0).toLowerCase() + para.slice(1);
            }
        }

        return para;
    });

    return result.join('\n\n');
}

/**
 * Vary sentence structure - break long sentences, combine short ones
 */
function varySentenceStructure(content: string): string {
    const paragraphs = content.split(/\n\n+/);

    const result = paragraphs.map(para => {
        // Skip headings
        if (para.startsWith('#')) return para;

        const sentences = para.split(/(?<=[.!?])\s+/);

        // If we have many similar-length sentences, vary them
        if (sentences.length > 3) {
            return sentences.map((sentence, idx) => {
                // Occasionally start with "And" or "But" for variety
                if (idx > 0 && idx % 3 === 0 && Math.random() > 0.7) {
                    if (sentence.length > 50 && !sentence.startsWith('And ') && !sentence.startsWith('But ')) {
                        const starters = ['And ', 'But ', 'So '];
                        return starters[Math.floor(Math.random() * starters.length)] +
                            sentence.charAt(0).toLowerCase() + sentence.slice(1);
                    }
                }
                return sentence;
            }).join(' ');
        }

        return para;
    });

    return result.join('\n\n');
}

// ============================================================================
// E-E-A-T Enhancement Functions
// ============================================================================

export interface EEATConfig {
    authorName: string;
    authorCredentials?: string;
    yearsExperience?: number;
    addFirstHandExperience?: boolean;
    addCitations?: boolean;
}

/**
 * Add E-E-A-T signals to content
 */
export function addEEATSignals(content: string, config: EEATConfig): string {
    let result = content;

    // Add first-hand experience statements
    if (config.addFirstHandExperience) {
        const experienceStatements = [
            `After ${config.yearsExperience || 5}+ years in this field, `,
            "From my hands-on experience, ",
            "Having tested this myself, ",
            "Based on my personal experience, ",
        ];

        // Insert experience statement in first major paragraph
        const paragraphs = result.split(/\n\n+/);
        let inserted = false;

        result = paragraphs.map(para => {
            if (!inserted && !para.startsWith('#') && para.length > 150) {
                inserted = true;
                const statement = experienceStatements[Math.floor(Math.random() * experienceStatements.length)];
                return statement + para.charAt(0).toLowerCase() + para.slice(1);
            }
            return para;
        }).join('\n\n');
    }

    return result;
}

// ============================================================================
// Export Utilities
// ============================================================================

export { AI_PATTERNS, CONVERSATIONAL_HOOKS, ENGAGEMENT_PHRASES, OPINION_STARTERS };
