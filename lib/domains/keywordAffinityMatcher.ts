/**
 * Keyword-Domain Affinity Matcher
 * 
 * Uses SpamZilla metrics and domain characteristics to intelligently
 * match keywords to domains based on affinity scoring.
 * 
 * Scoring factors:
 * - Domain name keyword presence
 * - Majestic Topics relevance  
 * - TF/CF ratio (trust signals)
 * - Domain age (authority)
 * - Quality tier bonus
 * - Niche alignment from SZ data
 */

import type { DomainItem } from './types';
import type { SpamZillaDomain } from './spamzillaParser';

// ============ TYPES ============

export interface AffinityScore {
    domain: string;
    totalScore: number;          // 0-100 overall affinity
    matchedKeywords: string[];   // Which keywords matched
    breakdown: {
        nameMatch: number;       // Domain name contains keyword
        topicMatch: number;      // Majestic topics alignment
        trustSignal: number;     // TF/CF ratio quality
        ageBonus: number;        // Domain age authority
        qualityTier: number;     // Gold/Silver/Bronze bonus
    };
}

export interface AffinityResult {
    matched: AffinityScore[];    // Domains with score > 0
    unmatched: string[];         // Domains with no keyword affinity
    averageScore: number;
}

// ============ NICHE KEYWORD MAPPING ============

const NICHE_KEYWORDS: Record<string, string[]> = {
    finance: ['finance', 'money', 'invest', 'bank', 'loan', 'credit', 'tax', 'crypto', 'trading', 'stock', 'wealth', 'budget', 'debt', 'mortgage'],
    technology: ['tech', 'software', 'app', 'digital', 'code', 'data', 'cloud', 'ai', 'cyber', 'web', 'dev', 'system', 'computing'],
    health: ['health', 'medical', 'fitness', 'diet', 'wellness', 'pharma', 'doctor', 'care', 'therapy', 'nutrition', 'exercise', 'mental'],
    business: ['business', 'company', 'corp', 'enterprise', 'startup', 'marketing', 'sales', 'consulting', 'agency', 'firm', 'commerce'],
    education: ['edu', 'learn', 'school', 'course', 'study', 'training', 'academy', 'university', 'tutor', 'class', 'knowledge'],
    travel: ['travel', 'trip', 'tour', 'hotel', 'flight', 'vacation', 'destination', 'holiday', 'booking', 'adventure'],
    ecommerce: ['shop', 'store', 'buy', 'sell', 'market', 'retail', 'product', 'deal', 'discount', 'cart', 'order'],
    lifestyle: ['life', 'home', 'family', 'fashion', 'beauty', 'style', 'living', 'diy', 'craft', 'hobby'],
    legal: ['law', 'legal', 'attorney', 'lawyer', 'court', 'justice', 'rights', 'contract', 'litigation'],
    gaming: ['game', 'gaming', 'play', 'esport', 'arcade', 'console', 'stream', 'virtual', 'multiplayer'],
};

// ============ SCORING FUNCTIONS ============

/**
 * Calculate name match score (0-30)
 * Checks if domain name contains any keyword or related terms
 */
function calculateNameMatch(domain: string, keywords: string[]): { score: number; matched: string[] } {
    const domainLower = domain.toLowerCase().replace(/[.-]/g, '');
    const matched: string[] = [];
    let score = 0;

    for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase().replace(/\s+/g, '');

        // Direct match: domain contains exact keyword
        if (domainLower.includes(keywordLower)) {
            score += 15;
            matched.push(keyword);
            continue;
        }

        // Partial match: keyword words appear in domain
        const words = keyword.toLowerCase().split(/\s+/);
        for (const word of words) {
            if (word.length > 3 && domainLower.includes(word)) {
                score += 5;
                if (!matched.includes(keyword)) matched.push(keyword);
            }
        }
    }

    return { score: Math.min(score, 30), matched };
}

/**
 * Calculate topic match score (0-25)
 * Matches Majestic Topics against keyword niches
 */
function calculateTopicMatch(majesticTopics: string | undefined, keywords: string[]): number {
    if (!majesticTopics) return 0;

    const topicsLower = majesticTopics.toLowerCase();
    let score = 0;

    // Check each keyword's niche alignment
    for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();

        // Direct topic mention
        if (topicsLower.includes(keywordLower)) {
            score += 10;
            continue;
        }

        // Check niche keyword groups
        for (const [niche, nicheKeywords] of Object.entries(NICHE_KEYWORDS)) {
            const keywordInNiche = nicheKeywords.some(nk => keywordLower.includes(nk));
            const topicInNiche = nicheKeywords.some(nk => topicsLower.includes(nk));

            if (keywordInNiche && topicInNiche) {
                score += 8;
                break;
            }
        }
    }

    return Math.min(score, 25);
}

