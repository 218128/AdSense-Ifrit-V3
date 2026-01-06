/**
 * Author Management - Type Definitions
 * FSD: features/authors/model/authorTypes.ts
 * 
 * Defines author profiles with credentials, expertise, and E-E-A-T signals.
 * Authors can be assigned to sites and articles for authentic authority building.
 */

// ============================================================================
// Core Author Entity
// ============================================================================

/**
 * Author expertise level for specific topics
 */
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Author verification status
 */
export type VerificationStatus = 'unverified' | 'pending' | 'verified';

/**
 * Social profile for author
 */
export interface SocialProfile {
    platform: 'linkedin' | 'twitter' | 'youtube' | 'medium' | 'github' | 'website' | 'other';
    url: string;
    username?: string;
    followers?: number;
    verified?: boolean;
}

/**
 * Author credential (degree, certification, etc.)
 */
export interface AuthorCredential {
    id: string;
    type: 'degree' | 'certification' | 'license' | 'award' | 'publication' | 'experience';
    title: string;                       // "Bachelor in Computer Science"
    issuer?: string;                     // "MIT", "Google"
    year?: number;
    url?: string;                        // Link to verify
    description?: string;
}

/**
 * Author expertise in a specific niche/topic
 */
export interface AuthorExpertise {
    niche: string;                       // "AI", "Personal Finance", "Travel"
    level: ExpertiseLevel;
    yearsExperience: number;
    credentials: string[];               // IDs of relevant credentials
    topics: string[];                    // Specific topics within niche
    verificationSource?: string;         // How was this verified?
}

/**
 * E-E-A-T signals that can be injected into content
 */
export interface EEATSignals {
    // Experience signals
    firstHandPhrases: string[];          // "When I tested...", "In my experience..."
    personalStories: string[];           // Short personal anecdotes
    yearsStatement: string;              // "With 10+ years in..."

    // Expertise signals  
    credentialMentions: string[];        // "As a certified..."
    technicalInsights: string[];         // Domain-specific knowledge

    // Authority signals
    publicationLinks: string[];          // Previous work URLs
    socialProofPhrases: string[];        // "Featured in...", "Trusted by..."

    // Trust signals
    disclosures: string[];               // Affiliate disclaimers, etc.
    updateCommitment: string;            // "I regularly update..."
}

/**
 * Complete Author Profile
 */
export interface AuthorProfile {
    // ─────────────────────────────────────────────────────────────────────────
    // Identity
    // ─────────────────────────────────────────────────────────────────────────
    id: string;                          // UUID
    name: string;                        // Display name
    slug: string;                        // URL-friendly: john-smith
    email?: string;                      // For gravatar, not published

    // ─────────────────────────────────────────────────────────────────────────
    // Public Profile
    // ─────────────────────────────────────────────────────────────────────────
    headline: string;                    // "AI & Machine Learning Expert"
    bio: string;                         // Full biography (HTML allowed)
    shortBio: string;                    // 1-2 sentences for article byline
    avatarUrl?: string;                  // Profile photo URL

    // ─────────────────────────────────────────────────────────────────────────
    // Credentials & Expertise
    // ─────────────────────────────────────────────────────────────────────────
    credentials: AuthorCredential[];
    expertise: AuthorExpertise[];
    primaryNiche: string;                // Main area of focus

    // ─────────────────────────────────────────────────────────────────────────
    // Social & Authority
    // ─────────────────────────────────────────────────────────────────────────
    socialProfiles: SocialProfile[];
    websiteUrl?: string;                 // Personal website
    linkedInUrl?: string;                // For schema.org sameAs

    // ─────────────────────────────────────────────────────────────────────────
    // E-E-A-T Content Signals
    // ─────────────────────────────────────────────────────────────────────────
    eeatSignals: EEATSignals;

    // ─────────────────────────────────────────────────────────────────────────
    // Site Assignments (For multi-site author pool)
    // ─────────────────────────────────────────────────────────────────────────
    assignedSiteIds: string[];           // Which WP sites can use this author
    wpAuthorMappings: WPAuthorMapping[]; // Mapped WP user IDs per site

    // ─────────────────────────────────────────────────────────────────────────
    // Verification
    // ─────────────────────────────────────────────────────────────────────────
    verificationStatus: VerificationStatus;
    verifiedAt?: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────────────────
    articlesPublished: number;
    totalWordCount: number;
    averageEEATScore?: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────
    createdAt: number;
    updatedAt: number;
}

