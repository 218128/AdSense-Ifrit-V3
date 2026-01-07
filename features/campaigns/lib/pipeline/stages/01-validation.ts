/**
 * Stage 01: Validation
 * FSD: features/campaigns/lib/pipeline/stages/01-validation.ts
 * 
 * Deduplication check to prevent duplicate content.
 */

import type { StageGroup } from '../types';

export const validationStages: StageGroup = {
    id: 'validation',
    name: 'Validation',
    parallel: false,
    runItemStatus: 'pending',
    stages: [
        {
            id: 'dedup',
            name: 'Deduplication Check',
            optional: false,
            execute: async (ctx, campaign) => {
                const { shouldSkipTopic } = await import('../../deduplication');
                const result = shouldSkipTopic(
                    ctx.sourceItem.topic,
                    campaign.id,
                    campaign.targetSiteId
                );
                if (result.skip) {
                    throw new Error(result.reason || 'Duplicate content detected');
                }
            },
        },
    ],
};
