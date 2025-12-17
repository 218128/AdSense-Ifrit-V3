/**
 * Formatting Module Index
 */

export type {
    ProductForComparison,
    ComparisonTableOptions,
    CalloutType
} from './richMarkdown';

export {
    generateComparisonTable,
    formatRating,
    generateProsCons,
    generateCallout,
    generateKeyTakeaways,
    generateFAQSection,
    generateVerdictBox,
    generateSteps,
    generateRequirementsList,
    generateQuickStats
} from './richMarkdown';

export type {
    ArticleSchemaOptions,
    ProductReviewSchemaOptions,
    FAQSchemaItem,
    HowToStep,
    HowToSchemaOptions,
    BreadcrumbItem
} from './schemaOrg';

export {
    generateArticleSchema,
    generateProductReviewSchema,
    generateFAQSchema,
    generateHowToSchema,
    generateBreadcrumbSchema,
    wrapSchemaInScriptTag,
    generateCombinedArticleFAQSchema,
    generateCombinedReviewFAQSchema,
    generateSchemaScripts
} from './schemaOrg';
