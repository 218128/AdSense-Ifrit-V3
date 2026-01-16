/**
 * Launch Workflow
 * FSD: features/hunt/lib/launchWorkflow.ts
 * 
 * Connects Hunt feature to Campaign and WP Sites for one-click site launch.
 * Flow: Hunt → Domain → WP Site → Campaign
 */

import type { OwnedDomain, SelectedKeyword, SelectedTrend } from '../model/huntStore';
import type { Campaign, AIConfig, ScheduleConfig, CampaignSource, SourceType } from '@/features/campaigns/model/types';
import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import { useHuntStore } from '../model/huntStore';

// ============================================================================
// Types
// ============================================================================

export interface LaunchConfig {
    /** Domain to launch site for */
    domain: OwnedDomain;
    /** Target WP site ID (if already created) */
    targetSiteId?: string;
    /** Keywords to use for content */
    keywords: SelectedKeyword[];
    /** Trends to use for content */
    trends: SelectedTrend[];
    /** Initial article count */
    initialArticles?: number;
    /** AI config overrides */
    aiConfig?: Partial<AIConfig>;
    /** Schedule config */
    schedule?: Partial<ScheduleConfig>;
    /** Auto-start campaign after creation */
    autoStart?: boolean;
}

export interface LaunchResult {
    success: boolean;
    campaignId?: string;
    campaign?: Campaign;
    error?: string;
}

// ============================================================================
// Quick Launch - One Click
// ============================================================================

/**
 * Create and optionally start a campaign from Hunt data
 * This is the main "Launch Site" action
 * Automatically reports progress to GlobalActionStatus
 */
export async function launchCampaignFromHunt(config: LaunchConfig): Promise<LaunchResult> {
    const { domain, keywords, trends, targetSiteId, autoStart = false } = config;

    // Import status store dynamically to avoid SSR issues
    const { useGlobalActionStatusStore } = await import('@/stores/globalActionStatusStore');
    const statusStore = useGlobalActionStatusStore.getState();

    // Start launch action
    const actionId = statusStore.startAction(
        `Launch: ${domain.domain}`,
        'campaign',
        {
            source: 'user',
            origin: 'hunt/launchWorkflow',
            retryable: true,
        }
    );

    if (!targetSiteId) {
        statusStore.failAction(actionId, 'No target WordPress site specified');
        return {
            success: false,
            error: 'No target WordPress site specified. Create a site first.',
        };
    }

    try {
        // Step 1: Build sources from Hunt data
        const step1Id = statusStore.addStep(actionId, '⏳ Building content sources...', 'running');
        const sources = buildSourcesFromHunt(keywords, trends, config.initialArticles);
        statusStore.updateStep(actionId, step1Id, `✅ ${sources.length} sources built`, 'success');

        // Step 2: Build AI config
        const step2Id = statusStore.addStep(actionId, '⏳ Configuring AI settings...', 'running');
        const aiConfig = buildAIConfig(domain, keywords, config.aiConfig);
        statusStore.updateStep(actionId, step2Id, `✅ AI config: ${aiConfig.nicheContext || 'general'}`, 'success');

        // Step 3: Build schedule
        const step3Id = statusStore.addStep(actionId, '⏳ Setting up schedule...', 'running');
        const schedule = buildSchedule(config.schedule);
        statusStore.updateStep(actionId, step3Id, `✅ Schedule: ${schedule.type}`, 'success');

        // Step 4: Create campaign
        const step4Id = statusStore.addStep(actionId, '⏳ Creating campaign...', 'running');
        const campaignName = `${domain.domain} - Launch Campaign`;

        const campaign = useCampaignStore.getState().createCampaign({
            name: campaignName,
            description: `Auto-generated campaign for ${domain.domain} from Hunt keywords and trends.`,
            targetSiteId,
            source: sources[0] || {
                type: 'manual' as SourceType,
                config: { topics: keywords.map(k => ({ topic: k.keyword, priority: 1 })) }
            },
            aiConfig,
            schedule,
            status: autoStart ? 'active' : 'paused',
            postStatus: 'publish',  // Default to publish
            // Note: multiLang config would go here if feature is implemented
        });
        statusStore.updateStep(actionId, step4Id, `✅ Campaign created: ${campaign.id}`, 'success');

        // Complete action
        statusStore.completeAction(actionId, `✅ Launched: ${domain.domain}`);

        return {
            success: true,
            campaignId: campaign.id,
            campaign,
        };

    } catch (error) {
        statusStore.failAction(actionId, error instanceof Error ? error.message : 'Failed to create campaign');
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create campaign',
        };
    }
}

// ============================================================================
// Hunt Data → Campaign Source Builders
// ============================================================================

/**
 * Build campaign sources from Hunt keywords and trends
 */
