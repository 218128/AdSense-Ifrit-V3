/**
 * AI Overview Types
 * FSD: lib/seo/types.ts
 * 
 * Type definitions for AI Overview optimization,
 * designed for Google's AI-generated summaries.
 */

// ============================================================================
// Answer Block Types
// ============================================================================

/**
 * Source reference for citations
 */
export interface SourceReference {
    title: string;
    url: string;
    domain: string;
    authorityScore?: number;
    snippet?: string;                    // Relevant snippet from source
}

/**
 * Answer block optimized for AI Overview extraction
 */
export interface AnswerBlock {
    id: string;
    question: string;                    // The question being answered
    conciseAnswer: string;               // <100 words, direct answer
    expandedAnswer: string;              // Full detailed answer
    keyTakeaways: string[];              // Bullet point summary
    sources: SourceReference[];          // Cited sources
    position: 'featured' | 'body';       // Featured = first in article
    confidence: number;                  // How well-formed is this Q&A (0-100)
}

// ============================================================================
// Entity & Relationship Types
// ============================================================================

/**
 * Named entity extracted from content
 */
export interface EntityReference {
    id: string;
    name: string;
    type: 'Person' | 'Organization' | 'Product' | 'Concept' | 'Place' | 'Event';
    description?: string;
    wikidata_id?: string;                // For knowledge graph linking
    mentions: number;                    // How many times mentioned
    importance: 'primary' | 'secondary' | 'mentioned';
}

/**
 * Relationship between entities
 */
export interface EntityRelationship {
    sourceId: string;
    targetId: string;
    relationship: string;                // "is", "created by", "located in", etc.
    strength: number;                    // 0-1
}

/**
 * Knowledge graph from content
 */
export interface RelationshipGraph {
    entities: EntityReference[];
    relationships: EntityRelationship[];
}

// ============================================================================
// Schema Types for AI Overview
// ============================================================================

/**
 * FAQ Schema item
 */
export interface FAQSchemaItem {
    question: string;
    answer: string;
}

/**
 * HowTo Schema step
 */
export interface HowToStep {
    name: string;
    text: string;
    image?: string;
    url?: string;
}

/**
 * Combined schema markup for AI Overview
 */
export interface AIOverviewSchema {
    faqPage?: {
        '@type': 'FAQPage';
        mainEntity: Array<{
            '@type': 'Question';
            name: string;
            acceptedAnswer: {
                '@type': 'Answer';
                text: string;
            };
        }>;
    };
    howTo?: {
        '@type': 'HowTo';
        name: string;
        description: string;
        step: Array<{
            '@type': 'HowToStep';
            name: string;
            text: string;
        }>;
    };
    article: {
        '@type': 'Article';
        headline: string;
        description: string;
        author: object;                  // Person schema
    };
    breadcrumb?: {
        '@type': 'BreadcrumbList';
        itemListElement: Array<{
            '@type': 'ListItem';
            position: number;
            name: string;
            item?: string;
        }>;
    };
}

// ============================================================================
// AI Overview Content
// ============================================================================

/**
 * Complete AI Overview optimized content
 */
export interface AIOverviewContent {
    // Content structure
    answerBlocks: AnswerBlock[];

    // Schema markup
    schemaMarkup: AIOverviewSchema;

    // Entity extraction
    structuredData: RelationshipGraph;

    // Scoring
    citationScore: number;               // How citable is this content (0-100)
    answerBoxScore: number;              // Answer box format quality (0-100)
    comprehensivenessScore: number;      // Topic coverage depth (0-100)
    overallScore: number;                // Combined AI Overview readiness

    // Recommendations
    recommendations: string[];
}

// ============================================================================
// Analysis Options
// ============================================================================

/**
 * Options for AI Overview analysis
 */
export interface AIOverviewOptions {
    targetKeyword?: string;
    extractEntities?: boolean;
    generateSchema?: boolean;
    minQuestionConfidence?: number;      // Default: 0.6
    maxAnswerBlocks?: number;            // Default: 10
}

/**
 * Result of question extraction
 */
export interface QuestionExtractionResult {
    questions: Array<{
        question: string;
        answer: string;
        source: 'heading' | 'faq' | 'inline' | 'inferred';
        confidence: number;
        position: number;                // Position in document
    }>;
    recommendedFeatured: number;         // Index of best Q&A for featured snippet
}
