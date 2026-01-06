/**
 * Trend Aggregator
 * FSD: features/hunt/lib/trendAggregator.ts
 * 
 * Phase 2 Enhancement: Intelligently merge trends from multiple sources
 * Deduplicates, scores by source count, and tracks momentum
 */

// ============================================================================
// Types
// ============================================================================

export interface RawTrendInput {
    topic: string;
    source: string;
    volume?: number;
    timestamp?: number;
    url?: string;
    region?: string;
}

export type MomentumLevel = 'exploding' | 'rising' | 'stable' | 'falling';

export interface AggregatedTrend {
    id: string;
    topic: string;
    normalizedTopic: string;
    sources: string[];
    sourceCount: number;
    combinedScore: number;
    firstSeen: number;
    lastSeen: number;
    momentum: MomentumLevel;
    volumeHistory: Array<{ timestamp: number; volume: number }>;
    regions: string[];
    urls: string[];
    rank: number;
}

export interface AggregationResult {
    trends: AggregatedTrend[];
    sourceBreakdown: Record<string, number>;
    totalRaw: number;
    uniqueCount: number;
    aggregatedAt: number;
}

// ============================================================================
// Text Normalization
// ============================================================================

/**
 * Normalize topic text for comparison
 */
function normalizeTopic(topic: string): string {
    return topic
        .toLowerCase()
        .replace(/[^\w\s]/g, '')  // Remove punctuation
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
}

/**
 * Calculate similarity between two topics
 */
function topicSimilarity(topic1: string, topic2: string): number {
    const norm1 = normalizeTopic(topic1);
    const norm2 = normalizeTopic(topic2);

    // Exact match
    if (norm1 === norm2) return 1.0;

    // One contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        const longerLen = Math.max(norm1.length, norm2.length);
        const shorterLen = Math.min(norm1.length, norm2.length);
        return shorterLen / longerLen;
    }

    // Word-based similarity
    const words1 = new Set(norm1.split(' '));
    const words2 = new Set(norm2.split(' '));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);

    return intersection.length / union.size;
}

// ============================================================================
// Momentum Calculation
// ============================================================================

/**
 * Calculate momentum based on volume history
 */
function calculateMomentum(volumeHistory: Array<{ timestamp: number; volume: number }>): MomentumLevel {
    if (volumeHistory.length < 2) return 'stable';

    // Sort by timestamp
    const sorted = [...volumeHistory].sort((a, b) => a.timestamp - b.timestamp);

    // Get recent vs older volumes
    const midpoint = Math.floor(sorted.length / 2);
    const olderAvg = sorted.slice(0, midpoint).reduce((s, v) => s + v.volume, 0) / midpoint || 1;
    const recentAvg = sorted.slice(midpoint).reduce((s, v) => s + v.volume, 0) / (sorted.length - midpoint) || 1;

    const changeRatio = recentAvg / olderAvg;

    if (changeRatio > 2) return 'exploding';
    if (changeRatio > 1.2) return 'rising';
    if (changeRatio < 0.5) return 'falling';
    return 'stable';
}

/**
 * Calculate combined score based on sources and volume
 */
