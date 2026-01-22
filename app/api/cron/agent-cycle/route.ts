/**
 * Cron: Daily Agent Analysis
 * GET /api/cron/agent-cycle
 * 
 * Runs content operations agent to analyze and suggest optimizations.
 * Configure in vercel.json: { "path": "/api/cron/agent-cycle", "schedule": "0 8 * * *" }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AgentContext } from '@/lib/agents/contentOperationsAgent';

export async function GET(request: NextRequest) {
    // Verify cron secret for Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { runAgentCycle, getPendingDecisions } = await import('@/lib/agents');
        const { getStaleContent, getFreshnessSummary } = await import('@/lib/seo/contentFreshnessManager');

        // Get stale content for context
        const staleContent = getStaleContent(60, 50);
        const freshnessSummary = getFreshnessSummary();

        // Build context with proper type
        const context: AgentContext = {
            recentPerformance: [], // Would come from analytics
            trendingTopics: [],    // Would come from trending analysis
            staleContent: staleContent,
            upcomingCampaigns: [],
            totalContent: freshnessSummary.total,
            avgQualityScore: freshnessSummary.avgScore,
        };

        const result = await runAgentCycle(context);
        const pendingDecisions = getPendingDecisions();

        return NextResponse.json({
            success: true,
            analysisResult: {
                newDecisions: result.decisions.length,
                totalPending: pendingDecisions.length,
            },
            summary: {
                staleContentFound: staleContent.length,
                freshnessSummary,
            },
            analyzedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Cron: Agent Cycle] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}

