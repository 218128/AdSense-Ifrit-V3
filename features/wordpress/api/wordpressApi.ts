/**
 * WordPress Feature - REST API Client
 * FSD: features/wordpress/api/wordpressApi.ts
 * 
 * Uses WordPress REST API with Application Passwords authentication.
 * @see https://developer.wordpress.org/rest-api/
 */

import type {
    WPSite,
    WPPostInput,
    WPPostResult,
    WPMediaInput,
    WPMediaResult,
    WPCategory,
    WPTag,
    WPAuthor,
    WPApiResponse,
    WPConnectionTestResult,
} from '../model/types';

// ============================================================================
// Core HTTP Client
// ============================================================================

/**
 * Make authenticated request to WordPress REST API
 */
async function wpFetch<T>(
    site: WPSite,
    endpoint: string,
    options: RequestInit = {}
): Promise<WPApiResponse<T>> {
    const baseUrl = site.url.replace(/\/$/, '');
    const url = `${baseUrl}/wp-json/wp/v2${endpoint}`;

    // Create Basic Auth header from username:appPassword
    const auth = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            };
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

// ============================================================================
// Connection Testing
// ============================================================================

/**
 * Test WordPress connection and get site info
 */
export async function testConnection(site: WPSite): Promise<WPConnectionTestResult> {
    const baseUrl = site.url.replace(/\/$/, '');

    try {
        // First, check if REST API is accessible (no auth needed)
        const infoResponse = await fetch(`${baseUrl}/wp-json/`);
        if (!infoResponse.ok) {
            return {
                connected: false,
                error: 'WordPress REST API not accessible. Check URL.',
            };
        }

        const siteInfo = await infoResponse.json();

        // Now test authentication by fetching users/me
        const auth = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');
        const authResponse = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
            headers: { 'Authorization': `Basic ${auth}` },
        });

        if (!authResponse.ok) {
            return {
                connected: false,
                siteName: siteInfo.name,
                siteUrl: siteInfo.url,
                error: 'Authentication failed. Check username and Application Password.',
            };
        }

        return {
            connected: true,
            siteName: siteInfo.name,
            siteUrl: siteInfo.url,
            wpVersion: siteInfo.namespaces?.includes('wp/v2') ? 'v2+' : 'unknown',
        };

    } catch (error) {
        return {
            connected: false,
            error: error instanceof Error ? error.message : 'Connection failed',
        };
    }
}

// ============================================================================
// Posts
// ============================================================================

/**
 * Create a new post on WordPress site
 */
export async function createPost(
    site: WPSite,
    post: WPPostInput
): Promise<WPApiResponse<WPPostResult>> {
    return wpFetch<WPPostResult>(site, '/posts', {
        method: 'POST',
        body: JSON.stringify(post),
    });
}

/**
 * Update existing post
 */
