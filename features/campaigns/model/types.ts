/**
 * Campaigns Feature - Type Definitions
 * FSD: features/campaigns/model/types.ts
 */

import type { CampaignContext, HuntCampaignContext } from './campaignContext';

// ============================================================================
// Campaign Entity
// ============================================================================

export interface Campaign {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'paused' | 'draft';

    // Target WordPress site
    targetSiteId: string;
    targetCategoryId?: number;
    targetAuthorId?: number;
    postStatus: 'publish' | 'draft' | 'pending';

    // Author assignment (Phase 2 integration)
    authorId?: string;                   // Ifrit author profile ID
    authorHealthMinScore?: number;       // Minimum health score required (default: 40)

    // Source configuration
    source: CampaignSource;

    // AI pipeline configuration
    aiConfig: AIConfig;

    // Schedule configuration
    schedule: ScheduleConfig;

    // Statistics
    stats: CampaignStats;

    // Hunt integration - data from Hunt workflow
    huntContext?: HuntCampaignContext;

    // Enriched context - layered data from multiple sources
    context?: CampaignContext;

    // Timestamps
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// Source Types
// ============================================================================

export type SourceType = 'keywords' | 'rss' | 'trends' | 'manual' | 'translation';

export interface CampaignSource {
    type: SourceType;
    config: KeywordSourceConfig | RSSSourceConfig | TrendsSourceConfig | ManualSourceConfig | TranslationSourceConfig;
}

export interface KeywordSourceConfig {
    type: 'keywords';
    keywords: string[];
    rotateMode: 'sequential' | 'random';
    currentIndex: number;
    skipUsed: boolean;
}

export interface RSSSourceConfig {
    type: 'rss';
    feedUrls: string[];
    extractFullContent: boolean;
    aiRewrite: boolean;
    filterKeywords?: string[];
}

export interface TrendsSourceConfig {
    type: 'trends';
    region: string;
    category?: string;
    minSearchVolume?: number;
}

export interface ManualSourceConfig {
    type: 'manual';
    topics: ManualTopic[];
}

export interface ManualTopic {
    id: string;
    topic: string;
    status: 'pending' | 'generated' | 'published';
}

// Translation source - Translates existing WP posts to multiple languages
export interface TranslationSourceConfig {
    type: 'translation';
    sourceSiteId: string;              // WP site to fetch posts from
    targetLanguages: LanguageMapping[]; // Multi-language targets
    postFilters?: {
        categories?: number[];          // Filter by WP category IDs
        afterDate?: string;             // ISO date - only posts after this date
        onlyPublished?: boolean;        // Only published posts (default: true)
    };
    postProcessing?: {
        humanize?: boolean;             // Run through humanizer after translation
        optimizeReadability?: boolean;  // Optimize readability after translation
    };
}

// Language to target site mapping
export interface LanguageMapping {
    language: string;            // Language code: 'es', 'fr', 'ar', 'de'
    languageName?: string;       // Display name: 'Spanish', 'French'
    targetSiteId: string;        // WP site ID for this language
    targetCategoryId?: number;   // Optional category override for translated posts
    targetAuthorId?: number;     // Optional author override
}

// ============================================================================
// AI Configuration
// ============================================================================

export interface AIConfig {
    provider: 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';
    model?: string;
    articleType: 'pillar' | 'cluster' | 'how-to' | 'review' | 'listicle';
    tone: 'professional' | 'conversational' | 'authoritative' | 'friendly';
    targetLength: number;  // in words

    // Research options
    useResearch: boolean;
    researchProvider?: 'perplexity' | 'google';

    // Image options
    includeImages: boolean;
    imageProvider?: 'dalle' | 'gemini' | 'unsplash' | 'pexels';
    imagePlacements?: ('cover' | 'inline')[];

    // SEO options
    optimizeForSEO: boolean;
    includeSchema: boolean;
    includeFAQ: boolean;

