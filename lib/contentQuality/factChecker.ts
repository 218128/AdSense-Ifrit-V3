/**
 * Google Fact Check API Client
 * FSD: lib/contentQuality/factChecker.ts
 * 
 * Integration with Google Fact Check Tools API for claim verification.
 * Free tier available, enhances E-E-A-T trustworthiness scoring.
 * 
 * API Docs: https://developers.google.com/fact-check/tools/api
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Fact check claim rating
 */
export interface ClaimRating {
    textualRating: string;               // "True", "Mostly True", "False", etc.
    ratingValue?: number;                // Numeric rating if available (0-1)
    worstRating?: number;
    bestRating?: number;
    ratingExplanation?: string;
}

/**
 * Publisher of a fact check
 */
export interface ClaimReviewPublisher {
    name: string;
    site: string;
}

/**
 * Single fact check result
 */
export interface ClaimReview {
    publisher: ClaimReviewPublisher;
    url: string;                         // URL to full fact check article
    title: string;
    reviewDate: string;
    textualRating: string;
    languageCode: string;
}

/**
 * Claim found in fact-check database
 */
export interface FactCheckClaim {
    text: string;                        // The claim text
    claimant?: string;                   // Who made the claim
    claimDate?: string;
    claimReview: ClaimReview[];          // Fact-check reviews for this claim
}

/**
 * Full fact check search result
 */
export interface FactCheckSearchResult {
    claims: FactCheckClaim[];
    nextPageToken?: string;
}

/**
 * Extracted claim from content
 */
export interface ExtractedClaim {
    text: string;
    confidence: number;                  // How confident this is a verifiable claim
    category: 'statistic' | 'quote' | 'fact' | 'claim' | 'finding';
    source?: string;                     // Source mentioned with claim
}

/**
 * Fact check result for content
 */
export interface ContentFactCheckResult {
    overallScore: number;                // 0-100
    claimsChecked: number;
    claimsVerified: number;
    claimsDisputed: number;
    claimsUnverified: number;

    details: Array<{
        claim: ExtractedClaim;
        factCheckResult: FactCheckClaim | null;
        status: 'verified' | 'disputed' | 'unverified' | 'no_data';
        confidence: number;
    }>;

