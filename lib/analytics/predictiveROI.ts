/**
 * Predictive ROI Model
 * FSD: lib/analytics/predictiveROI.ts
 *
 * Statistical model for predicting content ROI before publishing.
 * Uses historical data patterns without AI API calls.
 */

// ============================================================================
// Types
// ============================================================================

export interface ContentAttributes {
    topic: string;
    niche: string;
    wordCount: number;
    hasImages: boolean;
    hasFAQ: boolean;
    hasSchema: boolean;
    includesAffiliateLinks: boolean;
    template: string;
    publishHour?: number;    // 0-23
    publishDayOfWeek?: number; // 0-6 (Sunday = 0)
}

export interface ROIPrediction {
    expectedRevenue: {
        day30: number;
        day90: number;
        day365: number;
    };
    expectedPageViews: {
        day30: number;
        day90: number;
        day365: number;
    };
    expectedRPM: number;
    confidenceScore: number;  // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    factors: PredictionFactor[];
    recommendations: string[];
}

export interface PredictionFactor {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
}

interface HistoricalRecord {
    topic: string;
    niche: string;
    wordCount: number;
    pageViews: number;
    revenue: number;
    rpm: number;
    daysLive: number;
}

// ============================================================================
// Historical Data Storage
// ============================================================================

const HISTORY_KEY = 'ifrit_content_performance_history';

