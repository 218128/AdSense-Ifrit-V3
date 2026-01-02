/**
 * Campaign Templates
 * FSD: features/campaigns/templates/index.ts
 * 
 * Pre-built campaign configurations for common use cases.
 * One-click setup with best practices built-in.
 */

import type { FilterSet } from '../lib/filterEngine';
import type { KeywordRotator } from '../lib/keywordRotation';

// ============================================================================
// Types
// ============================================================================

export interface CampaignTemplate {
    id: string;
    name: string;
    description: string;
    category: TemplateCategory;
    icon: string;
    sourceType: SourceType;
    config: CampaignConfig;
    presets: CampaignPresets;
}

export type TemplateCategory =
    | 'affiliate'
    | 'news'
    | 'social'
    | 'video'
    | 'trending'
    | 'custom';

export type SourceType =
    | 'rss'
    | 'youtube'
    | 'twitter'
    | 'reddit'
    | 'amazon'
    | 'ebay'
    | 'facebook'
    | 'instagram'
    | 'pinterest'
    | 'trends'
    | 'scraper';

export interface CampaignConfig {
    postFrequency: 'hourly' | 'daily' | 'weekly';
    postsPerRun: number;
    maxTotalPosts?: number;
    autoPublish: boolean;
    contentGeneration: {
        useAI: boolean;
        aiModel?: string;
        minWords?: number;
        maxWords?: number;
        addImages?: boolean;
        addSchema?: boolean;
    };
}

export interface CampaignPresets {
    filterRules?: Partial<FilterSet>;
    keywordConfig?: Partial<KeywordRotator>;
    contentTemplate?: string;
    categoryIds?: number[];
    tagIds?: number[];
}

