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
 */
export async function launchCampaignFromHunt(config: LaunchConfig): Promise<LaunchResult> {
    const { domain, keywords, trends, targetSiteId, autoStart = false } = config;

    if (!targetSiteId) {
        return {
            success: false,
            error: 'No target WordPress site specified. Create a site first.',
        };
    }

    try {
        // Build campaign source from Hunt data
        const sources = buildSourcesFromHunt(keywords, trends, config.initialArticles);

        // Build AI config with niche context
        const aiConfig = buildAIConfig(domain, keywords, config.aiConfig);

        // Build schedule
        const schedule = buildSchedule(config.schedule);

        // Create campaign name
        const campaignName = `${domain.domain} - Launch Campaign`;

        // Create the campaign
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
            multiLang: {
                enabled: false,
                targetLanguages: [],
            },
        });

        return {
            success: true,
            campaignId: campaign.id,
            campaign,
        };

    } catch (error) {
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
                topics: keywords.slice(0, initialArticles).map((kw, idx) => ({
                    topic: kw.keyword,
                    priority: idx + 1,
                    notes: kw.researchFindings?.join('; '),
                })),
            },
        });
    }

    // If trends exist and not enough keywords, add trends as topics
    if (keywords.length < initialArticles && trends.length > 0) {
        const remaining = initialArticles - keywords.length;
        const trendTopics = trends.slice(0, remaining).map((t, idx) => ({
            topic: t.topic,
            priority: keywords.length + idx + 1,
            notes: `Trend from ${t.source}`,
        }));

        if (sources.length > 0 && sources[0].type === 'manual') {
            (sources[0].config as { topics: Array<{ topic: string; priority: number; notes?: string }> }).topics.push(...trendTopics);
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
        postsPerRun: 1,
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