/**
 * Mapping between Ifrit author and WordPress user
 */
export interface WPAuthorMapping {
    siteId: string;                      // WPSite.id
    wpUserId: number;                    // WordPress user ID
    wpUsername: string;                  // WordPress username
    syncedAt: number;                    // Last sync timestamp
}

// ============================================================================
// Author Creation/Update
// ============================================================================

/**
 * Input for creating a new author
 */
export interface CreateAuthorInput {
    name: string;
    headline: string;
    bio: string;
    shortBio: string;
    primaryNiche: string;
    avatarUrl?: string;
    email?: string;
    websiteUrl?: string;
    linkedInUrl?: string;
}

/**
 * Input for updating author
 */
export type UpdateAuthorInput = Partial<Omit<AuthorProfile, 'id' | 'createdAt' | 'updatedAt'>>;

// ============================================================================
// Author Selection & Matching
// ============================================================================

/**
 * Criteria for matching author to content
 */
export interface AuthorMatchCriteria {
    niche: string;
    topics?: string[];
    minExpertiseLevel?: ExpertiseLevel;
    preferredSiteId?: string;
}

/**
 * Result of author matching
 */
export interface AuthorMatchResult {
    author: AuthorProfile;
    matchScore: number;                  // 0-100
    matchReasons: string[];              // Why this author matched
    missingExpertise?: string[];         // Expertise gaps for this topic
}

// ============================================================================
// Schema.org Output
// ============================================================================

/**
 * Author data formatted for schema.org Person
 */
export interface AuthorSchemaData {
    '@type': 'Person';
    name: string;
    url?: string;
    image?: string;
    jobTitle?: string;
    description?: string;
    sameAs?: string[];                   // Social profile URLs
    knowsAbout?: string[];               // Expertise areas
    alumniOf?: {
        '@type': 'Organization';
        name: string;
    }[];
    hasCredential?: {
        '@type': 'EducationalOccupationalCredential';
        name: string;
        credentialCategory?: string;
    }[];
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_EEAT_SIGNALS: EEATSignals = {
    firstHandPhrases: [
        "In my experience,",
        "When I tested this,",
        "After using this for",
        "Having worked with",
        "From my perspective,"
    ],
    personalStories: [],
    yearsStatement: "",
    credentialMentions: [],
    technicalInsights: [],
    publicationLinks: [],
    socialProofPhrases: [],
    disclosures: [
        "This article may contain affiliate links.",
        "I only recommend products I've personally used."
    ],
    updateCommitment: "I regularly update this content to ensure accuracy."
};

export const EXPERTISE_LEVEL_YEARS: Record<ExpertiseLevel, { min: number; max: number }> = {
    beginner: { min: 0, max: 1 },
    intermediate: { min: 1, max: 3 },
    advanced: { min: 3, max: 7 },
    expert: { min: 7, max: 100 }
};

// ============================================================================
// Author Health Score System
// ============================================================================

/**
 * Individual checklist item for author health
 */
export interface AuthorHealthCheckItem {
    id: string;
    label: string;
    description: string;
    category: 'identity' | 'credentials' | 'social' | 'content';
    required: boolean;                   // Required for minimum viable author
    weight: number;                      // Score contribution (0-20)
    completed: boolean;
    actionRequired?: string;             // What user needs to do
    helpUrl?: string;                    // Link to help docs
}

/**
 * Complete Author Health Score
 */
export interface AuthorHealthScore {
    // Overall score
    score: number;                       // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';

    // Breakdown
    identityScore: number;               // Photo, bio, about page
    credentialScore: number;             // Degrees, certs, experience
    socialScore: number;                 // LinkedIn, Twitter, etc.
    contentScore: number;                // Past articles, word count

    // Checklist
    checklist: AuthorHealthCheckItem[];
    completedCount: number;
    totalCount: number;

    // Recommendations
    recommendations: AuthorHealthRecommendation[];

