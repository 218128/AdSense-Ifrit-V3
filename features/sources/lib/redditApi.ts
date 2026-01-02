/**
 * Reddit API Client
 * FSD: features/sources/lib/redditApi.ts
 * 
 * Reddit API integration for subreddit posts and trending content.
 * Uses OAuth2 for authenticated access or public endpoints.
 */

// ============================================================================
// Types
// ============================================================================

export interface RedditPost {
    id: string;
    title: string;
    selftext: string;
    author: string;
    subreddit: string;
    subredditPrefixed: string;
    url: string;
    permalink: string;
    thumbnail?: string;
    preview?: {
        images: { url: string; width: number; height: number }[];
    };
    createdUtc: number;
    score: number;
    upvoteRatio: number;
    numComments: number;
    isVideo: boolean;
    isSelf: boolean;
    linkFlairText?: string;
    media?: {
        type: 'video' | 'image' | 'link';
        url?: string;
    };
}

export interface RedditSearchResult {
    posts: RedditPost[];
    after?: string;
    before?: string;
}

export interface SubredditInfo {
    name: string;
    displayName: string;
    title: string;
    description: string;
    subscribers: number;
    activeUsers: number;
    icon?: string;
    banner?: string;
    over18: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

let redditCredentials: { clientId: string; clientSecret: string } | null = null;
let accessToken: string | null = null;
let tokenExpiry: number = 0;

export function setRedditCredentials(clientId: string, clientSecret: string): void {
    redditCredentials = { clientId, clientSecret };
}

export function getRedditCredentials(): { clientId: string; clientSecret: string } | null {
    if (redditCredentials) return redditCredentials;
    if (typeof window !== 'undefined') {
        const clientId = localStorage.getItem('ifrit_reddit_client_id');
        const clientSecret = localStorage.getItem('ifrit_reddit_client_secret');
        if (clientId && clientSecret) {
            return { clientId, clientSecret };
        }
    }
    return null;
}

export function isRedditConfigured(): boolean {
    // Reddit public endpoints work without auth
    return true;
}

const REDDIT_API_BASE = 'https://www.reddit.com';
const REDDIT_OAUTH_BASE = 'https://oauth.reddit.com';

// ============================================================================
// Auth (Optional - for higher rate limits)
// ============================================================================

async function getAccessToken(): Promise<string | null> {
    const creds = getRedditCredentials();
    if (!creds) return null;

    // Check if token is still valid
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    try {
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (response.ok) {
            const data = await response.json();
            accessToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
            return accessToken;
        }
    } catch (error) {
        console.warn('Reddit OAuth failed, using public endpoints');
    }

    return null;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get posts from a subreddit
 */
export async function getSubredditPosts(
    subreddit: string,
    options: {
        sort?: 'hot' | 'new' | 'top' | 'rising';
        time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
        limit?: number;
        after?: string;
    } = {}
): Promise<RedditSearchResult> {
    const sort = options.sort || 'hot';
    const limit = Math.min(options.limit || 25, 100);

    const params = new URLSearchParams({
        limit: String(limit),
        raw_json: '1',
    });

    if (options.after) params.set('after', options.after);
    if (sort === 'top' && options.time) params.set('t', options.time);

    const url = `${REDDIT_API_BASE}/r/${subreddit}/${sort}.json?${params}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Ifrit/1.0 ContentAutomation',
        },
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error(`Subreddit r/${subreddit} is private or banned`);
        }
        if (response.status === 404) {
            throw new Error(`Subreddit r/${subreddit} not found`);
        }
        throw new Error('Reddit API request failed');
    }

    const data = await response.json();

    const posts: RedditPost[] = data.data.children.map((child: {
        data: {
            id: string;
            title: string;
            selftext: string;
            author: string;
            subreddit: string;
            subreddit_name_prefixed: string;
            url: string;
            permalink: string;
            thumbnail: string;
            preview?: { images: { source: { url: string; width: number; height: number } }[] };
            created_utc: number;
            score: number;
            upvote_ratio: number;
            num_comments: number;
            is_video: boolean;
            is_self: boolean;
            link_flair_text?: string;
        }
    }) => {
        const post = child.data;
        return {
            id: post.id,
            title: post.title,
            selftext: post.selftext,
            author: post.author,
            subreddit: post.subreddit,
            subredditPrefixed: post.subreddit_name_prefixed,
            url: post.url,
            permalink: `https://reddit.com${post.permalink}`,
            thumbnail: post.thumbnail !== 'self' && post.thumbnail !== 'default'
                ? post.thumbnail
                : undefined,
            preview: post.preview?.images?.[0] ? {
                images: [{
                    url: decodeHtmlEntities(post.preview.images[0].source.url),
                    width: post.preview.images[0].source.width,
                    height: post.preview.images[0].source.height,
                }],
            } : undefined,
            createdUtc: post.created_utc,
            score: post.score,
            upvoteRatio: post.upvote_ratio,
            numComments: post.num_comments,
            isVideo: post.is_video,
            isSelf: post.is_self,
            linkFlairText: post.link_flair_text,
        };
    });

    return {
        posts,
        after: data.data.after,
        before: data.data.before,
    };
}

