/**
 * Content Strategy Engine
 * 
 * Strategic content planning for authority sites optimized for:
 * - AI Overview citations (35% more organic clicks)
 * - E-E-A-T signals
 * - High-engagement content types
 */

export type ContentCategory = 'tofu' | 'tactical' | 'seasonal' | 'pillar' | 'cluster';

export type ContentIntent =
    | 'awareness'      // TOFU - Top of funnel
    | 'consideration'  // Middle of funnel
    | 'decision'       // Bottom of funnel
    | 'retention';     // Post-purchase

export interface ContentTypeConfig {
    id: string;
    name: string;
    category: ContentCategory;
    intent: ContentIntent;
    description: string;
    avgViewMultiplier: number;  // vs baseline (1.0)
    aiOverviewOptimized: boolean;
    eeatSignals: string[];
    targetWordCount: { min: number; max: number };
    publishTiming?: 'evergreen' | 'seasonal' | 'trending';
    seasonalLeadDays?: number;  // Days before season to publish
}

export interface ContentStrategyMix {
    tofu: number;      // Percentage (0-100)
    tactical: number;
    seasonal: number;
    pillar: number;
    cluster: number;
}

export interface ContentPlan {
    totalArticles: number;
    breakdown: {
        category: ContentCategory;
        count: number;
        types: ContentTypeConfig[];
    }[];
    publishSchedule: {
        immediate: number;
        scheduled: { date: Date; count: number }[];
    };
}

// ============================================
// CONTENT TYPE DEFINITIONS
// ============================================

/**
 * TOFU (Top-of-Funnel) Content Types
 * +178% above-average views
 */
export const TOFU_TYPES: ContentTypeConfig[] = [
    {
        id: 'what_is_guide',
        name: 'What Is Guide',
        category: 'tofu',
        intent: 'awareness',
        description: 'Definition-focused explainer optimized for AI Overviews',
        avgViewMultiplier: 1.78,
        aiOverviewOptimized: true,
        eeatSignals: ['expert_definition', 'source_citations'],
        targetWordCount: { min: 1500, max: 2500 },
        publishTiming: 'evergreen'
    },
    {
        id: 'beginners_guide',
        name: 'Beginner\'s Complete Guide',
        category: 'tofu',
        intent: 'awareness',
        description: 'Comprehensive introduction for newcomers',
        avgViewMultiplier: 1.65,
        aiOverviewOptimized: true,
        eeatSignals: ['step_by_step', 'faq_section', 'expert_tips'],
        targetWordCount: { min: 2500, max: 4000 },
        publishTiming: 'evergreen'
    },
    {
        id: 'myths_debunked',
        name: 'Myths Debunked',
        category: 'tofu',
        intent: 'awareness',
        description: 'Myth-busting content with viral potential',
        avgViewMultiplier: 1.85,
        aiOverviewOptimized: true,
        eeatSignals: ['fact_checking', 'source_citations', 'expert_quotes'],
        targetWordCount: { min: 1800, max: 2800 },
        publishTiming: 'evergreen'
    },
    {
        id: 'statistics_roundup',
        name: 'Statistics & Data Roundup',
        category: 'tofu',
        intent: 'awareness',
        description: 'Data-driven content for backlinks and citations',
        avgViewMultiplier: 2.1,
        aiOverviewOptimized: true,
        eeatSignals: ['original_research', 'data_visualization', 'source_citations'],
        targetWordCount: { min: 2000, max: 3500 },
        publishTiming: 'evergreen'
    }
];

/**
 * Tactical Guide Content Types
 * +75% above-average views
 */
