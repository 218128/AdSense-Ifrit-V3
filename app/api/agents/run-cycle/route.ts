/**
 * Agent Cycle API Route
 * POST /api/agents/run-cycle
 * 
 * Triggers a content operations agent analysis cycle.
 * Returns suggested decisions for human-in-the-loop approval.
 */

import { NextResponse } from 'next/server';
import { runAgentCycle, getPendingDecisions } from '@/lib/agents';
import type { AgentContext } from '@/lib/agents/contentOperationsAgent';

export async function POST() {
    try {
        // Build context from available data
        const context: AgentContext = {
            recentPerformance: [],
            trendingTopics: [],
            staleContent: [],
            upcomingCampaigns: [],
            totalContent: 0,
            avgQualityScore: 0,
        };

        const result = await runAgentCycle(context);

        return NextResponse.json({
            success: true,
            decisionsCount: result.decisions.length,
            decisions: result.decisions,
        });
    } catch (error) {
        console.error('[Agent Cycle] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Agent cycle failed' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const pending = getPendingDecisions();
        return NextResponse.json({
            success: true,
            pending,
            count: pending.length,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to get decisions' },
            { status: 500 }
        );
    }
}
