/**
 * WP Author Sync
 * FSD: features/authors/lib/wpAuthorSync.ts
 * 
 * Syncs Ifrit Authors to WordPress sites as WP users.
 * Creates or finds matching WP users and stores the mapping.
 */

import type { AuthorProfile, WPAuthorMapping } from '../model/authorTypes';
import { useAuthorStore } from '../model/authorStore';
import type { WPSite } from '@/features/wordpress';

// ============================================================================
// Types
// ============================================================================

export interface WPUserCreatePayload {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    description?: string;
    url?: string;
    roles?: string[];
}

export interface WPUserResponse {
    id: number;
    username: string;
    name: string;
    email: string;
    url: string;
    description: string;
    link: string;
    slug: string;
    avatar_urls?: Record<string, string>;
}

export interface SyncResult {
    success: boolean;
    wpUserId?: number;
    wpUsername?: string;
    action: 'created' | 'found' | 'error';
    message: string;
}

// ============================================================================
// WP REST API Functions
// ============================================================================

/**
 * Build WP REST API headers with authentication
 */
function getWPHeaders(site: WPSite): Headers {
    const headers = new Headers({
        'Content-Type': 'application/json',
    });

    if (site.credentials?.username && site.credentials?.appPassword) {
        const auth = btoa(`${site.credentials.username}:${site.credentials.appPassword}`);
        headers.set('Authorization', `Basic ${auth}`);
    }

    return headers;
}

/**
 * Get WP REST API base URL
 */
function getWPApiUrl(site: WPSite): string {
    const base = site.url.replace(/\/$/, '');
    return `${base}/wp-json/wp/v2`;
}

/**
 * Search for existing WP user by email or username
 */
async function findWPUser(
    site: WPSite,
    email: string,
    username: string
): Promise<WPUserResponse | null> {
    const apiUrl = getWPApiUrl(site);
    const headers = getWPHeaders(site);

    try {
        // Search by slug (username)
        const response = await fetch(
            `${apiUrl}/users?slug=${encodeURIComponent(username)}`,
            { headers }
        );

        if (response.ok) {
            const users: WPUserResponse[] = await response.json();
            if (users.length > 0) {
                return users[0];
            }
        }

        // Search by email (requires search permission)
        const searchResponse = await fetch(
            `${apiUrl}/users?search=${encodeURIComponent(email)}`,
            { headers }
        );

        if (searchResponse.ok) {
            const users: WPUserResponse[] = await searchResponse.json();
            if (users.length > 0) {
                return users[0];
            }
        }

        return null;
    } catch (error) {
        console.error('[WPAuthorSync] Error searching for user:', error);
        return null;
    }
}

/**
 * Create a new WP user
 */
async function createWPUser(
    site: WPSite,
    payload: WPUserCreatePayload
): Promise<WPUserResponse | null> {
    const apiUrl = getWPApiUrl(site);
    const headers = getWPHeaders(site);

    try {
        // Generate a random password (WP requires one)
        const password = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

        const response = await fetch(`${apiUrl}/users`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ...payload,
                password,
            }),
        });

        if (response.ok) {
            return await response.json();
        }

        // Check if user already exists (409 conflict)
        if (response.status === 400 || response.status === 409) {
            const error = await response.json();
            console.log('[WPAuthorSync] User might already exist:', error);
            return null;
        }

        const error = await response.json();
        console.error('[WPAuthorSync] Failed to create user:', error);
        return null;
    } catch (error) {
        console.error('[WPAuthorSync] Error creating user:', error);
        return null;
    }
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Generate a WP-compatible username from author name
 */
function generateUsername(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20) || 'author';
}

/**
 * Generate a placeholder email if none exists
 */
function generateEmail(author: AuthorProfile, siteUrl: string): string {
    if (author.email) return author.email;

    const domain = new URL(siteUrl).hostname;
    const username = generateUsername(author.name);
    return `${username}@${domain}`;
}

/**
 * Sync an Ifrit Author to a WordPress site
 * Creates the WP user if it doesn't exist, or finds the existing one
 */
export async function syncAuthorToSite(
    author: AuthorProfile,
    site: WPSite
): Promise<SyncResult> {
    console.log(`[WPAuthorSync] Syncing "${author.name}" to ${site.name}`);

    // Check if already synced
    const existingMapping = author.wpAuthorMappings.find(m => m.siteId === site.id);
    if (existingMapping) {
        return {
            success: true,
            wpUserId: existingMapping.wpUserId,
            wpUsername: existingMapping.wpUsername,
            action: 'found',
            message: `Already synced as ${existingMapping.wpUsername}`,
        };
    }

    const username = generateUsername(author.name);
    const email = generateEmail(author, site.url);

    // First, try to find existing user
    const existingUser = await findWPUser(site, email, username);

    if (existingUser) {
        // Found existing user - save mapping
        const mapping: WPAuthorMapping = {
            siteId: site.id,
            wpUserId: existingUser.id,
            wpUsername: existingUser.slug,
            syncedAt: Date.now(),
        };

        useAuthorStore.getState().mapToWPUser(author.id, mapping);

        return {
            success: true,
            wpUserId: existingUser.id,
            wpUsername: existingUser.slug,
            action: 'found',
            message: `Found existing WP user: ${existingUser.name}`,
        };
    }

    // Create new WP user
    const nameParts = author.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newUser = await createWPUser(site, {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        description: author.shortBio || author.bio?.slice(0, 200) || '',
        url: author.websiteUrl || author.linkedInUrl || '',
        roles: ['author'], // Author role can publish but not manage
    });

    if (newUser) {
        // Save mapping
        const mapping: WPAuthorMapping = {
            siteId: site.id,
            wpUserId: newUser.id,
            wpUsername: newUser.slug,
            syncedAt: Date.now(),
        };

        useAuthorStore.getState().mapToWPUser(author.id, mapping);

        return {
            success: true,
            wpUserId: newUser.id,
            wpUsername: newUser.slug,
            action: 'created',
            message: `Created WP user: ${newUser.name}`,
        };
    }

    return {
        success: false,
        action: 'error',
        message: 'Failed to create or find WP user. Check site permissions.',
    };
}

/**
 * Sync an Ifrit Author to multiple WordPress sites
 */
export async function syncAuthorToSites(
    author: AuthorProfile,
    sites: WPSite[]
): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {};

    for (const site of sites) {
        results[site.id] = await syncAuthorToSite(author, site);
    }

    return results;
}

/**
 * Get the WP user ID for an author on a specific site
 */
export function getWPUserIdForSite(
    author: AuthorProfile,
    siteId: string
): number | undefined {
    const mapping = author.wpAuthorMappings.find(m => m.siteId === siteId);
    return mapping?.wpUserId;
}

/**
 * Check if an author is synced to a site
 */
export function isAuthorSyncedToSite(
    author: AuthorProfile,
    siteId: string
): boolean {
    return author.wpAuthorMappings.some(m => m.siteId === siteId);
}

/**
 * Remove author sync for a specific site
 */
export function removeSiteSync(
    authorId: string,
    siteId: string
): void {
    const store = useAuthorStore.getState();
    const author = store.getAuthor(authorId);

    if (author) {
        const filteredMappings = author.wpAuthorMappings.filter(m => m.siteId !== siteId);
        store.updateAuthor(authorId, { wpAuthorMappings: filteredMappings });
    }
}
