/**
 * Schema Components Index
 * Exports all JSON-LD structured data generators
 */

export { generateArticleSchema, generateInlineArticleSchema } from './articleSchema';
export { generateFAQSchema, generateInlineFAQSchema, generateFAQExtractor } from './faqSchema';
export {
    generateBreadcrumbSchema,
    generateArticleBreadcrumbSchema,
    generateBreadcrumbNav,
    generateBreadcrumbStyles,
    type BreadcrumbConfig
} from './breadcrumbs';
