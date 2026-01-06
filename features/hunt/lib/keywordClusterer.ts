/**
 * Keyword Clusterer
 * FSD: features/hunt/lib/keywordClusterer.ts
 * 
 * Phase 2 Enhancement: Group keywords by semantic similarity and intent
 * Enables better content strategy by identifying keyword themes
 */

// ============================================================================
// Types
// ============================================================================

export type KeywordIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';

export interface EnrichedKeywordInput {
    keyword: string;
    volume?: number;
    cpc?: number;
    competition?: number;
    trend?: 'rising' | 'stable' | 'falling';
}

export interface KeywordCluster {
    id: string;
    name: string;
    intent: KeywordIntent;
    primaryKeyword: string;
    keywords: ClusteredKeyword[];
    metrics: ClusterMetrics;
    suggestedArticles: string[];
}

export interface ClusteredKeyword extends EnrichedKeywordInput {
    similarity: number;
    isHead: boolean;
}

export interface ClusterMetrics {
    totalVolume: number;
    avgCPC: number;
    avgCompetition: number;
    keywordCount: number;
    potentialValue: number;
}

// ============================================================================
// Intent Classification
// ============================================================================

const TRANSACTIONAL_SIGNALS = [
    'buy', 'purchase', 'order', 'price', 'pricing', 'cost', 'cheap', 'affordable',
    'deal', 'discount', 'coupon', 'sale', 'shop', 'store', 'subscription',
];

const COMMERCIAL_SIGNALS = [
    'best', 'top', 'review', 'reviews', 'comparison', 'vs', 'versus', 'alternative',
    'alternatives', 'compare', 'rated', 'recommended', 'worth',
];

const INFORMATIONAL_SIGNALS = [
    'how to', 'what is', 'what are', 'why', 'when', 'where', 'guide', 'tutorial',
    'tips', 'learn', 'example', 'examples', 'definition', 'meaning', 'understand',
];

const NAVIGATIONAL_SIGNALS = [
    'login', 'sign in', 'download', 'website', 'official', 'app', 'account',
];

/**
 * Classify keyword intent based on signal words
 */
export function classifyIntent(keyword: string): KeywordIntent {
    const lower = keyword.toLowerCase();

    // Check navigational first (most specific)
    if (NAVIGATIONAL_SIGNALS.some(signal => lower.includes(signal))) {
        return 'navigational';
    }

    // Check transactional
    if (TRANSACTIONAL_SIGNALS.some(signal => lower.includes(signal))) {
        return 'transactional';
    }

    // Check commercial investigation
    if (COMMERCIAL_SIGNALS.some(signal => lower.includes(signal))) {
        return 'commercial';
    }

    // Check informational
    if (INFORMATIONAL_SIGNALS.some(signal => lower.includes(signal))) {
        return 'informational';
    }

    // Default to informational
    return 'informational';
}

// ============================================================================
// Similarity Calculation
// ============================================================================

/**
 * Simple word-based similarity (Jaccard index)
 */
function calculateSimilarity(keyword1: string, keyword2: string): number {
    const words1 = new Set(keyword1.toLowerCase().split(/\s+/));
    const words2 = new Set(keyword2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

/**
 * Extract key terms from a keyword (removing stop words)
 */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
]);

