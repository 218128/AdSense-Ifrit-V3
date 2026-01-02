/**
 * Analytics Integration
 * FSD: features/campaigns/lib/analytics.ts
 * 
 * Track post performance and suggest high-performing topics.
 */

// ============================================================================
// Types
// ============================================================================

export interface PostPerformance {
    postId: number;
    siteId: string;
    title: string;
    url: string;
    publishedAt: number;
    metrics: PerformanceMetrics;
    lastUpdated: number;
}

export interface PerformanceMetrics {
    pageViews?: number;
    uniqueVisitors?: number;
    bounceRate?: number;
    avgTimeOnPage?: number;
    entrances?: number;
    exits?: number;
}

export interface TopicSuggestion {
    topic: string;
    score: number;
    basedOn: string;
    reason: string;
}

export interface AnalyticsConfig {
    provider: 'umami' | 'plausible' | 'google' | 'manual';
    apiKey?: string;
    siteId?: string;
    baseUrl?: string;
}

// ============================================================================
// Analytics Fetcher
// ============================================================================

/**
 * Fetch post performance from Umami analytics
 */
export async function fetchUmamiAnalytics(
    config: AnalyticsConfig,
    postUrls: string[],
    startDate: Date,
    endDate: Date
): Promise<PostPerformance[]> {
    if (!config.apiKey || !config.siteId || !config.baseUrl) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            startAt: startDate.getTime().toString(),
            endAt: endDate.getTime().toString(),
        });

        const response = await fetch(`${config.baseUrl}/api/websites/${config.siteId}/stats?${params}`, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });

        if (!response.ok) return [];

        const data = await response.json();

        // Map Umami response to our format
        return postUrls.map(url => ({
            postId: 0, // Would need to correlate with WP
            siteId: config.siteId!,
            title: url,
            url,
            publishedAt: startDate.getTime(),
            metrics: {
                pageViews: data.pageviews?.value || 0,
                uniqueVisitors: data.visitors?.value || 0,
                bounceRate: data.bounces?.value || 0,
            },
            lastUpdated: Date.now(),
        }));
    } catch {
        return [];
    }
}

/**
 * Fetch post performance from Plausible analytics
 */
export async function fetchPlausibleAnalytics(
    config: AnalyticsConfig,
    postUrls: string[],
    period: '7d' | '30d' | '12mo' = '30d'
): Promise<PostPerformance[]> {
    if (!config.apiKey || !config.siteId) {
        return [];
    }

    try {
        const response = await fetch(
            `https://plausible.io/api/v1/stats/breakdown?site_id=${config.siteId}&period=${period}&property=event:page`,
            {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) return [];

        const data = await response.json();
        const results = data.results || [];

        return results
            .filter((r: { page: string }) => postUrls.some(url => url.includes(r.page)))
            .map((r: { page: string; visitors: number; pageviews: number; bounce_rate: number }) => ({
                postId: 0,
                siteId: config.siteId!,
                title: r.page,
                url: r.page,
                publishedAt: Date.now(),
                metrics: {
                    pageViews: r.pageviews,
                    uniqueVisitors: r.visitors,
                    bounceRate: r.bounce_rate,
                },
                lastUpdated: Date.now(),
            }));
    } catch {
        return [];
    }
}

// ============================================================================
// Topic Suggestions
// ============================================================================

/**
 * Analyze performance and suggest similar topics
 */
export function suggestTopicsFromPerformance(
    performances: PostPerformance[],
    limit: number = 5
): TopicSuggestion[] {
    // Sort by page views
    const sorted = [...performances].sort(
        (a, b) => (b.metrics.pageViews || 0) - (a.metrics.pageViews || 0)
    );

    const topPerformers = sorted.slice(0, 10);
    const suggestions: TopicSuggestion[] = [];

    for (const post of topPerformers) {
        // Extract keywords from title
        const keywords = extractKeywords(post.title);

        for (const keyword of keywords.slice(0, 2)) {
            suggestions.push({
                topic: keyword,
                score: calculateTopicScore(post.metrics),
                basedOn: post.title,
                reason: `High-performing topic with ${post.metrics.pageViews || 0} views`,
            });
        }
    }

    // Dedupe and sort
    const seen = new Set<string>();
    return suggestions
        .filter(s => {
            const key = s.topic.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Extract keywords from title
 */
function extractKeywords(title: string): string[] {
    const stopWords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'how', 'what',
        'why', 'best', 'top', 'guide', 'review', 'new', 'your',
    ]);

    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
}

/**
 * Calculate topic score from metrics
 */
function calculateTopicScore(metrics: PerformanceMetrics): number {
    let score = 0;

    // Page views (primary factor)
    score += (metrics.pageViews || 0) * 0.4;

    // Unique visitors
    score += (metrics.uniqueVisitors || 0) * 0.3;

    // Low bounce rate is good
    if (metrics.bounceRate !== undefined) {
        score += (100 - metrics.bounceRate) * 0.2;
    }

    // Time on page
    score += (metrics.avgTimeOnPage || 0) * 0.1;

    return Math.round(score);
}

// ============================================================================
// Manual Tracking
// ============================================================================

/**
 * Manually record post performance
 */
export function recordManualPerformance(
    postId: number,
    siteId: string,
    title: string,
    url: string,
    metrics: Partial<PerformanceMetrics>
): PostPerformance {
    return {
        postId,
        siteId,
        title,
        url,
        publishedAt: Date.now(),
        metrics: {
            pageViews: metrics.pageViews || 0,
            uniqueVisitors: metrics.uniqueVisitors || 0,
            bounceRate: metrics.bounceRate,
            avgTimeOnPage: metrics.avgTimeOnPage,
        },
        lastUpdated: Date.now(),
    };
}
