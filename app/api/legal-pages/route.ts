/**
 * Legal Pages API Endpoint
 * POST /api/legal-pages
 * 
 * Generates and publishes legal pages to WordPress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateLegalPage, LegalPageType, SiteInfo } from '@/lib/generators/legalPageGenerator';
import { createPage, getPageBySlug, updatePage } from '@/features/wordpress/api/wordpressApi';
import type { WPSite } from '@/features/wordpress/model/types';

export const dynamic = 'force-dynamic';

interface GenerateRequest {
    pageType: LegalPageType;
    siteInfo: SiteInfo;
    wpSite: WPSite;
    apiKey: string;
    provider?: 'gemini' | 'deepseek' | 'openrouter';
    publishStatus?: 'publish' | 'draft';
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateRequest = await request.json();
        const {
            pageType,
            siteInfo,
            wpSite,
            apiKey,
            provider = 'gemini',
            publishStatus = 'publish',
        } = body;

        if (!pageType || !siteInfo || !wpSite || !apiKey) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Step 1: Generate legal page content using AI
        console.log(`[LegalPages] Generating ${pageType} page...`);
        const generated = await generateLegalPage(pageType, siteInfo, apiKey, provider);

        if (!generated.success) {
            return NextResponse.json(
                { success: false, error: generated.error || 'Generation failed' },
                { status: 500 }
            );
        }

        // Step 2: Check if page already exists
        const existing = await getPageBySlug(wpSite, generated.slug);

        let wpResult;
        if (existing.success && existing.data) {
            // Update existing page
            console.log(`[LegalPages] Updating existing page: ${generated.slug}`);
            wpResult = await updatePage(wpSite, existing.data.id, {
                title: generated.title,
                content: generated.content,
                status: publishStatus,
            });
        } else {
            // Create new page
            console.log(`[LegalPages] Creating new page: ${generated.slug}`);
            wpResult = await createPage(wpSite, {
                title: generated.title,
                content: generated.content,
                slug: generated.slug,
                status: publishStatus,
                comment_status: 'closed',
            });
        }

        if (!wpResult.success) {
            return NextResponse.json(
                { success: false, error: wpResult.error || 'WordPress publish failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            pageType,
            title: generated.title,
            slug: generated.slug,
            wordpressId: wpResult.data?.id,
            url: wpResult.data?.link,
            isUpdate: !!(existing.success && existing.data),
        });

    } catch (error) {
        console.error('Legal pages API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/legal-pages - Get existing legal pages from WordPress
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Parse WP site credentials from query params (or body in real impl)
    const siteUrl = searchParams.get('siteUrl');
    const username = searchParams.get('username');
    const appPassword = searchParams.get('appPassword');

    if (!siteUrl || !username || !appPassword) {
        return NextResponse.json(
            { success: false, error: 'Missing WordPress credentials' },
            { status: 400 }
        );
    }

    const wpSite: WPSite = {
        id: 'temp',
        name: 'Temp',
        url: siteUrl,
        username,
        appPassword,
        status: 'connected',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    // Check which legal pages exist - include common variations from plugins
    const slugVariations: Record<string, string[]> = {
        'privacy-policy': ['privacy-policy', 'privacy', 'privacybeleid'],
        'terms-of-service': ['terms-of-service', 'terms-and-conditions', 'terms', 'tos', 'algemene-voorwaarden'],
        'about': ['about', 'about-us', 'over-ons'],
        'contact': ['contact', 'contact-us', 'contacteer-ons'],
        'disclaimer': ['disclaimer', 'legal-disclaimer'],
    };

    const existing: Record<string, { exists: boolean; id?: number; url?: string; foundSlug?: string }> = {};

    for (const [pageType, slugs] of Object.entries(slugVariations)) {
        let found = false;
        for (const slug of slugs) {
            const result = await getPageBySlug(wpSite, slug);
            if (result.success && result.data) {
                existing[pageType] = {
                    exists: true,
                    id: result.data.id,
                    url: result.data.link,
                    foundSlug: slug,
                };
                found = true;
                break;
            }
        }
        if (!found) {
            existing[pageType] = { exists: false };
        }
    }

    return NextResponse.json({
        success: true,
        pages: existing,
    });
}
