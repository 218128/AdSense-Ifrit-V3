/**
 * Approve Decision API Route
 * POST /api/agents/approve
 * 
 * Approves and optionally executes an agent decision.
 */

import { NextRequest, NextResponse } from 'next/server';
import { approveDecision, rejectDecision, executeDecision } from '@/lib/agents';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { decisionId, action, execute = true } = body;

        if (!decisionId) {
            return NextResponse.json(
                { success: false, error: 'Missing decisionId' },
                { status: 400 }
            );
        }

        if (action === 'approve') {
            approveDecision(decisionId);

            if (execute) {
                await executeDecision(decisionId, true);
            }

            return NextResponse.json({
                success: true,
                message: 'Decision approved' + (execute ? ' and executed' : ''),
            });
        } else if (action === 'reject') {
            rejectDecision(decisionId);
            return NextResponse.json({
                success: true,
                message: 'Decision rejected',
            });
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use "approve" or "reject"' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('[Approve Decision] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to process decision' },
            { status: 500 }
        );
    }
}
