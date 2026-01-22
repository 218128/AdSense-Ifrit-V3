/**
 * Campaigns Feature - Barrel Export
 * FSD: features/campaigns/index.ts
 */

// Types
export type {
    Campaign,
    CampaignSource,
    SourceType,
    KeywordSourceConfig,
    RSSSourceConfig,
    TrendsSourceConfig,
    ManualSourceConfig,
    ManualTopic,
    TranslationSourceConfig,
    LanguageMapping,
    AIConfig,
    ScheduleConfig,
    CampaignStats,
    CampaignRun,
    RunItem,
    RunError,
    PipelineContext,
    SourceItem,
} from './model/types';

// Campaign Context Types
export type {
    DataSource,
    SourcedData,
    EnrichedKeyword,
    NicheData,
    CompetitionData,
    ContentSuggestions,
    CampaignContext,
    HuntCampaignContext,
} from './model/campaignContext';
export {
    createSourced,
    unwrap,
    createEmptyContext,
    initContextFromHunt,
    needsEnrichment,
    getSourceSummary,
} from './model/campaignContext';

// Campaign Enrichment
export {
    getEnrichedContext,
    enrichKeywordResearch,
    enrichCompetition,
    enrichContentSuggestions,
    type EnrichmentOptions,
} from './lib/campaignEnrichment';

// Context Builder
export {
    buildPromptContext,
    buildResearchPrompt,
    buildOutlinePrompt,
    buildContentPrompt,
    getSourceBadgeConfig,
    type PromptContext,
    type SourceSummary,
} from './lib/contextBuilder';

// Store
export {
    useCampaignStore,
    useCampaigns,
    useActiveCampaign,
    useActiveCampaigns,
    useDueCampaigns,
} from './model/campaignStore';

// Lib
export {
    runPipeline,
    createRun,
} from './lib/processor';

// Unified Pipeline (New - replaces PipelineRunner)
export {
    hasCheckpoint,
    getCheckpointInfo,
    allStages,
    getTotalStageCount,
    getStageById,
    type StageGroup,
    type PipelineStage,
    type StageResult,
    type StageStatus,
    type PipelineProgress,
    type ProgressCallback,
    type PipelineOptions,
    type Checkpoint,
} from './lib/pipeline';

// Pipeline Stage Groups (for customization)
export {
    validationStages,
    enrichmentStages,
    generationStages,
    enhancementStages,
    qualityStages,
    optimizationStages,
    publishStages,
} from './lib/pipeline';

export {
    useDeduplicationStore,
    shouldSkipTopic,
    recordGeneratedPost,
    similarityScore,
} from './lib/deduplication';

export type { PostRecord } from './lib/deduplication';

// Content Quality Scoring (Phase 2 Enhancement)
export {
    scoreContent,
    analyzeReadability,
    analyzeSEO,
    analyzeUniqueness,
    analyzeStructure,
    meetsMinimumQuality,
    getQualityRating,
    getCriticalIssues,
    type QualityScore,
    type ReadabilityScore,
    type SEOScore,
    type UniquenessScore,
    type StructureScore,
    type QualityIssue,
} from './lib/contentQualityScorer';

// RSS
export { fetchFeed, type FeedItem, type ParsedFeed } from './lib/rssParser';
export { fetchRSSSourceItems, extractArticleContent, type RSSFetchResult } from './lib/rssSource';

// Trends
export {
    fetchTrends,
    fetchTrendsUnofficial,
    fetchTrendsSerpApi,
    type TrendingTopic,
    type TrendsResult,
    type TrendsConfig,
    type TrendsRegion
} from './lib/trendsApi';
export { fetchTrendsSourceItems, getRelatedTopics, type TrendsFetchResult } from './lib/trendsSource';

