/**
 * YouTube API Client
 * FSD: features/sources/lib/youtubeApi.ts
 * 
 * YouTube Data API v3 integration for video search, metadata, and transcripts.
 */

// ============================================================================
// Types
// ============================================================================

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
        default?: { url: string; width: number; height: number };
        medium?: { url: string; width: number; height: number };
        high?: { url: string; width: number; height: number };
        maxres?: { url: string; width: number; height: number };
    };
    duration?: string;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    tags?: string[];
    categoryId?: string;
}

export interface YouTubeChannel {
    id: string;
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: YouTubeVideo['thumbnails'];
    subscriberCount?: number;
    videoCount?: number;
}

export interface YouTubeSearchResult {
    videos: YouTubeVideo[];
    nextPageToken?: string;
    totalResults: number;
}

export interface YouTubeTranscript {
    text: string;
    start: number;
    duration: number;
}

export interface TranscriptResult {
    success: boolean;
    transcript?: YouTubeTranscript[];
    fullText?: string;
    language?: string;
    error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

let youtubeApiKey: string | null = null;

export function setYouTubeApiKey(key: string): void {
    youtubeApiKey = key;
}

export function getYouTubeApiKey(): string | null {
    if (youtubeApiKey) return youtubeApiKey;
    if (typeof window !== 'undefined') {
        return localStorage.getItem('ifrit_youtube_api_key');
    }
    return process.env.YOUTUBE_API_KEY || null;
}

export function isYouTubeConfigured(): boolean {
    return !!getYouTubeApiKey();
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search YouTube videos by keyword
 */
export async function searchVideos(
    query: string,
    options: {
        maxResults?: number;
        pageToken?: string;
        order?: 'relevance' | 'date' | 'rating' | 'viewCount';
        publishedAfter?: string;
        channelId?: string;
    } = {}
): Promise<YouTubeSearchResult> {
    const apiKey = getYouTubeApiKey();
    if (!apiKey) {
        throw new Error('YouTube API key not configured');
    }

    const params = new URLSearchParams({
        key: apiKey,
        part: 'snippet',
        type: 'video',
        q: query,
        maxResults: String(options.maxResults || 10),
        order: options.order || 'relevance',
    });

    if (options.pageToken) params.set('pageToken', options.pageToken);
    if (options.publishedAfter) params.set('publishedAfter', options.publishedAfter);
    if (options.channelId) params.set('channelId', options.channelId);

    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'YouTube API search failed');
    }

    const data = await response.json();
    const videoIds = data.items.map((item: { id: { videoId: string } }) => item.id.videoId);

    // Get full video details
    const videos = await getVideoDetails(videoIds);

    return {
        videos,
        nextPageToken: data.nextPageToken,
        totalResults: data.pageInfo?.totalResults || videos.length,
    };
}

/**
 * Get video details by IDs
 */
export async function getVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
    if (videoIds.length === 0) return [];

    const apiKey = getYouTubeApiKey();
    if (!apiKey) {
        throw new Error('YouTube API key not configured');
    }

    const params = new URLSearchParams({
        key: apiKey,
        part: 'snippet,contentDetails,statistics',
        id: videoIds.join(','),
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'YouTube API video details failed');
    }

    const data = await response.json();

    return data.items.map((item: {
        id: string;
        snippet: {
            title: string;
            description: string;
            channelId: string;
            channelTitle: string;
            publishedAt: string;
            thumbnails: YouTubeVideo['thumbnails'];
            tags?: string[];
            categoryId?: string;
        };
        contentDetails?: { duration?: string };
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails,
        duration: item.contentDetails?.duration,
        viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount) : undefined,
        likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount) : undefined,
        commentCount: item.statistics?.commentCount ? parseInt(item.statistics.commentCount) : undefined,
        tags: item.snippet.tags,
        categoryId: item.snippet.categoryId,
    }));
}

/**
 * Get channel videos
 */
export async function getChannelVideos(
    channelId: string,
    options: { maxResults?: number; pageToken?: string } = {}
): Promise<YouTubeSearchResult> {
    return searchVideos('', { ...options, channelId });
}

/**
 * Get channel info by ID or custom URL
 */
export async function getChannelInfo(channelIdOrUrl: string): Promise<YouTubeChannel | null> {
    const apiKey = getYouTubeApiKey();
    if (!apiKey) {
        throw new Error('YouTube API key not configured');
    }

    // Extract channel ID from URL if needed
    let channelId = channelIdOrUrl;
    const urlMatch = channelIdOrUrl.match(/(?:youtube\.com\/(?:channel\/|c\/|@))([^\/\?]+)/);
    if (urlMatch) {
        channelId = urlMatch[1];
    }

    // Try by ID first
    const params = new URLSearchParams({
        key: apiKey,
        part: 'snippet,statistics',
    });

    // Check if it's a channel ID (starts with UC) or handle
    if (channelId.startsWith('UC')) {
        params.set('id', channelId);
    } else {
        params.set('forHandle', channelId.replace('@', ''));
    }

    const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'YouTube API channel info failed');
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
        return null;
    }

    const item = data.items[0];
    return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        customUrl: item.snippet.customUrl,
        thumbnails: item.snippet.thumbnails,
        subscriberCount: item.statistics?.subscriberCount
            ? parseInt(item.statistics.subscriberCount)
            : undefined,
        videoCount: item.statistics?.videoCount
            ? parseInt(item.statistics.videoCount)
            : undefined,
    };
}

/**
 * Extract video transcript/captions
 * Uses YouTube's timedtext API (works for auto-generated captions)
 */
export async function getVideoTranscript(videoId: string): Promise<TranscriptResult> {
    try {
        // Fetch video page to get caption tracks
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const pageHtml = await pageRes.text();

        // Extract caption track URL from the page
        const captionMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
        if (!captionMatch) {
            return { success: false, error: 'No captions available for this video' };
        }

        const captionTracks = JSON.parse(captionMatch[1]);
        if (captionTracks.length === 0) {
            return { success: false, error: 'No caption tracks found' };
        }

        // Prefer English, then auto-generated, then first available
        const track = captionTracks.find((t: { languageCode: string }) => t.languageCode === 'en')
            || captionTracks.find((t: { kind: string }) => t.kind === 'asr')
            || captionTracks[0];

        // Fetch the transcript XML
        const transcriptRes = await fetch(track.baseUrl);
        const transcriptXml = await transcriptRes.text();

        // Parse XML transcript
        const segments: YouTubeTranscript[] = [];
        const textMatches = transcriptXml.matchAll(/<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g);

        for (const match of textMatches) {
            segments.push({
                start: parseFloat(match[1]),
                duration: parseFloat(match[2]),
                text: decodeHtmlEntities(match[3]),
            });
        }

        // Combine into full text
        const fullText = segments.map(s => s.text).join(' ');

        return {
            success: true,
            transcript: segments,
            fullText,
            language: track.languageCode,
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch transcript',
        };
    }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Decode HTML entities in transcript text
 */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
        .trim();
}

/**
 * Parse ISO 8601 duration to seconds
 */
export function parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format duration for display
 */
export function formatDuration(isoDuration: string): string {
    const seconds = parseDuration(isoDuration);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

/**
 * Get best available thumbnail URL
 */
export function getBestThumbnail(thumbnails: YouTubeVideo['thumbnails']): string {
    return thumbnails.maxres?.url
        || thumbnails.high?.url
        || thumbnails.medium?.url
        || thumbnails.default?.url
        || '';
}