function getHistoricalData(): HistoricalRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem(HISTORY_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

export function recordContentPerformance(record: HistoricalRecord): void {
    if (typeof window === 'undefined') return;
    try {
        const history = getHistoricalData();
        history.push(record);
        // Keep last 500 records
        const trimmed = history.slice(-500);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
        console.error('[Predictive ROI] Failed to save record');
    }
}

// ============================================================================
// Niche Benchmarks
// ============================================================================

const NICHE_BENCHMARKS: Record<string, { avgRPM: number; avgPageViews30: number; growthRate: number }> = {
    'technology': { avgRPM: 4.5, avgPageViews30: 800, growthRate: 1.2 },
    'finance': { avgRPM: 12.0, avgPageViews30: 500, growthRate: 1.1 },
    'health': { avgRPM: 6.0, avgPageViews30: 1200, growthRate: 1.0 },
    'travel': { avgRPM: 3.5, avgPageViews30: 600, growthRate: 0.9 },
    'food': { avgRPM: 3.0, avgPageViews30: 1500, growthRate: 1.1 },
    'lifestyle': { avgRPM: 2.5, avgPageViews30: 900, growthRate: 1.0 },
    'business': { avgRPM: 8.0, avgPageViews30: 400, growthRate: 1.05 },
    'education': { avgRPM: 5.0, avgPageViews30: 700, growthRate: 1.15 },
    'gaming': { avgRPM: 3.0, avgPageViews30: 2000, growthRate: 0.95 },
    'crypto': { avgRPM: 15.0, avgPageViews30: 350, growthRate: 0.85 },
    'default': { avgRPM: 4.0, avgPageViews30: 600, growthRate: 1.0 },
};

function getNicheBenchmark(niche: string) {
    const normalized = niche.toLowerCase().replace(/[^a-z]/g, '');
    return NICHE_BENCHMARKS[normalized] || NICHE_BENCHMARKS['default'];
}

// ============================================================================
// Prediction Engine
// ============================================================================

const WORD_COUNT_FACTORS: { min: number; max: number; factor: number }[] = [
    { min: 0, max: 500, factor: 0.6 },      // Too short
    { min: 500, max: 1000, factor: 0.85 },  // Short
    { min: 1000, max: 1500, factor: 1.0 },  // Good
    { min: 1500, max: 2500, factor: 1.15 }, // Optimal
    { min: 2500, max: 4000, factor: 1.1 },  // Long
    { min: 4000, max: Infinity, factor: 0.95 }, // Very long
];

function getWordCountFactor(wordCount: number): number {
    const match = WORD_COUNT_FACTORS.find(
        f => wordCount >= f.min && wordCount < f.max
    );
    return match?.factor ?? 1.0;
}

const PUBLISH_HOUR_FACTORS: number[] = [
    0.7, 0.6, 0.5, 0.5, 0.5, 0.6,  // 0-5 AM (low)
    0.8, 0.9, 1.0, 1.1, 1.1, 1.0,  // 6-11 AM (rising)
    0.95, 0.9, 0.95, 1.0, 1.0, 0.95, // 12-5 PM (midday)
    0.9, 0.85, 0.8, 0.75, 0.7, 0.7, // 6-11 PM (evening)
];

/**
 * Predict ROI for content before publishing.
 */
export function predictContentROI(attributes: ContentAttributes): ROIPrediction {
    const factors: PredictionFactor[] = [];
    let multiplier = 1.0;
    const benchmark = getNicheBenchmark(attributes.niche);

    // 1. Niche factor
    const nicheRPM = benchmark.avgRPM;
    factors.push({
        name: 'Niche',
        impact: nicheRPM >= 6 ? 'positive' : nicheRPM >= 3 ? 'neutral' : 'negative',
        weight: nicheRPM / 5,
        description: `${attributes.niche} niche has $${nicheRPM.toFixed(2)} avg RPM`,
    });

    // 2. Word count factor
    const wordFactor = getWordCountFactor(attributes.wordCount);
    multiplier *= wordFactor;
    factors.push({
        name: 'Word Count',
        impact: wordFactor >= 1.0 ? 'positive' : 'negative',
        weight: wordFactor,
        description: `${attributes.wordCount} words (${wordFactor >= 1.0 ? 'good' : 'could be longer'})`,
    });

    // 3. Images factor
    if (attributes.hasImages) {
        multiplier *= 1.15;
        factors.push({
            name: 'Images',
            impact: 'positive',
            weight: 1.15,
            description: 'Has images - increases engagement 15%',
        });
    } else {
        multiplier *= 0.85;
        factors.push({
            name: 'No Images',
            impact: 'negative',
            weight: 0.85,
            description: 'Missing images - reduces engagement',
        });
    }

    // 4. FAQ factor
    if (attributes.hasFAQ) {
        multiplier *= 1.12;
        factors.push({
            name: 'FAQ Section',
            impact: 'positive',
            weight: 1.12,
            description: 'FAQ improves AI Overview citability',
        });
    }

    // 5. Schema factor
    if (attributes.hasSchema) {
        multiplier *= 1.08;
        factors.push({
            name: 'Schema Markup',
            impact: 'positive',
            weight: 1.08,
            description: 'Schema helps with rich snippets',
        });
    }

    // 6. Affiliate links factor (higher revenue but lower traffic)
    if (attributes.includesAffiliateLinks) {
        multiplier *= 1.3; // More revenue per view
        factors.push({
            name: 'Affiliate Links',
            impact: 'positive',
            weight: 1.3,
            description: 'Affiliate links add 30% revenue potential',
        });
    }

    // 7. Publish time factor
    if (attributes.publishHour !== undefined) {
        const hourFactor = PUBLISH_HOUR_FACTORS[attributes.publishHour] ?? 1.0;
        multiplier *= hourFactor;
        const isGoodTime = hourFactor >= 0.95;
        factors.push({
            name: 'Publish Time',
            impact: isGoodTime ? 'positive' : 'negative',
            weight: hourFactor,
            description: `${attributes.publishHour}:00 ${isGoodTime ? 'is good timing' : 'may limit initial reach'}`,
        });
    }

    // Calculate predictions
    const basePageViews30 = benchmark.avgPageViews30 * multiplier;
    const baseRPM = nicheRPM * (multiplier > 1 ? 1 + (multiplier - 1) * 0.3 : 1);

    const expectedPageViews = {
        day30: Math.round(basePageViews30),
        day90: Math.round(basePageViews30 * 2.2 * benchmark.growthRate),
        day365: Math.round(basePageViews30 * 6 * Math.pow(benchmark.growthRate, 3)),
    };

    const expectedRevenue = {
        day30: expectedPageViews.day30 * baseRPM / 1000,
        day90: expectedPageViews.day90 * baseRPM / 1000,
        day365: expectedPageViews.day365 * baseRPM / 1000,
    };

    // Confidence score based on factors
    const positiveFactors = factors.filter(f => f.impact === 'positive').length;
    const totalFactors = factors.length;
    const confidence = Math.min(95, 40 + (positiveFactors / totalFactors) * 55);

    // Risk level
    const riskLevel = multiplier < 0.8 ? 'high' : multiplier < 1.0 ? 'medium' : 'low';

    // Generate recommendations
    const recommendations: string[] = [];
    if (!attributes.hasImages) {
        recommendations.push('Add high-quality images to increase engagement');
    }
    if (!attributes.hasFAQ) {
        recommendations.push('Add FAQ section for better AI Overview visibility');
    }
    if (!attributes.hasSchema) {
        recommendations.push('Add schema markup for rich search results');
    }
    if (attributes.wordCount < 1500) {
        recommendations.push(`Increase word count to 1500+ (currently ${attributes.wordCount})`);
    }
    if (nicheRPM >= 8) {
        recommendations.push('High-RPM niche - prioritize quality over quantity');
    }

    return {
        expectedRevenue: {
            day30: Math.round(expectedRevenue.day30 * 100) / 100,
            day90: Math.round(expectedRevenue.day90 * 100) / 100,
            day365: Math.round(expectedRevenue.day365 * 100) / 100,
        },
        expectedPageViews,
        expectedRPM: Math.round(baseRPM * 100) / 100,
        confidenceScore: Math.round(confidence),
        riskLevel,
        factors,
        recommendations: recommendations.slice(0, 3),
    };
}

// ============================================================================
// Quick Check
// ============================================================================

/**
 * Quick viability check for a topic/niche combo.
 */
export function quickROICheck(niche: string, wordCount: number): {
    viable: boolean;
    expectedRPM: number;
    recommendation: string;
} {
    const benchmark = getNicheBenchmark(niche);
    const wordFactor = getWordCountFactor(wordCount);

    const adjustedRPM = benchmark.avgRPM * wordFactor;
    const viable = adjustedRPM >= 3 && wordCount >= 800;

    return {
        viable,
        expectedRPM: Math.round(adjustedRPM * 100) / 100,
        recommendation: viable
            ? `Good potential: ~$${adjustedRPM.toFixed(2)} RPM expected`
            : wordCount < 800
                ? 'Increase word count to 800+ for viability'
                : 'Consider higher-RPM niche for better returns',
    };
}

// ============================================================================
// Export
// ============================================================================

export default {
    predictContentROI,
    quickROICheck,
    recordContentPerformance,
};