    // Content spinner options
    enableSpinner?: boolean;
    spinnerMode?: 'light' | 'moderate' | 'heavy';

    // Author/E-E-A-T options (Phase 2 integration)
    authorHealthRequired?: boolean;      // Require healthy author for generation
    injectEEATSignals?: boolean;         // Auto-inject experience/expertise phrases
    qualityGateEnabled?: boolean;        // Run quality scoring before publish

    // Content optimization (Phase 2)
    humanize?: boolean;                  // Run through humanizer
    optimizeReadability?: boolean;       // Optimize readability post-generation

    // Multi-site publishing (Phase 2)
    enableMultiSite?: boolean;           // Enable multi-site publishing
    additionalSiteIds?: string[];        // Additional WP site IDs
    multiSiteStaggerMinutes?: number;    // Minutes between multi-site posts

    // Analytics (Phase 2)
    analyticsEnabled?: boolean;          // Enable analytics tracking

    // Affiliate content (Phase 2)
    enableAffiliateLinks?: boolean;      // Inject affiliate product links
    affiliateDisclosureType?: 'amazon' | 'ebay' | 'general';

    // A/B Testing (Phase 2)
    enableABTesting?: boolean;           // Create title variations for testing
}

// ============================================================================
// Schedule Configuration
// ============================================================================

export interface ScheduleConfig {
    type: 'manual' | 'interval' | 'cron';
    intervalHours?: number;
    cronExpression?: string;
    maxPostsPerRun: number;
    pauseOnError: boolean;
    lastRunAt?: number;
    nextRunAt?: number;
}

// ============================================================================
// Statistics
// ============================================================================

export interface CampaignStats {
    totalGenerated: number;
    totalPublished: number;
    totalFailed: number;
    lastPostTitle?: string;
    lastPostUrl?: string;
    averageWordCount?: number;
}

// ============================================================================
// Run History
// ============================================================================

export interface CampaignRun {
    id: string;
    campaignId: string;
    startedAt: number;
    completedAt?: number;
    status: 'running' | 'completed' | 'failed' | 'partial';
    postsGenerated: number;
    postsPublished: number;
    errors: RunError[];
    items: RunItem[];
}

export interface RunItem {
    id: string;
    topic: string;
    status: 'pending' | 'researching' | 'generating' | 'imaging' | 'linking' | 'publishing' | 'done' | 'failed';
    title?: string;
    wordCount?: number;
    wpPostId?: number;
    wpPostUrl?: string;
    error?: string;
    startedAt: number;
    completedAt?: number;
}

export interface RunError {
    stage: 'research' | 'generate' | 'image' | 'publish';
    message: string;
    timestamp: number;
}

// ============================================================================
// Pipeline Context
// ============================================================================

export interface PipelineContext {
    campaign: Campaign;
    sourceItem: SourceItem;
    research?: string;
    content?: {
        title: string;
        body: string;
        excerpt: string;
        slug: string;
    };
    images?: {
        cover?: { url: string; alt: string };
        inline?: { url: string; alt: string }[];
    };
    wpResult?: {
        postId: number;
        postUrl: string;
    };
    status: RunItem['status'];
    error?: string;

    // Phase 2: Author integration
    matchedAuthor?: {
        id: string;
        name: string;
        headline?: string;
        avatarUrl?: string;
        healthScore?: number;
    };

    // Phase 2: Quality scoring
    qualityScore?: {
        eeat: number;
        experience: number;
        expertise: number;
        authoritativeness: number;
        trustworthiness: number;
        factCheck?: number;
    };

    // Phase 2: Review integration
    needsManualReview?: boolean;
    reviewItemId?: string;
    autoApproved?: boolean;

    // Phase 2: A/B Testing
    abTestId?: string;
}

export interface SourceItem {
    id: string;
    topic: string;
    sourceType: SourceType;
    metadata?: Record<string, unknown>;
}
