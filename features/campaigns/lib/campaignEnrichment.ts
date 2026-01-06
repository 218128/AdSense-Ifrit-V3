/**
 * Campaign Enrichment Engine
 * FSD: features/campaigns/lib/campaignEnrichment.ts
 * 
 * JIT (Just-In-Time) enrichment system that runs capabilities
 * to fill gaps in campaign context data.
 * 
 * Priority: Hunt > Profile > Campaign Enrichment > Built-in
 */

import { aiServices } from '@/lib/ai/services/AIServices';
import type { Campaign } from '../model/types';
import type {
    CampaignContext,
    SourcedData,
    EnrichedKeyword,
    CompetitionData,
    ContentSuggestions,
    DataSource,
} from '../model/campaignContext';
import {
    createSourced,
    createEmptyContext,
    initContextFromHunt,
    needsEnrichment,
} from '../model/campaignContext';

// ============================================================================
// Enrichment Pipeline Configuration
// ============================================================================

/**
 * Enrichment step definition
 */
interface EnrichmentStep {
    /** Capability to execute */
    capability: string;
    /** What data this enriches */
    target: 'keyword' | 'research' | 'competition' | 'contentSuggestions';
    /** Condition to check if enrichment is needed */
    condition: (ctx: CampaignContext, keyword?: string) => boolean;
    /** Transform result to context update */
    transform: (result: unknown, ctx: CampaignContext, keyword?: string) => Partial<CampaignContext>;
}

/**
 * Default enrichment pipeline - executed in order when data is missing
 */
const ENRICHMENT_PIPELINE: EnrichmentStep[] = [
    {
        capability: 'research',
        target: 'research',
        condition: (ctx, keyword) => {
            if (!keyword) return false;
            return !ctx.research[keyword]?.value?.length;
        },
        transform: (result, ctx, keyword) => {
            if (!keyword) return {};
            const findings = Array.isArray(result) ? result :
                typeof result === 'string' ? [result] : [];
            return {
                research: {
                    ...ctx.research,
                    [keyword]: createSourced(findings as string[], 'campaign-enrichment', 0.7),
                },
            };
        },
    },
    {
        capability: 'keyword-analyze',
        target: 'keyword',
        condition: (ctx) => {
            // Need enrichment if no keywords have CPC/score data
            return ctx.keywords.length > 0 &&
                ctx.keywords.every(k => !k.value.cpc && !k.value.score);
        },
        transform: (result, ctx) => {
            // Result should be array of analyzed keywords
            const analyzed = result as { keyword: string; cpc?: string; score?: number }[];
            if (!Array.isArray(analyzed)) return {};

            const updatedKeywords = ctx.keywords.map(kw => {
                const match = analyzed.find(a =>
                    a.keyword.toLowerCase() === kw.value.keyword.toLowerCase()
                );
                if (match) {
                    return createSourced<EnrichedKeyword>(
                        { ...kw.value, ...match },
                        'campaign-enrichment',
                        0.7
                    );
                }
                return kw;
            });

            return { keywords: updatedKeywords };
        },
    },
];

// ============================================================================
// Enrichment Engine
// ============================================================================

export interface EnrichmentOptions {
    /** Maximum enrichment steps to run */
    maxSteps?: number;
    /** Capabilities to skip */
    skipCapabilities?: string[];
    /** Only enrich specific fields */
    fieldsToEnrich?: ('research' | 'competition' | 'contentSuggestions')[];
    /** Specific keyword to enrich */
    forKeyword?: string;
}

/**
 * Get or create campaign context, enriching as needed
 */
export async function getEnrichedContext(
    campaign: Campaign,
    options: EnrichmentOptions = {}
): Promise<CampaignContext> {
    // 1. Initialize from existing context or Hunt data
    let context: CampaignContext;

    if (campaign.context) {
        // Use existing context
        context = campaign.context;
    } else if (campaign.huntContext) {
        // Initialize from Hunt data
        context = initContextFromHunt(campaign.huntContext);
    } else {
        // Start empty
        context = createEmptyContext();

        // Add keywords from source if available
        if (campaign.source.type === 'keywords' && campaign.source.config.keywords) {
            const keywords = campaign.source.config.keywords as string[];
            context.keywords = keywords.map(kw =>
                createSourced<EnrichedKeyword>({ keyword: kw }, 'built-in', 0.3)
            );
        }
    }

    // 2. Run JIT enrichment for missing data
    context = await runEnrichmentPipeline(context, options);

    return context;
}

/**
 * Run enrichment pipeline to fill gaps
 */
async function runEnrichmentPipeline(
    context: CampaignContext,
    options: EnrichmentOptions
): Promise<CampaignContext> {
    const { maxSteps = 5, skipCapabilities = [], forKeyword } = options;
    let enrichedContext = { ...context };
    let stepsRun = 0;

    for (const step of ENRICHMENT_PIPELINE) {
        if (stepsRun >= maxSteps) break;
        if (skipCapabilities.includes(step.capability)) continue;

        // Check if this step is needed
        const keyword = step.target === 'research' ? forKeyword : undefined;
        if (!step.condition(enrichedContext, keyword)) continue;

        try {
            // Execute capability
            const result = await aiServices.execute({
                capability: step.capability,
                prompt: buildEnrichmentPrompt(enrichedContext, step.target, keyword),
                context: {
                    niche: enrichedContext.niche.value.name,
                    keywords: enrichedContext.keywords.map(k => k.value.keyword),
                },
            });

            if (result.success && result.result) {
                // Apply transformation
                const updates = step.transform(result.result, enrichedContext, keyword);
                enrichedContext = { ...enrichedContext, ...updates };

                // Track source
                if (!enrichedContext.contributingSources.includes('campaign-enrichment')) {
                    enrichedContext.contributingSources.push('campaign-enrichment');
                }
            }

            stepsRun++;
        } catch (error) {
            console.error(`[Enrichment] Failed to run ${step.capability}:`, error);
        }
    }

    enrichedContext.lastUpdated = Date.now();
    return enrichedContext;
}

