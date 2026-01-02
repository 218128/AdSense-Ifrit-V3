/**
 * YouTube Handler
 * FSD: lib/ai/handlers/youtubeHandler.ts
 * 
 * YouTube Data API integration for video topic discovery.
 * Extracts trending topics, video metadata, and content ideas.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Constants
// ============================================================================

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const STORAGE_KEY = 'ifrit_youtube_api_key';

// ============================================================================
// Types
// ============================================================================

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnailUrl: string;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    tags?: string[];
}

export interface YouTubeSearchResult {
    videos: YouTubeVideo[];
    nextPageToken?: string;
    totalResults: number;
}

interface YouTubeApiItem {
    id: { videoId?: string } | string;
    snippet: {
        title: string;
        description: string;
        channelTitle: string;
        publishedAt: string;
        thumbnails: { high?: { url: string }; medium?: { url: string } };
        tags?: string[];
    };
    statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
    };
}

// ============================================================================
// Handler Definition
// ============================================================================

export const youtubeHandler: CapabilityHandler = {
    id: 'youtube-research',
    name: 'YouTube Research',
    source: 'integration',
    capabilities: ['research'],
    priority: 70,
    isAvailable: typeof window !== 'undefined' && !!getApiKey(),
    requiresApiKey: true,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const { prompt, context } = options;
        const startTime = Date.now();

        const apiKey = getApiKey();
        if (!apiKey) {
            return {
                success: false,
                error: 'YouTube API key not configured. Add it in Settings > Automation.',
                handlerUsed: 'youtube-research',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const query = context?.query as string || prompt;
            const maxResults = context?.maxResults as number || 10;
            const order = (context?.order as 'relevance' | 'date' | 'viewCount' | 'rating') || 'relevance';

            const result = await searchVideos(apiKey, query, maxResults, order);

            // Format results as text for AI consumption
            const formattedText = formatVideosAsText(result.videos);

            return {
                success: true,
                text: formattedText,
                handlerUsed: 'youtube-research',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'YouTube search failed',
                handlerUsed: 'youtube-research',
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
 * Search YouTube videos
 */
export async function searchVideos(
    apiKey: string,
    query: string,
    maxResults = 10,
    order: 'relevance' | 'date' | 'viewCount' | 'rating' = 'relevance'
): Promise<YouTubeSearchResult> {
    const url = new URL(`${YOUTUBE_API_URL}/search`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('order', order);

    const response = await fetch(url.toString());
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'YouTube API error');
    }

    const data = await response.json();
    const videoIds = data.items.map((item: YouTubeApiItem) =>
        typeof item.id === 'object' ? item.id.videoId : item.id
    ).filter(Boolean);

    // Get detailed stats
    const videos = await getVideoDetails(apiKey, videoIds);

    return {
        videos,
        nextPageToken: data.nextPageToken,
        totalResults: data.pageInfo?.totalResults || videos.length,
    };
}

/**
 * Get video details including statistics
 */
async function getVideoDetails(
    apiKey: string,
    videoIds: string[]
): Promise<YouTubeVideo[]> {
    if (videoIds.length === 0) return [];

    const url = new URL(`${YOUTUBE_API_URL}/videos`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('id', videoIds.join(','));
    url.searchParams.set('part', 'snippet,statistics');

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = await response.json();

    return data.items.map((item: YouTubeApiItem): YouTubeVideo => ({
        id: typeof item.id === 'string' ? item.id : item.id.videoId || '',
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || '',
        viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount) : undefined,
        likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount) : undefined,
        commentCount: item.statistics?.commentCount ? parseInt(item.statistics.commentCount) : undefined,
        tags: item.snippet.tags,
    }));
}

/**
 * Get trending videos in a category
 */
export async function getTrendingVideos(
    apiKey: string,
    regionCode = 'US',
    categoryId?: string
): Promise<YouTubeVideo[]> {
    const url = new URL(`${YOUTUBE_API_URL}/videos`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', regionCode);
    url.searchParams.set('maxResults', '25');
    if (categoryId) url.searchParams.set('videoCategoryId', categoryId);

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = await response.json();
    return data.items.map((item: YouTubeApiItem): YouTubeVideo => ({
        id: typeof item.id === 'string' ? item.id : item.id.videoId || '',
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.high?.url || '',
        viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount) : undefined,
        tags: item.snippet.tags,
    }));
}

// ============================================================================
// Helper Functions
// ============================================================================

function getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
}

function formatVideosAsText(videos: YouTubeVideo[]): string {
    if (videos.length === 0) return 'No videos found.';

    const lines = videos.map((v, i) => {
        const views = v.viewCount ? `${formatNumber(v.viewCount)} views` : '';
        return `${i + 1}. "${v.title}" by ${v.channelTitle}${views ? ` (${views})` : ''}\n   ${v.description.slice(0, 150)}...`;
    });

    return `Found ${videos.length} videos:\n\n${lines.join('\n\n')}`;
}

function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

/**
 * Set YouTube API key
 */
export function setYouTubeApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, key);
}

/**
 * Check if YouTube is configured
 */
export function isYouTubeConfigured(): boolean {
    return !!getApiKey();
}

export default youtubeHandler;