function buildSourcesFromHunt(
    keywords: SelectedKeyword[],
    trends: SelectedTrend[],
    initialArticles = 5
): CampaignSource[] {
    const sources: CampaignSource[] = [];

    // Keywords as manual topics
    if (keywords.length > 0) {
        sources.push({
            type: 'manual',
            config: {
                type: 'manual' as const,
                topics: keywords.slice(0, initialArticles).map((kw, idx) => ({
                    id: `hunt_kw_${idx}`,
                    topic: kw.keyword,
                    status: 'pending' as const,
                })),
            },
        });
    }

    // If trends exist and not enough keywords, add trends as topics
    if (keywords.length < initialArticles && trends.length > 0) {
        const remaining = initialArticles - keywords.length;
        const trendTopics = trends.slice(0, remaining).map((t, idx) => ({
            id: `hunt_trend_${idx}`,
            topic: t.topic,
            status: 'pending' as const,
        }));

        if (sources.length > 0 && sources[0].type === 'manual') {
            (sources[0].config as { type: 'manual'; topics: Array<{ id: string; topic: string; status: 'pending' | 'generated' | 'published' }> }).topics.push(...trendTopics);
        }
    }

    return sources;
}

/**
 * Build AI config with niche context from domain profile
 */
function buildAIConfig(
    domain: OwnedDomain,
    keywords: SelectedKeyword[],
    overrides?: Partial<AIConfig>
): AIConfig {
    // Infer niche from domain profile or keywords
    const niche = domain.profile?.niche ||
        keywords[0]?.niche ||
        inferNicheFromDomain(domain.domain);

    return {
        // provider inherited from Settings
        articleType: 'pillar',
        tone: 'professional',
        targetLength: 2000,
        useResearch: true,
        includeImages: true,
        includeFAQ: true,
        optimizeForSEO: true,
        includeSchema: true,
        nicheContext: niche,
        ...overrides,
    };
}

/**
 * Build default schedule for new campaign
 */
function buildSchedule(overrides?: Partial<ScheduleConfig>): ScheduleConfig {
    return {
        type: 'interval',
        intervalHours: 24, // Once per day
        maxPostsPerRun: 1,
        pauseOnError: false,  // Don't pause on first error
        ...overrides,
    };
}

/**
 * Simple niche inference from domain name
 */
function inferNicheFromDomain(domain: string): string {
    const name = domain.split('.')[0].toLowerCase();

    // Common niche keywords
    const nicheMap: Record<string, string> = {
        tech: 'technology',
        health: 'health & wellness',
        fitness: 'fitness',
        finance: 'finance',
        travel: 'travel',
        food: 'food & recipes',
        gaming: 'gaming',
        fashion: 'fashion',
        home: 'home & garden',
        auto: 'automotive',
        pet: 'pets',
        beauty: 'beauty',
        sport: 'sports',
    };

    for (const [keyword, niche] of Object.entries(nicheMap)) {
        if (name.includes(keyword)) {
            return niche;
        }
    }

    return 'general';
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get ready-to-launch domains (purchased but no campaign yet)
 */
export function getReadyToLaunchDomains(): OwnedDomain[] {
    const { ownedDomains } = useHuntStore.getState();
    const { campaigns } = useCampaignStore.getState();

    // Get domains that have a site but no campaign
    return ownedDomains.filter(d => {
        if (!d.siteCreated) return false;

        // Check if any campaign targets this domain
        // (would need to match by site ID in real implementation)
        const hasCampaign = campaigns.some(c =>
            c.name.toLowerCase().includes(d.domain.toLowerCase())
        );

        return !hasCampaign;
    });
}

/**
 * Get launch suggestions from Hunt data
 */
export function getLaunchSuggestions(): {
    domains: OwnedDomain[];
    keywords: SelectedKeyword[];
    trends: SelectedTrend[];
} {
    const { ownedDomains, selectedKeywords, selectedTrends } = useHuntStore.getState();

    return {
        domains: ownedDomains.filter(d => d.siteCreated),
        keywords: selectedKeywords,
        trends: selectedTrends,
    };
}

/**
 * Quick launch with defaults - minimal config needed
 */
export async function quickLaunch(
    domainName: string,
    targetSiteId: string
): Promise<LaunchResult> {
    const { ownedDomains, selectedKeywords, selectedTrends } = useHuntStore.getState();

    const domain = ownedDomains.find(d => d.domain === domainName);
    if (!domain) {
        return { success: false, error: `Domain ${domainName} not found in owned domains` };
    }

    return launchCampaignFromHunt({
        domain,
        targetSiteId,
        keywords: selectedKeywords.slice(0, 10),
        trends: selectedTrends.slice(0, 5),
        initialArticles: 5,
        autoStart: false, // Let user review before starting
    });
}
