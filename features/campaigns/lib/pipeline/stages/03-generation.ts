/**
 * Stage 03: Generation
 * FSD: features/campaigns/lib/pipeline/stages/03-generation.ts
 * 
 * Core content generation stage.
 */

import type { StageGroup } from '../types';

export const generationStages: StageGroup = {
    id: 'generation',
    name: 'Content Generation',
    parallel: false,
    runItemStatus: 'generating',
    stages: [
        {
            id: 'content',
            name: 'Generate Content',
            optional: false,
            execute: async (ctx, campaign) => {
                const { generateContent } = await import('../../contentGenerator');
                ctx.content = await generateContent(
                    ctx.sourceItem,
                    campaign,
                    { research: ctx.research }
                );
                console.log(`[Pipeline] Content generated: ${ctx.content.title}`);
            },
        },
    ],
};
