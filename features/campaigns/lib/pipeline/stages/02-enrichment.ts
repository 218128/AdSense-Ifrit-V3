/**
 * Stage 02: Enrichment
 * FSD: features/campaigns/lib/pipeline/stages/02-enrichment.ts
 * 
 * Parallel enrichment: Topic research + Author matching.
 */

import type { StageGroup } from '../types';

export const enrichmentStages: StageGroup = {
    id: 'enrichment',
    name: 'Enrichment',
    parallel: true,  // Research and author matching can run in parallel
    runItemStatus: 'researching',
    stages: [
        {
            id: 'research',
            name: 'Topic Research',
            optional: true,
            condition: (_, campaign) => campaign.aiConfig.useResearch,
            execute: async (ctx, campaign) => {
                const { performResearch } = await import('../../researchService');
                ctx.research = await performResearch(ctx.sourceItem.topic, campaign.aiConfig);
                console.log('[Pipeline] Research completed');
            },
        },
        {
            id: 'author_match',
            name: 'Author Matching',
            optional: true,
            condition: (_, campaign) => !!(campaign.authorId || campaign.aiConfig.authorHealthRequired),
            execute: async (ctx, campaign) => {
                const { matchAuthorForPipeline, applyAuthorToContext } = await import('../../authorMatcher');
                const result = matchAuthorForPipeline(campaign, ctx.sourceItem.topic, {
                    fallbackToGeneric: !campaign.aiConfig.authorHealthRequired,
                });

                if (!result.canPublish && campaign.aiConfig.authorHealthRequired) {
                    throw new Error(result.reason || 'No suitable author available');
                }

                applyAuthorToContext(ctx, result);
                console.log(`[Pipeline] Author matched: ${result.author?.name || 'generic'}`);
            },
        },
    ],
};
