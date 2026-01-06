/**
 * CPM Modeler
 * FSD: lib/monetization/cpmModeler.ts
 * 
 * Predictive CPM modeling based on niche, seasonality,
 * traffic sources, and historical data.
 */

import type {
    NicheCPMData,
    CPMPredictionRequest,
    CPMPrediction,
    DEFAULT_NICHE_CPM,
    DEFAULT_SEASONAL_FACTORS,
} from './types';

// ============================================================================
// Default CPM Data
// ============================================================================

const NICHE_CPM_DATA: Record<string, NicheCPMData> = {
    'technology': {
        niche: 'technology',
        avgCPM: 350,
        minCPM: 200,
        maxCPM: 600,
        sampleSize: 1000,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 0.85, q2: 0.95, q3: 1.0, q4: 1.2 },
        bySource: { organic: 1.2, social: 0.7, direct: 1.0, referral: 0.9 },
    },
    'personal finance': {
        niche: 'personal finance',
        avgCPM: 500,
        minCPM: 300,
        maxCPM: 800,
        sampleSize: 800,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 1.1, q2: 0.9, q3: 0.9, q4: 1.1 }, // Tax season Q1
        bySource: { organic: 1.3, social: 0.6, direct: 1.0, referral: 1.1 },
    },
    'health': {
        niche: 'health',
        avgCPM: 400,
        minCPM: 250,
        maxCPM: 700,
        sampleSize: 900,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 1.2, q2: 0.9, q3: 0.85, q4: 0.95 }, // New Year's resolutions
        bySource: { organic: 1.25, social: 0.8, direct: 1.0, referral: 0.95 },
    },
    'insurance': {
        niche: 'insurance',
        avgCPM: 1200,
        minCPM: 800,
        maxCPM: 2000,
        sampleSize: 500,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 0.9, q2: 1.0, q3: 1.0, q4: 1.1 },
        bySource: { organic: 1.4, social: 0.5, direct: 1.1, referral: 1.2 },
    },
    'legal': {
        niche: 'legal',
        avgCPM: 800,
        minCPM: 500,
        maxCPM: 1500,
        sampleSize: 400,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 0.95, q2: 1.0, q3: 1.0, q4: 1.05 },
        bySource: { organic: 1.35, social: 0.4, direct: 1.1, referral: 1.15 },
    },
    'travel': {
        niche: 'travel',
        avgCPM: 300,
        minCPM: 150,
        maxCPM: 500,
        sampleSize: 750,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 0.7, q2: 1.1, q3: 1.2, q4: 1.0 }, // Summer peak
        bySource: { organic: 1.15, social: 0.9, direct: 1.0, referral: 0.85 },
    },
    'food': {
        niche: 'food',
        avgCPM: 250,
        minCPM: 150,
        maxCPM: 400,
        sampleSize: 850,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 0.9, q2: 0.95, q3: 1.0, q4: 1.15 }, // Holiday recipes
        bySource: { organic: 1.1, social: 1.1, direct: 1.0, referral: 0.85 },
    },
    'lifestyle': {
        niche: 'lifestyle',
        avgCPM: 200,
        minCPM: 100,
        maxCPM: 350,
        sampleSize: 1200,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 0.85, q2: 0.95, q3: 1.0, q4: 1.2 },
        bySource: { organic: 1.0, social: 1.1, direct: 1.0, referral: 0.9 },
    },
    'gaming': {
        niche: 'gaming',
        avgCPM: 280,
        minCPM: 150,
        maxCPM: 450,
        sampleSize: 700,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 0.8, q2: 0.9, q3: 1.0, q4: 1.3 }, // Holiday releases
        bySource: { organic: 1.05, social: 1.0, direct: 1.1, referral: 0.95 },
    },
    'education': {
        niche: 'education',
        avgCPM: 350,
        minCPM: 200,
        maxCPM: 550,
        sampleSize: 600,
        lastUpdated: Date.now(),
        seasonalFactors: { q1: 1.0, q2: 0.85, q3: 1.15, q4: 1.0 }, // Back to school
        bySource: { organic: 1.25, social: 0.8, direct: 1.0, referral: 1.1 },
    },
};

// ============================================================================
// CPM Prediction
// ============================================================================

/**
 * Find best matching niche for a topic
 */
function findMatchingNiche(topic: string): string {
    const topicLower = topic.toLowerCase();

    // Direct match
    if (NICHE_CPM_DATA[topicLower]) {
        return topicLower;
    }

    // Keyword mapping
    const nicheKeywords: Record<string, string[]> = {
        'technology': ['tech', 'software', 'programming', 'ai', 'computer', 'app', 'digital'],
        'personal finance': ['money', 'invest', 'budget', 'savings', 'retirement', 'credit'],
        'health': ['fitness', 'nutrition', 'wellness', 'diet', 'medical', 'exercise', 'weight'],
        'insurance': ['car insurance', 'life insurance', 'health insurance', 'policy'],
        'legal': ['lawyer', 'attorney', 'law', 'lawsuit', 'court', 'legal'],
        'travel': ['vacation', 'trip', 'destination', 'hotel', 'flight', 'tourism'],
        'food': ['recipe', 'cooking', 'restaurant', 'meal', 'cuisine', 'baking'],
        'lifestyle': ['home', 'fashion', 'beauty', 'relationship', 'productivity'],
        'gaming': ['games', 'video game', 'esports', 'console', 'pc gaming'],
        'education': ['learning', 'course', 'study', 'school', 'university', 'training'],
    };

    for (const [niche, keywords] of Object.entries(nicheKeywords)) {
        if (keywords.some(kw => topicLower.includes(kw))) {
            return niche;
        }
    }

    return 'lifestyle'; // Default fallback
}

