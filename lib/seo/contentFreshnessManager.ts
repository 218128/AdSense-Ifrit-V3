/**
 * Content Freshness Manager
 * FSD: lib/seo/contentFreshnessManager.ts
 *
 * Tracks content aging and identifies stale content that needs updating.
 * Implements NMT (Need-to-Maintain) scoring based on age, niche, and performance.
 */

// ============================================================================
// Types
// ============================================================================

export type StaleReason = 'age' | 'ranking_drop' | 'competitor_update' | 'data_outdated';
export type SuggestedAction = 'minor_update' | 'major_rewrite' | 'republish' | 'archive' | 'no_action';

export interface ContentFreshness {
    contentId: string;
    title: string;
    url?: string;

    // Timestamps
    publishedAt: Date;
    lastUpdatedAt: Date;

    // Scoring
    freshnessScore: number;   // 0-100 (100 = fresh)
    staleReason?: StaleReason;
    suggestedAction: SuggestedAction;

    // Review scheduling
    nextReviewDate: Date;
    reviewPriority: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceData {
    trafficTrend: 'up' | 'stable' | 'down';
    rankingChange?: number;    // Positions gained/lost
    currentPosition?: number;
}

export interface FreshnessConfig {
    /** Days before content starts aging */
    gracePeriodDays: number;
    /** Days until content is considered stale */
    staleThresholdDays: number;
    /** Score below which content needs attention */
    scoreThreshold: number;
}

// ============================================================================
// Niche-Based Freshness Weights
// ============================================================================

/**
 * Some niches require more frequent updates than others.
 * Lower number = faster aging.
 */
const NICHE_FRESHNESS_MULTIPLIERS: Record<string, number> = {
    'technology': 0.7,       // Tech changes fast
    'news': 0.3,            // News ages very quickly
    'finance': 0.6,         // Markets change
    'health': 0.8,          // Guidelines update
    'legal': 0.75,          // Laws change
    'travel': 0.9,          // Destinations stable
    'food': 1.0,            // Recipes are evergreen
    'history': 1.5,         // Historical content stays fresh
    'gaming': 0.5,          // New releases constantly
    'education': 0.9,       // Educational content stable
    'lifestyle': 1.0,       // Generally evergreen
    'default': 0.85,
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: FreshnessConfig = {
    gracePeriodDays: 30,
    staleThresholdDays: 180,
    scoreThreshold: 60,
};

// ============================================================================
// Storage (localStorage for now, can be migrated to IndexedDB)
// ============================================================================

const STORAGE_KEY = 'ifrit_content_freshness';

function loadFreshnessData(): Map<string, ContentFreshness> {
    if (typeof window === 'undefined') return new Map();

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return new Map();

        const entries: [string, ContentFreshness][] = JSON.parse(stored);
        return new Map(entries.map(([id, cf]) => [
            id,
            {
                ...cf,
                publishedAt: new Date(cf.publishedAt),
                lastUpdatedAt: new Date(cf.lastUpdatedAt),
                nextReviewDate: new Date(cf.nextReviewDate),
            },
        ]));
    } catch {
        return new Map();
    }
}

function saveFreshnessData(data: Map<string, ContentFreshness>): void {
    if (typeof window === 'undefined') return;

    try {
        const entries = Array.from(data.entries());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
        console.error('[Freshness] Failed to save data:', e);
    }
}

// In-memory cache
let freshnessCache: Map<string, ContentFreshness> | null = null;

function getCache(): Map<string, ContentFreshness> {
    if (!freshnessCache) {
        freshnessCache = loadFreshnessData();
    }
    return freshnessCache;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate freshness score for content.
 * Score of 100 = perfectly fresh, 0 = completely stale.
 */
export function calculateFreshnessScore(
    publishedAt: Date,
    lastUpdatedAt: Date,
    niche: string,
    performanceData?: PerformanceData,
    config: FreshnessConfig = DEFAULT_CONFIG
): number {
    const now = new Date();
    const effectiveDate = lastUpdatedAt > publishedAt ? lastUpdatedAt : publishedAt;
    const daysSinceUpdate = Math.floor((now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get niche multiplier (affects how fast content ages)
    const nicheMultiplier = NICHE_FRESHNESS_MULTIPLIERS[niche.toLowerCase()]
        || NICHE_FRESHNESS_MULTIPLIERS['default'];

    // Adjust thresholds based on niche
    const adjustedGrace = config.gracePeriodDays / nicheMultiplier;
    const adjustedStale = config.staleThresholdDays / nicheMultiplier;

    // Calculate base score
    let score: number;

    if (daysSinceUpdate <= adjustedGrace) {
        // Within grace period = 100
        score = 100;
    } else if (daysSinceUpdate >= adjustedStale) {
        // Past stale threshold = 0-20
        score = Math.max(0, 20 - (daysSinceUpdate - adjustedStale) / 10);
    } else {
        // Linear decay between grace and stale
        const range = adjustedStale - adjustedGrace;
        const daysIntoDecay = daysSinceUpdate - adjustedGrace;
        score = 100 - (daysIntoDecay / range) * 80; // Decays from 100 to 20
    }

    // Performance adjustments
    if (performanceData) {
        if (performanceData.trafficTrend === 'down') {
            score -= 15;
        } else if (performanceData.trafficTrend === 'up') {
            score += 10;
        }

        if (performanceData.rankingChange && performanceData.rankingChange < -5) {
            score -= 20; // Significant ranking drop
        }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine the appropriate action based on freshness score.
 */
export function determineSuggestedAction(
    score: number,
    daysSincePublish: number
): { action: SuggestedAction; priority: ContentFreshness['reviewPriority'] } {
    if (score >= 80) {
        return { action: 'no_action', priority: 'low' };
    } else if (score >= 60) {
        return { action: 'minor_update', priority: 'low' };
    } else if (score >= 40) {
        return { action: 'minor_update', priority: 'medium' };
    } else if (score >= 20) {
        return { action: 'major_rewrite', priority: 'high' };
    } else if (daysSincePublish > 730) { // 2 years
        return { action: 'archive', priority: 'medium' };
    } else {
        return { action: 'major_rewrite', priority: 'critical' };
    }
}

/**
 * Track a piece of content for freshness monitoring.
 */
export function trackContent(
    contentId: string,
    title: string,
    publishedAt: Date,
    options?: {
        url?: string;
        niche?: string;
        performance?: PerformanceData;
    }
): ContentFreshness {
    const cache = getCache();
    const existing = cache.get(contentId);
    const lastUpdatedAt = existing?.lastUpdatedAt || publishedAt;

    const score = calculateFreshnessScore(
        publishedAt,
        lastUpdatedAt,
        options?.niche || 'default',
        options?.performance
    );

    const daysSincePublish = Math.floor(
        (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const { action, priority } = determineSuggestedAction(score, daysSincePublish);

    // Calculate next review date based on priority
    const reviewDays = {
        critical: 7,
        high: 14,
        medium: 30,
        low: 90,
    };

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + reviewDays[priority]);

    const freshness: ContentFreshness = {
        contentId,
        title,
        url: options?.url,
        publishedAt,
        lastUpdatedAt,
        freshnessScore: score,
        staleReason: score < 60 ? 'age' : undefined,
        suggestedAction: action,
        nextReviewDate,
        reviewPriority: priority,
    };

    cache.set(contentId, freshness);
    saveFreshnessData(cache);

    return freshness;
}

/**
 * Mark content as updated (refreshes the score).
 */
export function markAsUpdated(contentId: string): ContentFreshness | null {
    const cache = getCache();
    const existing = cache.get(contentId);

    if (!existing) return null;

    const updated = trackContent(
        contentId,
        existing.title,
        existing.publishedAt,
        { url: existing.url }
    );

    updated.lastUpdatedAt = new Date();
    cache.set(contentId, updated);
    saveFreshnessData(cache);

    return updated;
}

/**
 * Get all stale content (score below threshold).
 */
export function getStaleContent(
    threshold: number = 60,
    limit: number = 20
): ContentFreshness[] {
    const cache = getCache();

    return Array.from(cache.values())
        .filter(cf => cf.freshnessScore < threshold)
        .sort((a, b) => a.freshnessScore - b.freshnessScore)
        .slice(0, limit);
}

/**
 * Get content due for review.
 */
export function getContentDueForReview(): ContentFreshness[] {
    const cache = getCache();
    const now = new Date();

    return Array.from(cache.values())
        .filter(cf => cf.nextReviewDate <= now)
        .sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.reviewPriority] - priorityOrder[b.reviewPriority];
        });
}

/**
 * Schedule a content review.
 */
export function scheduleContentReview(
    contentId: string,
    reviewDate: Date
): void {
    const cache = getCache();
    const existing = cache.get(contentId);

    if (existing) {
        existing.nextReviewDate = reviewDate;
        cache.set(contentId, existing);
        saveFreshnessData(cache);
    }
}

/**
 * Get freshness summary statistics.
 */
export function getFreshnessSummary(): {
    total: number;
    fresh: number;
    aging: number;
    stale: number;
    avgScore: number;
} {
    const cache = getCache();
    const items = Array.from(cache.values());

    if (items.length === 0) {
        return { total: 0, fresh: 0, aging: 0, stale: 0, avgScore: 0 };
    }

    const fresh = items.filter(cf => cf.freshnessScore >= 80).length;
    const stale = items.filter(cf => cf.freshnessScore < 40).length;
    const aging = items.length - fresh - stale;
    const avgScore = Math.round(
        items.reduce((sum, cf) => sum + cf.freshnessScore, 0) / items.length
    );

    return {
        total: items.length,
        fresh,
        aging,
        stale,
        avgScore,
    };
}
