/**
 * Recommendation Engine
 * 
 * Analyzes content performance and provides optimization suggestions
 * for maximizing monetization.
 */

import { getHighCPCNiches } from '@/lib/modules/cpcIntelligence';

export interface ContentRecord {
    id: string;
    title: string;
    keyword: string;
    niche: string;
    wordCount: number;
    cpcScore: number;
    template: string;
    persona: string;
    publishedTo: string[];
    createdAt: string;
}

export interface RecommendationScore {
    overall: number;
    cpcOptimization: number;
    contentDiversity: number;
    publishingFrequency: number;
    nicheBalance: number;
}

export interface Recommendation {
    type: 'high_priority' | 'medium_priority' | 'low_priority';
    category: 'cpc' | 'content' | 'distribution' | 'niche';
    title: string;
    description: string;
    action: string;
    impact: 'high' | 'medium' | 'low';
}

export interface AnalyticsSummary {
    totalArticles: number;
    avgWordCount: number;
    avgCPCScore: number;
    nicheDistribution: Record<string, number>;
    templateDistribution: Record<string, number>;
    topPerformingNiches: string[];
    underutilizedNiches: string[];
    score: RecommendationScore;
    recommendations: Recommendation[];
}

const STORAGE_KEY = 'ifrit_content_history';

/**
 * Get content history from localStorage
 */