export const TACTICAL_TYPES: ContentTypeConfig[] = [
    {
        id: 'step_by_step_guide',
        name: 'Step-by-Step Guide',
        category: 'tactical',
        intent: 'consideration',
        description: 'Actionable how-to with numbered steps',
        avgViewMultiplier: 1.75,
        aiOverviewOptimized: true,
        eeatSignals: ['hands_on_experience', 'screenshots', 'pro_tips'],
        targetWordCount: { min: 2000, max: 3500 },
        publishTiming: 'evergreen'
    },
    {
        id: 'ultimate_guide',
        name: 'Ultimate Guide',
        category: 'tactical',
        intent: 'consideration',
        description: 'Comprehensive deep-dive on a topic',
        avgViewMultiplier: 1.85,
        aiOverviewOptimized: true,
        eeatSignals: ['comprehensive_coverage', 'expert_insights', 'case_studies'],
        targetWordCount: { min: 4000, max: 7000 },
        publishTiming: 'evergreen'
    },
    {
        id: 'comparison_guide',
        name: 'Comparison Guide',
        category: 'tactical',
        intent: 'decision',
        description: 'Head-to-head comparison with clear winner',
        avgViewMultiplier: 1.95,
        aiOverviewOptimized: true,
        eeatSignals: ['hands_on_testing', 'comparison_table', 'verdict'],
        targetWordCount: { min: 2500, max: 4000 },
        publishTiming: 'evergreen'
    },
    {
        id: 'troubleshooting_guide',
        name: 'Troubleshooting Guide',
        category: 'tactical',
        intent: 'retention',
        description: 'Problem-solution format for common issues',
        avgViewMultiplier: 1.6,
        aiOverviewOptimized: true,
        eeatSignals: ['expert_solutions', 'step_by_step', 'faq_section'],
        targetWordCount: { min: 1500, max: 2500 },
        publishTiming: 'evergreen'
    },
    {
        id: 'best_practices',
        name: 'Best Practices Guide',
        category: 'tactical',
        intent: 'consideration',
        description: 'Expert recommendations and industry standards',
        avgViewMultiplier: 1.7,
        aiOverviewOptimized: true,
        eeatSignals: ['industry_expertise', 'expert_quotes', 'real_examples'],
        targetWordCount: { min: 2000, max: 3500 },
        publishTiming: 'evergreen'
    }
];

/**
 * Seasonal Content Types
 * Published 2-3 months in advance
 */
export const SEASONAL_TYPES: ContentTypeConfig[] = [
    {
        id: 'yearly_guide',
        name: 'Yearly Guide',
        category: 'seasonal',
        intent: 'consideration',
        description: 'Annual guide updated for the current year',
        avgViewMultiplier: 1.9,
        aiOverviewOptimized: true,
        eeatSignals: ['up_to_date', 'comprehensive', 'expert_picks'],
        targetWordCount: { min: 3000, max: 5000 },
        publishTiming: 'seasonal',
        seasonalLeadDays: 90  // 3 months ahead
    },
    {
        id: 'best_of_year',
        name: 'Best Of [Year]',
        category: 'seasonal',
        intent: 'decision',
        description: 'Curated list of top picks for the year',
        avgViewMultiplier: 2.2,
        aiOverviewOptimized: true,
        eeatSignals: ['expert_curation', 'hands_on_testing', 'clear_rankings'],
        targetWordCount: { min: 2500, max: 4500 },
        publishTiming: 'seasonal',
        seasonalLeadDays: 60  // 2 months ahead
    },
    {
        id: 'predictions',
        name: 'Predictions & Trends',
        category: 'seasonal',
        intent: 'awareness',
        description: 'Future trends and predictions content',
        avgViewMultiplier: 1.8,
        aiOverviewOptimized: true,
        eeatSignals: ['industry_expertise', 'data_backed', 'expert_opinions'],
        targetWordCount: { min: 2000, max: 3500 },
        publishTiming: 'seasonal',
        seasonalLeadDays: 75
    }
];

/**
 * Pillar Content Types
 * Authority-building comprehensive guides
 */
