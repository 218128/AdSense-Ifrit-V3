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
// UI Components - IMPORT DIRECTLY for client components
// ============================================================================
// These components use React hooks internally. Import directly in client components:
//   import { WPSitesDashboard } from '@/features/wordpress/ui/WPSitesDashboard';
//   import { WPSiteCard } from '@/features/wordpress/ui/WPSiteCard';
//   import { SiteHealthWidget } from '@/features/wordpress/ui/SiteHealthWidget';

// Server-safe UI exports (no hooks)
export { AddWPSiteModal } from './ui/AddWPSiteModal';
export { AdSenseReadinessDashboard } from './ui/AdSenseReadinessDashboard';
export { MediaGeneratorCard } from './ui/MediaGeneratorCard';
export { AnalyticsMetricsPanel } from './ui/AnalyticsMetricsPanel';

// ============================================================================
// Hooks - IMPORT DIRECTLY to avoid server/client conflicts
// ============================================================================
// Client hooks should be imported directly from their files to avoid
// polluting server component imports:
//   import { usePluginSync } from '@/features/wordpress/hooks/usePluginSync';
//   import { useWPSiteMedia } from '@/features/wordpress/hooks/useWPSiteMedia';
//   import { useSiteAnalytics } from '@/features/wordpress/hooks/useSiteAnalytics';

// Export types and constants from server-safe file (does NOT import React)
export type {
    PluginInfo,
    DetectedFeatures,
    SyncResult,
    UsePluginSyncReturn,
} from './hooks/pluginSyncTypes';

export { RECOMMENDED_PLUGINS as RECOMMENDED_WP_PLUGINS } from './hooks/pluginSyncTypes';

// NOTE: These type exports are commented out because importing from the hook files
// still causes React to load (even for type-only imports in Next.js 16)
// Types should be imported directly from the hook files when needed.


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

// SiteHealthWidget uses usePluginSync hook - import directly:
//   import { SiteHealthWidget, SiteHealthBadge } from '@/features/wordpress/ui/SiteHealthWidget';
