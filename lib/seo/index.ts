/**
 * SEO Module Index
 * FSD: lib/seo/index.ts
 * 
 * Centralized exports for SEO utilities including
 * AI Overview optimization and traffic acquisition.
 */

// ============================================================================
// AI Overview Types
// ============================================================================

export type {
    // Answer blocks
    AnswerBlock,
    SourceReference,

    // Entity extraction
    EntityReference,
    EntityRelationship,
    RelationshipGraph,

    // Schema
    AIOverviewSchema,
    FAQSchemaItem,
    HowToStep,

    // Content
    AIOverviewContent,

    // Options
    AIOverviewOptions,
    QuestionExtractionResult,
} from './types';

// ============================================================================
// AI Overview Optimization
// ============================================================================

export {
    extractQuestions,
    toAnswerBlocks,
} from './questionExtractor';

export {
    analyzeForAIOverview,
    quickAIOverviewCheck,
    generateAIOverviewSchemaScript,
} from './aiOverviewOptimizer';

// ============================================================================
// Traffic Acquisition (Existing)
// ============================================================================

export type {
    InternalLink,
    TopicCluster,
    SEOAudit,
    SEOIssue
} from './trafficAcquisition';

export {
    auditArticleSEO,
    suggestInternalLinks,
    createTopicCluster,
    generateFeaturedSnippetContent,
    generateCanonicalUrl,
    suggestBacklinkOpportunities
} from './trafficAcquisition';