/**
 * Build prompt for enrichment capability
 */
function buildEnrichmentPrompt(
    context: CampaignContext,
    target: string,
    keyword?: string
): string {
    const niche = context.niche.value.name;
    const keywords = context.keywords.map(k => k.value.keyword).join(', ');

    switch (target) {
        case 'research':
            return `Research the topic "${keyword}" in the ${niche} niche. Provide key facts, statistics, and insights.`;
        case 'keyword':
            return `Analyze these keywords for the ${niche} niche: ${keywords}. Provide CPC estimates, competition level, and search intent.`;
        case 'competition':
            return `Analyze competition in the ${niche} niche for these keywords: ${keywords}. Identify top competitors and content gaps.`;
        case 'contentSuggestions':
            return `Suggest content ideas for the ${niche} niche covering: ${keywords}. Include unique angles and content gaps to fill.`;
        default:
            return `Provide analysis for ${target} in the ${niche} niche.`;
    }
}

// ============================================================================
// Specific Enrichment Functions
// ============================================================================

/**
 * Enrich research for a specific keyword (JIT)
 */
export async function enrichKeywordResearch(
    context: CampaignContext,
    keyword: string
): Promise<CampaignContext> {
    if (!needsEnrichment(context, 'research', keyword)) {
        return context;
    }

    try {
        const result = await aiServices.execute({
            capability: 'research',
            prompt: `Research "${keyword}" in the ${context.niche.value.name} niche. Provide 5-7 key facts and insights.`,
            context: { keyword, niche: context.niche.value.name },
        });

        if (result.success && result.result) {
            const findings = typeof result.result === 'string'
                ? result.result.split('\n').filter(Boolean)
                : Array.isArray(result.result) ? result.result : [];

            return {
                ...context,
                research: {
                    ...context.research,
                    [keyword]: createSourced(findings, 'campaign-enrichment', 0.7),
                },
                contributingSources: [...new Set([...context.contributingSources, 'campaign-enrichment'])],
                lastUpdated: Date.now(),
            };
        }
    } catch (error) {
        console.error(`[Enrichment] Research failed for "${keyword}":`, error);
    }

    return context;
}

/**
 * Enrich competition analysis
 */
export async function enrichCompetition(
    context: CampaignContext
): Promise<CampaignContext> {
    if (!needsEnrichment(context, 'competition')) {
        return context;
    }

    try {
        const keywords = context.keywords.map(k => k.value.keyword).join(', ');
        const result = await aiServices.execute({
            capability: 'research',
            prompt: `Analyze competition for these keywords in ${context.niche.value.name}: ${keywords}. 
                     Rate overall competition (low/medium/high), list top 3 competitors, identify content gaps.`,
            context: { niche: context.niche.value.name, keywords },
        });

        if (result.success && result.result) {
            // Parse competition data from AI response
            const competition: CompetitionData = {
                level: 'medium', // Default, would parse from result
                topCompetitors: [],
                contentGaps: [],
            };

            return {
                ...context,
                competition: createSourced(competition, 'campaign-enrichment', 0.6),
                contributingSources: [...new Set([...context.contributingSources, 'campaign-enrichment'])],
                lastUpdated: Date.now(),
            };
        }
    } catch (error) {
        console.error('[Enrichment] Competition analysis failed:', error);
    }

    return context;
}

/**
 * Enrich content suggestions
 */
export async function enrichContentSuggestions(
    context: CampaignContext
): Promise<CampaignContext> {
    if (!needsEnrichment(context, 'contentSuggestions')) {
        return context;
    }

    try {
        const keywords = context.keywords.map(k => k.value.keyword).join(', ');
        const result = await aiServices.execute({
            capability: 'generate',
            prompt: `Suggest content strategy for ${context.niche.value.name} blog covering: ${keywords}.
                     Provide: themes (3-5), content gaps to fill (3-5), unique angles (3-5).
                     Format as JSON with keys: themes, gaps, angles (all arrays of strings).`,
            context: { niche: context.niche.value.name, format: 'json' },
        });

        if (result.success && result.result) {
            let suggestions: ContentSuggestions = { themes: [], gaps: [], angles: [] };

            try {
                const parsed = typeof result.result === 'string'
                    ? JSON.parse(result.result)
                    : result.result;
                suggestions = {
                    themes: parsed.themes || [],
                    gaps: parsed.gaps || [],
                    angles: parsed.angles || [],
                };
            } catch {
                // Use empty defaults if parsing fails
            }

            return {
                ...context,
                contentSuggestions: createSourced(suggestions, 'campaign-enrichment', 0.7),
                contributingSources: [...new Set([...context.contributingSources, 'campaign-enrichment'])],
                lastUpdated: Date.now(),
            };
        }
    } catch (error) {
        console.error('[Enrichment] Content suggestions failed:', error);
    }

    return context;
}
