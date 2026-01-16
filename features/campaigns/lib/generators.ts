/**
 * Content Generators (Barrel Export)
 * FSD: features/campaigns/lib/generators.ts
 * 
 * This file has been refactored following Separation of Concerns.
 * Implementation is split into focused modules:
 * - researchService.ts - Topic research
 * - contentGenerator.ts - Article content generation
 * - imageGenerator.ts - Image generation with fallbacks
 * - wpPublisher.ts - WordPress publishing
 * 
 * This barrel file re-exports for backward compatibility.
 * For new code, import directly from the specific module.
 */

// ============================================================================
// Research Service
// ============================================================================

export {
    performResearch,
    performResearchWithDetails,
    performResearchRich,
} from './researchService';
export type { ResearchOptions, ResearchResult } from './researchService';

// ============================================================================
// Content Generator
// ============================================================================

export {
    generateContent,
    mapArticleType,
    parseHtmlContent,
    estimateReadingTime,
    extractHeadings,
} from './contentGenerator';
export type { ContentGenerationResult, ContentGenerationOptions } from './contentGenerator';

// ============================================================================
// Image Generator
// ============================================================================

export {
    generateImages,
    generateSingleImage,
    generateImagesEnhanced,
} from './imageGenerator';
export type {
    ImageType,
    ImageResult,
    InlineImageResult,
    GeneratedImages,
    ImageProgressStatus,
    ImageProgressCallback,
    EnhancedImageResult,
    EnhancedImagesResult,
} from './imageGenerator';

// ============================================================================
// WordPress Publisher
// ============================================================================

export {
    publishToWordPress,
    retryImagesForPost,
} from './wpPublisher';
export type {
    PublishResult,
    PublishOptions,
    RetryImagesResult,
} from './wpPublisher';
