/**
 * Social Source Helper
 * FSD: features/sources/lib/socialSource.ts
 * 
 * Unified interface for all social media platforms.
 * Converts social posts to campaign SourceItems.
 */

import {
    Tweet,
    searchTweets,
    searchHashtag,
    getTweetUrl,
    calculateEngagement,
    isTwitterConfigured,
} from './twitterApi';

import {
    RedditPost,
    getSubredditPosts,
    searchReddit,
    getBestImageUrl,
    calculateRedditEngagement,
} from './redditApi';

// ============================================================================
// Types
// ============================================================================

export type SocialPlatform = 'twitter' | 'reddit';

export interface SocialSourceItem {
    id: string;
    topic: string;
    sourceType: 'social';
    platform: SocialPlatform;
    sourceUrl: string;
    title: string;
    content: string;
    author: string;
    authorUrl?: string;
    imageUrl?: string;
    publishedAt: string;
    engagement: {
        score: number;
        likes?: number;
        comments?: number;
        shares?: number;
    };
    tags?: string[];
    metadata?: Record<string, unknown>;
}

export interface SocialSourceConfig {
    platform: SocialPlatform;
    // Twitter-specific
    query?: string;
    hashtag?: string;
    // Reddit-specific
    subreddit?: string;
    sort?: 'hot' | 'new' | 'top' | 'rising' | 'relevance';
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    // Common
    maxItems: number;
    minEngagement?: number;
}

export interface SocialSourceResult {
    success: boolean;
    items: SocialSourceItem[];
    error?: string;
    platformInfo?: {
        platform: SocialPlatform;
        query?: string;
    };
}

// ============================================================================
// Unified Source Fetching
// ============================================================================

/**
 * Fetch social media content based on config
 */
export async function fetchSocialSource(
    config: SocialSourceConfig
): Promise<SocialSourceResult> {
    try {
        if (config.platform === 'twitter') {
            return await fetchTwitterSource(config);
        } else if (config.platform === 'reddit') {
            return await fetchRedditSource(config);
        } else {
            return { success: false, items: [], error: 'Unsupported platform' };
        }
    } catch (error) {
        return {
            success: false,
            items: [],
            error: error instanceof Error ? error.message : 'Social source fetch failed',
        };
    }
}

/**
 * Fetch from Twitter
 */
async function fetchTwitterSource(
    config: SocialSourceConfig
): Promise<SocialSourceResult> {
    if (!isTwitterConfigured()) {
        return { success: false, items: [], error: 'Twitter not configured' };
    }

    let result;
    if (config.hashtag) {
        result = await searchHashtag(config.hashtag, { maxResults: config.maxItems });
    } else if (config.query) {
        result = await searchTweets(config.query, { maxResults: config.maxItems });
    } else {
        return { success: false, items: [], error: 'No query or hashtag specified' };
    }

    let items = result.tweets.map(tweetToSourceItem);

    // Filter by minimum engagement
    if (config.minEngagement) {
        items = items.filter(item => item.engagement.score >= config.minEngagement!);
    }

    return {
        success: true,
        items,
        platformInfo: {
            platform: 'twitter',
            query: config.hashtag || config.query,
        },
    };
}

/**
 * Fetch from Reddit
 */
async function fetchRedditSource(
    config: SocialSourceConfig
): Promise<SocialSourceResult> {
    let result;

    if (config.subreddit) {
        result = await getSubredditPosts(config.subreddit, {
            sort: config.sort as 'hot' | 'new' | 'top' | 'rising',
            time: config.time,
            limit: config.maxItems,
        });
    } else if (config.query) {
        result = await searchReddit(config.query, {
            sort: config.sort as 'relevance' | 'hot' | 'top' | 'new' | 'comments',
            time: config.time,
            limit: config.maxItems,
        });
    } else {
        return { success: false, items: [], error: 'No subreddit or query specified' };
    }

    let items = result.posts.map(redditPostToSourceItem);

    // Filter by minimum engagement
    if (config.minEngagement) {
        items = items.filter(item => item.engagement.score >= config.minEngagement!);
    }

    return {
        success: true,
        items,
        platformInfo: {
            platform: 'reddit',
            query: config.subreddit || config.query,
        },
    };
}

// ============================================================================
// Converters
// ============================================================================

/**
 * Convert Tweet to SocialSourceItem
 */
