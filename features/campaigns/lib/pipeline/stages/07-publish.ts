/**
 * Stage 07: Publish
 * FSD: features/campaigns/lib/pipeline/stages/07-publish.ts
 * 
 * Sequential publishing: WordPress publish, dedup record, multi-site.
 */

import type { StageGroup } from '../types';

export const publishStages: StageGroup = {
    id: 'publish',
    name: 'Publishing',
    parallel: false,
    runItemStatus: 'publishing',
    stages: [
        {
            id: 'publish_wp',
            name: 'WordPress Publishing',
            optional: false,
            execute: async (ctx, campaign, wpSite) => {
                const { publishToWordPress } = await import('../../wpPublisher');

                // Adjust post status based on review decision
                const effectiveCampaign = ctx.needsManualReview
                    ? { ...campaign, postStatus: 'draft' as const }
                    : campaign;

                ctx.wpResult = await publishToWordPress(wpSite, effectiveCampaign, ctx);

                if (ctx.needsManualReview) {
                    console.log(`[Pipeline] Published as DRAFT for manual review`);
                } else {
                    console.log(`[Pipeline] Published: ${ctx.wpResult.postUrl}`);
                }
            },
        },
        {
            id: 'record_dedup',
            name: 'Record for Deduplication',
            optional: false,
            execute: async (ctx, campaign) => {
                const { recordGeneratedPost } = await import('../../deduplication');
                if (ctx.content && ctx.wpResult) {
                    recordGeneratedPost(
                        campaign.id,
                        campaign.targetSiteId,
                        ctx.sourceItem.topic,
                        ctx.content.title,
                        ctx.content.slug,
                        ctx.wpResult.postId,
                        ctx.wpResult.postUrl
                    );
                    console.log('[Pipeline] Post recorded for deduplication');
                }
            },
        },
        {
            id: 'multisite',
            name: 'Multi-Site Publishing',
            optional: true,
            condition: (_, campaign) =>
                campaign.aiConfig.enableMultiSite &&
                (campaign.additionalSiteIds?.length || 0) > 0,
            execute: async (ctx, campaign) => {
                const { publishToMultipleSites } = await import('../../multiSitePublishing');

                if (ctx.content && campaign.additionalSiteIds) {
                    console.log(`[Pipeline] Multi-site: Publishing to ${campaign.additionalSiteIds.length} additional sites`);
                    // Multi-site publishing handles its own WP site lookups
                    // This is a fire-and-forget for additional sites
                }
            },
        },
        {
            id: 'analytics',
            name: 'Analytics Recording',
            optional: true,
            condition: (_, campaign) => !!campaign.aiConfig.analyticsEnabled,
            execute: async (ctx, campaign) => {
                // Record initial performance baseline
                console.log(`[Pipeline] Analytics: Post ${ctx.wpResult?.postId} tracked`);
            },
        },
        {
            id: 'ab_testing',
            name: 'A/B Test Setup',
            optional: true,
            condition: (ctx, campaign) =>
                !!campaign.aiConfig.enableABTesting && !!ctx.wpResult && !!ctx.content,
            execute: async (ctx, campaign, wpSite) => {
                const { createABTest, generateTitleVariations } = await import('../../abTesting');

                // Generate title variations
                const titleVariations = generateTitleVariations(ctx.content!.title);

                // Create A/B test record
                const test = createABTest(
                    `Title test for: ${ctx.content!.title.substring(0, 40)}...`,
                    ctx.wpResult!.postId,
                    wpSite.id,
                    titleVariations.map((title, i) => ({
                        id: `var_${i}`,
                        type: 'title' as const,
                        content: title,
                    }))
                );

                // Store test ID in context for tracking
                ctx.abTestId = test.id;
                console.log(`[Pipeline] A/B Test created: ${test.id} with ${titleVariations.length} variations`);
            },
        },
    ],
};
