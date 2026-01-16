/**
 * Stage 06: Optimization
 * FSD: features/campaigns/lib/pipeline/stages/06-optimization.ts
 * 
 * Sequential optimization: Content spinning, humanization, readability.
 */

import type { StageGroup } from '../types';

export const optimizationStages: StageGroup = {
    id: 'optimization',
    name: 'Optimization',
    parallel: false,  // Sequential: spinner -> humanizer -> readability
    runItemStatus: 'generating',
    stages: [
        {
            id: 'spinner',
            name: 'Content Spinning',
            optional: true,
            condition: (ctx, campaign) => !!campaign.aiConfig.enableSpinner && !!ctx.content,
            execute: async (ctx, campaign) => {
                const { spinContent } = await import('../../contentSpinner');
                const result = await spinContent(
                    ctx.content!.body,
                    { mode: campaign.aiConfig.spinnerMode || 'moderate' },
                    campaign.aiConfig
                );
                if (result.success) {
                    ctx.content!.body = result.content;
                    console.log('[Pipeline] Content spun for uniqueness');
                }
            },
        },
        {
            id: 'humanizer',
            name: 'Humanization',
            optional: true,
            condition: (ctx, campaign) => !!campaign.aiConfig.humanize && !!ctx.content,
            execute: async (ctx) => {
                const { humanizeContent } = await import('../../humanizer');
                // humanizeContent returns string directly, not a Promise
                const humanized = humanizeContent(ctx.content!.body, {});
                ctx.content!.body = humanized;
                console.log('[Pipeline] Content humanized');
            },
        },
        {
            id: 'readability',
            name: 'Readability Optimization',
            optional: true,
            condition: (ctx, campaign) => !!campaign.aiConfig.optimizeReadability && !!ctx.content,
            execute: async (ctx) => {
                const { optimizeReadability } = await import('../../readability');
                const result = optimizeReadability(ctx.content!.body);
                ctx.content!.body = result.optimizedContent;
                console.log(`[Pipeline] Readability optimized: score ${result.score}`);
            },
        },
    ],
};
