/**
 * Media System Barrel Exports
 * FSD: lib/media/index.ts
 */

// Main service
export { mediaAssetService, DEFAULT_TEMPLATES } from './MediaAssetService';
export type {
    MediaSlotType,
    MediaSourceType,
    MediaSlot,
    MediaRequest,
    GeneratedAsset,
    ArticleTemplate,
} from './MediaAssetService';

// React hook
export { useMediaAssets } from './hooks/useMediaAssets';

// Unified types
export * from './types';

// Scoring (NEW)
export {
    scoreImage,
    scoreAndRankImages,
    pickTopImages,
    mergeImageResults,
    getDefaultCriteria,
} from './scoring';
export type {
    ImageCandidate,
    ScoringCriteria,
    ScoredImage,
} from './scoring';

// SEO Validation (NEW)
export {
    validateImageSEO,
    validateImagesSEO,
    suggestAltText,
    improveAltText,
} from './seoValidation';
export type {
    SEOIssueType,
    SEOIssue,
    ImageSEOInput,
    ImageSEOResult,
} from './seoValidation';

// Image Optimization (Consolidated)
export {
    generateAltText,
    generateAltTextAI,
    determineImagePlacements,
    injectImages,
} from './optimization';
export type {
    ImagePlacement,
    GeneratedImage,
    ImageInjectionResult,
} from './optimization';
