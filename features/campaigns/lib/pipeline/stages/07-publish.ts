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
                !!campaign.aiConfig.enableMultiSite &&
                (campaign.aiConfig.additionalSiteIds?.length || 0) > 0,
            execute: async (ctx, campaign) => {
                const { publishToMultipleSites, validateMultiSiteConfig } = await import('../../multiSitePublishing');
                const { useWPSitesStore } = await import('@/features/wordpress');

                if (!ctx.content || !campaign.aiConfig.additionalSiteIds || campaign.aiConfig.additionalSiteIds.length === 0) {
                    return;
                }

                // Build multi-site config
                const config = {
                    sites: campaign.aiConfig.additionalSiteIds.map(siteId => ({
                        siteId,
                        customizations: {
                            postStatus: campaign.postStatus,
                        },
                    })),
                    staggerMinutes: campaign.aiConfig.multiSiteStaggerMinutes || 0,
                    spinForEachSite: campaign.aiConfig.enableSpinner || false,
                    spinMode: campaign.aiConfig.spinnerMode,
                };

                // Validate config
                const errors = validateMultiSiteConfig(config);
                if (errors.length > 0) {
                    console.warn(`[Pipeline] Multi-site config invalid: ${errors.join(', ')}`);
                    return;
                }

                // Get all sites from store
                const allSites = useWPSitesStore.getState().getAllSites();

                // Execute multi-site publishing
                console.log(`[Pipeline] Multi-site: Publishing to ${campaign.aiConfig.additionalSiteIds.length} additional sites`);
                const report = await publishToMultipleSites(ctx, config, allSites, campaign.aiConfig);

                console.log(`[Pipeline] Multi-site complete: ${report.successCount}/${report.totalSites} succeeded`);
                if (report.failedCount > 0) {
                    console.warn(`[Pipeline] Multi-site failures: ${report.results.filter(r => !r.success).map(r => r.siteName).join(', ')}`);
                }

                // Store report in context for run history
                ctx.multiSiteReport = report;
            },
        },
        {
            id: 'analytics',
            name: 'Analytics Recording',
            optional: true,
            condition: (_, campaign) => !!campaign.aiConfig.analyticsEnabled,
            execute: async (ctx, campaign, wpSite) => {
                const { recordPostPublished, validateGA4Config } = await import('@/lib/integrations/analyticsIntegration');
                const { useSettingsStore } = await import('@/stores/settingsStore');

                // Get GA4 config from settings
                const integrations = useSettingsStore.getState().integrations;
                const ga4Config = {
                    measurementId: integrations.ga4MeasurementId,
                    apiSecret: integrations.ga4ApiSecret,
                };

                // Validate config
                const errors = validateGA4Config(ga4Config);
                if (errors.length > 0) {
                    console.warn(`[Pipeline] Analytics skipped: ${errors.join(', ')}`);
                    return;
                }

                // Record post publication event
                if (ctx.wpResult && ctx.content) {
                    const result = await recordPostPublished(ga4Config, {
                        postUrl: ctx.wpResult.postUrl,
                        postTitle: ctx.content.title,
                        postId: ctx.wpResult.postId,
                        siteId: wpSite.id,
                        siteName: wpSite.name,
                        author: ctx.matchedAuthor?.name || 'Unknown',
                        wordCount: ctx.content.body?.split(/\s+/).length || 0,
                        hasImages: !!ctx.images?.cover,
                        campaignId: campaign.id,
                    });

                    if (result.success) {
                        console.log(`[Pipeline] Analytics: Post ${ctx.wpResult.postId} tracked via GA4`);
                    } else {
                        console.warn(`[Pipeline] Analytics failed: ${result.error}`);
                    }
                }
            },
        },
        {
            id: 'ab_testing',
            name: 'A/B Test Setup',
            optional: true,
            condition: (ctx, campaign) =>
                !!campaign.aiConfig.enableABTesting && !!ctx.wpResult && !!ctx.content,
            execute: async (ctx, campaign, wpSite) => {
                const {
                    createComprehensiveABTest,
                    generateContentRespinVariants,
                } = await import('../../abTesting');

                // Build A/B test config from campaign settings
                const config = {
                    testTitles: campaign.aiConfig.abTestTitles ?? true,
                    testCovers: campaign.aiConfig.abTestCovers ?? false,
                    testRespins: campaign.aiConfig.abTestRespins ?? false,
                };

                // Collect cover images if available
                const coverImages: { url: string; alt: string; source: string }[] = [];
                if (ctx.images?.cover?.url) {
                    coverImages.push({
                        url: ctx.images.cover.url,
                        alt: ctx.images.cover.alt || ctx.content!.title,
                        source: 'primary',
                    });
                }
                // Add any additional images from allImageAssets
                if (ctx.allImageAssets && Array.isArray(ctx.allImageAssets)) {
                    ctx.allImageAssets.slice(0, 5).forEach((img, i) => {
                        coverImages.push({
                            url: img.url,
                            alt: img.alt || `Image ${i + 1}`,
                            source: img.source || 'generated',
                        });
                    });
                }

                // Create comprehensive A/B test
                const test = createComprehensiveABTest(
                    `A/B Test: ${ctx.content!.title.substring(0, 40)}...`,
                    ctx.wpResult!.postId,
                    wpSite.id,
                    ctx.content!.title,
                    config,
                    coverImages
                );

                // Add respin variants if enabled (async)
                if (config.testRespins && ctx.content?.body) {
                    try {
                        const respinVariants = await generateContentRespinVariants(
                            ctx.content.body,
                            ['light', 'moderate']
                        );
                        test.variants.push(...respinVariants.map(v => ({
                            ...v,
                            impressions: 0,
                            clicks: 0,
                            conversions: 0,
                        })));
                        console.log(`[Pipeline] Added ${respinVariants.length} respin variants`);
                    } catch (e) {
                        console.warn('[Pipeline] Respin variants failed:', e);
                    }
                }

                // Store test ID in context for tracking
                ctx.abTestId = test.id;

                const variantCounts = {
                    titles: test.variants.filter(v => v.type === 'title').length,
                    covers: test.variants.filter(v => v.type === 'cover_image').length,
                    respins: test.variants.filter(v => v.type === 'content').length,
                };

                console.log(`[Pipeline] A/B Test created: ${test.id}`, variantCounts);
            },
        },
    ],
};
