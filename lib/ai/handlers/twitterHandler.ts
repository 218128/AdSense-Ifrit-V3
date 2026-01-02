/**
 * Twitter/X Handler
 * FSD: lib/ai/handlers/twitterHandler.ts
 * 
 * Twitter API v2 integration for trend discovery.
 * Extracts trending topics and hashtags for content ideas.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Constants
// ============================================================================

const TWITTER_API_URL = 'https://api.twitter.com/2';
const STORAGE_KEY = 'ifrit_twitter_bearer_token';

// ============================================================================
// Types
// ============================================================================

export interface TwitterTrend {
    name: string;
    url: string;
    tweetVolume: number | null;
    promoted: boolean;
}

export interface TwitterTweet {
    id: string;
    text: string;
    authorId: string;
    createdAt: string;
    likeCount?: number;
    retweetCount?: number;
    replyCount?: number;
}

export interface TwitterSearchResult {
    tweets: TwitterTweet[];
    meta: {
        resultCount: number;
        nextToken?: string;
    };
}

interface TwitterApiTweet {
    id: string;
    text: string;
    author_id: string;
    created_at: string;
    public_metrics?: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
    };
}

// ============================================================================
// Handler Definition
// ============================================================================

export const twitterHandler: CapabilityHandler = {
    id: 'twitter-research',
    name: 'Twitter/X Research',
    source: 'integration',
    capabilities: ['research'],
    priority: 65,
    isAvailable: typeof window !== 'undefined' && !!getBearerToken(),
    requiresApiKey: true,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const { prompt, context } = options;
        const startTime = Date.now();

        const bearerToken = getBearerToken();
        if (!bearerToken) {
            return {
                success: false,
                error: 'Twitter Bearer Token not configured. Add it in Settings > Automation.',
                handlerUsed: 'twitter-research',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const query = context?.query as string || prompt;
            const maxResults = context?.maxResults as number || 10;

            const result = await searchTweets(bearerToken, query, maxResults);

            // Format results as text
            const formattedText = formatTweetsAsText(result.tweets);

            return {
                success: true,
                text: formattedText,
                handlerUsed: 'twitter-research',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Twitter search failed',
                handlerUsed: 'twitter-research',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search recent tweets
 */
export async function searchTweets(
    bearerToken: string,
    query: string,
    maxResults = 10
): Promise<TwitterSearchResult> {
    const url = new URL(`${TWITTER_API_URL}/tweets/search/recent`);
    url.searchParams.set('query', `${query} -is:retweet lang:en`);
    url.searchParams.set('max_results', String(Math.min(maxResults, 100)));
    url.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${bearerToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.title || 'Twitter API error');
    }

    const data = await response.json();

    const tweets: TwitterTweet[] = (data.data || []).map((tweet: TwitterApiTweet) => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
        likeCount: tweet.public_metrics?.like_count,
        retweetCount: tweet.public_metrics?.retweet_count,
        replyCount: tweet.public_metrics?.reply_count,
    }));

    return {
        tweets,
        meta: {
            resultCount: data.meta?.result_count || tweets.length,
            nextToken: data.meta?.next_token,
        },
    };
}

/**
 * Get trending topics for a location
 * Note: Requires elevated API access
 */
export async function getTrends(
    bearerToken: string,
    woeid = 1 // 1 = Worldwide, 23424977 = US
): Promise<TwitterTrend[]> {
    // Twitter v1.1 endpoint required for trends
    const url = `https://api.twitter.com/1.1/trends/place.json?id=${woeid}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${bearerToken}`,
        },
    });

    if (!response.ok) {
        // Trends require elevated access, return empty gracefully
        return [];
    }

    const data = await response.json();
    const trends = data[0]?.trends || [];

    return trends.map((t: { name: string; url: string; tweet_volume: number | null; promoted_content: boolean | null }) => ({
        name: t.name,
        url: t.url,
        tweetVolume: t.tweet_volume,
        promoted: t.promoted_content || false,
    }));
}

/**
 * Extract hashtags from query results
 */
export function extractHashtags(tweets: TwitterTweet[]): string[] {
    const hashtagCounts: Record<string, number> = {};

    for (const tweet of tweets) {
        const hashtags = tweet.text.match(/#\w+/g) || [];
        for (const tag of hashtags) {
            const lower = tag.toLowerCase();
            hashtagCounts[lower] = (hashtagCounts[lower] || 0) + 1;
        }
    }

    return Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag]) => tag);
}

// ============================================================================
// Helper Functions
// ============================================================================

function getBearerToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
}

function formatTweetsAsText(tweets: TwitterTweet[]): string {
    if (tweets.length === 0) return 'No tweets found.';

    const lines = tweets.map((t, i) => {
        const engagement = [
            t.likeCount ? `${t.likeCount} likes` : '',
            t.retweetCount ? `${t.retweetCount} RTs` : '',
        ].filter(Boolean).join(', ');

        return `${i + 1}. ${t.text}${engagement ? ` (${engagement})` : ''}`;
    });

    // Extract trending hashtags
    const hashtags = extractHashtags(tweets);
    const hashtagText = hashtags.length > 0
        ? `\n\nTrending hashtags: ${hashtags.slice(0, 10).join(' ')}`
        : '';

    return `Found ${tweets.length} tweets:\n\n${lines.join('\n\n')}${hashtagText}`;
}

/**
 * Set Twitter Bearer Token
 */
export function setTwitterBearerToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, token);
}

/**
 * Check if Twitter is configured
 */
export function isTwitterConfigured(): boolean {
    return !!getBearerToken();
}

export default twitterHandler;
