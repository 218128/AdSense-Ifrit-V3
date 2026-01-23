/**
 * Cron: Daily AdSense Sync
 * GET /api/cron/adsense-sync
 * 
 * Syncs AdSense earnings data daily.
 * Configure in vercel.json: { "path": "/api/cron/adsense-sync", "schedule": "0 6 * * *" }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Verify cron secret for Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { getLast30DaysEarnings } = await import('@/lib/monetization/adsenseClient');
        const { importRevenueData } = await import('@/lib/monetization');

        // Note: In production, OAuth credentials would be stored securely
        const oauthEnv = {
            clientId: process.env.ADSENSE_CLIENT_ID || '',
            clientSecret: process.env.ADSENSE_CLIENT_SECRET || '',
            refreshToken: process.env.ADSENSE_REFRESH_TOKEN || '',
        };

        if (!oauthEnv.clientId || !oauthEnv.clientSecret || !oauthEnv.refreshToken) {
            return NextResponse.json({
                success: false,
                message: 'AdSense OAuth not configured in environment',
            });
        }

        // Fetch last 30 days of earnings
        const earnings = await getLast30DaysEarnings(oauthEnv);

        // Import into revenue tracker if we got data
        if (earnings && earnings.length > 0) {
            const dataPoints = earnings.map((day) => ({
                date: day.date,
                pageViews: day.pageViews,
                impressions: day.impressions,
                clicks: day.clicks,
                revenue: day.revenue,
                rpm: day.rpm,
                ctr: day.ctr,
                cpc: day.cpc,
            }));

            importRevenueData({
                siteId: 'adsense-main',
                domain: 'AdSense',
                dataPoints,
            });
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${earnings?.length || 0} days of earnings data`,
            syncedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Cron: AdSense Sync] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
            { status: 500 }
        );
    }
}

