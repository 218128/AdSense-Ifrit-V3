/**
 * Google Trends API Clients
 * FSD: features/campaigns/lib/trendsApi.ts
 * 
 * Provides two methods to fetch trending topics:
 * 1. Unofficial API (free, rate-limited)
 * 2. SerpAPI (paid, reliable)
 */

// ============================================================================
// Types
// ============================================================================

export interface TrendingTopic {
    title: string;
    relatedQueries?: string[];
    searchVolume?: string;
    articleUrl?: string;
    imageUrl?: string;
    source?: 'unofficial' | 'serpapi';
    publishedAt?: number;
}

export interface TrendsResult {
    success: boolean;
    topics: TrendingTopic[];
    error?: string;
    source: 'unofficial' | 'serpapi';
}

export type TrendsRegion =
    | 'US' | 'GB' | 'CA' | 'AU' | 'IN'
    | 'DE' | 'FR' | 'JP' | 'BR' | 'MX'
    | 'ES' | 'IT' | 'NL' | 'PL' | 'SE';

export interface TrendsConfig {
    provider: 'unofficial' | 'serpapi' | 'auto';
    region: TrendsRegion;
    category?: string;
    serpApiKey?: string;
}

// ============================================================================
// Unofficial Google Trends API
// ============================================================================

const TRENDS_BASE_URL = 'https://trends.google.com/trends/api';

/**
 * Fetch daily trends via unofficial API
 * This scrapes Google Trends public endpoints
 */
export async function fetchTrendsUnofficial(
    region: TrendsRegion = 'US'
): Promise<TrendsResult> {
    try {
        // Daily trends endpoint (most reliable)
        const url = `${TRENDS_BASE_URL}/dailytrends?hl=en-${region}&tz=-300&geo=${region}&ns=15`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return { success: false, topics: [], error: `HTTP ${response.status}`, source: 'unofficial' };
        }

        const text = await response.text();

        // Google prepends ")]}'" to prevent JSON hijacking
        const json = JSON.parse(text.replace(/^\)\]\}'/, ''));

        const topics: TrendingTopic[] = [];
        const days = json?.default?.trendingSearchesDays || [];

        for (const day of days) {
            for (const search of day.trendingSearches || []) {
                topics.push({
                    title: search.title?.query || '',
                    searchVolume: search.formattedTraffic,
                    articleUrl: search.articles?.[0]?.url,
                    imageUrl: search.image?.imageUrl,
                    relatedQueries: search.relatedQueries?.map((q: { query: string }) => q.query) || [],
                    source: 'unofficial',
                    publishedAt: Date.now(),
                });
            }
        }

        return { success: true, topics, source: 'unofficial' };
    } catch (error) {
        return {
            success: false,
            topics: [],
            error: error instanceof Error ? error.message : 'Unofficial API failed',
            source: 'unofficial',
        };
    }
}

/**
 * Fetch real-time trends (last 24h)
 */
export async function fetchRealtimeTrendsUnofficial(
    region: TrendsRegion = 'US',
    category?: string
): Promise<TrendsResult> {
    try {
        // Category mapping
        const categoryMap: Record<string, string> = {
            'all': 'all',
            'business': 'b',
            'entertainment': 'e',
            'health': 'm',
            'science': 's',
            'sports': 't',
            'tech': 'h',
        };

        const cat = category ? categoryMap[category] || 'all' : 'all';
        const url = `${TRENDS_BASE_URL}/realtimetrends?hl=en-${region}&tz=-300&cat=${cat}&fi=0&fs=0&geo=${region}&ri=300&rs=20&sort=0`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return { success: false, topics: [], error: `HTTP ${response.status}`, source: 'unofficial' };
        }

        const text = await response.text();
        const json = JSON.parse(text.replace(/^\)\]\}'/, ''));

        const topics: TrendingTopic[] = [];
        const stories = json?.storySummaries?.trendingStories || [];

        for (const story of stories) {
            topics.push({
                title: story.title || story.entityNames?.[0] || '',
                articleUrl: story.articles?.[0]?.articleTitle,
                imageUrl: story.image?.imgUrl,
                source: 'unofficial',
                publishedAt: Date.now(),
            });
        }

        return { success: true, topics, source: 'unofficial' };
    } catch (error) {
        return {
            success: false,
            topics: [],
            error: error instanceof Error ? error.message : 'Realtime API failed',
            source: 'unofficial',
        };
    }
}