export function getContentHistory(): ContentRecord[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Add content to history
 */
export function addContentToHistory(record: Omit<ContentRecord, 'id' | 'createdAt'>): void {
    if (typeof window === 'undefined') return;

    const history = getContentHistory();

    const newRecord: ContentRecord = {
        ...record,
        id: `content_${Date.now()}`,
        createdAt: new Date().toISOString()
    };

    history.unshift(newRecord);

    // Keep last 100 records
    const trimmed = history.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Generate analytics summary
 */
export function generateAnalytics(): AnalyticsSummary {
    const history = getContentHistory();

    if (history.length === 0) {
        return getEmptyAnalytics();
    }

    // Calculate basic stats
    const totalArticles = history.length;
    const avgWordCount = Math.round(
        history.reduce((sum, h) => sum + h.wordCount, 0) / totalArticles
    );
    const avgCPCScore = Math.round(
        history.reduce((sum, h) => sum + h.cpcScore, 0) / totalArticles
    );

    // Niche distribution
    const nicheDistribution: Record<string, number> = {};
    history.forEach(h => {
        nicheDistribution[h.niche] = (nicheDistribution[h.niche] || 0) + 1;
    });

    // Template distribution
    const templateDistribution: Record<string, number> = {};
    history.forEach(h => {
        templateDistribution[h.template] = (templateDistribution[h.template] || 0) + 1;
    });

    // Find top and underutilized niches
    const highCPCNiches = getHighCPCNiches().map(n => n.niche);
    const topPerformingNiches = Object.entries(nicheDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([niche]) => niche);

    const underutilizedNiches = highCPCNiches.filter(
        niche => !nicheDistribution[niche] || nicheDistribution[niche] < 3
    ).slice(0, 3);

    // Calculate scores
    const score = calculateScores(history, nicheDistribution);

    // Generate recommendations
    const recommendations = generateRecommendations(
        history,
        nicheDistribution,
        templateDistribution,
        score
    );

    return {
        totalArticles,
        avgWordCount,
        avgCPCScore,
        nicheDistribution,
        templateDistribution,
        topPerformingNiches,
        underutilizedNiches,
        score,
        recommendations
    };
}

function getEmptyAnalytics(): AnalyticsSummary {
    return {
        totalArticles: 0,
        avgWordCount: 0,
        avgCPCScore: 0,
        nicheDistribution: {},
        templateDistribution: {},
        topPerformingNiches: [],
        underutilizedNiches: getHighCPCNiches().map(n => n.niche).slice(0, 3),
        score: { overall: 0, cpcOptimization: 0, contentDiversity: 0, publishingFrequency: 0, nicheBalance: 0 },
        recommendations: [
            {
                type: 'high_priority',
                category: 'content',
                title: 'Start Creating Content',
                description: 'No content history found. Start generating articles to build your analytics.',
                action: 'Generate your first article',
                impact: 'high'
            }
        ]
    };
}

function calculateScores(
    history: ContentRecord[],
    nicheDistribution: Record<string, number>
): RecommendationScore {
    // CPC Optimization (0-100)
    const avgCPC = history.reduce((sum, h) => sum + h.cpcScore, 0) / history.length;
    const cpcOptimization = Math.min(100, avgCPC);

    // Content Diversity (0-100)
    const uniqueTemplates = new Set(history.map(h => h.template)).size;
    const contentDiversity = Math.min(100, uniqueTemplates * 20);

    // Publishing Frequency (0-100)
    const last30Days = history.filter(h => {
        const date = new Date(h.createdAt);
        const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
    }).length;
    const publishingFrequency = Math.min(100, last30Days * 3.3); // 30 articles/month = 100

    // Niche Balance (0-100)
    const nicheCount = Object.keys(nicheDistribution).length;
    const nicheBalance = Math.min(100, nicheCount * 15);

    // Overall (weighted average)
    const overall = Math.round(
        (cpcOptimization * 0.35) +
        (publishingFrequency * 0.30) +
        (nicheBalance * 0.20) +
        (contentDiversity * 0.15)
    );

    return {
        overall,
        cpcOptimization: Math.round(cpcOptimization),
        contentDiversity: Math.round(contentDiversity),
        publishingFrequency: Math.round(publishingFrequency),
        nicheBalance: Math.round(nicheBalance)
    };
}

function generateRecommendations(
    history: ContentRecord[],
    nicheDistribution: Record<string, number>,
    templateDistribution: Record<string, number>,
    score: RecommendationScore
): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // CPC recommendations
    if (score.cpcOptimization < 60) {
        const highCPCNiches = getHighCPCNiches().slice(0, 3);
        recommendations.push({
            type: 'high_priority',
            category: 'cpc',
            title: 'Target Higher-CPC Niches',
            description: `Your average CPC score is ${score.cpcOptimization}. Focus on high-CPC niches like ${highCPCNiches.map(n => n.niche).join(', ')}.`,
            action: `Create content in ${highCPCNiches[0].niche} (${highCPCNiches[0].cpcRange})`,
            impact: 'high'
        });
    }

    // Content diversity
    if (!templateDistribution['comparison'] || templateDistribution['comparison'] < 5) {
        recommendations.push({
            type: 'high_priority',
            category: 'content',
            title: 'Create More Comparison Articles',
            description: 'Comparison articles have the highest commercial intent and CPC potential.',
            action: 'Use the Comparison template for your next 3 articles',
            impact: 'high'
        });
    }

    // Publishing frequency
    if (score.publishingFrequency < 50) {
        recommendations.push({
            type: 'medium_priority',
            category: 'content',
            title: 'Increase Publishing Frequency',
            description: 'More content = more opportunities for ad revenue. Aim for at least 2 articles per week.',
            action: 'Set a publishing schedule',
            impact: 'medium'
        });
    }

    // Distribution recommendations
    const undistributed = history.filter(h => h.publishedTo.length === 0);
    if (undistributed.length > 5) {
        recommendations.push({
            type: 'medium_priority',
            category: 'distribution',
            title: 'Distribute Existing Content',
            description: `You have ${undistributed.length} articles not published to any external platform.`,
            action: 'Cross-publish to Dev.to for traffic acquisition',
            impact: 'medium'
        });
    }

    // Niche balance
    const highCPCNiches = getHighCPCNiches().map(n => n.niche);
    const missingHighCPC = highCPCNiches.filter(n => !nicheDistribution[n]);
    if (missingHighCPC.length > 3) {
        recommendations.push({
            type: 'low_priority',
            category: 'niche',
            title: 'Expand to New Niches',
            description: `Consider expanding into: ${missingHighCPC.slice(0, 3).join(', ')}`,
            action: 'Research keywords in these niches',
            impact: 'medium'
        });
    }

    return recommendations.slice(0, 5);
}

/**
 * Get quick insights for dashboard
 */
export function getQuickInsights(): string[] {
    const analytics = generateAnalytics();
    const insights: string[] = [];

    if (analytics.totalArticles === 0) {
        return ['Start generating content to see insights'];
    }

    if (analytics.avgCPCScore >= 70) {
        insights.push(`🔥 Great CPC targeting! Average score: ${analytics.avgCPCScore}`);
    } else if (analytics.avgCPCScore >= 50) {
        insights.push(`📈 Good CPC score (${analytics.avgCPCScore}). Room for improvement.`);
    } else {
        insights.push(`⚠️ Low CPC score (${analytics.avgCPCScore}). Target higher-value niches.`);
    }

    if (analytics.topPerformingNiches.length > 0) {
        insights.push(`📊 Top niche: ${analytics.topPerformingNiches[0]}`);
    }

    if (analytics.underutilizedNiches.length > 0) {
        insights.push(`💡 Opportunity: ${analytics.underutilizedNiches[0]}`);
    }

    return insights.slice(0, 3);
}
