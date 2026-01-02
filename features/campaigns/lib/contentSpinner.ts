/**
 * Content Spinner
 * FSD: features/campaigns/lib/contentSpinner.ts
 * 
 * AI-powered content rewriting and spinning for uniqueness.
 */

import type { AIConfig } from '../model/types';

// ============================================================================
// Types
// ============================================================================

export interface SpinResult {
    success: boolean;
    content: string;
    changes: string[];
    error?: string;
}

export interface SpinOptions {
    mode: 'light' | 'moderate' | 'heavy';
    preserveKeywords?: string[];
    addVariation?: boolean;
    expandContent?: boolean;
}

// ============================================================================
// Content Spinning
// ============================================================================

/**
 * Spin/rewrite content using AI for uniqueness
 * Uses the Unified Capabilities System
 */
export async function spinContent(
    content: string,
    options: SpinOptions,
    aiConfig: AIConfig
): Promise<SpinResult> {
    try {
        const prompt = buildSpinPrompt(content, options);

        const response = await fetch('/api/capabilities/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                preferredHandler: aiConfig.provider
                    ? `${aiConfig.provider}-generate`
                    : undefined,
                itemType: 'content_spin',
            }),
        });

        if (!response.ok) {
            return { success: false, content, changes: [], error: 'AI request failed' };
        }

        const data = await response.json();

        if (!data.success) {
            console.warn('[ContentSpinner] Failed:', data.error);
            return { success: false, content, changes: [], error: data.error };
        }

        const spunContent = data.text || content;
        console.log(`[ContentSpinner] Success via ${data.handlerUsed} in ${data.latencyMs}ms`);

        return {
            success: true,
            content: spunContent,
            changes: identifyChanges(content, spunContent),
        };
    } catch (error) {
        return {
            success: false,
            content,
            changes: [],
            error: error instanceof Error ? error.message : 'Spin failed',
        };
    }
}

/**
 * Build spinning prompt based on options
 */
function buildSpinPrompt(content: string, options: SpinOptions): string {
    const modeInstructions = {
        light: 'Make minor changes: synonyms, sentence structure. Keep meaning identical.',
        moderate: 'Rewrite paragraphs while preserving key information. Change examples and phrasing.',
        heavy: 'Completely rewrite while keeping the same topic and key points. Use different examples.',
    };

    let prompt = `Rewrite the following content to make it unique while preserving quality.\n\n`;
    prompt += `Mode: ${modeInstructions[options.mode]}\n\n`;

    if (options.preserveKeywords?.length) {
        prompt += `Preserve these exact keywords: ${options.preserveKeywords.join(', ')}\n\n`;
    }

    if (options.expandContent) {
        prompt += `Expand the content with additional relevant details.\n\n`;
    }

    if (options.addVariation) {
        prompt += `Add variations in sentence length and structure.\n\n`;
    }

    prompt += `Original content:\n\n${content}\n\n`;
    prompt += `Rewritten content:`;

    return prompt;
}

/**
 * Identify what changed between original and spun content
 */
function identifyChanges(original: string, spun: string): string[] {
    const changes: string[] = [];

    const originalWords = original.split(/\s+/).length;
    const spunWords = spun.split(/\s+/).length;
    const wordDiff = spunWords - originalWords;

    if (wordDiff > 50) {
        changes.push(`Added ~${wordDiff} words`);
    } else if (wordDiff < -50) {
        changes.push(`Removed ~${Math.abs(wordDiff)} words`);
    }

    const originalSentences = original.split(/[.!?]+/).length;
    const spunSentences = spun.split(/[.!?]+/).length;

    if (spunSentences !== originalSentences) {
        changes.push(`Restructured paragraphs`);
    }

    // Simple similarity check
    const similarity = calculateSimilarity(original, spun);
    if (similarity < 0.7) {
        changes.push('Heavy rewrite');
    } else if (similarity < 0.85) {
        changes.push('Moderate rewrite');
    } else {
        changes.push('Light synonyms');
    }

    return changes;
}

/**
 * Calculate text similarity (Jaccard on words)
 */
function calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;

    return union > 0 ? intersection / union : 0;
}

// ============================================================================
// Synonym Replacement (Fast, No AI)
// ============================================================================

const SYNONYMS: Record<string, string[]> = {
    'good': ['excellent', 'great', 'superb', 'outstanding'],
    'bad': ['poor', 'terrible', 'awful', 'subpar'],
    'big': ['large', 'huge', 'massive', 'substantial'],
    'small': ['tiny', 'compact', 'miniature', 'petite'],
    'fast': ['quick', 'rapid', 'swift', 'speedy'],
    'slow': ['gradual', 'unhurried', 'leisurely'],
    'important': ['crucial', 'vital', 'essential', 'significant'],
    'easy': ['simple', 'straightforward', 'effortless'],
    'hard': ['difficult', 'challenging', 'demanding'],
    'new': ['fresh', 'novel', 'latest', 'modern'],
    'old': ['vintage', 'classic', 'traditional', 'established'],
    'help': ['assist', 'support', 'aid', 'facilitate'],
    'show': ['demonstrate', 'illustrate', 'display', 'reveal'],
    'make': ['create', 'build', 'develop', 'produce'],
    'use': ['utilize', 'employ', 'leverage', 'apply'],
};

/**
 * Quick synonym replacement without AI
 */
export function quickSpin(text: string, intensity: number = 0.3): string {
    const words = text.split(/(\s+)/);

    return words.map(word => {
        const lower = word.toLowerCase().replace(/[^a-z]/g, '');
        const synonyms = SYNONYMS[lower];

        if (synonyms && Math.random() < intensity) {
            const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
            // Preserve original casing
            if (word[0] === word[0].toUpperCase()) {
                return synonym.charAt(0).toUpperCase() + synonym.slice(1);
            }
            return synonym;
        }

        return word;
    }).join('');
}
