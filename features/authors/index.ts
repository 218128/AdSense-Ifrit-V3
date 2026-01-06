/**
 * Authors Feature - Barrel Export
 * FSD: features/authors/index.ts
 * 
 * Centralized exports for the Author Management feature.
 * Provides author profiles, credentials, expertise matching, and E-E-A-T signals.
 */

// ============================================================================
// Types
// ============================================================================

export type {
    // Core types
    AuthorProfile,
    AuthorCredential,
    AuthorExpertise,
    SocialProfile,
    EEATSignals,
    ExpertiseLevel,
    VerificationStatus,
    WPAuthorMapping,

    // Input/Output types
    CreateAuthorInput,
    UpdateAuthorInput,
    AuthorMatchCriteria,
    AuthorMatchResult,
    AuthorSchemaData,

    // Health Score types
    AuthorHealthScore,
    AuthorHealthCheckItem,
    AuthorHealthRecommendation,
    SocialRepublishConfig,
    AuthorRepublishSettings,
} from './model/authorTypes';

export {
    DEFAULT_EEAT_SIGNALS,
    EXPERTISE_LEVEL_YEARS,
    HEALTH_SCORE_THRESHOLDS,
    DEFAULT_HEALTH_CHECKLIST,
} from './model/authorTypes';

// ============================================================================
// Store
// ============================================================================

export {
    useAuthorStore,
    selectAllAuthors,
    selectAuthorById,
    selectSelectedAuthor,
    selectAuthorsByNiche,
} from './model/authorStore';

// ============================================================================
// Schema & E-E-A-T Generation
// ============================================================================

export {
    // Schema.org
    generateAuthorSchema,
    generateAuthorSchemaScript,
    generateArticleWithAuthorSchema,

    // HTML Components
    generateAuthorByline,
    generateAuthorBioBox,

    // E-E-A-T Signals
    getExpertiseStatement,
    getCredentialMention,
    getFirstHandPhrase,
    generateEEATIntro,

    // Disclosures
    generateDisclosures,
} from './lib/authorSchemaBuilder';

// ============================================================================
// Expertise Matching
// ============================================================================

export type {
    TopicAnalysis,
    MatchRecommendation,
} from './lib/expertiseMatcher';

export {
    analyzeTopicForMatching,
    findAuthorForTopic,
    findPotentialAuthors,
    getFallbackAuthor,
    requiresHumanExpertise,
} from './lib/expertiseMatcher';

// ============================================================================
// Health Score Calculator
// ============================================================================

export {
    calculateAuthorHealthScore,
    getHealthSummary,
    canPublishWithAuthor,
} from './lib/healthScoreCalculator';

// ============================================================================
// WP Author Sync
// ============================================================================

export {
    syncAuthorToSite,
    syncAuthorToSites,
    getWPUserIdForSite,
    isAuthorSyncedToSite,
    removeSiteSync,
    type SyncResult,
} from './lib/wpAuthorSync';

// ============================================================================
// Components
// ============================================================================

export { AuthorManager } from './components/AuthorManager';
export { AuthorProfileEditor } from './components/AuthorProfileEditor';
