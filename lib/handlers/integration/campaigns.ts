/**
 * Campaign Runner Handler (Stub)
 * FSD: lib/handlers/integration/campaigns.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const campaignRunnerHandler: CapabilityHandler = {
    capability: 'campaign:run',
    name: 'Campaign Runner',
    provider: 'campaigns',
    execute: async (params) => {
        const { runPipeline } = await import('@/features/campaigns');
        return runPipeline(params.campaignId, params.options);
    },
};
