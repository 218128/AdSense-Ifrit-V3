/**
 * Stage 05: Quality Gate
 * FSD: features/campaigns/lib/pipeline/stages/05-quality.ts
 * 
 * Sequential quality scoring and smart review gate.
 */

import type { StageGroup } from '../types';

export const qualityStages: StageGroup = {
    id: 'quality',
    name: 'Quality Gate',
    parallel: false,  // Must be sequential: score -> review
    runItemStatus: 'generating',
    stages: [
        {
            id: 'quality_score',
            name: 'Quality Scoring',
            optional: true,
            condition: (ctx, campaign) => campaign.aiConfig.qualityGateEnabled && !!ctx.content,
            execute: async (ctx) => {
                const { scoreContentQuality, applyQualityScoreToContext } =
                    await import('../../qualityScoreStage');

                const score = scoreContentQuality(
                    ctx.content!.body,
                    ctx.sourceItem.topic,
                    ctx.matchedAuthor?.id
                );

                applyQualityScoreToContext(ctx, score);
                console.log(`[Pipeline] Quality score: ${score.combined} (${score.grade})`);
            },
        },
        {
            id: 'smart_review',
            name: 'Smart Review Gate',
            optional: true,
            condition: (ctx, campaign) => campaign.aiConfig.qualityGateEnabled && !!ctx.qualityScore,
            execute: async (ctx, campaign) => {
                const { processSmartReview } = await import('../../qualityScoreStage');

                const decision = await processSmartReview(ctx, campaign);

                console.log(`[Pipeline] Review decision: ${decision.action} (${decision.confidence}%)`);

                if (decision.action === 'approve') {
                    console.log('[Pipeline] Content auto-approved');
                } else if (decision.action === 'flag') {
                    console.log('[Pipeline] Content flagged - publishing normally');
                } else if (decision.action === 'retry') {
                    throw new Error(`Quality too low: ${decision.reasons.join(', ')}`);
                } else if (decision.action === 'reject') {
                    ctx.needsManualReview = true;
                    console.log('[Pipeline] Content requires manual review');
                }
            },
        },
    ],
};
