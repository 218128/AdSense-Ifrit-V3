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
    AIConfig,
    ScheduleConfig,
    CampaignStats,
    CampaignRun,
    RunItem,
    RunError,
    PipelineContext,
    SourceItem,
} from './model/types';

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

export {
    useDeduplicationStore,
    shouldSkipTopic,
    recordGeneratedPost,
    similarityScore,
} from './lib/deduplication';

export type { PostRecord } from './lib/deduplication';

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

// UI
export { CampaignsDashboard } from './ui/CampaignsDashboard';
export { CampaignCard } from './ui/CampaignCard';
export { CampaignEditor } from './ui/CampaignEditor';
export { RunHistoryPanel } from './ui/RunHistoryPanel';
