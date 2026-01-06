/**
 * Legal Pages Check API Endpoint
 * POST /api/legal-pages/check
 * 
 * Securely checks which legal pages exist on WordPress.
 * Uses POST to keep credentials in body (not exposed in URL/logs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPageBySlug } from '@/features/wordpress/api/wordpressApi';
import type { WPSite } from '@/features/wordpress/model/types';

export const dynamic = 'force-dynamic';

interface CheckRequest {
    siteUrl: string;
    username: string;
    appPassword: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: CheckRequest = await request.json();
        const { siteUrl, username, appPassword } = body;

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

    } catch (error) {
        console.error('Legal pages check error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