// ============================================================================
// SerpAPI (Paid, Reliable)
// ============================================================================

const SERPAPI_BASE = 'https://serpapi.com/search.json';

/**
 * Fetch trends via SerpAPI (requires API key)
 * More reliable but costs credits
 */
export async function fetchTrendsSerpApi(
    apiKey: string,
    region: TrendsRegion = 'US',
    category?: string
): Promise<TrendsResult> {
    if (!apiKey) {
        return { success: false, topics: [], error: 'SerpAPI key required', source: 'serpapi' };
    }

    try {
        const params = new URLSearchParams({
            engine: 'google_trends_trending_now',
            geo: region,
            api_key: apiKey,
        });

        if (category) {
            params.set('cat', category);
        }

        const response = await fetch(`${SERPAPI_BASE}?${params}`);

        if (!response.ok) {
            const error = await response.text();
            return { success: false, topics: [], error: `SerpAPI: ${error}`, source: 'serpapi' };
        }

        const data = await response.json();

        const topics: TrendingTopic[] = [];
        const trends = data.trending_searches || data.daily_searches || [];

        for (const trend of trends) {
            topics.push({
                title: trend.query || trend.title || '',
                searchVolume: trend.traffic || trend.search_volume,
                relatedQueries: trend.related_queries?.map((q: { query: string }) => q.query),
                articleUrl: trend.articles?.[0]?.link,
                imageUrl: trend.image,
                source: 'serpapi',
                publishedAt: trend.date ? new Date(trend.date).getTime() : Date.now(),
            });
        }

        return { success: true, topics, source: 'serpapi' };
    } catch (error) {
        return {
            success: false,
            topics: [],
            error: error instanceof Error ? error.message : 'SerpAPI failed',
            source: 'serpapi',
        };
    }
}

/**
 * Fetch related queries for a topic via SerpAPI
 */
export async function fetchRelatedQueriesSerpApi(
    apiKey: string,
    query: string,
    region: TrendsRegion = 'US'
): Promise<string[]> {
    if (!apiKey) return [];

    try {
        const params = new URLSearchParams({
            engine: 'google_trends',
            q: query,
            geo: region,
            data_type: 'RELATED_QUERIES',
            api_key: apiKey,
        });

        const response = await fetch(`${SERPAPI_BASE}?${params}`);
        if (!response.ok) return [];

        const data = await response.json();
        const rising = data.related_queries?.rising || [];
        const top = data.related_queries?.top || [];

        return [...rising, ...top].map((q: { query: string }) => q.query).slice(0, 10);
    } catch {
        return [];
    }
}

// ============================================================================
// Auto-Fallback Fetcher
// ============================================================================

/**
 * Fetch trends with automatic fallback
 * Tries unofficial first, falls back to SerpAPI if configured
 */
export async function fetchTrends(config: TrendsConfig): Promise<TrendsResult> {
    const { provider, region, category, serpApiKey } = config;

    // Direct SerpAPI
    if (provider === 'serpapi' && serpApiKey) {
        return fetchTrendsSerpApi(serpApiKey, region, category);
    }

    // Direct unofficial
    if (provider === 'unofficial') {
        if (category) {
            return fetchRealtimeTrendsUnofficial(region, category);
        }
        return fetchTrendsUnofficial(region);
    }

    // Auto: try unofficial first, fallback to SerpAPI
    const unofficialResult = category
        ? await fetchRealtimeTrendsUnofficial(region, category)
        : await fetchTrendsUnofficial(region);

    if (unofficialResult.success && unofficialResult.topics.length > 0) {
        return unofficialResult;
    }

    // Fallback to SerpAPI if available
    if (serpApiKey) {
        console.log('Unofficial trends failed, falling back to SerpAPI');
        return fetchTrendsSerpApi(serpApiKey, region, category);
    }

    return unofficialResult;
}
