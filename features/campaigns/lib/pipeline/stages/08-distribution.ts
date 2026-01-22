/**
 * Stage 08: Distribution
 * FSD: features/campaigns/lib/pipeline/stages/08-distribution.ts
 * 
 * Generate multi-format content and video scripts from published articles.
 * Runs after publish stage to repurpose content for social/video platforms.
 */

import type { StageGroup } from '../types';

export const distributionStages: StageGroup = {
    id: 'distribution',
    name: 'Distribution',
    parallel: true,  // Multi-format + Video can run concurrently
    runItemStatus: 'generating',
    stages: [
        {
            id: 'multi_format',
            name: 'Multi-Format Generation',
            optional: true,
            condition: (ctx, campaign) =>
                !!campaign.aiConfig.enableMultiFormat &&
                !!ctx.content &&
                (campaign.aiConfig.multiFormatOptions?.formats?.length ?? 0) > 0,
            execute: async (ctx, campaign) => {
                const { generateAllFormats } = await import('@/lib/distribution');

                const formats = campaign.aiConfig.multiFormatOptions?.formats ||
                    ['linkedIn', 'twitter', 'newsletter'];

                const output = await generateAllFormats(
                    {
                        title: ctx.content!.title,
                        body: ctx.content!.body,
                        excerpt: ctx.content!.excerpt,
                        // keyPoints would come from research but aren't in current type
                    },
                    {
                        formats: formats as Array<'linkedIn' | 'twitter' | 'tikTok' | 'podcast' | 'newsletter' | 'youtube'>,
                        tikTokDuration: campaign.aiConfig.multiFormatOptions?.tikTokDuration,
                    }
                );

                // Store in context for later use
                ctx.multiFormatOutput = output;

                const generatedFormats = Object.keys(output).filter(k => output[k as keyof typeof output]);
                console.log(`[Pipeline] Generated ${generatedFormats.length} formats: ${generatedFormats.join(', ')}`);
            },
        },
        {
            id: 'video_script',
            name: 'Video Script Generation',
            optional: true,
            condition: (ctx, campaign) =>
                !!campaign.aiConfig.enableVideoScript && !!ctx.content,
            execute: async (ctx, campaign) => {
                const { generateVideoFromArticle } = await import('@/lib/video');

                const platform = campaign.aiConfig.videoScriptPlatform || 'youtube_shorts';
                const duration = campaign.aiConfig.videoScriptDuration || 60;

                const script = await generateVideoFromArticle(
                    ctx.content!.body,
                    platform,
                    { duration }
                );

                if (script) {
                    ctx.videoScript = script;
                    console.log(`[Pipeline] Video script generated: ${script.title} (${script.platform}, ${script.targetDuration}s)`);
                } else {
                    console.warn('[Pipeline] Video script generation returned null');
                }
            },
        },
    ],
};