// ============================================================================
// Template Registry
// ============================================================================

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
    // -------------------------------------------
    // AFFILIATE TEMPLATES
    // -------------------------------------------
    {
        id: 'amazon-product-reviews',
        name: 'Amazon Product Reviews',
        description: 'Auto-import and review Amazon products with affiliate links',
        category: 'affiliate',
        icon: '🛒',
        sourceType: 'amazon',
        config: {
            postFrequency: 'daily',
            postsPerRun: 3,
            autoPublish: false,
            contentGeneration: {
                useAI: true,
                aiModel: 'gemini-3-flash-preview',
                minWords: 800,
                maxWords: 1500,
                addImages: true,
                addSchema: true,
            },
        },
        presets: {
            filterRules: {
                id: 'amazon-filter',
                name: 'Amazon Defaults',
                enabled: true,
                mode: 'all',
                rules: [
                    {
                        id: 'min_rating',
                        name: 'Min 4-star rating',
                        type: 'number',
                        field: 'rating',
                        operator: 'greaterThan',
                        value: 3.9,
                        enabled: true,
                        action: 'include',
                    },
                ],
            },
            contentTemplate: `
# [product_title] Review

[affiliate_disclosure]

## Quick Summary
[ai_summary]

## Key Features
[product_features]

## Pros and Cons
[ai_pros_cons]

## Final Verdict
[ai_verdict]

[buy_button]
            `.trim(),
        },
    },
    {
        id: 'ebay-deals-roundup',
        name: 'eBay Deals Roundup',
        description: 'Curate best eBay deals into weekly roundup posts',
        category: 'affiliate',
        icon: '💰',
        sourceType: 'ebay',
        config: {
            postFrequency: 'weekly',
            postsPerRun: 1,
            autoPublish: false,
            contentGeneration: {
                useAI: true,
                minWords: 1000,
                maxWords: 2000,
                addImages: true,
                addSchema: true,
            },
        },
        presets: {
            contentTemplate: `
# Best [category] Deals This Week

[affiliate_disclosure]

[comparison_table]

## Top Picks
[top_picks_section]

## How We Selected These Deals
[ai_methodology]

[cta_section]
            `.trim(),
        },
    },

    // -------------------------------------------
    // NEWS TEMPLATES
    // -------------------------------------------
    {
        id: 'news-aggregator',
        name: 'News Aggregator',
        description: 'Aggregate and summarize news from RSS feeds',
        category: 'news',
        icon: '📰',
        sourceType: 'rss',
        config: {
            postFrequency: 'hourly',
            postsPerRun: 5,
            maxTotalPosts: 50,
            autoPublish: true,
            contentGeneration: {
                useAI: true,
                minWords: 300,
                maxWords: 600,
                addImages: true,
                addSchema: false,
            },
        },
        presets: {
            filterRules: {
                id: 'news-filter',
                name: 'News Defaults',
                enabled: true,
                mode: 'all',
                rules: [
                    {
                        id: 'min_words',
                        name: 'Min 100 words',
                        type: 'number',
                        field: 'wordCount',
                        operator: 'greaterThan',
                        value: 99,
                        enabled: true,
                        action: 'include',
                    },
                ],
            },
            contentTemplate: `
# [original_title]

[ai_summary]

## Key Points
[ai_key_points]

## What This Means
[ai_analysis]

*[source_attribution]*
            `.trim(),
        },
    },

    // -------------------------------------------
    // VIDEO TEMPLATES
    // -------------------------------------------
    {
        id: 'youtube-to-blog',
        name: 'YouTube to Blog',
        description: 'Convert YouTube videos into blog articles',
        category: 'video',
        icon: '🎬',
        sourceType: 'youtube',
        config: {
            postFrequency: 'daily',
            postsPerRun: 2,
            autoPublish: false,
            contentGeneration: {
                useAI: true,
                minWords: 1000,
                maxWords: 2500,
                addImages: true,
                addSchema: true,
            },
        },
        presets: {
            filterRules: {
                id: 'youtube-filter',
                name: 'YouTube Defaults',
                enabled: true,
                mode: 'all',
                rules: [
                    {
                        id: 'has_transcript',
                        name: 'Has transcript',
                        type: 'text',
                        field: 'content',
                        operator: 'isNotEmpty',
                        value: '',
                        enabled: true,
                        action: 'include',
                    },
                ],
            },
            contentTemplate: `
# [video_title]

[video_embed]

## Summary
[ai_summary_from_transcript]

## Key Takeaways
[ai_key_points]

## Detailed Breakdown
[ai_detailed_content]

## Conclusion
[ai_conclusion]
            `.trim(),
        },
    },

    // -------------------------------------------
    // SOCIAL TEMPLATES
    // -------------------------------------------
    {
        id: 'reddit-trending',
        name: 'Reddit Trending',
        description: 'Convert trending Reddit posts into articles',
        category: 'social',
        icon: '🔥',
        sourceType: 'reddit',
        config: {
            postFrequency: 'daily',
            postsPerRun: 3,
            autoPublish: false,
            contentGeneration: {
                useAI: true,
                minWords: 600,
                maxWords: 1200,
                addImages: true,
                addSchema: false,
            },
        },
        presets: {
            filterRules: {
                id: 'reddit-filter',
                name: 'Reddit Defaults',
                enabled: true,
                mode: 'all',
                rules: [
                    {
                        id: 'min_upvotes',
                        name: 'Min 100 upvotes',
                        type: 'number',
                        field: 'rating',
                        operator: 'greaterThan',
                        value: 99,
                        enabled: true,
                        action: 'include',
                    },
                ],
            },
        },
    },
    {
        id: 'twitter-roundup',
        name: 'Twitter/X Roundup',
        description: 'Curate tweets on a topic into roundup posts',
        category: 'social',
        icon: '🐦',
        sourceType: 'twitter',
        config: {
            postFrequency: 'daily',
            postsPerRun: 1,
            autoPublish: false,
            contentGeneration: {
                useAI: true,
                minWords: 500,
                maxWords: 1000,
                addImages: true,
                addSchema: false,
            },
        },
        presets: {},
    },

    // -------------------------------------------
    // TRENDING TEMPLATES
    // -------------------------------------------
    {
        id: 'google-trends',
        name: 'Google Trends Articles',
        description: 'Auto-generate articles from trending topics',
        category: 'trending',
        icon: '📈',
        sourceType: 'trends',
        config: {
            postFrequency: 'hourly',
            postsPerRun: 2,
            maxTotalPosts: 20,
            autoPublish: true,
            contentGeneration: {
                useAI: true,
                minWords: 800,
                maxWords: 1500,
                addImages: true,
                addSchema: true,
            },
        },
        presets: {
            keywordConfig: {
                mode: 'exhaust-first',
            },
        },
    },
];

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): CampaignTemplate | undefined {
    return CAMPAIGN_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): CampaignTemplate[] {
    return CAMPAIGN_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by source type
 */
export function getTemplatesBySource(sourceType: SourceType): CampaignTemplate[] {
    return CAMPAIGN_TEMPLATES.filter(t => t.sourceType === sourceType);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): { id: TemplateCategory; name: string; count: number }[] {
    const categories: TemplateCategory[] = ['affiliate', 'news', 'social', 'video', 'trending', 'custom'];

    return categories.map(id => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        count: CAMPAIGN_TEMPLATES.filter(t => t.category === id).length,
    }));
}

/**
 * Clone template with custom overrides
 */
export function cloneTemplate(
    templateId: string,
    overrides: Partial<CampaignTemplate>
): CampaignTemplate | undefined {
    const template = getTemplate(templateId);
    if (!template) return undefined;

    return {
        ...template,
        ...overrides,
        id: `${template.id}-${Date.now()}`,
        config: {
            ...template.config,
            ...overrides.config,
        },
        presets: {
            ...template.presets,
            ...overrides.presets,
        },
    };
}
