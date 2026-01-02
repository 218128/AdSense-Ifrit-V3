/**
 * Video Source Helper
 * FSD: features/sources/lib/videoSource.ts
 * 
 * Converts video metadata (YouTube, Vimeo, etc.) to campaign SourceItems.
 */

import {
    YouTubeVideo,
    searchVideos,
    getChannelVideos,
    getChannelInfo,
    getVideoTranscript,
    getBestThumbnail,
    formatDuration,
    extractVideoId,
} from './youtubeApi';

// ============================================================================
// Types
// ============================================================================

export interface VideoSourceItem {
    id: string;
    topic: string;
    sourceType: 'youtube';
    sourceUrl: string;
    videoId: string;
    title: string;
    description: string;
    transcript?: string;
    thumbnailUrl: string;
    channelName: string;
    channelId: string;
    publishedAt: string;
    duration: string;
    viewCount?: number;
    tags?: string[];
}

export interface VideoSourceConfig {
    type: 'search' | 'channel';
    query?: string;
    channelUrl?: string;
    maxVideos: number;
    includeTranscript: boolean;
    minViews?: number;
    publishedAfter?: string;
}

export interface VideoSourceResult {
    success: boolean;
    items: VideoSourceItem[];
    error?: string;
    channelInfo?: {
        title: string;
        description: string;
        subscriberCount?: number;
    };
}

// ============================================================================
// Source Fetching
// ============================================================================

/**
 * Fetch videos based on config
 */
export async function fetchVideoSource(
    config: VideoSourceConfig
): Promise<VideoSourceResult> {
    try {
        let videos: YouTubeVideo[] = [];
        let channelInfo = undefined;

        if (config.type === 'search' && config.query) {
            const result = await searchVideos(config.query, {
                maxResults: config.maxVideos,
                publishedAfter: config.publishedAfter,
            });
            videos = result.videos;
        } else if (config.type === 'channel' && config.channelUrl) {
            // Get channel info
            const channel = await getChannelInfo(config.channelUrl);
            if (!channel) {
                return { success: false, items: [], error: 'Channel not found' };
            }

            channelInfo = {
                title: channel.title,
                description: channel.description,
                subscriberCount: channel.subscriberCount,
            };

            const result = await getChannelVideos(channel.id, {
                maxResults: config.maxVideos,
            });
            videos = result.videos;
        } else {
            return { success: false, items: [], error: 'Invalid video source config' };
        }

        // Filter by minimum views if specified
        if (config.minViews) {
            videos = videos.filter(v => (v.viewCount || 0) >= config.minViews!);
        }

        // Convert to VideoSourceItems
        const items = await Promise.all(
            videos.map(video => videoToSourceItem(video, config.includeTranscript))
        );

        return {
            success: true,
            items,
            channelInfo,
        };

    } catch (error) {
        return {
            success: false,
            items: [],
            error: error instanceof Error ? error.message : 'Failed to fetch videos',
        };
    }
}

/**
 * Convert YouTube video to SourceItem
 */
async function videoToSourceItem(
    video: YouTubeVideo,
    includeTranscript: boolean
): Promise<VideoSourceItem> {
    let transcript: string | undefined;

    if (includeTranscript) {
        const transcriptResult = await getVideoTranscript(video.id);
        if (transcriptResult.success && transcriptResult.fullText) {
            transcript = transcriptResult.fullText;
        }
    }

    return {
        id: `yt_${video.id}`,
        topic: video.title,
        sourceType: 'youtube',
        sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
        videoId: video.id,
        title: video.title,
        description: video.description,
        transcript,
        thumbnailUrl: getBestThumbnail(video.thumbnails),
        channelName: video.channelTitle,
        channelId: video.channelId,
        publishedAt: video.publishedAt,
        duration: video.duration ? formatDuration(video.duration) : '',
        viewCount: video.viewCount,
        tags: video.tags,
    };
}

/**
 * Get source item for a single video URL
 */
export async function getVideoSourceItem(
    url: string,
    includeTranscript: boolean = true
): Promise<VideoSourceItem | null> {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    // Import dynamically to avoid issues
    const { getVideoDetails } = await import('./youtubeApi');
    const videos = await getVideoDetails([videoId]);

    if (videos.length === 0) return null;

    return videoToSourceItem(videos[0], includeTranscript);
}

// ============================================================================
// Content Generation Helpers
// ============================================================================

/**
 * Generate article prompt context from video
 */
export function generateVideoContext(item: VideoSourceItem): string {
    const parts: string[] = [
        `Video Title: ${item.title}`,
        `Channel: ${item.channelName}`,
        `Published: ${new Date(item.publishedAt).toLocaleDateString()}`,
        `Duration: ${item.duration}`,
    ];

    if (item.viewCount) {
        parts.push(`Views: ${item.viewCount.toLocaleString()}`);
    }

    if (item.tags && item.tags.length > 0) {
        parts.push(`Tags: ${item.tags.slice(0, 10).join(', ')}`);
    }

    parts.push('');
    parts.push('Video Description:');
    parts.push(item.description.slice(0, 500));

    if (item.transcript) {
        parts.push('');
        parts.push('Transcript Summary:');
        parts.push(item.transcript.slice(0, 2000));
    }

    return parts.join('\n');
}

/**
 * Create prompt for AI article generation from video
 */
export function createVideoArticlePrompt(
    item: VideoSourceItem,
    options: {
        style?: 'summary' | 'analysis' | 'tutorial' | 'news';
        wordCount?: number;
    } = {}
): string {
    const style = options.style || 'summary';
    const wordCount = options.wordCount || 1500;

    const styleInstructions: Record<string, string> = {
        summary: 'Create a comprehensive article summarizing the key points and insights from this video.',
        analysis: 'Write an analytical article that expands on the topic, adding your perspective and additional research.',
        tutorial: 'Convert this video content into a step-by-step tutorial or how-to guide.',
        news: 'Write a news-style article covering the information presented in this video.',
    };

    return `
Based on the following video content, ${styleInstructions[style]}

---
${generateVideoContext(item)}
---

Requirements:
- Write approximately ${wordCount} words
- Include proper headings (H2, H3)
- Create an engaging introduction
- Add a conclusion section
- Do NOT copy the transcript verbatim - rewrite in your own words
- Credit the original video with a link: ${item.sourceUrl}
- Optimize for SEO with the topic: "${item.topic}"

Write the article in HTML format using semantic tags (article, section, header, etc.).
`.trim();
}
