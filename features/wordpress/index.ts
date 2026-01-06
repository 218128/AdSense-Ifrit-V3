/**
 * WordPress Feature - Barrel Export
 * FSD: features/wordpress/index.ts
 */

// ============================================================================
// New WP Sites Types (Clean Model)
// ============================================================================

export type {
    WPSite,
    WPArticle,
    WPSiteConfig,
    WPSiteType,
    AdsenseStatus,
    WPConnectionStatus,
    HostingProvider,
    HumanizationConfig,
    AdSenseReadinessReport,
    AdSenseCheck,
    HostingerOrder,
    HostingerProvisionRequest,
    HostingerProvisionResult,
} from './model/wpSiteTypes';

export { DEFAULT_HUMANIZATION_CONFIG } from './model/wpSiteTypes';

// ============================================================================
// New WP Sites Store
// ============================================================================

export {
    useWPSitesStore,
    useActiveSite,
    useActiveArticle,
    useConnectedSites,
    selectActiveSite,
    selectActiveArticle,
    selectConnectedSites,
    selectSitesNeedingAdsense,
} from './model/wpSiteStore';

// ============================================================================
// AdSense Checker
// ============================================================================

export {
    checkAdSenseReadiness,
    getReadinessStatus,
    getCriticalMissing,
    getApprovalProgress,
    getMissingEssentialPages,
    needsAttention,
} from './lib/adsenseChecker';

// ============================================================================
// WP Site Service (Business Logic - SoC extracted from store)
// ============================================================================

export {
    loadHuntProfileForDomain,
    transformProfileToSiteData,
    validateSiteUrl,
    checkEssentialPages,
    calculateAdsenseReadiness,
    calculateSiteStats,
    getRecommendedActions,
    type WPSiteProfileData,
    type LoadHuntProfileResult,
    type SiteHealthCheck,
} from './lib/wpSiteService';

// ============================================================================
// Content Prompts
// ============================================================================

export {
    getDefaultPromptTemplates,
    buildPrompt,
    interpolatePrompt,
    PROMPT_VARIABLES,
} from './lib/wpContentPrompts';

export type {
    WPPromptContext,
    WPArticleRequest,
    WPPromptTemplates,
} from './lib/wpContentPrompts';

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

export type {
    WPCategory,
    WPTag,
    WPAuthor,
    WPPostInput,
    WPPostResult,
    WPMediaInput,
    WPMediaResult,
    WPApiResponse,
    WPConnectionTestResult,
} from './model/types';

// ============================================================================
// Legacy-Compatible Hooks
// These provide the old wordpressStore API using the new wpSiteStore
// ============================================================================

export { useWPSitesLegacy } from './model/wpSiteStore';

// Legacy aliases for smooth migration
export { useWPSitesLegacy as useWordPressStore } from './model/wpSiteStore';
export { selectSitesArray as useWPSites } from './model/wpSiteStore';


// ============================================================================
// API
// ============================================================================

export {
    testConnection,
    createPost,
    updatePost,
    uploadMedia,
    getCategories,
    getTags,
    createCategory,
    createTag,
    getAuthors,
    syncSiteMetadata,
} from './api/wordpressApi';

// ============================================================================
// Recommended Stacks
// ============================================================================

export {
    RECOMMENDED_THEMES,
    RECOMMENDED_PLUGINS,
    getRecommendedStack,
    getPrimaryTheme,
    getRequiredPlugins,
} from './lib/recommendedStacks';

// ============================================================================
// UI Components
// ============================================================================

export { WPSitesDashboard } from './ui/WPSitesDashboard';
export { AddWPSiteModal } from './ui/AddWPSiteModal';
export { WPSiteCard } from './ui/WPSiteCard';
export { AdSenseReadinessDashboard } from './ui/AdSenseReadinessDashboard';
export { MediaGeneratorCard } from './ui/MediaGeneratorCard';
export { AnalyticsMetricsPanel } from './ui/AnalyticsMetricsPanel';

// ============================================================================
// Hooks
// ============================================================================

export {
    usePluginSync,
    RECOMMENDED_PLUGINS as RECOMMENDED_WP_PLUGINS,
    type PluginInfo,
    type DetectedFeatures,
    type SyncResult,
    type UsePluginSyncReturn,
} from './hooks/usePluginSync';

export {
    useWPSiteMedia,
    type GeneratedMediaAsset,
    type UseWPSiteMediaReturn,
} from './hooks/useWPSiteMedia';

export {
    useSiteAnalytics,
    generateMockAnalytics,
    type UseSiteAnalyticsReturn,
} from './hooks/useSiteAnalytics';

// ============================================================================
// Analytics Types
// ============================================================================

export type {
    SiteAnalytics,
    MultiSiteAnalytics,
    SearchConsoleMetrics,
    AnalyticsMetrics,
    AdSenseMetrics,
    PageSpeedMetrics,
} from './model/analyticsTypes';

// ============================================================================
// Ifrit Plugin API
// ============================================================================

export {
    checkPluginHealth,
    getPluginSiteInfo,
    getPluginAnalytics,
    createPostViaPlugin,
    updatePostViaPlugin,
    uploadMediaViaPlugin,
    setPluginWebhookUrl,
    installPluginRemotely,
} from './api/ifritPluginApi';

export type {
    PluginHealthResponse,
    PluginSiteInfo,
    PluginAnalyticsResponse,
    CreatePostRequest,
    CreatePostResponse,
    UploadMediaRequest,
    UploadMediaResponse,
} from './api/ifritPluginApi';

// ============================================================================
// Legal Pages Generator
// ============================================================================

export {
    generateLegalPages,
    publishLegalPages,
    checkLegalPagesExist,
    type LegalPageConfig,
    type GeneratedLegalPage,
    type LegalPagesResult,
} from './lib/legalPagesGenerator';

// ============================================================================
// AdSense Readiness UI
// ============================================================================

export { PortfolioAdSenseWidget } from './ui/PortfolioAdSenseWidget';
// Note: adsenseChecker functions already exported in "AdSense Checker" section above

// ============================================================================
// Plugin Monitoring
// ============================================================================

export {
    checkSiteHealth,
    isReadyToPublish,
    getCategoryIcon,
    getSeverityStyle,
    REQUIRED_PLUGINS,
    type PluginHealthCheck,
    type SiteHealthReport,
    type PluginCategory,
    type HealthSeverity,
} from './lib/pluginMonitor';

export { SiteHealthWidget, SiteHealthBadge } from './ui/SiteHealthWidget';
