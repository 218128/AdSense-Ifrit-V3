/**
 * Social Sources Feature
 * FSD: features/social/index.ts
 * 
 * Unified API for video and social media content sourcing.
 */

// YouTube exports
export {
    youtubeHandler,
    searchVideos,
    getTrendingVideos,
    setYouTubeApiKey,
    isYouTubeConfigured,
    type YouTubeVideo,
    type YouTubeSearchResult,
} from '@/lib/ai/handlers/youtubeHandler';

// Twitter exports
export {
    twitterHandler,
    searchTweets,
    getTrends,
    extractHashtags,
    setTwitterBearerToken,
    isTwitterConfigured,
    type TwitterTrend,
    type TwitterTweet,
    type TwitterSearchResult,
} from '@/lib/ai/handlers/twitterHandler';

// ============================================================================
// Types
// ============================================================================

export interface SocialTopic {
    title: string;
    source: 'youtube' | 'twitter';
    engagement: number;
    url?: string;
    hashtags?: string[];
}

// ============================================================================
// Topic Discovery
// ============================================================================

/**
 * Discover trending topics from multiple sources
 */
export async function discoverTopics(
    query: string,
    sources: ('youtube' | 'twitter')[] = ['youtube', 'twitter']
): Promise<SocialTopic[]> {
    const topics: SocialTopic[] = [];

    // Dynamic imports for handlers
    const promises = sources.map(async (source) => {
        try {
            if (source === 'youtube') {
                const { searchVideos } = await import('@/lib/ai/handlers/youtubeHandler');
                const apiKey = typeof window !== 'undefined'
                    ? localStorage.getItem('ifrit_youtube_api_key')
                    : null;
                if (!apiKey) return [];

                const result = await searchVideos(apiKey, query, 10, 'viewCount');
                return result.videos.map((v): SocialTopic => ({
                    title: v.title,
                    source: 'youtube',
                    engagement: v.viewCount || 0,
                    url: `https://youtube.com/watch?v=${v.id}`,
                    hashtags: v.tags?.slice(0, 5),
                }));
            }

            if (source === 'twitter') {
                const { searchTweets, extractHashtags } = await import('@/lib/ai/handlers/twitterHandler');
                const token = typeof window !== 'undefined'
                    ? localStorage.getItem('ifrit_twitter_bearer_token')
                    : null;
                if (!token) return [];

                const result = await searchTweets(token, query, 20);
                const hashtags = extractHashtags(result.tweets);

                // Group by hashtags for topic generation
                return hashtags.slice(0, 10).map((tag, i): SocialTopic => ({
                    title: `${query} - ${tag}`,
                    source: 'twitter',
                    engagement: 100 - i * 10, // Rank by frequency
                    hashtags: [tag],
                }));
            }

            return [];
        } catch {
            return [];
        }
    });

    const results = await Promise.all(promises);
    results.forEach(r => topics.push(...r));

    // Sort by engagement
    return topics.sort((a, b) => b.engagement - a.engagement);
}

/**
 * Generate content ideas from social trends
 */
export function generateContentIdeas(topics: SocialTopic[]): string[] {
    const ideas: string[] = [];

    for (const topic of topics.slice(0, 20)) {
        // Transform video titles into article ideas
        if (topic.source === 'youtube') {
            const clean = topic.title
                .replace(/\[.*?\]/g, '') // Remove [brackets]
                .replace(/\|.*$/g, '')   // Remove | channel name
                .trim();

            ideas.push(`The Complete Guide: ${clean}`);
            ideas.push(`${clean} - Everything You Need to Know`);
        }

        // Transform hashtags into article ideas
        if (topic.source === 'twitter' && topic.hashtags) {
            const tag = topic.hashtags[0].replace('#', '');
            ideas.push(`What Everyone is Saying About ${tag}`);
            ideas.push(`${tag} Trends: A Deep Dive`);
        }
    }

    // Deduplicate
    return [...new Set(ideas)].slice(0, 30);
}
