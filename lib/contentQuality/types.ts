/**
 * Content Quality Types - E-E-A-T Scoring
 * FSD: lib/contentQuality/types.ts
 * 
 * Type definitions for comprehensive content quality scoring
 * including E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).
 */

// ============================================================================
// Source & Citation Types
// ============================================================================

/**
 * Quality tier for source domains
 */
export type SourceQualityTier =
    | 'authoritative'     // .gov, .edu, major publications
    | 'reputable'         // Well-known blogs, industry sites
    | 'standard'          // Regular websites with some authority
    | 'low'               // Unknown or low-quality sources
    | 'problematic';      // Known misinformation sources

/**
 * Extracted citation from content
 */
export interface SourceCitation {
    id: string;
    text: string;                        // The citation text/claim
    url?: string;                        // Source URL if found
    domain?: string;                     // Source domain
    anchorText?: string;                 // Link text if hyperlinked
    context: string;                     // Surrounding text

    // Validation
    qualityTier?: SourceQualityTier;
    authorityScore?: number;             // 0-100
    verified: boolean;                   // Could we validate the source?
    verificationError?: string;

    // Position
    position: 'intro' | 'body' | 'conclusion';
    lineNumber?: number;
}

/**
 * Citation analysis summary
 */
export interface CitationAnalysis {
    total: number;
    verified: number;
    failed: number;
    byTier: Record<SourceQualityTier, number>;
    density: number;                     // Citations per 1000 words
    averageAuthority: number;            // Average authority score
    hasExternalLinks: boolean;
    hasInternalLinks: boolean;
}

// ============================================================================
// Experience Dimension
// ============================================================================

/**
 * First-hand experience signals detected in content
 */
export interface ExperienceSignals {
    firstHandPhrases: {
        phrase: string;
        context: string;
        lineNumber?: number;
    }[];
    personalAnecdotes: {
        text: string;
        type: 'story' | 'example' | 'comparison' | 'result';
    }[];
    originalInsights: string[];          // Unique claims not found elsewhere
    testingMentions: number;             // "I tested", "When I used"
    experienceVerbs: number;             // "I found", "I discovered"
}

/**
 * Experience dimension score
 */
export interface ExperienceScore {
    score: number;                       // 0-100
    originalContent: number;             // % unique to this article
    authorPerspective: number;           // First-person experience signals
    uniqueInsights: number;              // Claims not found in top results
    signals: ExperienceSignals;
    recommendations: string[];
}

// ============================================================================
// Expertise Dimension
// ============================================================================

/**
 * Expertise signals detected in content
 */
export interface ExpertiseSignals {
    technicalTerms: string[];            // Domain-specific vocabulary
    credentialMentions: string[];        // "As a certified...", "With my degree..."
    accurateStatements: number;          // Fact-checked accurate claims
    inaccurateStatements: number;        // Fact-checked inaccurate claims
    complexityLevel: 'basic' | 'intermediate' | 'advanced';
}

/**
 * Expertise dimension score
 */
export interface ExpertiseScore {
    score: number;                       // 0-100
    sourceQuality: number;               // Quality of cited sources
    citationDensity: number;             // Citations per 1000 words
    credibilitySignals: number;          // Expert language signals
    technicalAccuracy: number;           // Verified facts score
    signals: ExpertiseSignals;
    recommendations: string[];
}

// ============================================================================
// Authoritativeness Dimension
// ============================================================================

/**
 * Authority signals (some require external data)
 */
export interface AuthoritySignals {
    authorCredentialsPresent: boolean;
    authorBioPresent: boolean;
    authorSchemaPresent: boolean;
    externalMentions: number;            // Requires external API
    backlinksQuality: number;            // Requires external API (stub)
}

/**
 * Authoritativeness dimension score
 */
export interface AuthoritativenessScore {
    score: number;                       // 0-100
    domainAuthority: number;             // Site DA (from Hunt or external)
    topicalAuthority: number;            // Topic coverage depth
    backlinksQuality: number;            // Quality of inbound links (external)
    signals: AuthoritySignals;
    recommendations: string[];
}