export const PILLAR_TYPES: ContentTypeConfig[] = [
    {
        id: 'definitive_guide',
        name: 'Definitive Guide',
        category: 'pillar',
        intent: 'consideration',
        description: 'The definitive resource on a core topic',
        avgViewMultiplier: 2.0,
        aiOverviewOptimized: true,
        eeatSignals: ['comprehensive_authority', 'expert_authorship', 'regular_updates'],
        targetWordCount: { min: 5000, max: 10000 },
        publishTiming: 'evergreen'
    },
    {
        id: 'complete_resource',
        name: 'Complete Resource Hub',
        category: 'pillar',
        intent: 'awareness',
        description: 'Hub page linking to all related content',
        avgViewMultiplier: 1.5,
        aiOverviewOptimized: true,
        eeatSignals: ['content_organization', 'internal_linking', 'comprehensive'],
        targetWordCount: { min: 3000, max: 5000 },
        publishTiming: 'evergreen'
    }
];

/**
 * Cluster Content Types
 * Supporting content that links to pillars
 */
export const CLUSTER_TYPES: ContentTypeConfig[] = [
    {
        id: 'specific_topic',
        name: 'Specific Topic Deep-Dive',
        category: 'cluster',
        intent: 'consideration',
        description: 'Focused article on a specific subtopic',
        avgViewMultiplier: 1.3,
        aiOverviewOptimized: true,
        eeatSignals: ['topic_expertise', 'practical_examples'],
        targetWordCount: { min: 1500, max: 2500 },
        publishTiming: 'evergreen'
    },
    {
        id: 'case_study',
        name: 'Case Study',
        category: 'cluster',
        intent: 'consideration',
        description: 'Real-world example with analysis',
        avgViewMultiplier: 1.6,
        aiOverviewOptimized: true,
        eeatSignals: ['real_experience', 'data_analysis', 'lessons_learned'],
        targetWordCount: { min: 1800, max: 3000 },
        publishTiming: 'evergreen'
    }
];

// ============================================
// CONTENT STRATEGY FUNCTIONS
// ============================================

/**
 * Default content mix optimized for authority building
 */
export const DEFAULT_CONTENT_MIX: ContentStrategyMix = {
    tofu: 40,      // High-traffic awareness content
    tactical: 40,  // Deep engagement guides
    seasonal: 20,  // Timely traffic bursts
    pillar: 0,     // Calculated from total (1 per 10 articles)
    cluster: 0     // Filled automatically around pillars
};

/**
 * Get all content types
 */
export function getAllContentTypes(): ContentTypeConfig[] {
    return [
        ...TOFU_TYPES,
        ...TACTICAL_TYPES,
        ...SEASONAL_TYPES,
        ...PILLAR_TYPES,
        ...CLUSTER_TYPES
    ];
}

/**
 * Get content types by category
 */
export function getContentTypesByCategory(category: ContentCategory): ContentTypeConfig[] {
    switch (category) {
        case 'tofu': return TOFU_TYPES;
        case 'tactical': return TACTICAL_TYPES;
        case 'seasonal': return SEASONAL_TYPES;
        case 'pillar': return PILLAR_TYPES;
        case 'cluster': return CLUSTER_TYPES;
        default: return [];
    }
}

/**
 * Calculate content plan based on strategy mix
 */