    recommendations: string[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get API key from settings store
 */
function getFactCheckApiKey(): string | null {
    // Try to get from environment or settings
    if (typeof window === 'undefined') {
        return process.env.GOOGLE_FACT_CHECK_API_KEY || null;
    }

    // Client-side: would need to get from settings store
    try {
        const stored = localStorage.getItem('ifrit-settings');
        if (stored) {
            const settings = JSON.parse(stored);
            return settings.state?.factCheckApiKey || null;
        }
    } catch (e) {
        // Ignore parse errors
    }

    return null;
}

const FACT_CHECK_API_BASE = 'https://factchecktools.googleapis.com/v1alpha1';

// ============================================================================
// Claim Extraction
// ============================================================================

/**
 * Patterns that indicate verifiable claims
 */
const CLAIM_PATTERNS = [
    // Statistics
    { pattern: /(\d+(?:\.\d+)?%?\s+(?:of|percent|people|users|studies|experts))/gi, category: 'statistic' as const },
    { pattern: /(according to\s+(?:a\s+)?(?:study|research|survey|report|data))/gi, category: 'finding' as const },
    { pattern: /(research shows|studies show|data shows|evidence suggests)/gi, category: 'finding' as const },

    // Quotes and attributions
    { pattern: /("[^"]{20,200}")/g, category: 'quote' as const },
    { pattern: /(said|stated|claimed|reported)\s+that/gi, category: 'quote' as const },

    // Facts and claims
    { pattern: /(it is (?:a )?fact that|the fact is|factually)/gi, category: 'fact' as const },
    { pattern: /(has been proven|scientifically proven|medically proven)/gi, category: 'claim' as const },
    { pattern: /(causes?|prevents?|cures?|treats?)\s+\w+/gi, category: 'claim' as const },
];

/**
 * Extract verifiable claims from content
 */
export function extractClaims(html: string): ExtractedClaim[] {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const claims: ExtractedClaim[] = [];

    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        for (const { pattern, category } of CLAIM_PATTERNS) {
            if (pattern.test(trimmed)) {
                // Avoid duplicates
                if (!claims.some(c => c.text === trimmed)) {
                    claims.push({
                        text: trimmed.substring(0, 300),
                        confidence: 0.7,
                        category,
                    });
                }
                break;
            }
        }
    }

    // Sort by confidence and limit
    return claims
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10); // Max 10 claims to check
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search Google Fact Check API for a claim
 */
export async function searchFactChecks(
    query: string,
    options?: { languageCode?: string; maxResults?: number }
): Promise<FactCheckSearchResult> {
    const apiKey = getFactCheckApiKey();

    if (!apiKey) {
        console.warn('Fact Check API key not configured');
        return { claims: [] };
    }

    const params = new URLSearchParams({
        key: apiKey,
        query: query.substring(0, 500), // API limit
        languageCode: options?.languageCode || 'en',
    });

    if (options?.maxResults) {
        params.set('pageSize', options.maxResults.toString());
    }

    try {
        const response = await fetch(
            `${FACT_CHECK_API_BASE}/claims:search?${params.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            if (response.status === 403) {
                console.error('Fact Check API: Invalid or quota exceeded');
            }
            return { claims: [] };
        }

        const data = await response.json();
        return {
            claims: data.claims || [],
            nextPageToken: data.nextPageToken,
        };
    } catch (error) {
        console.error('Fact Check API error:', error);
        return { claims: [] };
    }
}

/**
 * Check a single claim against fact-check database
 */
export async function checkClaim(claimText: string): Promise<{
    found: boolean;
    reviews: ClaimReview[];
    rating: string | null;
}> {
    const result = await searchFactChecks(claimText, { maxResults: 3 });

    if (result.claims.length === 0) {
        return { found: false, reviews: [], rating: null };
    }

    // Get the most relevant claim
    const bestMatch = result.claims[0];
    const reviews = bestMatch.claimReview || [];

    // Aggregate rating
    let rating: string | null = null;
    if (reviews.length > 0) {
        // Use the most common rating
        const ratings = reviews.map(r => r.textualRating.toLowerCase());
        const counts = ratings.reduce((acc, r) => {
            acc[r] = (acc[r] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        rating = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    return { found: true, reviews, rating };
}

// ============================================================================
// Content Fact Checking
// ============================================================================

/**
 * Fact check all verifiable claims in content
 */
export async function factCheckContent(html: string): Promise<ContentFactCheckResult> {
    const claims = extractClaims(html);
    const details: ContentFactCheckResult['details'] = [];
    const recommendations: string[] = [];

    let verified = 0;
    let disputed = 0;
    let unverified = 0;

    // Check each claim
    for (const claim of claims) {
        try {
            const result = await searchFactChecks(claim.text, { maxResults: 2 });

            if (result.claims.length > 0) {
                const bestMatch = result.claims[0];
                const reviews = bestMatch.claimReview || [];

                // Determine status based on ratings
                let status: 'verified' | 'disputed' = 'verified';
                for (const review of reviews) {
                    const rating = review.textualRating.toLowerCase();
                    if (rating.includes('false') ||
                        rating.includes('misleading') ||
                        rating.includes('incorrect')) {
                        status = 'disputed';
                        break;
                    }
                }

                if (status === 'verified') verified++;
                else disputed++;

                details.push({
                    claim,
                    factCheckResult: bestMatch,
                    status,
                    confidence: 0.85,
                });
            } else {
                unverified++;
                details.push({
                    claim,
                    factCheckResult: null,
                    status: 'unverified',
                    confidence: 0.5,
                });
            }
        } catch (error) {
            unverified++;
            details.push({
                claim,
                factCheckResult: null,
                status: 'no_data',
                confidence: 0,
            });
        }
    }

    // Calculate overall score
    const total = claims.length;
    let overallScore = 100; // Start perfect

    if (total > 0) {
        // Each disputed claim reduces score significantly
        overallScore -= disputed * 20;
        // Each unverified claim reduces score slightly
        overallScore -= unverified * 5;
        overallScore = Math.max(0, Math.min(100, overallScore));
    }

    // Generate recommendations
    if (disputed > 0) {
        recommendations.push(`Review ${disputed} disputed claim(s) for accuracy`);
    }
    if (unverified > claims.length * 0.5) {
        recommendations.push('Add more authoritative sources to verify claims');
    }
    if (claims.length === 0) {
        recommendations.push('Content has few verifiable claims - consider adding data/studies');
    }

    return {
        overallScore: Math.round(overallScore),
        claimsChecked: total,
        claimsVerified: verified,
        claimsDisputed: disputed,
        claimsUnverified: unverified,
        details,
        recommendations,
    };
}

/**
 * Quick fact check score (without API calls, based on structure)
 */
export function quickFactCheckScore(html: string): {
    score: number;
    claimDensity: number;
    hasAttributions: boolean;
} {
    const claims = extractClaims(html);
    const text = html.replace(/<[^>]+>/g, ' ');
    const wordCount = text.split(/\s+/).length;

    const claimDensity = wordCount > 0 ? (claims.length / wordCount) * 1000 : 0;

    // Check for attributions
    const hasAttributions = /according to|source:|cited from|research by/i.test(text);

    // Score based on structure
    let score = 70; // Base
    if (hasAttributions) score += 15;
    if (claimDensity >= 2 && claimDensity <= 10) score += 15; // Good density
    if (claimDensity > 15) score -= 10; // Too many unverified claims

    return {
        score: Math.min(100, Math.max(0, score)),
        claimDensity,
        hasAttributions,
    };
}