export async function updatePost(
    site: WPSite,
    postId: number,
    updates: Partial<WPPostInput>
): Promise<WPApiResponse<WPPostResult>> {
    return wpFetch<WPPostResult>(site, `/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

// ============================================================================
// Pages (for Legal Pages, About, Contact, etc.)
// ============================================================================

export interface WPPageInput {
    title: string;
    content: string;
    slug?: string;
    status?: 'publish' | 'draft' | 'pending' | 'private';
    parent?: number;
    menu_order?: number;
    comment_status?: 'open' | 'closed';
}

export interface WPPageResult {
    id: number;
    link: string;
    slug: string;
    title: { rendered: string };
    status: string;
}

/**
 * Create a new page on WordPress site
 */
export async function createPage(
    site: WPSite,
    page: WPPageInput
): Promise<WPApiResponse<WPPageResult>> {
    return wpFetch<WPPageResult>(site, '/pages', {
        method: 'POST',
        body: JSON.stringify(page),
    });
}

/**
 * Update existing page
 */
export async function updatePage(
    site: WPSite,
    pageId: number,
    updates: Partial<WPPageInput>
): Promise<WPApiResponse<WPPageResult>> {
    return wpFetch<WPPageResult>(site, `/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

/**
 * Get all pages from WordPress site
 */
export async function getPages(site: WPSite): Promise<WPApiResponse<WPPageResult[]>> {
    return wpFetch<WPPageResult[]>(site, '/pages?per_page=100');
}

/**
 * Get page by slug
 */
export async function getPageBySlug(
    site: WPSite,
    slug: string
): Promise<WPApiResponse<WPPageResult | null>> {
    const result = await wpFetch<WPPageResult[]>(site, `/pages?slug=${encodeURIComponent(slug)}`);
    if (result.success && result.data && result.data.length > 0) {
        return { success: true, data: result.data[0] };
    }
    return { success: true, data: null };
}

// ============================================================================
// Media
// ============================================================================

/**
 * Upload media (image) to WordPress
 */
export async function uploadMedia(
    site: WPSite,
    media: WPMediaInput
): Promise<WPApiResponse<WPMediaResult>> {
    const baseUrl = site.url.replace(/\/$/, '');
    const url = `${baseUrl}/wp-json/wp/v2/media`;
    const auth = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');

    try {
        // Media upload requires multipart form data
        const formData = new FormData();
        const blob = media.file instanceof Blob
            ? media.file
            : new Blob([new Uint8Array(media.file)], { type: media.mimeType });

        formData.append('file', blob, media.filename);
        if (media.title) formData.append('title', media.title);
        if (media.alt_text) formData.append('alt_text', media.alt_text);
        if (media.caption) formData.append('caption', media.caption);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                // Don't set Content-Type - browser will set it with boundary
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || `Upload failed: ${response.status}`,
            };
        }

        const data = await response.json();
        return {
            success: true,
            data: {
                id: data.id,
                source_url: data.source_url,
                alt_text: data.alt_text || '',
            }
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
        };
    }
}

// ============================================================================
// Taxonomies
// ============================================================================

/**
 * Get all categories from WordPress site
 */
export async function getCategories(site: WPSite): Promise<WPApiResponse<WPCategory[]>> {
    return wpFetch<WPCategory[]>(site, '/categories?per_page=100');
}

/**
 * Get all tags from WordPress site
 */
export async function getTags(site: WPSite): Promise<WPApiResponse<WPTag[]>> {
    return wpFetch<WPTag[]>(site, '/tags?per_page=100');
}

/**
 * Create a new category
 */
export async function createCategory(
    site: WPSite,
    name: string,
    parent?: number
): Promise<WPApiResponse<WPCategory>> {
    return wpFetch<WPCategory>(site, '/categories', {
        method: 'POST',
        body: JSON.stringify({ name, parent }),
    });
}

/**
 * Create a new tag
 */
export async function createTag(
    site: WPSite,
    name: string
): Promise<WPApiResponse<WPTag>> {
    return wpFetch<WPTag>(site, '/tags', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
}

// ============================================================================
// Users/Authors
// ============================================================================

/**
 * Get all authors from WordPress site
 */
export async function getAuthors(site: WPSite): Promise<WPApiResponse<WPAuthor[]>> {
    return wpFetch<WPAuthor[]>(site, '/users?per_page=100&who=authors');
}

// ============================================================================
// Sync All Metadata
// ============================================================================

/**
 * Sync all site metadata (categories, tags, authors)
 */
export async function syncSiteMetadata(site: WPSite): Promise<{
    categories: WPCategory[];
    tags: WPTag[];
    authors: WPAuthor[];
    error?: string;
}> {
    const [catResult, tagResult, authorResult] = await Promise.all([
        getCategories(site),
        getTags(site),
        getAuthors(site),
    ]);

    return {
        categories: catResult.success ? catResult.data || [] : [],
        tags: tagResult.success ? tagResult.data || [] : [],
        authors: authorResult.success ? authorResult.data || [] : [],
        error: [catResult, tagResult, authorResult]
            .filter(r => !r.success)
            .map(r => r.error)
            .join('; ') || undefined,
    };
}
