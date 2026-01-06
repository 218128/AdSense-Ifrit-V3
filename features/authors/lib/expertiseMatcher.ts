/**
 * Expertise Matcher
 * FSD: features/authors/lib/expertiseMatcher.ts
 * 
 * Matches authors to content topics based on expertise,
 * with fallback strategies when no perfect match exists.
 */

import type {
    AuthorProfile,
    AuthorMatchCriteria,
    AuthorMatchResult,
    ExpertiseLevel
} from '../model/authorTypes';
import { useAuthorStore } from '../model/authorStore';

// ============================================================================
// Types
// ============================================================================

export interface TopicAnalysis {
    mainTopic: string;
    niche: string;
    subtopics: string[];
    requiredExpertise: ExpertiseLevel;
    isYMYL: boolean;                     // Your Money Your Life
}

export interface MatchRecommendation {
    primary: AuthorMatchResult | null;
    alternatives: AuthorMatchResult[];
    needsNewAuthor: boolean;
    suggestedExpertise: string[];
}

// ============================================================================
// Topic Analysis
// ============================================================================

/**
 * YMYL (Your Money or Your Life) niches requiring higher expertise
 */
const YMYL_NICHES = [
    'health', 'medical', 'medicine', 'fitness', 'nutrition', 'diet',
    'finance', 'investing', 'insurance', 'tax', 'legal', 'law',
    'news', 'politics', 'government', 'safety', 'security'
];

/**
 * Common niche mappings for topic normalization
 */
const NICHE_MAPPINGS: Record<string, string[]> = {
    'technology': ['tech', 'software', 'programming', 'coding', 'ai', 'machine learning', 'data science'],
    'personal finance': ['finance', 'money', 'investing', 'savings', 'retirement', 'budgeting'],
    'health & wellness': ['health', 'wellness', 'fitness', 'nutrition', 'mental health'],
    'travel': ['travel', 'vacation', 'destinations', 'tourism', 'backpacking'],
    'home & garden': ['home', 'garden', 'diy', 'renovation', 'interior design'],
    'food & cooking': ['food', 'cooking', 'recipes', 'culinary', 'baking'],
    'business': ['business', 'entrepreneurship', 'marketing', 'sales', 'startup'],
    'lifestyle': ['lifestyle', 'productivity', 'self-improvement', 'relationships'],
};

/**
 * Analyze a topic to extract niche and expertise requirements
 */
export function analyzeTopicForMatching(topic: string): TopicAnalysis {
    const topicLower = topic.toLowerCase();

    // Extract words for analysis
    const words = topicLower.split(/\s+/);

    // Find matching niche
    let matchedNiche = 'general';
    for (const [niche, keywords] of Object.entries(NICHE_MAPPINGS)) {
        if (keywords.some(kw => topicLower.includes(kw))) {
            matchedNiche = niche;
            break;
        }
    }

    // Check if YMYL
    const isYMYL = YMYL_NICHES.some(yn => topicLower.includes(yn));

    // Determine required expertise level
    let requiredExpertise: ExpertiseLevel = 'intermediate';
    if (isYMYL) {
        requiredExpertise = 'expert';
    } else if (topicLower.includes('advanced') || topicLower.includes('expert')) {
        requiredExpertise = 'advanced';
    } else if (topicLower.includes('beginner') || topicLower.includes('introduction')) {
        requiredExpertise = 'beginner';
    }

    // Extract subtopics (significant words)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'how', 'what', 'why', 'when', 'best', 'top'];
    const subtopics = words
        .filter(w => w.length > 3 && !stopWords.includes(w))
        .slice(0, 5);

    return {
        mainTopic: topic,
        niche: matchedNiche,
        subtopics,
        requiredExpertise,
        isYMYL
    };
}

// ============================================================================
// Matching Logic
// ============================================================================

/**
 * Find the best author for a given topic
 */
