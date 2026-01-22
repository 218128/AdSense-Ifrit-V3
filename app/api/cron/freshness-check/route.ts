/**
 * Cron: Weekly Freshness Check
 * GET /api/cron/freshness-check
 * 
 * Scans all content for freshness and schedules reviews.
 * Configure in vercel.json: { "path": "/api/cron/freshness-check", "schedule": "0 9 * * 1" }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Verify cron secret for Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const {
            getStaleContent,
            getContentDueForReview,
            getFreshnessSummary,
        } = await import('@/lib/seo/contentFreshnessManager');

        // Get all stale content (over 60 days)
        const staleContent = getStaleContent(60, 100);
        const dueForReview = getContentDueForReview();
        const summary = getFreshnessSummary();

        // Count critical/high priority items (for logging)
        const criticalCount = staleContent.filter(
            item => item.reviewPriority === 'critical' || item.reviewPriority === 'high'
        ).length;

        return NextResponse.json({
            success: true,
            summary: {
                total: summary.total,
                fresh: summary.fresh,
                aging: summary.aging,
                stale: summary.stale,
                avgScore: summary.avgScore,
            },
            staleCount: staleContent.length,
            dueForReviewCount: dueForReview.length,
            criticalItems: criticalCount,
            checkedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Cron: Freshness Check] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Check failed' },
            { status: 500 }
        );
    }
}

