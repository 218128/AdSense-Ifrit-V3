/**
 * Stage 09: Syndication
 * FSD: features/campaigns/lib/pipeline/stages/09-syndicate.ts
 * 
 * Publish content to newsletter providers and third-party platforms.
 * Runs after distribution stage (requires publishedUrl from 07-publish).
 */

import type { StageGroup } from '../types';

export const syndicationStages: StageGroup = {
    id: 'syndication',
    name: 'Syndication',
    parallel: true,  // Newsletter + Platform syndication can run concurrently
    runItemStatus: 'publishing',
    stages: [
        {
            id: 'newsletter_publish',
            name: 'Newsletter Publishing',
            optional: true,
            condition: (ctx, campaign) =>
                !!campaign.aiConfig.enableNewsletterPublish &&
                !!ctx.publishedUrl &&
                campaign.aiConfig.newsletterSchedule !== 'manual',
            execute: async (ctx, campaign) => {
                const { sendNewsletter } = await import('@/lib/distribution');
                const { useSettingsStore } = await import('@/stores/settingsStore');

                const config = useSettingsStore.getState().newsletterConfig;

                if (!config?.apiKey || !config.provider) {
                    console.warn('[Pipeline] Newsletter not configured in Settings');
                    return;
                }

                // Use newsletter content from multiFormatOutput if available
                const newsletterContent = ctx.multiFormatOutput?.newsletter;

                const result = await sendNewsletter(
                    {
                        provider: config.provider,
                        apiKey: config.apiKey,
                        listId: config.listId,
                    },
                    {
                        subject: newsletterContent?.subject || ctx.content!.title,
                        htmlBody: newsletterContent?.body || ctx.content!.body,
                        previewText: newsletterContent?.preview || ctx.content!.excerpt,
                    }
                );

                if (result.success) {
                    console.log(`[Pipeline] Newsletter sent: ${result.messageId}`);
                    ctx.newsletterResult = result;
                } else {
                    console.warn(`[Pipeline] Newsletter failed: ${result.error}`);
                }
            },
        },
        {
            id: 'platform_syndication',
            name: 'Platform Syndication',
            optional: true,
            condition: (ctx, campaign) =>
                !!campaign.aiConfig.enableSyndication &&
                !!ctx.publishedUrl &&
                (campaign.aiConfig.syndicationPlatforms?.length ?? 0) > 0,
            execute: async (ctx, campaign) => {
                const { syndicateToMultiple } = await import('@/lib/distribution');
                const { useSettingsStore } = await import('@/stores/settingsStore');

                const allConfigs = useSettingsStore.getState().syndicationConfigs || [];

                // Filter to enabled configs for selected platforms
                const enabledConfigs = allConfigs.filter(c =>
                    c.enabled &&
                    campaign.aiConfig.syndicationPlatforms?.includes(c.platform)
                );

                if (enabledConfigs.length === 0) {
                    console.warn('[Pipeline] No syndication platforms configured/enabled');
                    return;
                }

                // Check delay (if configured)
                const delay = campaign.aiConfig.syndicationDelay || 0;
                if (delay > 0) {
                    console.log(`[Pipeline] Syndication delayed by ${delay} days (will syndicate later)`);
                    // Store for later processing via cron
                    ctx.pendingSyndication = {
                        platforms: enabledConfigs.map(c => c.platform),
                        scheduledFor: new Date(Date.now() + delay * 24 * 60 * 60 * 1000),
                    };
                    return;
                }

                const results = await syndicateToMultiple(enabledConfigs, {
                    title: ctx.content!.title,
                    body: ctx.content!.body,
                    canonicalUrl: ctx.publishedUrl,
                    // Note: tags and coverImage are extracted from content if available
                });

                ctx.syndicationResults = results;

                const successCount = Object.values(results).filter(
                    (r): r is { success: true; url?: string; postId?: string } => r.success === true
                ).length;
                console.log(`[Pipeline] Syndicated to ${successCount}/${enabledConfigs.length} platforms`);

                // Log individual results
                for (const [platform, result] of Object.entries(results)) {
                    const typedResult = result as { success: boolean; url?: string; error?: string };
                    if (typedResult.success) {
                        console.log(`  ✓ ${platform}: ${typedResult.url}`);
                    } else {
                        console.warn(`  ✗ ${platform}: ${typedResult.error}`);
                    }
                }
            },
        },
    ],
};