// ============================================================================
// Trustworthiness Dimension
// ============================================================================

/**
 * Trust signals detected in content
 */
export interface TrustSignals {
    hasDisclaimer: boolean;
    hasAffiliateDisclosure: boolean;
    hasLastUpdatedDate: boolean;
    hasAuthorAttribution: boolean;
    hasContactInfo: boolean;
    hasPrivacyPolicy: boolean;           // Site-level, not content
    transparentAffiliate: boolean;
    noMisleadingClaims: boolean;
}

/**
 * Trustworthiness dimension score
 */
export interface TrustworthinessScore {
    score: number;                       // 0-100
    factCheckScore: number;              // Via Fact Check API
    disclaimerPresence: boolean;
    dateRelevance: number;               // Content freshness
    transparentAuthorship: boolean;
    signals: TrustSignals;
    recommendations: string[];
}

// ============================================================================
// Combined E-E-A-T Score
// ============================================================================

/**
 * Complete E-E-A-T score for content
 */
export interface EEATScore {
    overall: number;                     // 0-100 weighted average
    grade: 'A' | 'B' | 'C' | 'D' | 'F';  // Letter grade

    experience: ExperienceScore;
    expertise: ExpertiseScore;
    authoritativeness: AuthoritativenessScore;
    trustworthiness: TrustworthinessScore;

    // Summary
    strengths: string[];
    weaknesses: string[];
    criticalIssues: string[];
    recommendations: string[];

    // Metadata
    analyzedAt: number;
    wordCount: number;
    citationAnalysis: CitationAnalysis;
}

// ============================================================================
// Full Content Quality Score (extends existing)
// ============================================================================

/**
 * Combined quality score including E-E-A-T and existing metrics
 */
export interface FullContentScore {
    // Existing metrics (from contentQualityScorer.ts)
    readability: {
        score: number;
        fleschKincaid: number;
        avgSentenceLength: number;
        avgWordLength: number;
    };
    seo: {
        score: number;
        keywordDensity: number;
        hasH1: boolean;
        headingCount: number;
        metaPresent: boolean;
    };
    uniqueness: {
        score: number;
        aiPatternScore: number;
        detectedPatterns: string[];
    };
    structure: {
        score: number;
        hasIntro: boolean;
        hasConclusion: boolean;
        hasFAQ: boolean;
        paragraphCount: number;
    };

    // New E-E-A-T scoring
    eeat: EEATScore;

    // AI Overview optimization score
    aiOverview?: {
        score: number;
        hasAnswerBox: boolean;
        hasFAQSchema: boolean;
        citationReadiness: number;
    };

    // Overall
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    passesThreshold: boolean;
    threshold: number;
}

// ============================================================================
// Scoring Configuration
// ============================================================================

/**
 * Weights for E-E-A-T dimensions
 */
export interface EEATWeights {
    experience: number;                  // Default: 0.25
    expertise: number;                   // Default: 0.30
    authoritativeness: number;           // Default: 0.20
    trustworthiness: number;             // Default: 0.25
}

/**
 * Thresholds for quality gates
 */
export interface QualityThresholds {
    minEEATScore: number;                // Default: 60
    minExperienceScore: number;          // Default: 50
    minExpertiseScore: number;           // Default: 60
    minCitationCount: number;            // Default: 3
    maxAIPatternScore: number;           // Default: 30 (lower is better)
    ymylMinScore: number;                // Default: 80 (stricter for YMYL)
}

/**
 * Default configuration
 */
export const DEFAULT_EEAT_WEIGHTS: EEATWeights = {
    experience: 0.25,
    expertise: 0.30,
    authoritativeness: 0.20,
    trustworthiness: 0.25,
};

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
    minEEATScore: 60,
    minExperienceScore: 50,
    minExpertiseScore: 60,
    minCitationCount: 3,
    maxAIPatternScore: 30,
    ymylMinScore: 80,
};