function extractKeyTerms(keyword: string): string[] {
    return keyword
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Calculate semantic similarity based on key terms
 */
function semanticSimilarity(keyword1: string, keyword2: string): number {
    const terms1 = extractKeyTerms(keyword1);
    const terms2 = extractKeyTerms(keyword2);

    if (terms1.length === 0 || terms2.length === 0) {
        return calculateSimilarity(keyword1, keyword2);
    }

    // Check for exact term matches
    const matches = terms1.filter(t1 =>
        terms2.some(t2 => t1 === t2 || t1.includes(t2) || t2.includes(t1))
    );

    // Weight by matching ratio
    const maxLen = Math.max(terms1.length, terms2.length);
    return matches.length / maxLen;
}

// ============================================================================
// Clustering Algorithm
// ============================================================================

/**
 * Cluster keywords using agglomerative approach
 */
export function clusterKeywords(
    keywords: EnrichedKeywordInput[],
    options?: {
        minSimilarity?: number;
        maxClusters?: number;
    }
): KeywordCluster[] {
    const minSimilarity = options?.minSimilarity ?? 0.3;
    const maxClusters = options?.maxClusters ?? 20;

    if (keywords.length === 0) return [];

    // Sort by volume (head terms first)
    const sorted = [...keywords].sort((a, b) => (b.volume || 0) - (a.volume || 0));

    const clusters: KeywordCluster[] = [];
    const assigned = new Set<string>();

    for (const keyword of sorted) {
        if (assigned.has(keyword.keyword)) continue;

        // Find or create cluster
        let bestCluster: KeywordCluster | null = null;
        let bestSimilarity = 0;

        for (const cluster of clusters) {
            const similarity = semanticSimilarity(keyword.keyword, cluster.primaryKeyword);
            if (similarity >= minSimilarity && similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestCluster = cluster;
            }
        }

        if (bestCluster && clusters.length >= maxClusters) {
            // Add to existing cluster
            bestCluster.keywords.push({
                ...keyword,
                similarity: bestSimilarity,
                isHead: false,
            });
            assigned.add(keyword.keyword);
        } else {
            // Create new cluster
            const intent = classifyIntent(keyword.keyword);
            const clusterName = generateClusterName(keyword.keyword);

            const newCluster: KeywordCluster = {
                id: `cluster_${Date.now()}_${clusters.length}`,
                name: clusterName,
                intent,
                primaryKeyword: keyword.keyword,
                keywords: [{
                    ...keyword,
                    similarity: 1,
                    isHead: true,
                }],
                metrics: {
                    totalVolume: keyword.volume || 0,
                    avgCPC: keyword.cpc || 0,
                    avgCompetition: keyword.competition || 0,
                    keywordCount: 1,
                    potentialValue: (keyword.volume || 0) * (keyword.cpc || 0),
                },
                suggestedArticles: [],
            };

            clusters.push(newCluster);
            assigned.add(keyword.keyword);
        }
    }

    // Second pass: try to assign remaining keywords
    for (const keyword of sorted) {
        if (assigned.has(keyword.keyword)) continue;

        let bestCluster: KeywordCluster | null = null;
        let bestSimilarity = 0;

        for (const cluster of clusters) {
            for (const existing of cluster.keywords) {
                const similarity = semanticSimilarity(keyword.keyword, existing.keyword);
                if (similarity >= minSimilarity && similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestCluster = cluster;
                }
            }
        }

        if (bestCluster) {
            bestCluster.keywords.push({
                ...keyword,
                similarity: bestSimilarity,
                isHead: false,
            });
            assigned.add(keyword.keyword);
        }
    }

    // Calculate final metrics and suggestions for each cluster
    for (const cluster of clusters) {
        updateClusterMetrics(cluster);
        cluster.suggestedArticles = generateArticleSuggestions(cluster);
    }

    // Sort clusters by potential value
    clusters.sort((a, b) => b.metrics.potentialValue - a.metrics.potentialValue);

    return clusters;
}

// ============================================================================
// Cluster Utilities
// ============================================================================

/**
 * Generate a readable name for a cluster
 */
function generateClusterName(primaryKeyword: string): string {
    const terms = extractKeyTerms(primaryKeyword);
    if (terms.length === 0) return primaryKeyword;

    // Capitalize first letter of each term
    return terms
        .slice(0, 3)
        .map(t => t.charAt(0).toUpperCase() + t.slice(1))
        .join(' ');
}

/**
 * Update cluster metrics based on all keywords
 */
function updateClusterMetrics(cluster: KeywordCluster): void {
    const keywords = cluster.keywords;
    const count = keywords.length;

    cluster.metrics = {
        keywordCount: count,
        totalVolume: keywords.reduce((sum, k) => sum + (k.volume || 0), 0),
        avgCPC: count > 0
            ? keywords.reduce((sum, k) => sum + (k.cpc || 0), 0) / count
            : 0,
        avgCompetition: count > 0
            ? keywords.reduce((sum, k) => sum + (k.competition || 0), 0) / count
            : 0,
        potentialValue: keywords.reduce((sum, k) => sum + (k.volume || 0) * (k.cpc || 0), 0),
    };
}

/**
 * Generate article title suggestions based on cluster
 */
function generateArticleSuggestions(cluster: KeywordCluster): string[] {
    const suggestions: string[] = [];
    const primary = cluster.primaryKeyword;

    switch (cluster.intent) {
        case 'informational':
            suggestions.push(
                `Complete Guide to ${primary}`,
                `What is ${primary}? Everything You Need to Know`,
                `${primary}: Tips and Best Practices`,
            );
            break;
        case 'commercial':
            suggestions.push(
                `Best ${primary} in ${new Date().getFullYear()}`,
                `${primary} Review: Pros, Cons, and Verdict`,
                `Top 10 ${primary} Compared`,
            );
            break;
        case 'transactional':
            suggestions.push(
                `Where to Buy ${primary} (Best Deals)`,
                `${primary} Buying Guide`,
                `How to Get the Best Price on ${primary}`,
            );
            break;
        case 'navigational':
            suggestions.push(
                `How to Access ${primary}`,
                `${primary} Official Resources`,
            );
            break;
    }

    return suggestions;
}

/**
 * Get cluster summary statistics
 */
export function getClusterSummary(clusters: KeywordCluster[]): {
    totalClusters: number;
    totalKeywords: number;
    totalVolume: number;
    byIntent: Record<KeywordIntent, number>;
    topClusters: Array<{ name: string; volume: number }>;
} {
    const byIntent: Record<KeywordIntent, number> = {
        informational: 0,
        commercial: 0,
        transactional: 0,
        navigational: 0,
    };

    let totalKeywords = 0;
    let totalVolume = 0;

    for (const cluster of clusters) {
        byIntent[cluster.intent]++;
        totalKeywords += cluster.keywords.length;
        totalVolume += cluster.metrics.totalVolume;
    }

    return {
        totalClusters: clusters.length,
        totalKeywords,
        totalVolume,
        byIntent,
        topClusters: clusters
            .slice(0, 5)
            .map(c => ({ name: c.name, volume: c.metrics.totalVolume })),
    };
}

/**
 * Find related clusters
 */
export function findRelatedClusters(
    cluster: KeywordCluster,
    allClusters: KeywordCluster[],
    minSimilarity: number = 0.2
): KeywordCluster[] {
    return allClusters
        .filter(c => c.id !== cluster.id)
        .map(c => ({
            cluster: c,
            similarity: semanticSimilarity(cluster.primaryKeyword, c.primaryKeyword),
        }))
        .filter(({ similarity }) => similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
        .map(({ cluster }) => cluster);
}
