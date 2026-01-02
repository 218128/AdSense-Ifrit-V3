/**
 * PageSpeed Insights API Endpoint
 * GET /api/pagespeed?url=example.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPageSpeedInsights } from '@/lib/quality/pageSpeedInsights';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const strategy = searchParams.get('strategy') as 'mobile' | 'desktop' || 'mobile';
    const apiKey = searchParams.get('apiKey') || process.env.PAGESPEED_API_KEY;

    if (!url) {
        return NextResponse.json(
            { success: false, error: 'URL is required' },
            { status: 400 }
        );
    }

    const result = await fetchPageSpeedInsights(url, strategy, apiKey);

    if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
        );
    }

    return NextResponse.json(result);
}
