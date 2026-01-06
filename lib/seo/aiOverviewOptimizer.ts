/**
 * AI Overview Optimizer
 * FSD: lib/seo/aiOverviewOptimizer.ts
 * 
 * Main optimizer for making content AI Overview-friendly.
 * Restructures content for Google's AI-generated summaries.
 */

import type {
    AIOverviewContent,
    AIOverviewOptions,
    AIOverviewSchema,
    AnswerBlock,
    EntityReference,
    RelationshipGraph,
    SourceReference,
} from './types';
import { extractQuestions, toAnswerBlocks } from './questionExtractor';
import { extractCitations, analyzeCitations } from '@/lib/contentQuality';

// ============================================================================
// Entity Extraction
// ============================================================================

/**
 * Common entity patterns
 */
const ENTITY_PATTERNS = {
    // Organizations (capitalized multi-word)
    organization: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+(?:\s+(?:Inc|LLC|Corp|Ltd|Company|Association|Foundation|Institute))?)\b/g,
    // Products (capitalized, often with numbers)
    product: /\b([A-Z][a-z]*(?:\s+\d+|\s+[A-Z][a-z]+)*(?:\s+(?:Pro|Plus|Max|Ultra|Edition))?)\b/g,
    // Concepts (quoted or in lists)
    concept: /"([^"]+)"|'([^']+)'/g,
};

/**
 * Extract named entities from content
 */
function extractEntities(html: string): EntityReference[] {
    const text = html.replace(/<[^>]+>/g, ' ');
    const entities: Map<string, EntityReference> = new Map();
    let idCounter = 0;

    // Count word frequencies for importance
    const wordCounts: Record<string, number> = {};
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    }

    // Extract organizations
    const orgMatches = text.matchAll(ENTITY_PATTERNS.organization);
    for (const match of orgMatches) {
        const name = match[1].trim();
        if (name.length > 3 && !entities.has(name.toLowerCase())) {
            const mentions = (text.match(new RegExp(name, 'gi')) || []).length;
            entities.set(name.toLowerCase(), {
                id: `entity_${++idCounter}`,
                name,
                type: 'Organization',
                mentions,
                importance: mentions > 3 ? 'primary' : mentions > 1 ? 'secondary' : 'mentioned',
            });
        }
    }

    // Extract concepts (quoted terms)
    const conceptMatches = text.matchAll(ENTITY_PATTERNS.concept);
    for (const match of conceptMatches) {
        const name = (match[1] || match[2]).trim();
        if (name.length > 3 && name.length < 50 && !entities.has(name.toLowerCase())) {
            entities.set(name.toLowerCase(), {
                id: `entity_${++idCounter}`,
                name,
                type: 'Concept',
                mentions: 1,
                importance: 'mentioned',
            });
        }
    }

    return Array.from(entities.values())
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 20); // Max 20 entities
}

/**
 * Build relationship graph from entities
 */
function buildRelationshipGraph(entities: EntityReference[], html: string): RelationshipGraph {
    const relationships: RelationshipGraph['relationships'] = [];
    const text = html.replace(/<[^>]+>/g, ' ');

    // Simple co-occurrence based relationships
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            const e1 = entities[i];
            const e2 = entities[j];

            // Check if they appear near each other (within 100 chars)
            const pattern = new RegExp(
                `${e1.name}.{1,100}${e2.name}|${e2.name}.{1,100}${e1.name}`,
                'gi'
            );

            if (pattern.test(text)) {
                relationships.push({
                    sourceId: e1.id,
                    targetId: e2.id,
                    relationship: 'related to',
                    strength: 0.5,
                });
            }
        }
    }

    return { entities, relationships };
}

// ============================================================================
// Schema Generation
// ============================================================================

/**
 * Generate FAQ schema from answer blocks
 */
function generateFAQSchema(answerBlocks: AnswerBlock[]): AIOverviewSchema['faqPage'] | undefined {
    if (answerBlocks.length < 2) return undefined;

    return {
        '@type': 'FAQPage',
        mainEntity: answerBlocks.map(block => ({
            '@type': 'Question',
            name: block.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: block.expandedAnswer,
            },
        })),
    };
}

/**
 * Generate Article schema
 */
function generateArticleSchema(
    html: string,
    author?: { name: string; url?: string }
): AIOverviewSchema['article'] {
    // Extract title
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'Article';

    // Extract first paragraph as description
    const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
    const description = pMatch
        ? pMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 160)
        : '';

    return {
        '@type': 'Article',
        headline: title,
        description,
        author: {
            '@type': 'Person',
            name: author?.name || 'Author',
            url: author?.url,
        },
    };
}

// ============================================================================
// Scoring
// ============================================================================

/**
 * Calculate AI Overview readiness scores
 */
