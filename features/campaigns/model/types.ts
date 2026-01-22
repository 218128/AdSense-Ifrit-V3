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
    provider?: 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';  // Optional - inherited from Settings
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

    // NEW: Media source preference (P1 enhancement)
    mediaSourcePreference?: 'ai' | 'search' | 'both';  // Default: 'both' - AI gen or stock search
    preferredStockSource?: 'unsplash' | 'pexels' | 'brave' | 'auto';  // Which stock source to prefer
    inlineImageCount?: number;  // 0-5, default: 2 - number of inline images
    enableImageScoring?: boolean;  // Use aggregated search with scoring (default: true)

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
    abTestTitles?: boolean;              // Test title variations
    abTestCovers?: boolean;              // Test cover image variations
    abTestRespins?: boolean;             // Test content respins

    // Hunt integration
    nicheContext?: string;               // Niche context from domain research (e.g., 'technology', 'health & wellness')

    // Multi-Format Distribution (Phase 3)
    enableMultiFormat?: boolean;            // Generate LinkedIn/Twitter/TikTok/etc. from article
    multiFormatOptions?: {
        formats: ('linkedIn' | 'twitter' | 'tikTok' | 'podcast' | 'newsletter' | 'youtube')[];
        tikTokDuration?: 30 | 60 | 90;
    };

    // Video Scripts (Phase 3)
    enableVideoScript?: boolean;            // Generate video script from article
    videoScriptPlatform?: 'youtube_shorts' | 'tiktok' | 'instagram_reels' | 'youtube';
    videoScriptDuration?: 30 | 60 | 90;     // For short-form platforms

    // Newsletter Distribution (Phase 3)
    enableNewsletterPublish?: boolean;      // Auto-publish to newsletter after article
    newsletterSchedule?: 'immediate' | 'next_batch' | 'manual';

    // Third-Party Syndication (Phase 3)
    enableSyndication?: boolean;            // Publish to Medium/Dev.to/Hashnode
    syndicationPlatforms?: ('medium' | 'devto' | 'hashnode')[];
    syndicationDelay?: number;              // Days after WP publish before syndicating (default: 0)
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
    // Research result - now captures rich data from Perplexity SDK
    research?: {
        text: string;                    // Research content
        citations?: string[];            // Source URLs
        relatedQuestions?: string[];      // Follow-up ideas
        images?: string[];               // Suggested images
        handlerUsed?: string;            // Which handler was used
    } | string;                          // Backward compatible with string
    content?: {
        title: string;
        body: string;
        excerpt: string;
        slug: string;
    };
    images?: {
        cover?: { url: string; alt: string };
        inline?: Array<{ url: string; alt: string; position: 'after-intro' | 'after-h2' | 'before-conclusion' | 'inline' }>;
    };
    // All collected image assets for MediaAssetLibrary persistence and A/B testing
    allImageAssets?: Array<{
        id: string;
        url: string;
        alt: string;
        source: 'ai' | 'unsplash' | 'pexels' | 'brave' | 'serper' | 'perplexity';
        score: number;
        width?: number;
        height?: number;
        photographer?: string;
    }>;
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

    // Phase 2: Multi-site publishing report
    multiSiteReport?: {
        totalSites: number;
        successCount: number;
        failedCount: number;
        results: Array<{
            siteId: string;
            siteName: string;
            success: boolean;
            postUrl?: string;
            postId?: number;
            error?: string;
            spinApplied: boolean;
            publishedAt?: number;
        }>;
        originalContent: string;
    };

    // Phase 3: Published URL (for syndication canonical)
    publishedUrl?: string;

    // Phase 3: Multi-format distribution outputs
    multiFormatOutput?: {
        linkedIn?: { post: string; hashtags: string[] };
        twitter?: { thread: string[]; standalone: string };
        tikTok?: { hook: string; script: string; callToAction: string };
        podcast?: { title: string; intro: string; outro: string };
        newsletter?: { subject: string; preview: string; body: string };
        youtube?: { description: string; tags: string[] };
    };

    // Phase 3: Video script output
    videoScript?: {
        type: 'short' | 'long';
        platform: string;
        title: string;
        hook: string;
        targetDuration: number;
    };

    // Phase 3: Newsletter result
    newsletterResult?: {
        success: boolean;
        messageId?: string;
        error?: string;
    };

    // Phase 3: Syndication results
    syndicationResults?: Record<string, {
        success: boolean;
        url?: string;
        postId?: string;
        error?: string;
    }>;

    // Phase 3: Pending syndication (for delayed publishing)
    pendingSyndication?: {
        platforms: string[];
        scheduledFor: Date;
    };
}

export interface SourceItem {
    id: string;
    topic: string;
    sourceType: SourceType;
    metadata?: Record<string, unknown>;
}