/**
 * Calculate trust signal score (0-20)
 * Based on TF/CF ratio quality
 */
function calculateTrustSignal(domain: DomainItem | SpamZillaDomain): number {
    const tfCfRatio = domain.tfCfRatio || 0;
    const trustFlow = domain.trustFlow || 0;

    // Excellent ratio (0.6+): 20 points
    if (tfCfRatio >= 0.6 && trustFlow >= 15) return 20;
    // Good ratio (0.4-0.6): 15 points
    if (tfCfRatio >= 0.4 && trustFlow >= 10) return 15;
    // Acceptable ratio (0.3-0.4): 10 points
    if (tfCfRatio >= 0.3 && trustFlow >= 8) return 10;
    // Below threshold
    if (tfCfRatio >= 0.25) return 5;

    return 0;
}

/**
 * Calculate age bonus (0-15)
 * Older domains have more authority
 */
function calculateAgeBonus(age: number | undefined): number {
    if (!age) return 0;

    if (age >= 10) return 15;  // 10+ years: premium authority
    if (age >= 5) return 12;   // 5-10 years: established
    if (age >= 3) return 8;    // 3-5 years: good
    if (age >= 1) return 4;    // 1-3 years: young

    return 0;
}

/**
 * Calculate quality tier bonus (0-10)
 */
function calculateQualityTierBonus(tier: string | undefined): number {
    switch (tier) {
        case 'gold': return 10;
        case 'silver': return 7;
        case 'bronze': return 4;
        default: return 0;
    }
}

// ============ MAIN MATCHER ============

/**
 * Calculate affinity between keywords and a single domain
 */
export function calculateDomainAffinity(
    domain: DomainItem | SpamZillaDomain,
    keywords: string[]
): AffinityScore {
    const nameResult = calculateNameMatch(domain.domain, keywords);

    // Get majestic topics (SpamZillaDomain has it, DomainItem might not)
    const majesticTopics = 'majesticTopics' in domain ? domain.majesticTopics : undefined;

    const breakdown = {
        nameMatch: nameResult.score,
        topicMatch: calculateTopicMatch(majesticTopics, keywords),
        trustSignal: calculateTrustSignal(domain),
        ageBonus: calculateAgeBonus('domainAge' in domain ? domain.domainAge : ('age' in domain ? domain.age : undefined)),
        qualityTier: calculateQualityTierBonus(domain.qualityTier),
    };

    const totalScore = Math.min(
        breakdown.nameMatch +
        breakdown.topicMatch +
        breakdown.trustSignal +
        breakdown.ageBonus +
        breakdown.qualityTier,
        100
    );

    return {
        domain: domain.domain,
        totalScore,
        matchedKeywords: nameResult.matched,
        breakdown,
    };
}

/**
 * Match keywords against a list of domains
 * Returns domains sorted by affinity score
 */
export function matchKeywordsToDomains(
    keywords: string[],
    domains: (DomainItem | SpamZillaDomain)[]
): AffinityResult {
    if (keywords.length === 0 || domains.length === 0) {
        return {
            matched: [],
            unmatched: domains.map(d => d.domain),
            averageScore: 0,
        };
    }

    const scores = domains.map(domain => calculateDomainAffinity(domain, keywords));

    // Separate matched (score > 0) and unmatched
    const matched = scores
        .filter(s => s.totalScore > 0)
        .sort((a, b) => b.totalScore - a.totalScore);

    const unmatched = scores
        .filter(s => s.totalScore === 0)
        .map(s => s.domain);

    const averageScore = matched.length > 0
        ? Math.round(matched.reduce((sum, s) => sum + s.totalScore, 0) / matched.length)
        : 0;

    return { matched, unmatched, averageScore };
}

/**
 * Get top N domains by affinity
 */
export function getTopAffinityDomains(
    keywords: string[],
    domains: (DomainItem | SpamZillaDomain)[],
    limit: number = 10
): AffinityScore[] {
    const result = matchKeywordsToDomains(keywords, domains);
    return result.matched.slice(0, limit);
}

/**
 * Detect likely niche from keyword set
 */
export function detectNicheFromKeywords(keywords: string[]): string | null {
    const nicheScores: Record<string, number> = {};

    for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();

        for (const [niche, nicheKeywords] of Object.entries(NICHE_KEYWORDS)) {
            for (const nk of nicheKeywords) {
                if (keywordLower.includes(nk)) {
                    nicheScores[niche] = (nicheScores[niche] || 0) + 1;
                }
            }
        }
    }

    const topNiche = Object.entries(nicheScores)
        .sort((a, b) => b[1] - a[1])[0];

    return topNiche ? topNiche[0] : null;
}