/**
 * Get current quarter (1-4)
 */
function getCurrentQuarter(month?: number): 1 | 2 | 3 | 4 {
    const m = month || (new Date().getMonth() + 1);
    if (m <= 3) return 1;
    if (m <= 6) return 2;
    if (m <= 9) return 3;
    return 4;
}

/**
 * Predict CPM for given parameters
 */
export function predictCPM(request: CPMPredictionRequest): CPMPrediction {
    const niche = request.topic
        ? findMatchingNiche(request.topic)
        : findMatchingNiche(request.niche);

    const nicheData = NICHE_CPM_DATA[niche] || NICHE_CPM_DATA['lifestyle'];
    const factors: string[] = [];

    // Start with base CPM
    let cpm = nicheData.avgCPM;
    factors.push(`Base CPM for ${niche}: $${(cpm / 100).toFixed(2)}`);

    // Apply seasonal factor
    const quarter = getCurrentQuarter(request.month);
    const seasonKey = `q${quarter}` as keyof typeof nicheData.seasonalFactors;
    const seasonFactor = nicheData.seasonalFactors[seasonKey];
    cpm *= seasonFactor;

    if (seasonFactor !== 1.0) {
        factors.push(`Q${quarter} seasonal adjustment: ${seasonFactor > 1 ? '+' : ''}${((seasonFactor - 1) * 100).toFixed(0)}%`);
    }

    // Apply traffic source factor
    if (request.trafficSource && nicheData.bySource) {
        const sourceFactor = nicheData.bySource[request.trafficSource];
        cpm *= sourceFactor;

        if (sourceFactor !== 1.0) {
            factors.push(`${request.trafficSource} traffic: ${sourceFactor > 1 ? '+' : ''}${((sourceFactor - 1) * 100).toFixed(0)}%`);
        }
    }

    // Apply geo factor (simplified - US is baseline)
    if (request.geoTarget) {
        const geoFactors: Record<string, number> = {
            'US': 1.0,
            'GB': 0.9,
            'CA': 0.85,
            'AU': 0.85,
            'DE': 0.8,
            'FR': 0.75,
            'IN': 0.3,
            'BR': 0.4,
        };
        const geoFactor = geoFactors[request.geoTarget.toUpperCase()] || 0.6;
        cpm *= geoFactor;

        if (geoFactor !== 1.0) {
            factors.push(`${request.geoTarget} geo target: ${geoFactor > 1 ? '+' : ''}${((geoFactor - 1) * 100).toFixed(0)}%`);
        }
    }

    // Calculate range
    const varianceFactor = 0.3; // 30% variance
    const min = cpm * (1 - varianceFactor);
    const max = cpm * (1 + varianceFactor);

    // Confidence based on sample size
    let confidence = Math.min(90, 50 + (nicheData.sampleSize / 20));
    if (request.trafficSource) confidence -= 5;
    if (request.geoTarget) confidence -= 5;

    return {
        estimatedCPM: Math.round(cpm),
        confidence: Math.round(confidence),
        range: {
            min: Math.round(min),
            max: Math.round(max),
        },
        factors,
    };
}

/**
 * Estimate monthly revenue based on page views and CPM
 */
export function estimateMonthlyRevenue(
    pageViews: number,
    niche: string,
    options?: {
        month?: number;
        trafficSource?: CPMPredictionRequest['trafficSource'];
        geoTarget?: string;
    }
): {
    estimatedRevenue: number;
    cpmUsed: number;
    breakdown: string;
} {
    const prediction = predictCPM({
        niche,
        month: options?.month,
        trafficSource: options?.trafficSource,
        geoTarget: options?.geoTarget,
    });

    // Revenue = (Page Views / 1000) * CPM
    const revenueInCents = (pageViews / 1000) * prediction.estimatedCPM;

    return {
        estimatedRevenue: Math.round(revenueInCents),
        cpmUsed: prediction.estimatedCPM,
        breakdown: `${pageViews.toLocaleString()} views × $${(prediction.estimatedCPM / 100).toFixed(2)} CPM = $${(revenueInCents / 100).toFixed(2)}`,
    };
}

/**
 * Get top niches by CPM
 */
export function getTopNichesByCPM(limit = 5): Array<{ niche: string; avgCPM: number }> {
    return Object.values(NICHE_CPM_DATA)
        .sort((a, b) => b.avgCPM - a.avgCPM)
        .slice(0, limit)
        .map(n => ({ niche: n.niche, avgCPM: n.avgCPM }));
}

/**
 * Get niche CPM data
 */
export function getNicheCPMData(niche: string): NicheCPMData | undefined {
    return NICHE_CPM_DATA[niche.toLowerCase()];
}
