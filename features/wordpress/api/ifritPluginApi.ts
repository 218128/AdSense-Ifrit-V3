/**
 * Ifrit Plugin API Client
 * FSD: features/wordpress/api/ifritPluginApi.ts
 * 
 * Client for communicating with ifrit-connector WordPress plugin.
 * Uses the plugin's REST API for faster operations than WP REST API.
 */

import type { WPSite } from '../model/types';
import type { SiteAnalytics } from '../model/analyticsTypes';

// ============================================================================
// Types
// ============================================================================

export interface PluginHealthResponse {
    status: 'ok';
    plugin: string;
    version: string;
    wordpress: string;
    php: string;
    timestamp: string;
}

export interface PluginSiteInfo {
    site: {
        name: string;
        description: string;
        url: string;
        admin_email: string;
        language: string;
        timezone: string;
    };
    wordpress: {
        version: string;
        multisite: boolean;
    };
    theme: {
        name: string;
        version: string;
        template: string;
    };
    stats: {
        posts: number;
        pages: number;
        comments: number;
        users: number;
    };
}

export interface PluginAnalyticsResponse {
    success: boolean;
    site_kit_active: boolean;
    wordpress_stats: {
        posts: {
            published: number;
            draft: number;
            pending: number;
            total: number;
        };
        pages: number;
        comments: {
            approved: number;
            pending: number;
            spam: number;
        };
        users: number;
        posts_by_month: Array<{ month: string; count: number }>;
        top_posts: Array<{ id: number; title: string; comments: number; url: string }>;
    };
    search_console?: unknown;
    analytics?: unknown;
    adsense?: unknown;
    page_speed?: {
        performance: number;
        accessibility: number;
        best_practices: number;
        seo: number;
        lcp: number;
        fid: number;
        cls: number;
        fetched_at: string;
    };
}

export interface CreatePostRequest {
    title: string;
    content: string;
    status?: 'draft' | 'publish' | 'pending';
    excerpt?: string;
    slug?: string;
    author_id?: number;
    categories?: number[];
    tags?: string[];
    featured_image_url?: string;
    featured_image_alt?: string;
    campaign_id?: string;
    meta?: Record<string, unknown>;
}

export interface CreatePostResponse {
    success: boolean;
    post_id: number;
    url: string;
    edit_url: string;
    status: string;
}

export interface UploadMediaRequest {
    url?: string;          // Image URL to download
    data?: string;         // Base64 data
    filename?: string;
    post_id?: number;
    alt?: string;
}

export interface UploadMediaResponse {
    success: boolean;
    attachment_id: number;
    url: string;
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Check if site has ifrit-connector plugin installed
 */
export async function checkPluginHealth(site: WPSite): Promise<PluginHealthResponse | null> {
    try {
        const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Get site information via plugin
 */
export async function getPluginSiteInfo(site: WPSite): Promise<PluginSiteInfo | null> {
    if (!site.ifritToken) {
        console.warn('[PluginAPI] No ifrit token for site:', site.domain);
        return null;
    }

    try {
        const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/site`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Ifrit-Token': site.ifritToken,
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.success ? data : null;
    } catch {
        return null;
    }
}

/**
 * Get analytics via plugin (Site Kit + WP stats)
 */
export async function getPluginAnalytics(site: WPSite): Promise<PluginAnalyticsResponse | null> {
    if (!site.ifritToken) {
        return null;
    }

    try {
        const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/analytics`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Ifrit-Token': site.ifritToken,
            },
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Create post via plugin
 */
export async function createPostViaPlugin(
    site: WPSite,
    post: CreatePostRequest
): Promise<CreatePostResponse> {
    if (!site.ifritToken) {
        throw new Error('Ifrit plugin token not configured');
    }

    const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Ifrit-Token': site.ifritToken,
        },
        body: JSON.stringify(post),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create post');
    }

    return await response.json();
}

/**
 * Update post via plugin
 */
export async function updatePostViaPlugin(
    site: WPSite,
    postId: number,
    updates: Partial<CreatePostRequest>
): Promise<CreatePostResponse> {
    if (!site.ifritToken) {
        throw new Error('Ifrit plugin token not configured');
    }

    const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/posts/${postId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Ifrit-Token': site.ifritToken,
        },
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update post');
    }

    return await response.json();
}

/**
 * Upload media via plugin
 */
export async function uploadMediaViaPlugin(
    site: WPSite,
    media: UploadMediaRequest
): Promise<UploadMediaResponse> {
    if (!site.ifritToken) {
        throw new Error('Ifrit plugin token not configured');
    }

    const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/media`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Ifrit-Token': site.ifritToken,
        },
        body: JSON.stringify(media),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload media');
    }

    return await response.json();
}

/**
 * Configure webhook URL on the plugin
 */
export async function setPluginWebhookUrl(
    site: WPSite,
    webhookUrl: string
): Promise<boolean> {
    if (!site.ifritToken) {
        return false;
    }

    try {
        const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/webhook-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Ifrit-Token': site.ifritToken,
            },
            body: JSON.stringify({ webhook_url: webhookUrl }),
        });

        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Install a plugin remotely (requires remote management enabled)
 */
export async function installPluginRemotely(
    site: WPSite,
    pluginSlug: string,
    activate: boolean = true
): Promise<{ success: boolean; message: string }> {
    if (!site.ifritToken) {
        throw new Error('Ifrit plugin token not configured');
    }

    const response = await fetch(`${site.siteUrl}/wp-json/ifrit/v1/plugins/install`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Ifrit-Token': site.ifritToken,
        },
        body: JSON.stringify({ slug: pluginSlug, activate }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to install plugin');
    }

    return data;
}
