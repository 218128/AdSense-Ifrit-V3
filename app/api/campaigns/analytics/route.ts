/**
 * Campaign Analytics API
 * GET /api/campaigns/analytics
 * 
 * Fetches post performance from Umami or returns basic WordPress stats.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const postUrls = searchParams.get('urls')?.split(',') || [];
    const period = searchParams.get('period') || '30d';

    // Get Umami config from request (passed from client which has access to settingsStore)
    const umamiApiUrl = searchParams.get('umamiApiUrl');
    const umamiApiKey = searchParams.get('umamiApiKey');
    const umamiSiteId = searchParams.get('umamiSiteId');

    try {
        // If Umami is configured, use it
        if (umamiApiUrl && umamiApiKey && umamiSiteId) {
            const { fetchUmamiAnalytics } = await import('@/features/campaigns/lib/analytics');

            const endDate = new Date();
            const startDate = new Date();
            if (period === '7d') startDate.setDate(startDate.getDate() - 7);
            else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
            else startDate.setFullYear(startDate.getFullYear() - 1);

            const performance = await fetchUmamiAnalytics(
                {
                    provider: 'umami',
                    apiKey: umamiApiKey,
                    siteId: umamiSiteId,
                    baseUrl: umamiApiUrl,
                },
                postUrls,
                startDate,
                endDate
            );

            return NextResponse.json({
                success: true,
                source: 'umami',
                data: performance,
            });
        }

        // Fallback: Return basic info (no external analytics)
        const basicStats = postUrls.map(url => ({
            url,
            metrics: {
                pageViews: null,
                uniqueVisitors: null,
                note: 'Configure Umami API in Settings for analytics',
            },
        }));

        return NextResponse.json({
            success: true,
            source: 'none',
            data: basicStats,
            message: 'No analytics provider configured. Add Umami API URL and Token in Settings.',
        });

    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
