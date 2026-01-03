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
