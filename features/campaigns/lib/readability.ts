/**
 * Readability Optimizer
 * FSD: features/campaigns/lib/readability.ts
 * 
 * Optimizes content for readability:
 * - Flesch Reading Ease scoring
 * - Paragraph length optimization
 * - Sentence structure analysis
 * - Formatting improvements for scannability
 */

// ============================================================================
// Readability Scoring (Flesch Reading Ease)
// ============================================================================

export interface ReadabilityScores {
    fleschReadingEase: number;        // 0-100 (60-70 ideal for general web)
    fleschKincaidGrade: number;       // Grade level
    avgSentenceLength: number;        // Words per sentence
    avgSyllablesPerWord: number;      // Avg syllables
    paragraphCount: number;
    sentenceCount: number;
    wordCount: number;
    readingTimeMinutes: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Calculate readability scores for content
 */
export function analyzeReadability(content: string): ReadabilityScores {
    // Strip markdown formatting for analysis
    const plainText = stripMarkdown(content);

    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);

    const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;

    // Flesch Reading Ease = 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
    const fleschReadingEase = Math.max(0, Math.min(100,
        206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)
    ));

    // Flesch-Kincaid Grade Level = 0.39(words/sentences) + 11.8(syllables/words) - 15.59
    const fleschKincaidGrade = Math.max(0,
        (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59
    );

    // Reading time: ~200 words per minute
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    // Grade based on Flesch score
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (fleschReadingEase >= 70) grade = 'A';
    else if (fleschReadingEase >= 60) grade = 'B';
    else if (fleschReadingEase >= 50) grade = 'C';
    else if (fleschReadingEase >= 30) grade = 'D';
    else grade = 'F';

    return {
        fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
        fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
        avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
        avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
        paragraphCount: paragraphs.length,
        sentenceCount,
        wordCount,
        readingTimeMinutes,
        grade,
    };
}

// ============================================================================
// Readability Optimization
// ============================================================================

export interface OptimizationSuggestions {
    longSentences: { text: string; wordCount: number }[];
    longParagraphs: { text: string; sentenceCount: number }[];
    complexWords: string[];
    passiveVoice: string[];
    overallScore: number;
    suggestions: string[];
}

/**
 * Get optimization suggestions for content
 */
export function getOptimizationSuggestions(content: string): OptimizationSuggestions {
    const plainText = stripMarkdown(content);
    const sentences = plainText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0 && !p.startsWith('#'));

    // Find long sentences (>25 words)
    const longSentences = sentences
        .filter(s => s.split(/\s+/).length > 25)
        .map(s => ({ text: s.slice(0, 100) + '...', wordCount: s.split(/\s+/).length }))
        .slice(0, 5);

    // Find long paragraphs (>5 sentences)
    const longParagraphs = paragraphs
        .filter(p => p.split(/[.!?]+/).length > 5)
        .map(p => ({ text: p.slice(0, 100) + '...', sentenceCount: p.split(/[.!?]+/).length }))
        .slice(0, 3);

    // Find complex words (4+ syllables)
    const words = plainText.toLowerCase().split(/\s+/);
    const complexWords = [...new Set(words.filter(w => countSyllables(w) >= 4))].slice(0, 10);

    // Simple passive voice detection
    const passivePatterns = /\b(was|were|is|are|been|being|be)\s+\w+ed\b/gi;
    const passiveMatches = plainText.match(passivePatterns) || [];
    const passiveVoice = [...new Set(passiveMatches)].slice(0, 5);

    // Build suggestions
    const suggestions: string[] = [];
    const scores = analyzeReadability(content);

    if (scores.fleschReadingEase < 60) {
        suggestions.push('Content is too complex. Simplify sentences and use shorter words.');
    }
    if (scores.avgSentenceLength > 20) {
        suggestions.push(`Average sentence is ${scores.avgSentenceLength} words. Aim for 15-20.`);
    }
    if (longSentences.length > 0) {
        suggestions.push(`${longSentences.length} sentences are too long. Break them up.`);
    }
    if (longParagraphs.length > 0) {
        suggestions.push(`${longParagraphs.length} paragraphs need to be split.`);
    }
    if (complexWords.length > 5) {
        suggestions.push('Consider simpler alternatives for complex words.');
    }
    if (passiveVoice.length > 3) {
        suggestions.push('Convert passive voice to active for stronger writing.');
    }

    return {
        longSentences,
        longParagraphs,
        complexWords,
        passiveVoice,
        overallScore: scores.fleschReadingEase,
        suggestions,
    };
}

// ============================================================================
// Formatting Enhancer
// ============================================================================

export interface FormattingOptions {
    addTableOfContents?: boolean;
    addTLDR?: boolean;
    addKeyTakeaways?: boolean;
    maxParagraphSentences?: number;
    addBulletLists?: boolean;
}

/**
 * Enhance content formatting for scannability
 */
