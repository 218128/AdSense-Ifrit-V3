/**
 * WP Site Sync API Route
 * FSD: app/api/wp-sites/[id]/sync/route.ts
 * 
 * Securely syncs site data from WordPress REST API.
 * Detects installed plugins, pages, and content stats.
 * 
 * Uses POST to avoid exposing credentials in URL/logs.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface SyncRequest {
    siteUrl: string;
    username: string;
    appPassword: string;
}

interface WPPlugin {
    plugin: string;        // e.g., "complianz-gdpr/complianz-gpdr.php"
    status: string;        // "active" | "inactive"
    name: string;          // Display name
    version: string;
}

interface WPPage {
    id: number;
    slug: string;
    title: { rendered: string };
    link: string;
    status: string;
}

interface SyncResult {
    success: boolean;
    plugins: {
        slug: string;
        name: string;
        active: boolean;
    }[];
    pages: {
        slug: string;
        exists: boolean;
        id?: number;
        url?: string;
    }[];
    stats: {
        postCount: number;
        pageCount: number;
        categoryCount: number;
    };
    detectedFeatures: {
        hasComplianz: boolean;
        hasRankMath: boolean;
        hasYoast: boolean;
        hasCachePlugin: boolean;
        hasSecurityPlugin: boolean;
        hasSiteKit: boolean;
    };
    syncedAt: number;
    error?: string;
}

// ============================================================================
// Known Plugins Mapping
// ============================================================================

const KNOWN_PLUGINS: Record<string, { category: string; name: string }> = {
    'complianz-gdpr': { category: 'gdpr', name: 'Complianz GDPR' },
    'complianz-terms-conditions': { category: 'legal', name: 'Complianz T&C' },
    'seo-by-rank-math': { category: 'seo', name: 'Rank Math' },
    'wordpress-seo': { category: 'seo', name: 'Yoast SEO' },
    'litespeed-cache': { category: 'cache', name: 'LiteSpeed Cache' },
    'wp-super-cache': { category: 'cache', name: 'WP Super Cache' },
    'really-simple-ssl': { category: 'security', name: 'Really Simple SSL' },
    'google-site-kit': { category: 'analytics', name: 'Site Kit by Google' },
    'hostinger-ai': { category: 'hostinger', name: 'Hostinger AI' },
    'hostinger-tools': { category: 'hostinger', name: 'Hostinger Tools' },
    'hostinger-easy-onboarding': { category: 'hostinger', name: 'Hostinger Onboarding' },
    'hostinger-reach': { category: 'hostinger', name: 'Hostinger Reach' },
};

const LEGAL_PAGE_SLUGS = ['privacy-policy', 'terms-of-service', 'about', 'contact', 'disclaimer'];

// ============================================================================
// Handler
// ============================================================================

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Next.js 16: params is async
        const { id } = await params;

        const body = await request.json() as SyncRequest;
        const { siteUrl, username, appPassword } = body;

        if (!siteUrl || !username || !appPassword) {
            return NextResponse.json(
                { success: false, error: 'Missing required credentials' },
                { status: 400 }
            );
        }

        // Build auth header
        const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
        const headers = {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
        };

        const baseUrl = siteUrl.replace(/\/$/, '');
        const result: SyncResult = {
            success: true,
            plugins: [],
            pages: [],
            stats: { postCount: 0, pageCount: 0, categoryCount: 0 },
            detectedFeatures: {
                hasComplianz: false,
                hasRankMath: false,
                hasYoast: false,
                hasCachePlugin: false,
                hasSecurityPlugin: false,
                hasSiteKit: false,
            },
            syncedAt: Date.now(),
        };

        // 1. Fetch plugins
        try {
            const pluginsRes = await fetch(`${baseUrl}/wp-json/wp/v2/plugins`, { headers });
            if (pluginsRes.ok) {
                const plugins = await pluginsRes.json() as WPPlugin[];

                result.plugins = plugins.map(p => {
                    // Extract slug from plugin path (e.g., "complianz-gdpr/complianz-gpdr.php" -> "complianz-gdpr")
                    const slug = p.plugin.split('/')[0];
                    return {
                        slug,
                        name: p.name,
                        active: p.status === 'active',
                    };
                });

                // Detect features
                const activePluginSlugs = result.plugins
                    .filter(p => p.active)
                    .map(p => p.slug.toLowerCase());

                result.detectedFeatures.hasComplianz = activePluginSlugs.some(s =>
                    s.includes('complianz'));
                result.detectedFeatures.hasRankMath = activePluginSlugs.some(s =>
                    s.includes('rank-math'));
                result.detectedFeatures.hasYoast = activePluginSlugs.some(s =>
                    s.includes('wordpress-seo') || s.includes('yoast'));
                result.detectedFeatures.hasCachePlugin = activePluginSlugs.some(s =>
                    s.includes('cache') || s.includes('litespeed'));
                result.detectedFeatures.hasSecurityPlugin = activePluginSlugs.some(s =>
                    s.includes('security') || s.includes('really-simple-ssl'));
                result.detectedFeatures.hasSiteKit = activePluginSlugs.some(s =>
                    s.includes('google-site-kit') || s.includes('site-kit'));
            }
        } catch (e) {
            console.error('[Sync] Plugin fetch failed:', e);
            // Continue - plugins API might require extra permissions
        }

        // 2. Fetch pages to check legal pages
        try {
            const pagesRes = await fetch(
                `${baseUrl}/wp-json/wp/v2/pages?per_page=100&status=publish,draft`,
                { headers }
            );
            if (pagesRes.ok) {
                const pages = await pagesRes.json() as WPPage[];

                // Check for legal page slugs
                for (const slug of LEGAL_PAGE_SLUGS) {
                    const found = pages.find(p =>
                        p.slug.toLowerCase().includes(slug.replace('-', '')) ||
                        p.slug.toLowerCase() === slug
                    );
                    result.pages.push({
                        slug,
                        exists: !!found,
                        id: found?.id,
                        url: found?.link,
                    });
                }

                result.stats.pageCount = pages.length;
            }
        } catch (e) {
            console.error('[Sync] Pages fetch failed:', e);
        }

        // 3. Fetch post count
        try {
            const postsRes = await fetch(
                `${baseUrl}/wp-json/wp/v2/posts?per_page=1&status=publish`,
                { headers }
            );
            if (postsRes.ok) {
                // Total from header
                const total = postsRes.headers.get('X-WP-Total');
                result.stats.postCount = total ? parseInt(total, 10) : 0;
            }
        } catch (e) {
            console.error('[Sync] Posts fetch failed:', e);
        }

        // 4. Fetch category count
        try {
            const catsRes = await fetch(
                `${baseUrl}/wp-json/wp/v2/categories?per_page=1`,
                { headers }
            );
            if (catsRes.ok) {
                const total = catsRes.headers.get('X-WP-Total');
                result.stats.categoryCount = total ? parseInt(total, 10) : 0;
            }
        } catch (e) {
            console.error('[Sync] Categories fetch failed:', e);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('[Sync] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Sync failed'
            },
            { status: 500 }
        );
    }
}
