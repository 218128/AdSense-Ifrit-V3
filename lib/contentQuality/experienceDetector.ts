/**
 * Experience Detector
 * FSD: lib/contentQuality/experienceDetector.ts
 * 
 * Detects first-hand experience signals in content
 * for the Experience dimension of E-E-A-T scoring.
 */

import type { ExperienceSignals, ExperienceScore } from './types';

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * First-hand experience phrases that indicate personal involvement
 */
const FIRST_HAND_PATTERNS = [
    // Direct experience
    /\b(I|we)\s+(tested|tried|used|experimented|examined|evaluated|reviewed)/gi,
    /\b(I|we)\s+(found|discovered|noticed|observed|realized|learned)/gi,
    /\b(I|we)\s+(recommend|suggest|advise|personally prefer)/gi,
    /\bIn my (experience|opinion|view|testing)/gi,
    /\bFrom my (experience|perspective|point of view)/gi,
    /\bHaving (used|tested|worked with|spent time)/gi,
    /\bAfter (using|testing|trying|evaluating)/gi,
    /\bWhen I (first|actually|personally)/gi,

    // Results and outcomes
    /\b(I|we)\s+(saw|achieved|got|experienced)\s+\w+\s+results/gi,
    /\bThis worked (well|great|perfectly) for (me|us)/gi,
    /\bIn my case/gi,

    // Comparisons from experience
    /\bCompared to (other|previous).*(I|we) (used|tested)/gi,
    /\bUnlike (other|some).*I've (used|tried)/gi,
];

/**
 * Personal anecdote patterns
 */
const ANECDOTE_PATTERNS = [
    // Story indicators
    /\b(Let me (share|tell you)|Here's what happened)/gi,
    /\b(One time|Once|Recently),?\s+(I|we)/gi,
    /\b(A few (months|weeks|years) ago)/gi,
    /\bI remember when/gi,

    // Example sharing
    /\bFor example,?\s+(I|we|in my)/gi,
    /\bHere's an example from my/gi,
    /\bTo illustrate,?\s+(I|we)/gi,
];

/**
 * Testing/evaluation verbs
 */
const TESTING_VERBS = [
    'tested', 'tried', 'evaluated', 'reviewed', 'examined',
    'experimented', 'measured', 'benchmarked', 'compared', 'analyzed'
];

/**
 * Experience verbs
 */
const EXPERIENCE_VERBS = [
    'found', 'discovered', 'noticed', 'observed', 'realized',
    'learned', 'experienced', 'witnessed', 'encountered', 'saw'
];

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Extract first-hand experience phrases from content
 */
function extractFirstHandPhrases(html: string): ExperienceSignals['firstHandPhrases'] {
    // Strip HTML for text analysis
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const lines = text.split(/[.!?]+/);
    const phrases: ExperienceSignals['firstHandPhrases'] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        for (const pattern of FIRST_HAND_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                phrases.push({
                    phrase: match[0],
                    context: line.substring(0, 150),
                    lineNumber: i + 1
                });
                break; // One match per line
            }
        }
    }

    return phrases;
}

/**
 * Extract personal anecdotes from content
 */
function extractPersonalAnecdotes(html: string): ExperienceSignals['personalAnecdotes'] {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const sentences = text.split(/[.!?]+/);
    const anecdotes: ExperienceSignals['personalAnecdotes'] = [];

    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length < 20) continue;

        for (const pattern of ANECDOTE_PATTERNS) {
            if (pattern.test(trimmed)) {
                // Classify the type
                let type: ExperienceSignals['personalAnecdotes'][0]['type'] = 'story';
                if (/example|illustrate/i.test(trimmed)) type = 'example';
                if (/compared|unlike|versus/i.test(trimmed)) type = 'comparison';
                if (/result|outcome|achieved/i.test(trimmed)) type = 'result';

                anecdotes.push({
                    text: trimmed.substring(0, 200),
                    type
                });
                break;
            }
        }
    }

    return anecdotes;
}

