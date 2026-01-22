/**
 * AdSense Connection Test API Route
 * FSD: app/api/monetization/adsense/test/route.ts
 *
 * Tests AdSense API connection with provided credentials.
 */

import { NextResponse } from 'next/server';
import { testAdSenseConnection } from '@/lib/monetization';
import type { AdSenseCredentials } from '@/lib/monetization';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const credentials = body.credentials as AdSenseCredentials;

        if (!credentials?.clientId || !credentials?.clientSecret || !credentials?.refreshToken) {
            return NextResponse.json(
                { error: 'Missing required credentials (clientId, clientSecret, refreshToken)' },
                { status: 400 }
            );
        }

        const status = await testAdSenseConnection(credentials);

        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json(
            {
                connected: false,
                error: error instanceof Error ? error.message : 'Connection test failed',
            },
            { status: 500 }
        );
    }
}
