/**
 * AdSense Sync API Route
 * FSD: app/api/monetization/adsense/sync/route.ts
 *
 * Syncs AdSense earnings data and stores it in the revenue tracker.
 */

import { NextResponse } from 'next/server';
import {
    testAdSenseConnection,
    getLast30DaysEarnings,
    getEarningsByPage,
    importRevenueData,
    setSyncStatus,
} from '@/lib/monetization';
import type { AdSenseCredentials } from '@/lib/monetization';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { credentials, siteId, domain } = body as {
            credentials: AdSenseCredentials;
            siteId: string;
            domain: string;
        };

        if (!credentials?.clientId || !credentials?.clientSecret || !credentials?.refreshToken) {
            return NextResponse.json(
                { error: 'Missing AdSense credentials' },
                { status: 400 }
            );
        }

        if (!siteId || !domain) {
            return NextResponse.json(
                { error: 'Missing siteId or domain' },
                { status: 400 }
            );
        }

        setSyncStatus('syncing');

        // Test connection first
        const connectionStatus = await testAdSenseConnection(credentials);
        if (!connectionStatus.connected) {
            setSyncStatus('error', connectionStatus.error);
            return NextResponse.json(
                { error: connectionStatus.error || 'Failed to connect to AdSense' },
                { status: 401 }
            );
        }

        // Fetch last 30 days earnings
        const earningsData = await getLast30DaysEarnings(credentials);

        // Import into revenue tracker
        importRevenueData({
            siteId,
            domain,
            dataPoints: earningsData,
        });

        setSyncStatus('idle');

        return NextResponse.json({
            success: true,
            accountId: connectionStatus.accountId,
            accountName: connectionStatus.accountName,
            dataPoints: earningsData.length,
            totalRevenue: earningsData.reduce((sum, d) => sum + d.revenue, 0),
            syncedAt: Date.now(),
        });
    } catch (error) {
        setSyncStatus('error', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Sync failed' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Use POST to sync AdSense data',
        requiredFields: {
            credentials: {
                clientId: 'OAuth2 client ID',
                clientSecret: 'OAuth2 client secret',
                refreshToken: 'OAuth2 refresh token',
            },
            siteId: 'Your WP site ID',
            domain: 'Your site domain (e.g., example.com)',
        },
    });
}
