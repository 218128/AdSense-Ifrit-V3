/**
 * WP Sites API Route
 * FSD: app/api/wp-sites/route.ts
 * 
 * Dedicated API endpoint for WordPress Sites management.
 * Separated from Legacy Websites (/api/websites/).
 * 
 * This route provides server-side operations for WP Sites that can't be done
 * client-side, such as server-to-server authentication or heavy processing.
 */

import { NextResponse } from 'next/server';

// ============================================================================
// GET /api/wp-sites - Health check and feature info
// ============================================================================

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        feature: 'wp-sites',
        version: '1.0.0',
        description: 'WordPress Sites management API (Hostinger/WP integration)',
        endpoints: {
            health: 'GET /api/wp-sites',
            // Future endpoints:
            // 'POST /api/wp-sites/generate': 'Generate content for WP Site',
            // 'POST /api/wp-sites/[siteId]/publish': 'Publish article to WordPress',
            // 'POST /api/wp-sites/[siteId]/sync': 'Sync site metadata',
        },
        relatedRoutes: [
            '/api/hosting/provision - Provision new WP site via Hostinger',
            '/api/hosting/orders - List Hostinger hosting orders',
            '/api/capabilities/generate - AI content generation',
            '/api/capabilities/research - Topic research',
        ],
        note: 'Most WP Sites operations use client-side WordPress REST API calls via features/wordpress/api/wordpressApi.ts',
    });
}

// ============================================================================
// POST /api/wp-sites - Reserved for future site operations
// ============================================================================

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'health':
                return NextResponse.json({ status: 'ok' });

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
