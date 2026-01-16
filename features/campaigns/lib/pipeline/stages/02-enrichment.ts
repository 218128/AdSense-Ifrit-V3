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
            condition: (_, campaign) => !!campaign.aiConfig.useResearch,
            execute: async (ctx, campaign) => {
                const { performResearchRich } = await import('../../researchService');
                const result = await performResearchRich(ctx.sourceItem.topic, campaign.aiConfig);

                if (!result.success) {
                    throw new Error(result.error || 'Research failed');
                }

                // Store rich research data
                ctx.research = {
                    text: result.text,
                    citations: result.citations,
                    relatedQuestions: result.relatedQuestions,
                    images: result.images,
                    handlerUsed: result.handlerUsed,
                };
                console.log(`[Pipeline] Research completed via ${result.handlerUsed}${result.citations?.length ? ` with ${result.citations.length} citations` : ''}`);
            },
        },
        {
            id: 'author_match',
            name: 'Author Matching',
            optional: true,
            condition: (_, campaign) => {
                // DEBUG: Log why condition may fail
                const hasAuthorId = !!campaign.authorId;
                const requiresHealth = !!campaign.aiConfig.authorHealthRequired;
                const passes = hasAuthorId || requiresHealth;
                console.log(`[Pipeline] Author match condition: authorId=${hasAuthorId}, healthRequired=${requiresHealth}, passes=${passes}`);
                return passes;
            },
            execute: async (ctx, campaign) => {
                console.log(`[Pipeline] Starting author matching for campaign: ${campaign.name}`);
                const { matchAuthorForPipeline, applyAuthorToContext } = await import('../../authorMatcher');
                const result = matchAuthorForPipeline(campaign, ctx.sourceItem.topic, {
                    fallbackToGeneric: !campaign.aiConfig.authorHealthRequired,
                });

                console.log(`[Pipeline] Author match result:`, {
                    authorFound: !!result.author,
                    authorName: result.author?.name || 'none',
                    canPublish: result.canPublish,
                    healthScore: result.healthScore,
                    matchScore: result.matchScore,
                    reason: result.reason,
                });

                if (!result.canPublish && campaign.aiConfig.authorHealthRequired) {
                    throw new Error(result.reason || 'No suitable author available');
                }

                applyAuthorToContext(ctx, result);
                console.log(`[Pipeline] Author applied to context: matchedAuthor=${ctx.matchedAuthor ? ctx.matchedAuthor.name : 'null'}`);
            },
        },
    ],
};