export function findAuthorForTopic(
    topic: string,
    siteId?: string,
    options?: {
        requireVerified?: boolean;
        minArticles?: number;
    }
): MatchRecommendation {
    const store = useAuthorStore.getState();
    const analysis = analyzeTopicForMatching(topic);

    // Build criteria
    const criteria: AuthorMatchCriteria = {
        niche: analysis.niche,
        topics: analysis.subtopics,
        minExpertiseLevel: analysis.requiredExpertise,
        preferredSiteId: siteId
    };

    // Get matches
    let matches = store.findMatchingAuthors(criteria, 10);

    // Filter by options
    if (options?.requireVerified) {
        matches = matches.filter(m => m.author.verificationStatus === 'verified');
    }
    if (options?.minArticles) {
        matches = matches.filter(m => m.author.articlesPublished >= options.minArticles!);
    }

    // Boost YMYL topic requirements
    if (analysis.isYMYL) {
        matches = matches.map(m => ({
            ...m,
            matchScore: m.author.verificationStatus === 'verified'
                ? m.matchScore + 10
                : m.matchScore - 20
        })).sort((a, b) => b.matchScore - a.matchScore);
    }

    const primary = matches.length > 0 && matches[0].matchScore >= 40
        ? matches[0]
        : null;

    const alternatives = matches.slice(1, 4);

    // Determine if we need a new author
    const needsNewAuthor = !primary || primary.matchScore < 60;

    // Suggest expertise to add
    const suggestedExpertise: string[] = [];
    if (needsNewAuthor) {
        suggestedExpertise.push(analysis.niche);
        suggestedExpertise.push(...analysis.subtopics.slice(0, 3));
    }

    return {
        primary,
        alternatives,
        needsNewAuthor,
        suggestedExpertise
    };
}

/**
 * Find authors who could cover a topic with additional expertise
 */
export function findPotentialAuthors(
    topic: string,
    siteId?: string
): AuthorMatchResult[] {
    const store = useAuthorStore.getState();
    const analysis = analyzeTopicForMatching(topic);

    // Get all authors for site (or all if no site specified)
    const authors = siteId
        ? store.getAuthorsForSite(siteId)
        : store.authors;

    // Score each author on potential (not current expertise)
    return authors.map(author => {
        let score = 30; // Base potential score
        const reasons: string[] = [];
        const missing: string[] = [];

        // Check for related expertise
        const hasRelatedNiche = author.expertise.some(e => {
            const related = Object.entries(NICHE_MAPPINGS).find(([_, keywords]) =>
                keywords.some(kw => e.niche.toLowerCase().includes(kw))
            );
            return related && NICHE_MAPPINGS[analysis.niche]?.some(kw =>
                related[1].includes(kw)
            );
        });

        if (hasRelatedNiche) {
            score += 20;
            reasons.push('Has related expertise');
        }

        // Check for credentials that could apply
        if (author.credentials.length > 0) {
            score += 10;
            reasons.push('Has transferable credentials');
        }

        // Check article history
        if (author.articlesPublished >= 10) {
            score += 10;
            reasons.push('Experienced content creator');
        }

        missing.push(`Add expertise in: ${analysis.niche}`);
        if (analysis.subtopics.length > 0) {
            missing.push(`Cover topics: ${analysis.subtopics.join(', ')}`);
        }

        return {
            author,
            matchScore: score,
            matchReasons: reasons,
            missingExpertise: missing
        };
    }).sort((a, b) => b.matchScore - a.matchScore);
}

// ============================================================================
// Fallback Strategies
// ============================================================================

/**
 * Get a fallback author when no good match exists
 */
export function getFallbackAuthor(siteId?: string): AuthorProfile | null {
    const store = useAuthorStore.getState();

    // Get authors for site
    const authors = siteId
        ? store.getAuthorsForSite(siteId)
        : store.authors;

    if (authors.length === 0) {
        return null;
    }

    // Prefer verified authors with most articles
    const sorted = [...authors].sort((a, b) => {
        // Verified first
        if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1;
        if (b.verificationStatus === 'verified' && a.verificationStatus !== 'verified') return 1;

        // Then by article count
        return b.articlesPublished - a.articlesPublished;
    });

    return sorted[0];
}

/**
 * Check if a topic is too sensitive for AI-only content
 */
export function requiresHumanExpertise(topic: string): boolean {
    const analysis = analyzeTopicForMatching(topic);
    return analysis.isYMYL;
}
