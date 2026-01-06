/**
 * Context Builder
 * FSD: features/campaigns/lib/contextBuilder.ts
 * 
 * Builds step-specific prompt contexts from the layered campaign data.
 * Provides transparency about data sources for each field.
 */

import type {
    CampaignContext,
    SourcedData,
    DataSource,
    EnrichedKeyword,
} from '../model/campaignContext';
import { enrichKeywordResearch } from './campaignEnrichment';

// ============================================================================
// Types
// ============================================================================

/**
 * Context for a specific content generation step
 */
export interface PromptContext {
    /** The target keyword */
    keyword: string;
    /** Niche name */
    niche: string;
    /** Content pillars for the niche */
    pillars: string[];
    /** Target audience description */
    targetAudience?: string;
    /** Research findings for the keyword */
    research: string[];
    /** Competition level */
    competitionLevel?: string;
    /** Unique content angles */
    angles: string[];
    /** Full keyword data */
    keywordData: EnrichedKeyword;
    /** Source summary for debugging/display */
    sourceSummary: SourceSummary;
}

/**
 * Source attribution for each field
 */
export interface SourceSummary {
    keyword: DataSource;
    niche: DataSource;
    research: DataSource;
    competition?: DataSource;
    angles?: DataSource;
    /** Human-readable summary */
    description: string;
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Build prompt context for a specific keyword and step
 * Will enrich missing data JIT if needed
 */
export async function buildPromptContext(
    campaignContext: CampaignContext,
    keyword: string,
    step: 'research' | 'outline' | 'content' | 'seo' | 'images'
): Promise<{ context: PromptContext; updatedCampaignContext: CampaignContext }> {
    let ctx = campaignContext;

    // Find keyword data
    const kwData = ctx.keywords.find(k =>
        k.value.keyword.toLowerCase() === keyword.toLowerCase()
    );

    // JIT enrich research if needed for content steps
    if (['outline', 'content', 'seo'].includes(step)) {
        if (!ctx.research[keyword]?.value?.length) {
            ctx = await enrichKeywordResearch(ctx, keyword);
        }
    }

    // Build source summary
    const sourceSummary = buildSourceSummary(ctx, keyword);

    // Build the context
    const promptContext: PromptContext = {
        keyword,
        niche: ctx.niche.value.name,
        pillars: ctx.niche.value.pillars,
        targetAudience: ctx.niche.value.targetAudience,
        research: ctx.research[keyword]?.value || [],
        competitionLevel: ctx.competition?.value?.level,
        angles: ctx.contentSuggestions?.value?.angles || [],
        keywordData: kwData?.value || { keyword },
        sourceSummary,
    };

    return {
        context: promptContext,
        updatedCampaignContext: ctx,
    };
}

/**
 * Build source summary for transparency
 */
function buildSourceSummary(
    ctx: CampaignContext,
    keyword: string
): SourceSummary {
    const kwData = ctx.keywords.find(k =>
        k.value.keyword.toLowerCase() === keyword.toLowerCase()
    );

    const sources: SourceSummary = {
        keyword: kwData?.source || 'built-in',
        niche: ctx.niche.source,
        research: ctx.research[keyword]?.source || 'built-in',
        competition: ctx.competition?.source,
        angles: ctx.contentSuggestions?.source,
        description: '',
    };

    // Build human-readable description
    const parts: string[] = [];

    if (sources.keyword === 'hunt') parts.push('Hunt keywords');
    if (sources.niche === 'hunt') parts.push('Hunt niche');
    else if (sources.niche === 'profile') parts.push('Profile niche');

    if (sources.research === 'hunt') parts.push('Hunt research');
    else if (sources.research === 'campaign-enrichment') parts.push('AI research');

    if (sources.competition === 'campaign-enrichment') parts.push('AI competition');
    if (sources.angles === 'campaign-enrichment') parts.push('AI angles');

    sources.description = parts.length > 0
        ? `Data from: ${parts.join(', ')}`
        : 'Using defaults';

    return sources;
}

// ============================================================================
// Prompt Templates
// ============================================================================

/**
 * Build research prompt using context
 */
export function buildResearchPrompt(ctx: PromptContext): string {
    return `Research the topic "${ctx.keyword}" for a ${ctx.niche} blog.

Target audience: ${ctx.targetAudience || 'general readers'}

Provide:
- Key facts and statistics
- Common questions people ask
- Recent developments or trends
- Expert insights if available

Focus on information that would be valuable for a comprehensive article.`;
}

/**
 * Build outline prompt using context
 */
export function buildOutlinePrompt(ctx: PromptContext): string {
    const researchSection = ctx.research.length > 0
        ? `\n\nResearch findings to incorporate:\n${ctx.research.map(r => `- ${r}`).join('\n')}`
        : '';

    const anglesSection = ctx.angles.length > 0
        ? `\n\nUnique angles to consider:\n${ctx.angles.map(a => `- ${a}`).join('\n')}`
        : '';

    return `Create an outline for an article about "${ctx.keyword}" for a ${ctx.niche} blog.

Target audience: ${ctx.targetAudience || 'general readers'}
Content pillars: ${ctx.pillars.join(', ') || 'N/A'}
${ctx.competitionLevel ? `Competition: ${ctx.competitionLevel}` : ''}
${researchSection}
${anglesSection}

Create a comprehensive outline with:
- Engaging introduction hook
- 4-6 main sections with subpoints
- FAQ section ideas
- Conclusion with call-to-action`;
}

/**
 * Build content generation prompt using context
 */
export function buildContentPrompt(ctx: PromptContext, outline: string): string {
    const researchSection = ctx.research.length > 0
        ? `\n\nKey facts to include:\n${ctx.research.slice(0, 5).map(r => `- ${r}`).join('\n')}`
        : '';

    return `Write a comprehensive article about "${ctx.keyword}" for a ${ctx.niche} blog.

Target audience: ${ctx.targetAudience || 'general readers'}
Keyword data: ${ctx.keywordData.intent ? `Intent: ${ctx.keywordData.intent}` : ''}
${researchSection}

Follow this outline:
${outline}

Write in a ${ctx.niche === 'Finance' ? 'professional' : 'conversational'} tone.
Include practical examples and actionable advice.`;
}

// ============================================================================
// Source Badge Helpers (for UI)
// ============================================================================

/**
 * Get badge configuration for a data source
 */
export function getSourceBadgeConfig(source: DataSource): {
    color: string;
    icon: string;
    label: string;
    bgClass: string;
    textClass: string;
} {
    switch (source) {
        case 'hunt':
            return {
                color: 'amber',
                icon: '🎯',
                label: 'Hunt',
                bgClass: 'bg-amber-100',
                textClass: 'text-amber-700',
            };
        case 'profile':
            return {
                color: 'blue',
                icon: '📋',
                label: 'Profile',
                bgClass: 'bg-blue-100',
                textClass: 'text-blue-700',
            };
        case 'campaign-enrichment':
            return {
                color: 'green',
                icon: '🔄',
                label: 'AI Enriched',
                bgClass: 'bg-green-100',
                textClass: 'text-green-700',
            };
        case 'built-in':
        default:
            return {
                color: 'gray',
                icon: '📦',
                label: 'Default',
                bgClass: 'bg-gray-100',
                textClass: 'text-gray-600',
            };
    }
}