/**
 * Search Reddit posts
 */
export async function searchReddit(
    query: string,
    options: {
        subreddit?: string;
        sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
        time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
        limit?: number;
        after?: string;
    } = {}
): Promise<RedditSearchResult> {
    const limit = Math.min(options.limit || 25, 100);

    const params = new URLSearchParams({
        q: query,
        limit: String(limit),
        sort: options.sort || 'relevance',
        raw_json: '1',
    });

    if (options.after) params.set('after', options.after);
    if (options.time) params.set('t', options.time);
    if (options.subreddit) params.set('restrict_sr', '1');

    const base = options.subreddit
        ? `${REDDIT_API_BASE}/r/${options.subreddit}/search.json`
        : `${REDDIT_API_BASE}/search.json`;

    const response = await fetch(`${base}?${params}`, {
        headers: {
            'User-Agent': 'Ifrit/1.0 ContentAutomation',
        },
    });

    if (!response.ok) {
        throw new Error('Reddit search failed');
    }

    const data = await response.json();

    // Same mapping as getSubredditPosts
    const posts: RedditPost[] = data.data.children.map((child: {
        data: {
            id: string;
            title: string;
            selftext: string;
            author: string;
            subreddit: string;
            subreddit_name_prefixed: string;
            url: string;
            permalink: string;
            thumbnail: string;
            preview?: { images: { source: { url: string; width: number; height: number } }[] };
            created_utc: number;
            score: number;
            upvote_ratio: number;
            num_comments: number;
            is_video: boolean;
            is_self: boolean;
            link_flair_text?: string;
        }
    }) => {
        const post = child.data;
        return {
            id: post.id,
            title: post.title,
            selftext: post.selftext,
            author: post.author,
            subreddit: post.subreddit,
            subredditPrefixed: post.subreddit_name_prefixed,
            url: post.url,
            permalink: `https://reddit.com${post.permalink}`,
            thumbnail: post.thumbnail !== 'self' && post.thumbnail !== 'default'
                ? post.thumbnail
                : undefined,
            preview: post.preview?.images?.[0] ? {
                images: [{
                    url: decodeHtmlEntities(post.preview.images[0].source.url),
                    width: post.preview.images[0].source.width,
                    height: post.preview.images[0].source.height,
                }],
            } : undefined,
            createdUtc: post.created_utc,
            score: post.score,
            upvoteRatio: post.upvote_ratio,
            numComments: post.num_comments,
            isVideo: post.is_video,
            isSelf: post.is_self,
            linkFlairText: post.link_flair_text,
        };
    });

    return {
        posts,
        after: data.data.after,
        before: data.data.before,
    };
}

/**
 * Get subreddit info
 */
export async function getSubredditInfo(subreddit: string): Promise<SubredditInfo | null> {
    const response = await fetch(`${REDDIT_API_BASE}/r/${subreddit}/about.json`, {
        headers: {
            'User-Agent': 'Ifrit/1.0 ContentAutomation',
        },
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    const sub = data.data;

    return {
        name: sub.name,
        displayName: sub.display_name,
        title: sub.title,
        description: sub.public_description || sub.description,
        subscribers: sub.subscribers,
        activeUsers: sub.accounts_active || 0,
        icon: sub.icon_img || sub.community_icon,
        banner: sub.banner_img,
        over18: sub.over18,
    };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Decode HTML entities in URLs
 */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
}

/**
 * Get the best image URL from a post
 */
export function getBestImageUrl(post: RedditPost): string | undefined {
    // Check preview images first
    if (post.preview?.images?.[0]) {
        return post.preview.images[0].url;
    }
    // Check thumbnail
    if (post.thumbnail && post.thumbnail.startsWith('http')) {
        return post.thumbnail;
    }
    // Check if the URL is a direct image link
    if (post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return post.url;
    }
    return undefined;
}

/**
 * Calculate engagement score for a post
 */
export function calculateRedditEngagement(post: RedditPost): number {
    return post.score + (post.numComments * 2);
}

/**
 * Get post age in hours
 */
export function getPostAgeHours(post: RedditPost): number {
    return (Date.now() / 1000 - post.createdUtc) / 3600;
}
