/**
 * Campaign Cron API
 * GET /api/campaigns/cron
 * 
 * Checks for due campaigns and executes them.
 * Called by external cron service or manually for testing.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CronResult {
    campaignId: string;
    campaignName: string;
    status: 'success' | 'failed' | 'skipped';
    postsGenerated?: number;
    error?: string;
}

export async function GET() {
    const results: CronResult[] = [];

    try {
        // Import dynamically to avoid SSR issues with Zustand persist
        const { useCampaignStore } = await import('@/features/campaigns');
        const { useWPSitesStore } = await import('@/features/wordpress/model/wpSiteStore');
        const { runPipeline, createRun } = await import('@/features/campaigns');

        const store = useCampaignStore.getState();
        const wpStore = useWPSitesStore.getState();

        // Get all due campaigns
        const dueCampaigns = store.getDueCampaigns();

        if (dueCampaigns.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No due campaigns',
                results: [],
            });
        }

        // Execute each due campaign
        for (const campaign of dueCampaigns) {
            const wpSite = wpStore.getSite(campaign.targetSiteId);

            if (!wpSite || wpSite.status !== 'connected') {
                results.push({
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    status: 'skipped',
                    error: 'WordPress site not connected',
                });
                continue;
            }

            // Get source items based on source type
            const sourceItems = await getSourceItems(campaign);

            if (sourceItems.length === 0) {
                results.push({
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    status: 'skipped',
                    error: 'No source items available',
                });
                continue;
            }

            // Create run record
            const run = createRun(campaign.id);
            store.addRunToHistory(run);

            let postsGenerated = 0;
            const maxPosts = campaign.schedule.maxPostsPerRun;

            // Process source items up to max
            for (let i = 0; i < Math.min(sourceItems.length, maxPosts); i++) {
                try {
                    await runPipeline(campaign, sourceItems[i], wpSite);
                    postsGenerated++;
                    store.incrementPublished(campaign.id);
                } catch (error) {
                    store.incrementFailed(campaign.id);
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    store.addErrorToRun(run.id, 'generate', errorMsg);

                    if (campaign.schedule.pauseOnError) {
                        store.pauseCampaign(campaign.id);
                        break;
                    }
                }
            }

            // Complete run
            store.completeRun(run.id, postsGenerated > 0 ? 'completed' : 'failed');

            // Update next run time
            store.updateNextRun(campaign.id);

            results.push({
                campaignId: campaign.id,
                campaignName: campaign.name,
                status: postsGenerated > 0 ? 'success' : 'failed',
                postsGenerated,
            });
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${results.length} campaigns`,
            results,
        });

    } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json(
            { success: false, error: 'Cron execution failed', results },
            { status: 500 }
        );
    }
}

// ============================================================================
// Helpers
// ============================================================================

async function getSourceItems(campaign: { source: { type: string; config: unknown } }) {
    const { source } = campaign;

    if (source.type === 'keywords') {
        const config = source.config as { keywords: string[]; currentIndex?: number };
        const keywords = config.keywords || [];
        const startIndex = config.currentIndex || 0;

        return keywords.slice(startIndex).map(keyword => ({
            id: `kw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            topic: keyword,
            sourceType: 'keywords' as const,
        }));
    }

    if (source.type === 'rss') {
        const { fetchFeed } = await import('@/features/campaigns/lib/rssParser');
        const config = source.config as { feedUrls: string[]; aiRewrite?: boolean };
        const feedUrls = config.feedUrls || [];
        const items: { id: string; topic: string; sourceType: 'rss' }[] = [];

        for (const url of feedUrls) {
            try {
                const result = await fetchFeed(url);
                if (result.success && result.feed) {
                    for (const item of result.feed.items.slice(0, 5)) { // Max 5 per feed
                        items.push({
                            id: item.id || `rss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            topic: item.title,
                            sourceType: 'rss' as const,
                        });
                    }
                }
            } catch (err) {
                console.error(`[Cron] Failed to fetch RSS: ${url}`, err);
            }
        }
        return items;
    }

    if (source.type === 'trends') {
        const { fetchTrends } = await import('@/features/campaigns/lib/trendsApi');
        const config = source.config as { region?: string; category?: string };

        try {
            const result = await fetchTrends({
                provider: 'unofficial',
                region: (config.region || 'US') as 'US' | 'GB' | 'CA' | 'AU' | 'IN' | 'DE' | 'FR' | 'JP' | 'BR',
                category: config.category,
            });

            if (result.success) {
                return result.topics.slice(0, 10).map(topic => ({
                    id: `trend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    topic: topic.title,
                    sourceType: 'trends' as const,
                }));
            }
        } catch (err) {
            console.error('[Cron] Failed to fetch trends', err);
        }
        return [];
    }

    return [];
}

