/**
 * Campaign Context Types
 * FSD: features/campaigns/model/campaignContext.ts
 * 
 * Defines the layered data context system with source tracking.
 * Data flows from multiple sources with clear priority and transparency.
 * 
 * Priority Order:
 * 1. Hunt - Keyword analysis, research from Hunt workflow
 * 2. Profile - Domain profile data (pillars, audience)
 * 3. Campaign Enrichment - Self-executed capabilities
 * 4. Built-in - Default fallback values
 */

// ============================================================================
// Data Source Tracking
// ============================================================================

/**
 * Data source identifier for UI transparency
 */
export type DataSource = 'hunt' | 'profile' | 'campaign-enrichment' | 'built-in';

/**
 * Wrapper for any data value with source tracking
 */
export interface SourcedData<T> {
    /** The actual data value */
    value: T;
    /** Where this data came from */
    source: DataSource;
    /** When this data was enriched/updated */
    enrichedAt?: number;
    /** Quality confidence score 0-1 */
    confidence?: number;
}

/**
 * Create a SourcedData wrapper
 */
export function createSourced<T>(
    value: T,
    source: DataSource,
    confidence?: number
): SourcedData<T> {
    return {
        value,
        source,
        enrichedAt: Date.now(),
        confidence,
    };
}

/**
 * Unwrap SourcedData to get just the value
 */
export function unwrap<T>(sourced: SourcedData<T>): T {
    return sourced.value;
}

// ============================================================================
// Enriched Keyword (from Hunt or Campaign)
// ============================================================================

/**
 * Full keyword data with all analysis fields
 */
export interface EnrichedKeyword {
    /** The keyword string */
    keyword: string;
    /** Identified niche/category */
    niche?: string;
    /** Estimated CPC (e.g., "$2.50") */
    cpc?: string;
    /** Estimated monthly search volume */
    volume?: string;
    /** Competition level */
    competition?: 'low' | 'medium' | 'high';
    /** Search intent */
    intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
    /** Quality/priority score 0-100 */
    score?: number;
    /** AI research findings */
    research?: string[];
    /** Reasoning for score/recommendation */
    reasoning?: string;
}

// ============================================================================
// Niche Data
// ============================================================================

/**
 * Niche/category information
 */
export interface NicheData {
    /** Niche name (e.g., "Personal Finance") */
    name: string;
    /** Content pillars/clusters */
    pillars: string[];
    /** Target audience description */
    targetAudience?: string;
    /** Monetization strategies */
    monetization?: ('adsense' | 'affiliate' | 'sponsored' | 'products')[];
    /** Content style/angle */
    contentStyle?: string;
}

// ============================================================================
// Competition Analysis
// ============================================================================

/**
 * Competition analysis data
 */
export interface CompetitionData {
    /** Overall competition level */
    level: 'low' | 'medium' | 'high';
    /** Top competing sites */
    topCompetitors?: string[];
    /** Content gaps we can fill */
    contentGaps?: string[];
    /** Average content length in niche */
    avgContentLength?: number;
}

// ============================================================================
// Content Suggestions
// ============================================================================

/**
 * AI-generated content suggestions
 */
export interface ContentSuggestions {
    /** Content themes to cover */
    themes: string[];
    /** Gaps in existing content */
    gaps: string[];
    /** Unique angles to differentiate */
    angles: string[];
    /** Specific article ideas */
    articleIdeas?: string[];
}

// ============================================================================
// Campaign Context (Main Interface)
// ============================================================================

/**
 * Full campaign context with layered data from multiple sources
 */
export interface CampaignContext {
    /** Keywords with source tracking */
    keywords: SourcedData<EnrichedKeyword>[];

    /** Niche information */
    niche: SourcedData<NicheData>;

    /** Research per keyword (keyword -> findings) */
    research: Record<string, SourcedData<string[]>>;

    /** Competition analysis */
    competition?: SourcedData<CompetitionData>;

    /** Content suggestions */
    contentSuggestions?: SourcedData<ContentSuggestions>;

    /** When context was last updated */
    lastUpdated: number;

    /** Sources that contributed to this context */
    contributingSources: DataSource[];
}

// ============================================================================
// Hunt Campaign Context (Input from Hunt)
// ============================================================================

/**
 * Data structure passed from Hunt to Campaign
 */
export interface HuntCampaignContext {
    /** Enriched keywords from Hunt analysis */
    keywords: EnrichedKeyword[];

    /** Selected trends */
    trends?: {
        topic: string;
        source: string;
        niche?: string;
        cpcScore?: number;
    }[];

    /** Niche identified in Hunt */
    niche: {
        name: string;
        pillars?: string[];
    };

    /** Domain profile if available */
    domainProfile?: {
        domain: string;
        pillars?: string[];
        targetAudience?: string;
        existingTopics?: string[];
    };
}

// ============================================================================
// Context Factory Functions
// ============================================================================

/**
 * Create empty campaign context with defaults
 */
export function createEmptyContext(): CampaignContext {
    return {
        keywords: [],
        niche: createSourced<NicheData>(
            { name: 'General', pillars: [] },
            'built-in'
        ),
        research: {},
        lastUpdated: Date.now(),
        contributingSources: ['built-in'],
    };
}

/**
 * Initialize context from Hunt data
 */
export function initContextFromHunt(hunt: HuntCampaignContext): CampaignContext {
    const context = createEmptyContext();

    // Add keywords from Hunt
    context.keywords = hunt.keywords.map(kw => createSourced(kw, 'hunt', 0.9));

    // Add niche from Hunt
    context.niche = createSourced<NicheData>(
        {
            name: hunt.niche.name,
            pillars: hunt.niche.pillars || [],
        },
        'hunt',
        0.9
    );

    // Add research from keywords
    hunt.keywords.forEach(kw => {
        if (kw.research?.length) {
            context.research[kw.keyword] = createSourced(kw.research, 'hunt', 0.9);
        }
    });

    // Layer profile data if available
    if (hunt.domainProfile) {
        if (hunt.domainProfile.pillars?.length) {
            context.niche.value.pillars = [
                ...new Set([...context.niche.value.pillars, ...hunt.domainProfile.pillars])
            ];
        }
        if (hunt.domainProfile.targetAudience) {
            context.niche.value.targetAudience = hunt.domainProfile.targetAudience;
        }
        context.contributingSources.push('profile');
    }

    context.contributingSources = ['hunt'];
    context.lastUpdated = Date.now();

    return context;
}

/**
 * Check if context needs enrichment for a specific field
 */
export function needsEnrichment(
    context: CampaignContext,
    field: 'keywords' | 'research' | 'competition' | 'contentSuggestions',
    keyword?: string
): boolean {
    switch (field) {
        case 'keywords':
            return context.keywords.length === 0;
        case 'research':
            if (!keyword) return Object.keys(context.research).length === 0;
            return !context.research[keyword]?.value?.length;
        case 'competition':
            return !context.competition;
        case 'contentSuggestions':
            return !context.contentSuggestions;
        default:
            return false;
    }
}

/**
 * Get source summary for display (e.g., "Hunt keywords, AI research")
 */
export function getSourceSummary(context: CampaignContext): string {
    const sources = context.contributingSources.map(s => {
        switch (s) {
            case 'hunt': return 'Hunt analysis';
            case 'profile': return 'Domain profile';
            case 'campaign-enrichment': return 'AI enrichment';
            case 'built-in': return 'defaults';
        }
    });
    return sources.join(', ');
}