export function calculateContentPlan(
    totalArticles: number,
    mix: ContentStrategyMix = DEFAULT_CONTENT_MIX
): ContentPlan {
    // Calculate pillar count (1 per 10 articles minimum)
    const pillarCount = Math.max(1, Math.floor(totalArticles / 10));

    // Adjust mix to include pillars
    const adjustedMix = { ...mix };
    const pillarPercentage = (pillarCount / totalArticles) * 100;

    // Reduce other categories proportionally
    const reductionFactor = (100 - pillarPercentage) / 100;
    adjustedMix.tofu = Math.round(mix.tofu * reductionFactor);
    adjustedMix.tactical = Math.round(mix.tactical * reductionFactor);
    adjustedMix.seasonal = Math.round(mix.seasonal * reductionFactor);
    adjustedMix.pillar = pillarPercentage;

    // Calculate cluster count (remaining after other categories)
    const usedPercentage = adjustedMix.tofu + adjustedMix.tactical +
        adjustedMix.seasonal + adjustedMix.pillar;
    adjustedMix.cluster = Math.max(0, 100 - usedPercentage);

    // Calculate counts per category
    const breakdown = [
        {
            category: 'tofu' as ContentCategory,
            count: Math.round(totalArticles * adjustedMix.tofu / 100),
            types: TOFU_TYPES
        },
        {
            category: 'tactical' as ContentCategory,
            count: Math.round(totalArticles * adjustedMix.tactical / 100),
            types: TACTICAL_TYPES
        },
        {
            category: 'seasonal' as ContentCategory,
            count: Math.round(totalArticles * adjustedMix.seasonal / 100),
            types: SEASONAL_TYPES
        },
        {
            category: 'pillar' as ContentCategory,
            count: pillarCount,
            types: PILLAR_TYPES
        },
        {
            category: 'cluster' as ContentCategory,
            count: Math.round(totalArticles * adjustedMix.cluster / 100),
            types: CLUSTER_TYPES
        }
    ];

    // Calculate seasonal publish schedule
    const seasonalArticles = breakdown.find(b => b.category === 'seasonal')?.count || 0;
    const now = new Date();
    const scheduledDates: { date: Date; count: number }[] = [];

    if (seasonalArticles > 0) {
        // Distribute seasonal content across upcoming dates
        for (let i = 0; i < Math.min(seasonalArticles, 3); i++) {
            const publishDate = new Date(now);
            publishDate.setDate(publishDate.getDate() + (60 + i * 30)); // 2-3 months ahead
            scheduledDates.push({
                date: publishDate,
                count: Math.ceil(seasonalArticles / 3)
            });
        }
    }

    return {
        totalArticles,
        breakdown,
        publishSchedule: {
            immediate: totalArticles - seasonalArticles,
            scheduled: scheduledDates
        }
    };
}

/**
 * Select a random content type from a category
 */
export function selectContentType(category: ContentCategory): ContentTypeConfig {
    const types = getContentTypesByCategory(category);
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Get E-E-A-T signals for a content type
 */
export function getEEATSignals(contentType: ContentTypeConfig): string[] {
    return contentType.eeatSignals;
}

/**
 * Check if content type is optimized for AI Overviews
 */
export function isAIOverviewOptimized(contentType: ContentTypeConfig): boolean {
    return contentType.aiOverviewOptimized;
}

/**
 * Get recommended word count for content type
 */
export function getTargetWordCount(contentType: ContentTypeConfig): number {
    const { min, max } = contentType.targetWordCount;
    // Return average, slightly weighted toward longer content
    return Math.round((min + max * 1.2) / 2.2);
}

/**
 * Generate content type distribution summary
 */
export function getContentDistributionSummary(plan: ContentPlan): string {
    const lines = [
        `📊 Content Strategy: ${plan.totalArticles} articles`,
        '',
        'Distribution:'
    ];

    for (const item of plan.breakdown) {
        if (item.count > 0) {
            const percentage = Math.round((item.count / plan.totalArticles) * 100);
            const emoji = getCategoryEmoji(item.category);
            lines.push(`  ${emoji} ${item.category.toUpperCase()}: ${item.count} (${percentage}%)`);
        }
    }

    if (plan.publishSchedule.scheduled.length > 0) {
        lines.push('');
        lines.push('📅 Scheduled Content:');
        for (const schedule of plan.publishSchedule.scheduled) {
            lines.push(`  • ${schedule.date.toLocaleDateString()}: ${schedule.count} articles`);
        }
    }

    return lines.join('\n');
}

function getCategoryEmoji(category: ContentCategory): string {
    switch (category) {
        case 'tofu': return '🎯';
        case 'tactical': return '🛠️';
        case 'seasonal': return '📅';
        case 'pillar': return '🏛️';
        case 'cluster': return '🔗';
        default: return '📄';
    }
}
