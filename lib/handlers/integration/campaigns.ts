/**
 * Campaign Runner Handler (Stub)
 * FSD: lib/handlers/integration/campaigns.ts
 * 
 * NOTE: This is a placeholder. Campaign execution is handled through the
 * campaigns feature module directly, not via the capability system.
 * See: features/campaigns/lib/pipeline/orchestrator.ts
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const campaignRunnerHandler: CapabilityHandler = {
    id: 'campaign-runner',
    name: 'Campaign Runner',
    source: 'local',
    capabilities: ['campaign-run'],
    priority: 50,
    isAvailable: false, // Not available - use campaign feature directly
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Campaign execution should use features/campaigns directly, not the capability system',
            handlerUsed: 'campaign-runner',
            source: 'local',
            latencyMs: 0,
        };
    },
};