/**
 * Count testing-related verb mentions
 */
function countTestingMentions(text: string): number {
    let count = 0;
    const lowerText = text.toLowerCase();

    for (const verb of TESTING_VERBS) {
        const pattern = new RegExp(`\\b(I|we)\\s+(have\\s+)?${verb}\\b`, 'gi');
        const matches = lowerText.match(pattern);
        if (matches) {
            count += matches.length;
        }
    }

    return count;
}

/**
 * Count experience verb mentions
 */
function countExperienceVerbs(text: string): number {
    let count = 0;
    const lowerText = text.toLowerCase();

    for (const verb of EXPERIENCE_VERBS) {
        const pattern = new RegExp(`\\b(I|we)\\s+(have\\s+)?${verb}\\b`, 'gi');
        const matches = lowerText.match(pattern);
        if (matches) {
            count += matches.length;
        }
    }

    return count;
}

/**
 * Detect unique insights (simplified - full version needs competitor analysis)
 */
function detectOriginalInsights(text: string): string[] {
    const insights: string[] = [];

    // Look for unique claim patterns
    const claimPatterns = [
        /What (I|we) (found|discovered) was/gi,
        /The surprising thing (is|was)/gi,
        /Contrary to (popular belief|what you might think)/gi,
        /Most people don't (know|realize)/gi,
        /The (real|actual|hidden) (secret|truth|reason)/gi,
        /Here's what (nobody|few people) (tells|tell) you/gi,
    ];

    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
        for (const pattern of claimPatterns) {
            if (pattern.test(sentence)) {
                insights.push(sentence.trim().substring(0, 150));
                break;
            }
        }
    }

    return insights.slice(0, 5); // Max 5 insights
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect all experience signals in content
 */
export function detectExperienceSignals(html: string): ExperienceSignals {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    return {
        firstHandPhrases: extractFirstHandPhrases(html),
        personalAnecdotes: extractPersonalAnecdotes(html),
        originalInsights: detectOriginalInsights(text),
        testingMentions: countTestingMentions(text),
        experienceVerbs: countExperienceVerbs(text),
    };
}

/**
 * Score the Experience dimension
 */
export function scoreExperience(html: string, wordCount: number): ExperienceScore {
    const signals = detectExperienceSignals(html);
    const recommendations: string[] = [];

    // Calculate component scores

    // Original content score (simplified - needs plagiarism check for full accuracy)
    // For now, we estimate based on experience signals
    const originalContent = Math.min(100,
        50 + (signals.originalInsights.length * 10) +
        (signals.personalAnecdotes.filter(a => a.type === 'story').length * 5)
    );

    // Author perspective score
    const perspectiveSignals =
        signals.firstHandPhrases.length * 5 +
        signals.testingMentions * 8 +
        signals.experienceVerbs * 3;
    const authorPerspective = Math.min(100, perspectiveSignals * 2);

    // Unique insights score
    const uniqueInsights = Math.min(100, signals.originalInsights.length * 20);

    // Overall experience score
    const score = Math.round(
        (originalContent * 0.3) +
        (authorPerspective * 0.5) +
        (uniqueInsights * 0.2)
    );

    // Generate recommendations
    if (signals.firstHandPhrases.length < 3) {
        recommendations.push('Add more first-hand experience phrases like "I tested" or "In my experience"');
    }
    if (signals.personalAnecdotes.length === 0) {
        recommendations.push('Include a personal story or example from your experience');
    }
    if (signals.testingMentions === 0) {
        recommendations.push('Mention actual testing or evaluation you performed');
    }
    if (signals.originalInsights.length === 0) {
        recommendations.push('Share unique insights or discoveries not commonly known');
    }

    return {
        score,
        originalContent,
        authorPerspective,
        uniqueInsights,
        signals,
        recommendations,
    };
}
