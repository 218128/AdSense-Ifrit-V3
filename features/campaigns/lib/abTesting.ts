/**
 * A/B Testing for Content
 * FSD: features/campaigns/lib/abTesting.ts
 * 
 * Test different titles/excerpts and track performance.
 */

// ============================================================================
// Types
// ============================================================================

export interface ABTest {
    id: string;
    name: string;
    postId: number;
    siteId: string;
    variants: ABVariant[];
    status: 'running' | 'completed' | 'paused';
    startedAt: number;
    completedAt?: number;
    winnerId?: string;
}

export interface ABVariant {
    id: string;
    type: 'title' | 'excerpt' | 'cta';
    content: string;
    impressions: number;
    clicks: number;
    conversions: number;
}

export interface ABResult {
    testId: string;
    winnerId: string;
    winnerContent: string;
    confidence: number;
    improvement: number;
    recommendation: string;
}

// ============================================================================
// A/B Test Management
// ============================================================================

/**
 * Create a new A/B test
 */
export function createABTest(
    name: string,
    postId: number,
    siteId: string,
    variants: Omit<ABVariant, 'impressions' | 'clicks' | 'conversions'>[]
): ABTest {
    return {
        id: `ab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        postId,
        siteId,
        variants: variants.map(v => ({
            ...v,
            impressions: 0,
            clicks: 0,
            conversions: 0,
        })),
        status: 'running',
        startedAt: Date.now(),
    };
}

/**
 * Record an impression for a variant
 */
export function recordImpression(test: ABTest, variantId: string): ABTest {
    return {
        ...test,
        variants: test.variants.map(v =>
            v.id === variantId
                ? { ...v, impressions: v.impressions + 1 }
                : v
        ),
    };
}

/**
 * Record a click for a variant
 */
export function recordClick(test: ABTest, variantId: string): ABTest {
    return {
        ...test,
        variants: test.variants.map(v =>
            v.id === variantId
                ? { ...v, clicks: v.clicks + 1 }
                : v
        ),
    };
}

/**
 * Record a conversion for a variant
 */
export function recordConversion(test: ABTest, variantId: string): ABTest {
    return {
        ...test,
        variants: test.variants.map(v =>
            v.id === variantId
                ? { ...v, conversions: v.conversions + 1 }
                : v
        ),
    };
}

// ============================================================================
// Statistical Analysis
// ============================================================================

/**
 * Calculate click-through rate
 */
export function calculateCTR(variant: ABVariant): number {
    if (variant.impressions === 0) return 0;
    return (variant.clicks / variant.impressions) * 100;
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(variant: ABVariant): number {
    if (variant.clicks === 0) return 0;
    return (variant.conversions / variant.clicks) * 100;
}

/**
 * Determine test winner with statistical significance
 */
export function determineWinner(test: ABTest): ABResult | null {
    if (test.variants.length < 2) return null;

    // Calculate CTR for each variant
    const variantStats = test.variants.map(v => ({
        variant: v,
        ctr: calculateCTR(v),
        convRate: calculateConversionRate(v),
    }));

    // Sort by CTR
    variantStats.sort((a, b) => b.ctr - a.ctr);

    const winner = variantStats[0];
    const runnerUp = variantStats[1];

    // Check if we have enough data
    const minImpressions = 100;
    if (winner.variant.impressions < minImpressions) {
        return null; // Not enough data
    }

    // Calculate confidence using simplified z-test
    const confidence = calculateConfidence(winner.variant, runnerUp.variant);

    if (confidence < 0.95) {
        return null; // Not statistically significant
    }

    const improvement = runnerUp.ctr > 0
        ? ((winner.ctr - runnerUp.ctr) / runnerUp.ctr) * 100
        : 0;

    return {
        testId: test.id,
        winnerId: winner.variant.id,
        winnerContent: winner.variant.content,
        confidence: Math.round(confidence * 100),
        improvement: Math.round(improvement),
        recommendation: `Use "${winner.variant.content.slice(0, 50)}..." - ${Math.round(improvement)}% better CTR`,
    };
}

/**
 * Simplified confidence calculation
 */
function calculateConfidence(winner: ABVariant, loser: ABVariant): number {
    const p1 = winner.clicks / winner.impressions;
    const p2 = loser.clicks / loser.impressions;
    const n1 = winner.impressions;
    const n2 = loser.impressions;

    // Pooled standard error
    const pooledP = (winner.clicks + loser.clicks) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    if (se === 0) return 0;

    // Z-score
    const z = Math.abs(p1 - p2) / se;

    // Approximate confidence from z-score
    if (z >= 2.58) return 0.99;
    if (z >= 1.96) return 0.95;
    if (z >= 1.64) return 0.90;
    return z / 2.58 * 0.90;
}

// ============================================================================
// Title Variations
// ============================================================================

/**
 * Generate title variations for A/B testing
 */
export function generateTitleVariations(baseTitle: string): string[] {
    const variations: string[] = [baseTitle];

    // Add number prefix
    if (!baseTitle.match(/^\d+/)) {
        variations.push(`7 ${baseTitle}`);
        variations.push(`10 ${baseTitle}`);
    }

    // Add "How to" if not present
    if (!baseTitle.toLowerCase().startsWith('how to')) {
        variations.push(`How to ${baseTitle}`);
    }

    // Add urgency
    variations.push(`${baseTitle} [2024 Guide]`);
    variations.push(`${baseTitle} (Updated)`);

    // Add question format
    if (!baseTitle.includes('?')) {
        variations.push(`What is ${baseTitle}?`);
    }

    return variations.slice(0, 5); // Max 5 variations
}