function calculateScores(
    html: string,
    answerBlocks: AnswerBlock[],
    graph: RelationshipGraph
): { citationScore: number; answerBoxScore: number; comprehensivenessScore: number } {
    // Citation score
    const citations = extractCitations(html);
    const text = html.replace(/<[^>]+>/g, ' ');
    const wordCount = text.split(/\s+/).length;
    const citationAnalysis = analyzeCitations(citations, wordCount);
    const citationScore = Math.min(100,
        (citationAnalysis.total * 15) +
        (citationAnalysis.averageAuthority * 0.5) +
        (citationAnalysis.hasExternalLinks ? 20 : 0)
    );

    // Answer box score
    let answerBoxScore = 0;
    if (answerBlocks.length > 0) {
        answerBoxScore += Math.min(30, answerBlocks.length * 6);

        // Check for featured answer
        const featured = answerBlocks.find(b => b.position === 'featured');
        if (featured) {
            answerBoxScore += 20;
            if (featured.conciseAnswer.length < 100) answerBoxScore += 15;
            if (featured.keyTakeaways.length >= 3) answerBoxScore += 15;
        }

        // Average confidence
        const avgConfidence = answerBlocks.reduce((s, b) => s + b.confidence, 0) / answerBlocks.length;
        answerBoxScore += avgConfidence * 0.2;
    }
    answerBoxScore = Math.min(100, answerBoxScore);

    // Comprehensiveness score
    let comprehensivenessScore = 0;
    comprehensivenessScore += Math.min(30, graph.entities.length * 3);
    comprehensivenessScore += Math.min(20, graph.relationships.length * 4);
    comprehensivenessScore += Math.min(30, wordCount / 50); // 1 point per 50 words

    // Check for structural elements
    if (/<h2/i.test(html)) comprehensivenessScore += 5;
    if (/<h3/i.test(html)) comprehensivenessScore += 5;
    if (/<ul|<ol/i.test(html)) comprehensivenessScore += 5;
    if (/<table/i.test(html)) comprehensivenessScore += 5;

    comprehensivenessScore = Math.min(100, comprehensivenessScore);

    return { citationScore, answerBoxScore, comprehensivenessScore };
}

/**
 * Generate recommendations for AI Overview improvement
 */
function generateRecommendations(
    answerBlocks: AnswerBlock[],
    scores: ReturnType<typeof calculateScores>,
    graph: RelationshipGraph
): string[] {
    const recommendations: string[] = [];

    if (answerBlocks.length < 3) {
        recommendations.push('Add more Q&A formatted content - use question headings');
    }

    if (!answerBlocks.some(b => b.position === 'featured')) {
        recommendations.push('Add a clear question-and-answer at the start for featured snippet');
    }

    if (scores.citationScore < 50) {
        recommendations.push('Add more authoritative citations to improve source credibility');
    }

    if (scores.answerBoxScore < 50) {
        recommendations.push('Format answers as concise, direct responses under 100 words');
    }

    if (scores.comprehensivenessScore < 50) {
        recommendations.push('Add more structured content: lists, tables, and subheadings');
    }

    if (graph.entities.length < 5) {
        recommendations.push('Include more named entities (organizations, products, concepts)');
    }

    if (answerBlocks.some(b => b.keyTakeaways.length < 2)) {
        recommendations.push('Add bullet-point key takeaways after each answer');
    }

    return recommendations;
}

// ============================================================================
// Main Optimizer Function
// ============================================================================

/**
 * Analyze and optimize content for AI Overview
 */
export function analyzeForAIOverview(
    html: string,
    options: AIOverviewOptions = {}
): AIOverviewContent {
    const {
        targetKeyword,
        extractEntities: shouldExtractEntities = true,
        generateSchema: shouldGenerateSchema = true,
        minQuestionConfidence = 0.6,
        maxAnswerBlocks = 10,
    } = options;

    // Extract questions
    const questionResult = extractQuestions(html, {
        keyword: targetKeyword,
        maxQuestions: maxAnswerBlocks,
    });

    // Filter by confidence
    questionResult.questions = questionResult.questions.filter(
        q => q.confidence >= minQuestionConfidence
    );

    // Convert to answer blocks
    const answerBlocks = toAnswerBlocks(questionResult);

    // Extract entities
    let structuredData: RelationshipGraph = { entities: [], relationships: [] };
    if (shouldExtractEntities) {
        const entities = extractEntities(html);
        structuredData = buildRelationshipGraph(entities, html);
    }

    // Generate schema
    let schemaMarkup: AIOverviewSchema = {
        article: generateArticleSchema(html),
    };

    if (shouldGenerateSchema && answerBlocks.length >= 2) {
        schemaMarkup.faqPage = generateFAQSchema(answerBlocks);
    }

    // Calculate scores
    const scores = calculateScores(html, answerBlocks, structuredData);

    // Overall score
    const overallScore = Math.round(
        (scores.citationScore * 0.25) +
        (scores.answerBoxScore * 0.40) +
        (scores.comprehensivenessScore * 0.35)
    );

    // Generate recommendations
    const recommendations = generateRecommendations(answerBlocks, scores, structuredData);

    return {
        answerBlocks,
        schemaMarkup,
        structuredData,
        citationScore: Math.round(scores.citationScore),
        answerBoxScore: Math.round(scores.answerBoxScore),
        comprehensivenessScore: Math.round(scores.comprehensivenessScore),
        overallScore,
        recommendations,
    };
}

/**
 * Quick AI Overview score check
 */
export function quickAIOverviewCheck(html: string): {
    score: number;
    hasAnswerBox: boolean;
    hasFAQSchema: boolean;
    citationReadiness: number;
} {
    const result = analyzeForAIOverview(html);

    return {
        score: result.overallScore,
        hasAnswerBox: result.answerBlocks.some(b => b.position === 'featured'),
        hasFAQSchema: !!result.schemaMarkup.faqPage,
        citationReadiness: result.citationScore,
    };
}

/**
 * Generate JSON-LD script for AI Overview schema
 */
export function generateAIOverviewSchemaScript(schema: AIOverviewSchema): string {
    const scripts: string[] = [];

    if (schema.faqPage) {
        scripts.push(`<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', ...schema.faqPage }, null, 2)}
</script>`);
    }

    if (schema.article) {
        scripts.push(`<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', ...schema.article }, null, 2)}
</script>`);
    }

    return scripts.join('\n');
}
