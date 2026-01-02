/**
 * Instagram API Client
 * FSD: features/sources/lib/instagramApi.ts
 * 
 * Instagram Basic Display API / Graph API integration.
 * Note: Requires Instagram Business/Creator account connected to Facebook.
 */

// ============================================================================
// Types
// ============================================================================

export interface InstagramMedia {
    id: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    caption?: string;
    timestamp: string;
    username?: string;
    like_count?: number;
    comments_count?: number;
    children?: {
        data: { id: string; media_type: string; media_url: string }[];
    };
}

export interface InstagramUser {
    id: string;
    username: string;
    name?: string;
    biography?: string;
    profile_picture_url?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    website?: string;
}

export interface InstagramCredentials {
    accessToken: string;
    userId?: string;
}

export interface InstagramMediaResult {
    media: InstagramMedia[];
    paging?: {
        cursors?: { before?: string; after?: string };
        next?: string;
    };
}

// ============================================================================
// Configuration
// ============================================================================

let igCredentials: InstagramCredentials | null = null;

const IG_GRAPH_URL = 'https://graph.instagram.com';
const FB_GRAPH_URL = 'https://graph.facebook.com/v18.0';

export function setInstagramCredentials(creds: InstagramCredentials): void {
    igCredentials = creds;
}

export function getInstagramCredentials(): InstagramCredentials | null {
    if (igCredentials) return igCredentials;
    if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('ifrit_instagram_access_token');
        const userId = localStorage.getItem('ifrit_instagram_user_id');
        if (accessToken) {
            return { accessToken, userId: userId || undefined };
        }
    }
    return null;
}

export function isInstagramConfigured(): boolean {
    return !!getInstagramCredentials();
}

// ============================================================================
// API Methods - Basic Display API
// ============================================================================

/**
 * Get user's own media (Basic Display API)
 */
export async function getOwnMedia(
    options: { limit?: number; after?: string } = {}
): Promise<InstagramMediaResult> {
    const creds = getInstagramCredentials();
    if (!creds) throw new Error('Instagram credentials not configured');

    const fields = [
        'id',
        'media_type',
        'media_url',
        'thumbnail_url',
        'permalink',
        'caption',
        'timestamp',
        'username',
    ];

    const params = new URLSearchParams({
        access_token: creds.accessToken,
        fields: fields.join(','),
        limit: String(options.limit || 25),
    });

    if (options.after) params.set('after', options.after);

    const url = `${IG_GRAPH_URL}/me/media?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Instagram API error');
    }

    const data = await response.json();
    return {
        media: data.data || [],
        paging: data.paging,
    };
}

/**
 * Get user profile info
 */
export async function getUserProfile(): Promise<InstagramUser> {
    const creds = getInstagramCredentials();
    if (!creds) throw new Error('Instagram credentials not configured');

    const fields = ['id', 'username', 'account_type', 'media_count'];

    const url = `${IG_GRAPH_URL}/me?` + new URLSearchParams({
        access_token: creds.accessToken,
        fields: fields.join(','),
    });

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Instagram API error');
    }

    return response.json();
}

// ============================================================================
// API Methods - Instagram Graph API (Business/Creator)
// ============================================================================

/**
 * Get business account media with insights
 */
export async function getBusinessMedia(
    igUserId: string,
    options: { limit?: number; after?: string } = {}
): Promise<InstagramMediaResult> {
    const creds = getInstagramCredentials();
    if (!creds) throw new Error('Instagram credentials not configured');

    const fields = [
        'id',
        'media_type',
        'media_url',
        'thumbnail_url',
        'permalink',
        'caption',
        'timestamp',
        'like_count',
        'comments_count',
        'children{id,media_type,media_url}',
    ];

    const params = new URLSearchParams({
        access_token: creds.accessToken,
        fields: fields.join(','),
        limit: String(options.limit || 25),
    });

    if (options.after) params.set('after', options.after);

    const url = `${FB_GRAPH_URL}/${igUserId}/media?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Instagram API error');
    }

    const data = await response.json();
    return {
        media: data.data || [],
        paging: data.paging,
    };
}

/**
 * Get business account info
 */
export async function getBusinessProfile(igUserId: string): Promise<InstagramUser> {
    const creds = getInstagramCredentials();
    if (!creds) throw new Error('Instagram credentials not configured');

    const fields = [
        'id',
        'username',
        'name',
        'biography',
        'profile_picture_url',
        'followers_count',
        'follows_count',
        'media_count',
        'website',
    ];

    const url = `${FB_GRAPH_URL}/${igUserId}?` + new URLSearchParams({
        access_token: creds.accessToken,
        fields: fields.join(','),
    });

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Instagram API error');
    }

    return response.json();
}

/**
 * Search hashtags (Business API)
 */
export async function searchHashtag(
    hashtag: string,
    igUserId: string,
    type: 'recent' | 'top' = 'recent',
    limit: number = 25
): Promise<InstagramMedia[]> {
    const creds = getInstagramCredentials();
    if (!creds) throw new Error('Instagram credentials not configured');

    // First, get hashtag ID
    const searchUrl = `${FB_GRAPH_URL}/ig_hashtag_search?` + new URLSearchParams({
        access_token: creds.accessToken,
        user_id: igUserId,
        q: hashtag,
    });

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
        throw new Error('Hashtag search failed');
    }

    const searchData = await searchResponse.json();
    const hashtagId = searchData.data?.[0]?.id;

    if (!hashtagId) {
        return [];
    }

    // Then get media for hashtag
    const endpoint = type === 'top' ? 'top_media' : 'recent_media';
    const fields = ['id', 'media_type', 'permalink', 'caption', 'timestamp', 'like_count', 'comments_count'];

    const mediaUrl = `${FB_GRAPH_URL}/${hashtagId}/${endpoint}?` + new URLSearchParams({
        access_token: creds.accessToken,
        user_id: igUserId,
        fields: fields.join(','),
        limit: String(limit),
    });

    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok) {
        throw new Error('Hashtag media fetch failed');
    }

    const mediaData = await mediaResponse.json();
    return mediaData.data || [];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate engagement rate
 */
export function calculateInstagramEngagement(media: InstagramMedia, followerCount?: number): number {
    const likes = media.like_count || 0;
    const comments = media.comments_count || 0;
    const total = likes + comments;

    if (followerCount && followerCount > 0) {
        return (total / followerCount) * 100;
    }

    return total;
}

/**
 * Get best media URL (handles video thumbnails)
 */
export function getInstagramMediaUrl(media: InstagramMedia): string {
    if (media.media_type === 'VIDEO') {
        return media.thumbnail_url || media.media_url || '';
    }
    return media.media_url || '';
}

/**
 * Extract hashtags from caption
 */
export function extractInstagramHashtags(caption?: string): string[] {
    if (!caption) return [];
    const matches = caption.match(/#[\w\u00C0-\u024f]+/g);
    return matches || [];
}

/**
 * Get carousel images
 */
export function getCarouselImages(media: InstagramMedia): string[] {
    if (media.media_type !== 'CAROUSEL_ALBUM') {
        return media.media_url ? [media.media_url] : [];
    }

    return media.children?.data
        .filter(child => child.media_type === 'IMAGE' && child.media_url)
        .map(child => child.media_url) || [];
}