export function enhanceFormatting(content: string, options: FormattingOptions = {}): string {
    const opts = {
        addTableOfContents: true,
        addTLDR: true,
        addKeyTakeaways: true,
        maxParagraphSentences: 4,
        addBulletLists: true,
        ...options,
    };

    let result = content;

    // Extract headings for ToC
    const headings = content.match(/^##\s+.+$/gm) || [];

    // Add Table of Contents after first H1
    if (opts.addTableOfContents && headings.length >= 3) {
        const toc = generateTableOfContents(headings);
        result = result.replace(/^(#\s+.+\n+)/, `$1${toc}\n\n`);
    }

    // Add TL;DR at the top
    if (opts.addTLDR) {
        // Find first paragraph after title
        const firstParaMatch = result.match(/^#\s+.+\n+([^#].+)/m);
        if (firstParaMatch) {
            const tldr = generateTLDR(result);
            if (tldr) {
                result = result.replace(/^(#\s+.+\n+)/, `$1> **TL;DR:** ${tldr}\n\n`);
            }
        }
    }

    return result;
}

/**
 * Generate table of contents from headings
 */
function generateTableOfContents(headings: string[]): string {
    const items = headings.map(h => {
        const text = h.replace(/^##\s+/, '');
        const anchor = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `- [${text}](#${anchor})`;
    });

    return `## Quick Navigation\n\n${items.join('\n')}`;
}

/**
 * Generate TL;DR summary from content
 */
function generateTLDR(content: string): string | null {
    // Extract first substantial paragraph
    const paragraphs = content.split(/\n\n+/).filter(p =>
        p.trim().length > 100 && !p.startsWith('#') && !p.startsWith('>')
    );

    if (paragraphs.length === 0) return null;

    // Take first 1-2 sentences of first paragraph
    const firstPara = paragraphs[0];
    const sentences = firstPara.split(/(?<=[.!?])\s+/).slice(0, 2);

    return sentences.join(' ').slice(0, 200) + (sentences.join(' ').length > 200 ? '...' : '');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Strip markdown formatting from content
 */
function stripMarkdown(content: string): string {
    return content
        .replace(/^#+\s+/gm, '')           // Headers
        .replace(/\*\*(.+?)\*\*/g, '$1')   // Bold
        .replace(/\*(.+?)\*/g, '$1')       // Italic
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
        .replace(/`(.+?)`/g, '$1')         // Code
        .replace(/^[-*+]\s+/gm, '')        // List items
        .replace(/^\d+\.\s+/gm, '')        // Numbered lists
        .replace(/^>\s+/gm, '')            // Blockquotes
        .replace(/\n{2,}/g, '\n');         // Multiple newlines
}

/**
 * Count syllables in a word (approximate)
 */
function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g) || [];
    let count = vowelGroups.length;

    // Subtract silent e
    if (word.endsWith('e') && count > 1) count--;

    // Handle special cases
    if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
        count++;
    }

    return Math.max(1, count);
}

// ============================================================================
// Simple Word Replacements for Readability
// ============================================================================

export const COMPLEX_TO_SIMPLE: Record<string, string> = {
    'utilize': 'use',
    'implement': 'set up',
    'facilitate': 'help',
    'subsequently': 'then',
    'commence': 'start',
    'terminate': 'end',
    'demonstrate': 'show',
    'approximately': 'about',
    'sufficient': 'enough',
    'numerous': 'many',
    'additional': 'more',
    'purchase': 'buy',
    'obtain': 'get',
    'regarding': 'about',
    'prior to': 'before',
    'in order to': 'to',
    'at this point in time': 'now',
    'in the event that': 'if',
    'due to the fact that': 'because',
};

/**
 * Replace complex words with simpler alternatives
 */
export function simplifyLanguage(content: string): string {
    let result = content;

    for (const [complex, simple] of Object.entries(COMPLEX_TO_SIMPLE)) {
        const regex = new RegExp(`\\b${complex}\\b`, 'gi');
        result = result.replace(regex, simple);
    }

    return result;
}

// ============================================================================
// Main Readability Optimization (used by pipeline)
// ============================================================================

export interface OptimizeReadabilityResult {
    optimizedContent: string;
    score: number;
    improvements: string[];
}

/**
 * Optimize content for readability
 * Used by 06-optimization.ts in the pipeline
 */
export function optimizeReadability(content: string): OptimizeReadabilityResult {
    const improvements: string[] = [];
    let optimized = content;

    // 1. Simplify language
    const simplified = simplifyLanguage(optimized);
    if (simplified !== optimized) {
        improvements.push('Simplified complex words');
        optimized = simplified;
    }

    // 2. Get readability scores
    const beforeScore = analyzeReadability(content);
    const afterScore = analyzeReadability(optimized);

    // 3. Log improvement
    if (afterScore.fleschReadingEase > beforeScore.fleschReadingEase) {
        improvements.push(`Readability improved from ${beforeScore.fleschReadingEase} to ${afterScore.fleschReadingEase}`);
    }

    return {
        optimizedContent: optimized,
        score: afterScore.fleschReadingEase,
        improvements,
    };
}