function calculateCombinedScore(
    sourceCount: number,
    avgVolume: number,
    momentum: MomentumLevel
): number {
    let score = 0;

    // Source count (more sources = more credible)
    score += Math.min(sourceCount * 20, 60);

    // Volume contribution (normalized)
    const volumeScore = Math.min(Math.log10(avgVolume + 1) * 10, 30);
    score += volumeScore;

    // Momentum bonus
    switch (momentum) {
        case 'exploding': score += 20; break;
        case 'rising': score += 10; break;
        case 'stable': score += 0; break;
        case 'falling': score -= 10; break;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// Main Aggregation
// ============================================================================

/**
 * Aggregate raw trends from multiple sources into deduplicated list
 */
export function aggregateTrends(
    rawTrends: RawTrendInput[],
    options?: {
        similarityThreshold?: number;
        maxTrends?: number;
    }
): AggregationResult {
    const similarityThreshold = options?.similarityThreshold ?? 0.6;
    const maxTrends = options?.maxTrends ?? 100;

    if (rawTrends.length === 0) {
        return {
            trends: [],
            sourceBreakdown: {},
            totalRaw: 0,
            uniqueCount: 0,
            aggregatedAt: Date.now(),
        };
    }

    // Track source counts
    const sourceBreakdown: Record<string, number> = {};

    // Build aggregated trends
    const aggregated: Map<string, AggregatedTrend> = new Map();

    for (const raw of rawTrends) {
        // Count source
        sourceBreakdown[raw.source] = (sourceBreakdown[raw.source] || 0) + 1;

        const normalized = normalizeTopic(raw.topic);
        if (!normalized) continue;

        // Find existing similar trend
        let matched = false;
        for (const [key, existing] of aggregated) {
            const similarity = topicSimilarity(raw.topic, existing.topic);

            if (similarity >= similarityThreshold) {
                // Merge into existing
                if (!existing.sources.includes(raw.source)) {
                    existing.sources.push(raw.source);
                    existing.sourceCount++;
                }

                if (raw.volume) {
                    existing.volumeHistory.push({
                        timestamp: raw.timestamp || Date.now(),
                        volume: raw.volume,
                    });
                }

                if (raw.region && !existing.regions.includes(raw.region)) {
                    existing.regions.push(raw.region);
                }

                if (raw.url && !existing.urls.includes(raw.url)) {
                    existing.urls.push(raw.url);
                }

                existing.lastSeen = Math.max(existing.lastSeen, raw.timestamp || Date.now());

                matched = true;
                break;
            }
        }

        if (!matched) {
            // Create new aggregated trend
            const id = `trend_${Date.now()}_${aggregated.size}`;
            const timestamp = raw.timestamp || Date.now();

            aggregated.set(id, {
                id,
                topic: raw.topic,
                normalizedTopic: normalized,
                sources: [raw.source],
                sourceCount: 1,
                combinedScore: 0, // Calculated later
                firstSeen: timestamp,
                lastSeen: timestamp,
                momentum: 'stable',
                volumeHistory: raw.volume
                    ? [{ timestamp, volume: raw.volume }]
                    : [],
                regions: raw.region ? [raw.region] : [],
                urls: raw.url ? [raw.url] : [],
                rank: 0,
            });
        }
    }

    // Calculate scores and momentum
    const trends = Array.from(aggregated.values());

    for (const trend of trends) {
        trend.momentum = calculateMomentum(trend.volumeHistory);

        const avgVolume = trend.volumeHistory.length > 0
            ? trend.volumeHistory.reduce((s, v) => s + v.volume, 0) / trend.volumeHistory.length
            : 0;

        trend.combinedScore = calculateCombinedScore(
            trend.sourceCount,
            avgVolume,
            trend.momentum
        );
    }

    // Sort by score and assign ranks
    trends.sort((a, b) => b.combinedScore - a.combinedScore);
    trends.forEach((t, i) => t.rank = i + 1);

    // Limit results
    const limited = trends.slice(0, maxTrends);

    return {
        trends: limited,
        sourceBreakdown,
        totalRaw: rawTrends.length,
        uniqueCount: limited.length,
        aggregatedAt: Date.now(),
    };
}

// ============================================================================
// Filtering and Queries
// ============================================================================

/**
 * Filter trends by momentum
 */
export function filterByMomentum(
    trends: AggregatedTrend[],
    minMomentum: MomentumLevel
): AggregatedTrend[] {
    const levels: MomentumLevel[] = ['falling', 'stable', 'rising', 'exploding'];
    const minIndex = levels.indexOf(minMomentum);

    return trends.filter(t => levels.indexOf(t.momentum) >= minIndex);
}

/**
 * Filter trends appearing in multiple sources
 */
export function filterMultiSource(
    trends: AggregatedTrend[],
    minSources: number = 2
): AggregatedTrend[] {
    return trends.filter(t => t.sourceCount >= minSources);
}

/**
 * Get trending topics for a specific region
 */
export function filterByRegion(
    trends: AggregatedTrend[],
    region: string
): AggregatedTrend[] {
    return trends.filter(t =>
        t.regions.length === 0 || t.regions.includes(region)
    );
}

/**
 * Get top N trending topics
 */
export function getTopTrends(
    trends: AggregatedTrend[],
    count: number = 10
): AggregatedTrend[] {
    return [...trends]
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, count);
}

/**
 * Get exploding trends (highest momentum)
 */
export function getExplodingTrends(
    trends: AggregatedTrend[]
): AggregatedTrend[] {
    return filterByMomentum(trends, 'exploding');
}

/**
 * Get high-confidence trends (multiple sources + good score)
 */
export function getHighConfidenceTrends(
    trends: AggregatedTrend[],
    minScore: number = 50,
    minSources: number = 2
): AggregatedTrend[] {
    return trends.filter(t =>
        t.combinedScore >= minScore && t.sourceCount >= minSources
    );
}