    // Flags
    isMinimumViable: boolean;            // Has all required items
    isEEATReady: boolean;                // Score >= 70
    isRepublishReady: boolean;           // Has social profiles for auto-share
}

/**
 * Actionable recommendation for improving author health
 */
export interface AuthorHealthRecommendation {
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: AuthorHealthCheckItem['category'];
    title: string;
    description: string;
    action: string;                      // e.g., "Add LinkedIn URL"
    impact: string;                      // e.g., "+15 to health score"
    estimatedTime: string;               // e.g., "2 minutes"
}

/**
 * Social profile configuration for republishing
 */
export interface SocialRepublishConfig {
    platform: SocialProfile['platform'];
    enabled: boolean;
    autoRepublish: boolean;              // Auto-share new articles
    urlFormat?: string;                  // Template for social share URL
    hashtagStrategy?: 'niche' | 'trending' | 'custom';
    customHashtags?: string[];
}

/**
 * Extended AuthorProfile with republishing settings
 */
export interface AuthorRepublishSettings {
    authorId: string;
    socialConfigs: SocialRepublishConfig[];
    defaultShareMessage?: string;        // Template with {{title}}, {{url}}
    schedulingEnabled: boolean;
    schedulingDelay?: number;            // Hours after publish to share
}

// ============================================================================
// Health Score Thresholds
// ============================================================================

export const HEALTH_SCORE_THRESHOLDS = {
    grades: {
        A: 90,
        B: 75,
        C: 60,
        D: 40,
        F: 0,
    },
    minimumViable: 40,                   // Minimum to use author
    eeatReady: 70,                       // Good E-E-A-T compliance
    republishReady: 60,                  // Has social profiles configured
};

/**
 * Default health checklist items
 */
export const DEFAULT_HEALTH_CHECKLIST: Omit<AuthorHealthCheckItem, 'completed'>[] = [
    // Identity (25 points)
    {
        id: 'has_photo',
        label: 'Profile Photo',
        description: 'Professional headshot or avatar',
        category: 'identity',
        required: true,
        weight: 10,
        actionRequired: 'Upload a professional photo URL',
    },
    {
        id: 'has_bio_100',
        label: 'Bio (100+ words)',
        description: 'Detailed biography establishing expertise',
        category: 'identity',
        required: true,
        weight: 10,
        actionRequired: 'Write a bio with at least 100 words',
    },
    {
        id: 'has_about_url',
        label: 'About Page URL',
        description: 'Link to author page on website',
        category: 'identity',
        required: false,
        weight: 5,
        actionRequired: 'Create an About page and add the URL',
    },

    // Credentials (30 points)
    {
        id: 'has_credential',
        label: 'At Least 1 Credential',
        description: 'Degree, certification, or professional credential',
        category: 'credentials',
        required: true,
        weight: 15,
        actionRequired: 'Add your most relevant credential',
    },
    {
        id: 'credential_verified',
        label: 'Verified Credential',
        description: 'At least one credential with verification URL',
        category: 'credentials',
        required: false,
        weight: 10,
        actionRequired: 'Add a URL to verify your credential',
    },
    {
        id: 'has_expertise_3',
        label: '3+ Expertise Areas',
        description: 'Define at least 3 areas of expertise',
        category: 'credentials',
        required: false,
        weight: 5,
        actionRequired: 'Add expertise areas relevant to your niche',
    },

    // Social (25 points)
    {
        id: 'has_linkedin',
        label: 'LinkedIn Profile',
        description: 'Professional LinkedIn profile linked',
        category: 'social',
        required: true,
        weight: 10,
        actionRequired: 'Add your LinkedIn profile URL',
    },
    {
        id: 'has_twitter',
        label: 'Twitter/X Profile',
        description: 'Twitter profile for content amplification',
        category: 'social',
        required: false,
        weight: 8,
        actionRequired: 'Add your Twitter profile URL',
    },
    {
        id: 'has_website',
        label: 'Personal Website',
        description: 'Personal or professional website URL',
        category: 'social',
        required: false,
        weight: 7,
        actionRequired: 'Add your personal website URL',
    },

    // Content Track Record (20 points)
    {
        id: 'has_published_5',
        label: '5+ Published Articles',
        description: 'Track record of content creation',
        category: 'content',
        required: false,
        weight: 10,
        actionRequired: 'Publish more articles with this author',
    },
    {
        id: 'avg_eeat_70',
        label: 'Avg E-E-A-T Score ≥70',
        description: 'Consistent quality across articles',
        category: 'content',
        required: false,
        weight: 10,
        actionRequired: 'Improve article quality to raise avg E-E-A-T',
    },
];

