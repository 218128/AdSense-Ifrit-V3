/**
 * Twitter/X API Client
 * FSD: features/sources/lib/twitterApi.ts
 * 
 * Twitter API v2 integration for trending topics and tweet search.
 * Uses Bearer Token authentication.
 */

// ============================================================================
// Types
// ============================================================================

export interface Tweet {
    id: string;
    text: string;
    authorId: string;
    authorUsername?: string;
    authorName?: string;
    createdAt: string;
    metrics?: {
        retweets: number;
        replies: number;
        likes: number;
        quotes: number;
    };
    entities?: {
        hashtags?: { tag: string }[];
        urls?: { url: string; expandedUrl: string }[];
        mentions?: { username: string }[];
    };
    media?: {
        type: 'photo' | 'video' | 'animated_gif';
        url: string;
        previewUrl?: string;
    }[];
}

export interface TwitterTrend {
    name: string;
    url: string;
    tweetVolume?: number;
    query: string;
}

export interface TwitterSearchResult {
    tweets: Tweet[];
    nextToken?: string;
    resultCount: number;
}

// ============================================================================
// Configuration
// ============================================================================

let twitterBearerToken: string | null = null;

export function setTwitterBearerToken(token: string): void {
    twitterBearerToken = token;
}

export function getTwitterBearerToken(): string | null {
    if (twitterBearerToken) return twitterBearerToken;
    if (typeof window !== 'undefined') {
        return localStorage.getItem('ifrit_twitter_bearer_token');
    }
    return process.env.TWITTER_BEARER_TOKEN || null;
}

export function isTwitterConfigured(): boolean {
    return !!getTwitterBearerToken();
}

const TWITTER_API_BASE = 'https://api.twitter.com/2';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search tweets by query
 */
export async function searchTweets(
    query: string,
    options: {
        maxResults?: number;
        nextToken?: string;
        startTime?: string;
        endTime?: string;
        sortOrder?: 'recency' | 'relevancy';
    } = {}
): Promise<TwitterSearchResult> {
    const token = getTwitterBearerToken();
    if (!token) {
        throw new Error('Twitter Bearer Token not configured');
    }

    const params = new URLSearchParams({
        query,
        max_results: String(Math.min(options.maxResults || 10, 100)),
        'tweet.fields': 'created_at,public_metrics,entities,author_id',
        'user.fields': 'username,name',
        'expansions': 'author_id,attachments.media_keys',
        'media.fields': 'url,preview_image_url,type',
    });

    if (options.nextToken) params.set('next_token', options.nextToken);
    if (options.startTime) params.set('start_time', options.startTime);
    if (options.endTime) params.set('end_time', options.endTime);
    if (options.sortOrder) params.set('sort_order', options.sortOrder);

    const response = await fetch(`${TWITTER_API_BASE}/tweets/search/recent?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.title || 'Twitter API search failed');
    }

    const data = await response.json();

    // Build user lookup map
    const users = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
        for (const user of data.includes.users) {
            users.set(user.id, { username: user.username, name: user.name });
        }
    }

    // Build media lookup map
    const media = new Map<string, { type: string; url: string; previewUrl?: string }>();
    if (data.includes?.media) {
        for (const m of data.includes.media) {
            media.set(m.media_key, {
                type: m.type,
                url: m.url || m.preview_image_url,
                previewUrl: m.preview_image_url,
            });
        }
    }

    const tweets: Tweet[] = (data.data || []).map((tweet: {
        id: string;
        text: string;
        author_id: string;
        created_at: string;
        public_metrics?: { retweet_count: number; reply_count: number; like_count: number; quote_count: number };
        entities?: { hashtags?: { tag: string }[]; urls?: { url: string; expanded_url: string }[]; mentions?: { username: string }[] };
        attachments?: { media_keys?: string[] };
    }) => {
        const user = users.get(tweet.author_id);
        const tweetMedia = tweet.attachments?.media_keys?.map(key => media.get(key)).filter(Boolean);

        return {
            id: tweet.id,
            text: tweet.text,
            authorId: tweet.author_id,
            authorUsername: user?.username,
            authorName: user?.name,
            createdAt: tweet.created_at,
            metrics: tweet.public_metrics ? {
                retweets: tweet.public_metrics.retweet_count,
                replies: tweet.public_metrics.reply_count,
                likes: tweet.public_metrics.like_count,
                quotes: tweet.public_metrics.quote_count,
            } : undefined,
            entities: tweet.entities ? {
                hashtags: tweet.entities.hashtags,
                urls: tweet.entities.urls?.map(u => ({ url: u.url, expandedUrl: u.expanded_url })),
                mentions: tweet.entities.mentions,
            } : undefined,
            media: tweetMedia as Tweet['media'],
        };
    });

    return {
        tweets,
        nextToken: data.meta?.next_token,
        resultCount: data.meta?.result_count || tweets.length,
    };
}

/**
 * Search tweets by hashtag
 */
export async function searchHashtag(
    hashtag: string,
    options: { maxResults?: number } = {}
): Promise<TwitterSearchResult> {
    // Remove # if present and search
    const tag = hashtag.replace(/^#/, '');
    return searchTweets(`#${tag}`, options);
}

/**
 * Get trending topics for a location
 * Note: This requires elevated API access (v1.1 endpoint)
 * For now, we'll use a workaround with search-based inference
 */
export async function getTrendingTopics(
    options: { woeid?: number } = {}
): Promise<TwitterTrend[]> {
    // Note: Twitter v2 doesn't have a direct trends endpoint for free tier
    // This is a placeholder that returns popular hashtags from recent tweets
    console.warn('Twitter trends API requires elevated access. Using fallback.');

    // Return empty for now - would need elevated API access
    return [];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract hashtags from tweet text
 */
export function extractHashtags(text: string): string[] {
    const matches = text.match(/#\w+/g) || [];
    return matches.map(tag => tag.slice(1));
}

/**
 * Get tweet URL
 */
export function getTweetUrl(tweet: Tweet): string {
    return `https://twitter.com/${tweet.authorUsername || 'i'}/status/${tweet.id}`;
}

/**
 * Calculate engagement score
 */
export function calculateEngagement(tweet: Tweet): number {
    if (!tweet.metrics) return 0;
    const { retweets, replies, likes, quotes } = tweet.metrics;
    // Weighted engagement score
    return (likes * 1) + (retweets * 2) + (replies * 1.5) + (quotes * 2);
}