// Content Enhancement
export { spinContent, quickSpin, type SpinResult, type SpinOptions } from './lib/contentSpinner';
export {
    fetchExistingPosts,
    findLinkOpportunities,
    injectInternalLinks,
    type ExistingPost,
    type LinkSuggestion,
    type LinkingResult
} from './lib/internalLinking';
export {
    generateAltText,
    generateAltTextAI,
    determineImagePlacements,
    injectImages,
    type ImagePlacement,
    type GeneratedImage,
    type ImageInjectionResult
} from './lib/imageOptimization';
export {
    generateArticleSchema,
    generateFAQSchema,
    generateHowToSchema,
    generateAllSchemas,
    type ArticleSchema,
    type FAQSchema,
    type HowToSchema
} from './lib/schemaMarkup';

// Multi-Site Publishing
export {
    publishToMultipleSites,
    createStaggeredSchedule,
    getNextScheduledSite,
    validateMultiSiteConfig,
    type MultiSiteConfig,
    type MultiSiteTarget,
    type SiteCustomization,
    type MultiSitePublishResult,
    type MultiSitePublishReport
} from './lib/multiSitePublishing';

// Analytics
export {
    fetchUmamiAnalytics,
    fetchPlausibleAnalytics,
    suggestTopicsFromPerformance,
    recordManualPerformance,
    type PostPerformance,
    type PerformanceMetrics,
    type TopicSuggestion,
    type AnalyticsConfig
} from './lib/analytics';

// A/B Testing
export {
    createABTest,
    recordImpression,
    recordClick,
    recordConversion,
    calculateCTR,
    calculateConversionRate,
    determineWinner,
    generateTitleVariations,
    type ABTest,
    type ABVariant,
    type ABResult
} from './lib/abTesting';

// Translation (Multi-Language Publishing)
export {
    translatePost,
    translatePosts,
    type TranslatePostOptions,
    type TranslatedContent,
} from './lib/translatePost';
export {
    runTranslationPipeline,
    type TranslationPipelineOptions,
    type TranslationPipelineResult,
    type TranslationProgress,
} from './lib/translationPipeline';
export {
    isAlreadyTranslated,
    getTranslationsForPost,
    getTranslationStats,
    createTranslationRecord,
    updateTranslationStatus,
    type TranslationRecord,
    type TranslationHistoryState,
} from './model/translationHistory';
export {
    runTranslationCampaignWithStatus,
    translateSinglePostWithStatus,
    type RunTranslationCampaignOptions,
} from './lib/translationActionRunner';

// Multi-Language Publishing
export {
    publishMultiLang,
    getPopularTargetLanguages,
    getAllSupportedLanguages,
    DEFAULT_MULTILANG_CONFIG,
    type MultiLangConfig,
    type MultiLangResult,
    type TranslatedPost,
} from './lib/multiLangPublisher';

// Image Retry
export {
    retryImagesForPost,
    type RetryImagesResult,
} from './lib/generators';

// UI
export { CampaignsDashboard } from './ui/CampaignsDashboard';
export { CampaignCard } from './ui/CampaignCard';
export { CampaignEditor } from './ui/CampaignEditor';
export { RunHistoryPanel } from './ui/RunHistoryPanel';

// ============================================================================
// Phase 2: Author & Quality Integration
// ============================================================================

// Author Matching
export {
    matchAuthorForPipeline,
    applyAuthorToContext,
    validateAuthorForPublishing,
    type AuthorMatchResult,
    type AuthorMatchOptions,
} from './lib/authorMatcher';

// E-E-A-T Injection
export {
    injectEEATSignals,
    injectExperiencePhrases,
    getContentGenerationEnhancements,
    type EEATInjectionResult,
    type EEATInjectionOptions,
} from './lib/eeatInjector';

// Quality Scoring & Review Integration
export {
    scoreContentQuality,
    applyQualityScoreToContext,
    createReviewItemFromContext,
    processSmartReview,
    shouldPublish,
    getPostStatusForReview,
    type QualityScoreResult,
    type ReviewDecisionResult,
} from './lib/qualityScoreStage';

// Phase 2 UI Components
export { AuthorSelector } from './components/AuthorSelector';
export { QualityScorePanel } from './components/QualityScorePanel';
export { ROIPredictionCard } from './components/ROIPredictionCard';