function tweetToSourceItem(tweet: Tweet): SocialSourceItem {
    return {
        id: `twitter_${tweet.id}`,
        topic: tweet.text.slice(0, 100),
        sourceType: 'social',
        platform: 'twitter',
        sourceUrl: getTweetUrl(tweet),
        title: `@${tweet.authorUsername}: ${tweet.text.slice(0, 60)}...`,
        content: tweet.text,
        author: tweet.authorName || tweet.authorUsername || 'Unknown',
        authorUrl: tweet.authorUsername
            ? `https://twitter.com/${tweet.authorUsername}`
            : undefined,
        imageUrl: tweet.media?.[0]?.url,
        publishedAt: tweet.createdAt,
        engagement: {
            score: calculateEngagement(tweet),
            likes: tweet.metrics?.likes,
            comments: tweet.metrics?.replies,
            shares: tweet.metrics?.retweets,
        },
        tags: tweet.entities?.hashtags?.map(h => h.tag),
        metadata: {
            quotes: tweet.metrics?.quotes,
        },
    };
}

/**
 * Convert RedditPost to SocialSourceItem
 */
function redditPostToSourceItem(post: RedditPost): SocialSourceItem {
    return {
        id: `reddit_${post.id}`,
        topic: post.title,
        sourceType: 'social',
        platform: 'reddit',
        sourceUrl: post.permalink,
        title: post.title,
        content: post.selftext || post.url,
        author: post.author,
        authorUrl: `https://reddit.com/u/${post.author}`,
        imageUrl: getBestImageUrl(post),
        publishedAt: new Date(post.createdUtc * 1000).toISOString(),
        engagement: {
            score: calculateRedditEngagement(post),
            likes: post.score,
            comments: post.numComments,
        },
        tags: post.linkFlairText ? [post.linkFlairText] : undefined,
        metadata: {
            subreddit: post.subreddit,
            upvoteRatio: post.upvoteRatio,
            isVideo: post.isVideo,
            isSelf: post.isSelf,
        },
    };
}

// ============================================================================
// Content Generation Helpers
// ============================================================================

/**
 * Generate article context from social post
 */
export function generateSocialContext(item: SocialSourceItem): string {
    const parts: string[] = [
        `Platform: ${item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}`,
        `Author: ${item.author}`,
        `Posted: ${new Date(item.publishedAt).toLocaleDateString()}`,
        `Engagement Score: ${item.engagement.score}`,
    ];

    if (item.engagement.likes) {
        parts.push(`Likes/Upvotes: ${item.engagement.likes.toLocaleString()}`);
    }
    if (item.engagement.comments) {
        parts.push(`Comments: ${item.engagement.comments.toLocaleString()}`);
    }

    parts.push('');
    parts.push('Content:');
    parts.push(item.content.slice(0, 1000));

    if (item.tags && item.tags.length > 0) {
        parts.push('');
        parts.push(`Tags: ${item.tags.join(', ')}`);
    }

    return parts.join('\n');
}

/**
 * Create prompt for AI article generation from social content
 */
export function createSocialArticlePrompt(
    item: SocialSourceItem,
    options: {
        style?: 'news' | 'analysis' | 'reaction' | 'roundup';
        wordCount?: number;
    } = {}
): string {
    const style = options.style || 'news';
    const wordCount = options.wordCount || 1000;

    const styleInstructions: Record<string, string> = {
        news: 'Write a news article covering the topic discussed in this social media post.',
        analysis: 'Write an analytical piece that explores and expands on the ideas in this post.',
        reaction: 'Write a response/reaction article to this viral social media content.',
        roundup: 'Use this post as part of a roundup article on trending discussions.',
    };

    return `
Based on the following social media content, ${styleInstructions[style]}

---
${generateSocialContext(item)}
---

Requirements:
- Write approximately ${wordCount} words
- Include proper headings
- Provide context for readers not on ${item.platform}
- Do NOT copy the post verbatim - create original content
- Credit the source: ${item.sourceUrl}
- Optimize for SEO with the topic: "${item.topic}"

Write the article in HTML format using semantic tags.
`.trim();
}

/**
 * Get trending sources sorted by engagement
 */
export function sortByEngagement(items: SocialSourceItem[]): SocialSourceItem[] {
    return [...items].sort((a, b) => b.engagement.score - a.engagement.score);
}

/**
 * Filter to only high-engagement posts
 */
export function filterHighEngagement(
    items: SocialSourceItem[],
    minScore: number = 100
): SocialSourceItem[] {
    return items.filter(item => item.engagement.score >= minScore);
}
