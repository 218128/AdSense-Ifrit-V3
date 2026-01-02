/**
 * Facebook API Client
 * FSD: features/sources/lib/facebookApi.ts
 * 
 * Facebook Graph API integration for page/group content.
 * Note: Requires Facebook App with appropriate permissions.
 */

// ============================================================================
// Types
// ============================================================================

export interface FacebookPost {
    id: string;
    message?: string;
    story?: string;
    full_picture?: string;
    permalink_url: string;
    created_time: string;
    shares?: { count: number };
    reactions?: { summary: { total_count: number } };
    comments?: { summary: { total_count: number } };
    from?: {
        id: string;
        name: string;
    };
    attachments?: {
        data: FacebookAttachment[];
    };
}

export interface FacebookAttachment {
    type: 'photo' | 'video' | 'share' | 'album';
    url?: string;
    title?: string;
    description?: string;
    media?: {
        image?: { src: string; height: number; width: number };
    };
}

export interface FacebookPage {
    id: string;
    name: string;
    about?: string;
    category?: string;
    fan_count?: number;
    cover?: { source: string };
    picture?: { data: { url: string } };
    link: string;
}

export interface FacebookCredentials {
    accessToken: string;
    appId?: string;
    appSecret?: string;
}

export interface FacebookPostResult {
    posts: FacebookPost[];
    paging?: {
        next?: string;
        previous?: string;
    };
}

// ============================================================================
// Configuration
// ============================================================================

let fbCredentials: FacebookCredentials | null = null;

const FB_GRAPH_URL = 'https://graph.facebook.com/v18.0';

export function setFacebookCredentials(creds: FacebookCredentials): void {
    fbCredentials = creds;
}

export function getFacebookCredentials(): FacebookCredentials | null {
    if (fbCredentials) return fbCredentials;
    if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('ifrit_facebook_access_token');
        if (accessToken) {
            return { accessToken };
        }
    }
    return null;
}

export function isFacebookConfigured(): boolean {
    return !!getFacebookCredentials();
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Get posts from a Facebook Page
 */
export async function getPagePosts(
    pageId: string,
    options: {
        limit?: number;
        fields?: string[];
    } = {}
): Promise<FacebookPostResult> {
    const creds = getFacebookCredentials();
    if (!creds) throw new Error('Facebook credentials not configured');

    const limit = options.limit || 25;
    const fields = options.fields || [
        'id',
        'message',
        'story',
        'full_picture',
        'permalink_url',
        'created_time',
        'shares',
        'reactions.summary(true)',
        'comments.summary(true)',
        'from',
        'attachments',
    ];

    const url = `${FB_GRAPH_URL}/${pageId}/posts?` + new URLSearchParams({
        access_token: creds.accessToken,
        fields: fields.join(','),
        limit: String(limit),
    });

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Facebook API error');
    }

    const data = await response.json();
    return {
        posts: data.data || [],
        paging: data.paging,
    };
}

/**
 * Get page info
 */
export async function getPageInfo(pageId: string): Promise<FacebookPage> {
    const creds = getFacebookCredentials();
    if (!creds) throw new Error('Facebook credentials not configured');

    const fields = ['id', 'name', 'about', 'category', 'fan_count', 'cover', 'picture', 'link'];

    const url = `${FB_GRAPH_URL}/${pageId}?` + new URLSearchParams({
        access_token: creds.accessToken,
        fields: fields.join(','),
    });

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Facebook API error');
    }

    return response.json();
}

/**
 * Search public pages
 */
export async function searchPages(
    query: string,
    limit: number = 10
): Promise<FacebookPage[]> {
    const creds = getFacebookCredentials();
    if (!creds) throw new Error('Facebook credentials not configured');

    const url = `${FB_GRAPH_URL}/pages/search?` + new URLSearchParams({
        access_token: creds.accessToken,
        q: query,
        limit: String(limit),
    });

    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Facebook API error');
    }

    const data = await response.json();
    return data.data || [];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate engagement score for a post
 */
export function calculateFacebookEngagement(post: FacebookPost): number {
    const reactions = post.reactions?.summary?.total_count || 0;
    const comments = post.comments?.summary?.total_count || 0;
    const shares = post.shares?.count || 0;

    // Weighted: shares (3x), comments (2x), reactions (1x)
    return reactions + (comments * 2) + (shares * 3);
}

/**
 * Get best image from post
 */
export function getFacebookPostImage(post: FacebookPost): string | undefined {
    if (post.full_picture) return post.full_picture;

    const attachment = post.attachments?.data[0];
    if (attachment?.media?.image?.src) {
        return attachment.media.image.src;
    }

    return undefined;
}

/**
 * Get post text content
 */
export function getFacebookPostText(post: FacebookPost): string {
    return post.message || post.story || '';
}

/**
 * Get relative time since post
 */
export function getPostAge(post: FacebookPost): string {
    const created = new Date(post.created_time);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w ago`;
}
