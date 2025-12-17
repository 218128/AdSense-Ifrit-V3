/**
 * Advanced Trend Scoring System
 * 
 * Scores trends based on multiple factors for maximum monetization potential.
 */

import { analyzeCPC, CPCAnalysis } from './cpcIntelligence';

export interface TrendScore {
    keyword: string;
    searchVolume: number;       // 1-100 normalized
    cpcPotential: number;       // 1-100 based on niche
    competitionScore: number;   // 1-100 (lower is better for us)
    intentScore: number;        // 1-100 (commercial = higher)
    freshness: number;          // 1-100 (newer = higher)
    overallScore: number;       // Weighted composite
    cpcAnalysis: CPCAnalysis;
    recommendation: string;
}

export interface ScoringWeights {
    cpcPotential: number;
    intentScore: number;
    searchVolume: number;
    competitionScore: number;
    freshness: number;
}

/**
 * Default weights optimized for maximum monetization
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
    cpcPotential: 0.35,      // Most important - revenue potential
    intentScore: 0.25,        // Commercial intent matters
    searchVolume: 0.20,       // Need traffic too
    competitionScore: 0.15,   // Lower competition is better
    freshness: 0.05           // Some preference for trending
};

/**
 * Alternative weights for different strategies
 */
export const TRAFFIC_FOCUSED_WEIGHTS: ScoringWeights = {
    cpcPotential: 0.20,
    intentScore: 0.15,
    searchVolume: 0.40,
    competitionScore: 0.20,
    freshness: 0.05
};

export const QUICK_WIN_WEIGHTS: ScoringWeights = {
    cpcPotential: 0.25,
    intentScore: 0.20,
    searchVolume: 0.15,
    competitionScore: 0.35,   // Focus on low competition
    freshness: 0.05
};

/**
 * Score a single trend/keyword
 */
export function scoreTrend(
    keyword: string,
    searchVolume: number = 50,  // Default to medium if unknown
    freshness: number = 50,
    weights: ScoringWeights = DEFAULT_WEIGHTS
): TrendScore {
    // Get CPC analysis
    const cpcAnalysis = analyzeCPC(keyword);

    // Calculate individual scores
    const cpcPotential = cpcAnalysis.score;
    const intentScore = calculateIntentScore(keyword, cpcAnalysis);
    const competitionScore = calculateCompetitionScore(cpcAnalysis);

    // Calculate weighted overall score
    const overallScore = Math.round(
        (cpcPotential * weights.cpcPotential) +
        (intentScore * weights.intentScore) +
        (searchVolume * weights.searchVolume) +
        (competitionScore * weights.competitionScore) +
        (freshness * weights.freshness)
    );

    return {
        keyword,
        searchVolume,
        cpcPotential,
        competitionScore,
        intentScore,
        freshness,
        overallScore,
        cpcAnalysis,
        recommendation: generateTrendRecommendation(overallScore, cpcAnalysis)
    };
}

/**
 * Score and rank multiple trends
 */
export function rankTrends(
    keywords: string[],
    weights: ScoringWeights = DEFAULT_WEIGHTS
): TrendScore[] {
    const scores = keywords.map(keyword => scoreTrend(keyword, 50, 70, weights));
    return scores.sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Filter trends to only high-CPC opportunities
 */
export function filterHighCPCTrends(
    keywords: string[],
    minScore: number = 60
): TrendScore[] {
    const ranked = rankTrends(keywords);
    return ranked.filter(t => t.cpcPotential >= minScore);
}

/**
 * Calculate intent score based on keyword patterns
 */
function calculateIntentScore(keyword: string, cpcAnalysis: CPCAnalysis): number {
    const keywordLower = keyword.toLowerCase();
    let score = 30; // Base informational score

    // Check primary classification intent
    if (cpcAnalysis.classifications.length > 0) {
        const intent = cpcAnalysis.classifications[0].intent;
        switch (intent) {
            case 'transactional':
                score = 90;
                break;
            case 'commercial':
                score = 75;
                break;
            case 'navigational':
                score = 40;
                break;
            case 'informational':
                score = 30;
                break;
        }
    }

    // Boost for specific commercial patterns
    const commercialPatterns = [
        { pattern: 'best', boost: 15 },
        { pattern: 'top 10', boost: 15 },
        { pattern: 'review', boost: 20 },
        { pattern: 'vs', boost: 20 },
        { pattern: 'alternative', boost: 15 },
        { pattern: 'comparison', boost: 20 },
        { pattern: 'pricing', boost: 25 },
        { pattern: 'cost', boost: 20 },
        { pattern: 'buy', boost: 30 },
        { pattern: 'for business', boost: 15 }
    ];

    for (const { pattern, boost } of commercialPatterns) {
        if (keywordLower.includes(pattern)) {
            score = Math.min(100, score + boost);
            break; // Only apply one boost
        }
    }

    return score;
}

/**
 * Calculate competition score (inverted - lower competition = higher score)
 */
function calculateCompetitionScore(cpcAnalysis: CPCAnalysis): number {
    if (cpcAnalysis.classifications.length === 0) {
        return 70; // Unknown = assume medium competition
    }

    const competition = cpcAnalysis.classifications[0].competitionLevel;
    switch (competition) {
        case 'very_high':
            return 20;
        case 'high':
            return 40;
        case 'medium':
            return 65;
        case 'low':
            return 90;
        default:
            return 50;
    }
}

/**
 * Generate recommendation based on trend score
 */
function generateTrendRecommendation(score: number, cpcAnalysis: CPCAnalysis): string {
    if (score >= 80) {
        return `🔥 TOP PRIORITY: High revenue potential in ${cpcAnalysis.primaryNiche}. Create content immediately.`;
    } else if (score >= 65) {
        return `✅ RECOMMENDED: Good balance of traffic and revenue. Strong candidate for content.`;
    } else if (score >= 50) {
        return `⚡ CONSIDER: Decent potential. May need optimization or commercial intent modifiers.`;
    } else if (score >= 35) {
        return `📝 OPTIONAL: Lower priority. Good for building topical authority.`;
    } else {
        return `⏸️ SKIP: Low monetization potential. Focus on higher-scoring opportunities.`;
    }
}

/**
 * Get the best keywords from a list for monetization
 */
export function getBestKeywordsForMonetization(
    keywords: string[],
    count: number = 5
): TrendScore[] {
    const ranked = rankTrends(keywords, DEFAULT_WEIGHTS);
    return ranked.slice(0, count);
}

/**
 * Enhance keywords with commercial intent modifiers
 */
export function enhanceKeywordForCPC(keyword: string): string[] {
    const enhanced: string[] = [];
    const year = new Date().getFullYear();

    enhanced.push(`best ${keyword} ${year}`);
    enhanced.push(`${keyword} review`);
    enhanced.push(`top ${keyword} alternatives`);
    enhanced.push(`${keyword} vs [competitor]`);
    enhanced.push(`${keyword} pricing comparison`);

    return enhanced;
}
