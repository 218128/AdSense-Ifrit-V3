/**
 * Campaign Trigger API
 * POST /api/campaigns/trigger
 * 
 * Manually trigger a specific campaign (for local dev/testing).
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { campaignId }: { campaignId?: string } = body;

        if (!campaignId) {
            return NextResponse.json(
                { success: false, error: 'campaignId is required' },
                { status: 400 }
            );
        }

        // Import dynamically
        const { useCampaignStore, createRun, runPipeline } = await import('@/features/campaigns');
        const { useWPSitesStore } = await import('@/features/wordpress/model/wpSiteStore');
        const { fetchRSSSourceItems } = await import('@/features/campaigns/lib/rssSource');
        const { fetchTrendsSourceItems } = await import('@/features/campaigns/lib/trendsSource');

        const store = useCampaignStore.getState();
        const wpStore = useWPSitesStore.getState();

        const campaign = store.getCampaign(campaignId);

        if (!campaign) {
            return NextResponse.json(
                { success: false, error: 'Campaign not found' },
                { status: 404 }
            );
        }

        const wpSite = wpStore.getSite(campaign.targetSiteId);

        if (!wpSite) {
            return NextResponse.json(
                { success: false, error: 'WordPress site not found' },
                { status: 404 }
            );
        }

        if (wpSite.status !== 'connected') {
            return NextResponse.json(
                { success: false, error: 'WordPress site not connected' },
                { status: 400 }
            );
        }

        // Get source items based on type
        const sourceItems = await getSourceItems(campaign, fetchRSSSourceItems, fetchTrendsSourceItems);

        if (sourceItems.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No source items available' },
                { status: 400 }
            );
        }

        // Create run record
        const run = createRun(campaign.id);
        store.addRunToHistory(run);

        const results = [];
        const maxPosts = Math.min(sourceItems.length, campaign.schedule.maxPostsPerRun);

        for (let i = 0; i < maxPosts; i++) {
            try {
                const ctx = await runPipeline(campaign, sourceItems[i], wpSite);
                store.incrementPublished(campaign.id);

                results.push({
                    topic: sourceItems[i].topic,
                    status: 'success',
                    postUrl: ctx.wpResult?.postUrl,
                });
            } catch (error) {
                store.incrementFailed(campaign.id);
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                store.addErrorToRun(run.id, 'generate', errorMsg);

                results.push({
                    topic: sourceItems[i].topic,
                    status: 'failed',
                    error: errorMsg,
                });

                if (campaign.schedule.pauseOnError) {
                    store.pauseCampaign(campaign.id);
                    break;
                }
            }
        }

        // Complete run
        const hasSuccess = results.some(r => r.status === 'success');
        store.completeRun(run.id, hasSuccess ? 'completed' : 'failed');

        // Update next run time for interval schedules
        if (campaign.schedule.type === 'interval') {
            store.updateNextRun(campaign.id);
        }

        return NextResponse.json({
            success: hasSuccess,
            campaignId,
            campaignName: campaign.name,
            runId: run.id,
            results,
        });

    } catch (error) {
        console.error('Trigger error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Trigger failed' },
            { status: 500 }
        );
    }
}

// ============================================================================
// Helpers
// ============================================================================

import type { RSSSourceConfig, TrendsSourceConfig, SourceItem, SourceType } from '@/features/campaigns/model/types';
import type { RSSFetchResult } from '@/features/campaigns/lib/rssSource';
import type { TrendsFetchResult } from '@/features/campaigns/lib/trendsSource';

type FetchRSSFn = (config: RSSSourceConfig, limit?: number) => Promise<RSSFetchResult>;
type FetchTrendsFn = (config: TrendsSourceConfig, limit?: number, serpApiKey?: string) => Promise<TrendsFetchResult>;

async function getSourceItems(
    campaign: { source: { type: string; config: unknown }; schedule: { maxPostsPerRun: number } },
    fetchRSS: FetchRSSFn,
    fetchTrends?: FetchTrendsFn
): Promise<SourceItem[]> {
    const { source } = campaign;

    if (source.type === 'keywords') {
        const config = source.config as { keywords: string[]; currentIndex?: number };
        const keywords = config.keywords || [];
        const startIndex = config.currentIndex || 0;

        return keywords.slice(startIndex).map(keyword => ({
            id: `kw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            topic: keyword,
            sourceType: 'keywords' as SourceType,
        }));
    }

    if (source.type === 'rss') {
        const config = source.config as RSSSourceConfig;
        const result = await fetchRSS(config, campaign.schedule.maxPostsPerRun);
        return result.items;
    }

    if (source.type === 'trends' && fetchTrends) {
        const config = source.config as TrendsSourceConfig;
        // Get SerpAPI key from localStorage if available (passed from client)
        const serpApiKey = typeof localStorage !== 'undefined'
            ? localStorage.getItem('serpapi_key') || undefined
            : undefined;
        const result = await fetchTrends(config, campaign.schedule.maxPostsPerRun, serpApiKey);
        return result.items;
    }

    return [];
}
