/**
 * Content Quality - Barrel Export
 * FSD: lib/contentQuality/index.ts
 * 
 * Centralized exports for E-E-A-T content quality scoring.
 */

// ============================================================================
// Types
// ============================================================================

export type {
    // Core types
    EEATScore,
    ExperienceScore,
    ExpertiseScore,
    AuthoritativenessScore,
    TrustworthinessScore,
    FullContentScore,

    // Signal types
    ExperienceSignals,
    ExpertiseSignals,
    AuthoritySignals,
    TrustSignals,

    // Citation types
    SourceCitation,
    CitationAnalysis,
    SourceQualityTier,

    // Configuration
    EEATWeights,
    QualityThresholds,
} from './types';

export {
    DEFAULT_EEAT_WEIGHTS,
    DEFAULT_QUALITY_THRESHOLDS,
} from './types';

// ============================================================================
// E-E-A-T Scoring
// ============================================================================

export {
    calculateEEATScore,
    quickEEATCheck,
} from './eeatScorer';

// ============================================================================
// Experience Detection
// ============================================================================

export {
    detectExperienceSignals,
    scoreExperience,
} from './experienceDetector';

// ============================================================================
// Citation Validation
// ============================================================================

export {
    extractCitations,
    classifyDomain,
    calculateDomainAuthority,
    analyzeCitations,
    validateCitations,
    getCitationRecommendations,
} from './citationValidator';

// ============================================================================
// Fact Checking (Google Fact Check API)
// ============================================================================

export type {
    ClaimRating,
    ClaimReviewPublisher,
    ClaimReview,
    FactCheckClaim,
    FactCheckSearchResult,
    ExtractedClaim,
    ContentFactCheckResult,
} from './factChecker';

export {
    extractClaims,
    searchFactChecks,
    checkClaim,
    factCheckContent,
    quickFactCheckScore,
} from './factChecker';

