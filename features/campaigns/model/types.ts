/**
 * Campaigns Feature - Type Definitions
 * FSD: features/campaigns/model/types.ts
 */

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

    // Source configuration
    source: CampaignSource;

    // AI pipeline configuration
    aiConfig: AIConfig;

    // Schedule configuration
    schedule: ScheduleConfig;

    // Statistics
    stats: CampaignStats;

    // Timestamps
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// Source Types
// ============================================================================

export type SourceType = 'keywords' | 'rss' | 'trends' | 'manual';

export interface CampaignSource {
    type: SourceType;
    config: KeywordSourceConfig | RSSSourceConfig | TrendsSourceConfig | ManualSourceConfig;
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
}

export interface SourceItem {
    id: string;
    topic: string;
    sourceType: SourceType;
    metadata?: Record<string, unknown>;
}
