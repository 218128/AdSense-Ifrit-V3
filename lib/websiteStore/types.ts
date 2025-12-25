/**
 * Website Store Types
 * 
 * All TypeScript interfaces and types for the website data layer.
 * Extracted from websiteStore.ts for better modularity.
 */

// ============================================
// CORE TYPES
// ============================================

export type TemplateId = 'niche-authority' | 'topical-magazine' | 'expert-hub';
export type WebsiteStatus = 'setup' | 'building' | 'live' | 'error' | 'pending-deploy';

export interface TemplateInfo {
    id: TemplateId;
    version: string;           // e.g., "1.2.0"
    installedAt: number;
    upgradeAvailable?: string; // Next available version
}

export interface ProviderUsage {
    provider: string;           // 'gemini', 'deepseek', 'openai', 'manual'
    model?: string;             // 'gemini-2.0-flash', 'deepseek-chat', etc.
    articlesGenerated: number;
    firstUsedAt: number;
    lastUsedAt: number;
}

export interface AIFingerprint {
    providers: string[];             // All providers ever used (summary)
    providerHistory: ProviderUsage[]; // Detailed usage history
    contentStrategy: string;         // '40-40-20' (TOFU-Tactical-Seasonal) or 'unknown'
    eeatScore?: number;              // 0-100, calculated by analyzer
    aiOverviewScore?: number;        // 0-100, calculated by analyzer
    eeatEnabled: boolean;            // Detected or manually set
    aiOverviewOptimized: boolean;    // Detected or manually set
    lastAnalyzedAt?: number;         // When analysis was run
    analysisSource?: 'in-app' | 'external-ai' | 'manual';  // How scores were obtained
    generatedAt: number;
    articleTemplatesUsed: string[];
}

export interface DeploymentInfo {
    githubRepo: string;
    githubOwner: string;
    vercelProject: string;
    liveUrl: string;
    lastDeployAt?: number;
    lastDeployCommit?: string;
    pendingChanges: number;    // Local changes not yet deployed
}

export interface WebsiteStats {
    articlesCount: number;
    totalWords: number;
    lastPublishedAt?: number;
    estimatedMonthlyRevenue: number;
}

export interface WebsiteVersion {
    version: string;           // Site version (auto-incremented)
    templateVersion: string;   // Template version at this point
    deployedAt: number;
    commitSha: string;
    changes: string[];         // Changelog entries
    canRollback: boolean;
}

export interface ContentCompatibilityWarning {
    type: 'missing_category' | 'orphaned_article' | 'schema_mismatch';
    description: string;
    affectedItems: string[];
    suggestedAction: string;
}

export interface Website {
    id: string;
    domain: string;
    name: string;
    niche: string;

    template: TemplateInfo;
    fingerprint: AIFingerprint;
    deployment: DeploymentInfo;
    stats: WebsiteStats;

    versions: WebsiteVersion[];

    author: {
        name: string;
        role: string;
        experience?: string;
        bio?: string;
    };

    status: WebsiteStatus;
    createdAt: number;
    updatedAt: number;
}

// ============================================
// ARTICLE TYPES
// ============================================

export interface CoverImage {
    url: string;               // Local path: /images/[slug]/cover/cover.webp
    alt: string;
    width?: number;
    height?: number;
    source: 'unsplash' | 'pexels' | 'manual';
    attribution?: string;      // "Photo by X on Unsplash"
    originalUrl?: string;      // Original URL before download
}

export interface ContentImage {
    id: string;
    url: string;               // /images/[slug]/images/img-001.webp
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
    source: 'unsplash' | 'pexels' | 'manual';
}

export interface Article {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;

    category: string;
    tags: string[];

    // Images
    coverImage?: CoverImage;
    contentImages?: ContentImage[];

    // Metadata
    contentType: string;       // 'tofu', 'tactical', 'seasonal', etc.
    wordCount: number;
    readingTime: number;

    // Page type differentiation
    pageType: 'article' | 'structural' | 'homepage';
    structuralType?: 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer';

    // E-E-A-T signals
    eeatSignals: string[];
    aiOverviewBlocks: string[];

    // Generation info (detailed AI tracking)
    aiGeneration?: {
        provider: string;       // 'gemini', 'deepseek', 'openai', 'manual'
        model?: string;         // 'gemini-2.0-flash', etc.
        generatedAt: number;
        promptVersion?: string; // For tracking prompt changes
        regeneratedFrom?: string; // Previous article ID if regenerated
    };
    generatedBy?: string;       // Legacy: AI provider name (for backwards compat)
    generatedAt?: number;       // Legacy: timestamp
    isExternal: boolean;        // True if uploaded by user
    source: 'ai-generated' | 'external' | 'github-sync' | 'manual';  // Origin of article

    // Publishing
    status: 'draft' | 'ready' | 'published';
    publishedAt?: number;
    lastModifiedAt: number;

    // SEO
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;

    // Version history (last 10 versions kept)
    versions?: ArticleVersion[];
}

export interface ArticleVersion {
    id: string;                 // ver_timestamp
    content: string;            // Snapshot of content at this version
    title: string;              // Title at this version
    savedAt: number;            // Timestamp
    reason: 'auto' | 'manual' | 'before-ai-refine' | 'before-edit';
    wordCount: number;
}

// Structural page type helper
export type StructuralPageType = 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer';

// ============================================
// THEME TYPES
// ============================================

export interface ThemeConfig {
    globals: string;           // Main globals.css content
    variables: {               // Parsed CSS variables for easy editing
        primaryColor: string;
        secondaryColor: string;
        bgColor: string;
        textColor: string;
        fontFamily?: string;
    };
    custom?: string;           // User custom CSS (never touched by system)
    lastModifiedAt: number;
}

export interface ThemeVersion {
    id: string;
    globals: string;
    variables: ThemeConfig['variables'];
    savedAt: number;
    reason: 'auto' | 'manual' | 'before-edit' | 'before-deploy';
}

// ============================================
// PENDING CHANGES
// ============================================

export interface PendingChanges {
    hasChanges: boolean;           // Quick check if anything pending
    theme: boolean;                // Local theme differs from deployed
    articles: string[];            // IDs of unpublished articles
    pages: string[];               // IDs of changed pages
    plugins: boolean;              // Local plugins not yet deployed
    template: boolean;             // Template version differs
    summary: {                     // For display
        themeLabel: string | null;
        articlesLabel: string | null;
        pagesLabel: string | null;
        pluginsLabel: string | null;
        templateLabel: string | null;
    };
}

// ============================================
// DOMAIN PROFILE (Hunt → Website Transfer)
// ============================================

export interface DomainProfile {
    domain: string;
    niche: string;
    purchaseType: 'internal' | 'external';
    purchasedAt: number;

    // Deep Analysis Results
    deepAnalysis: {
        score: {
            overall: number;
            authority: number;
            trustworthiness: number;
            relevance: number;
            emailPotential: number;
            flipPotential: number;
            nameQuality: number;
        };
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        recommendation: 'strong-buy' | 'buy' | 'consider' | 'avoid';
        estimatedValue: number;
        estimatedMonthlyRevenue: number;

        wayback: {
            hasHistory: boolean;
            firstCaptureDate?: string;
            lastCaptureDate?: string;
            totalCaptures?: number;
            wasAdult?: boolean;
            wasCasino?: boolean;
            wasPBN?: boolean;
            hadSpam?: boolean;
        };

        risks: Array<{
            type: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            description: string;
        }>;

        trust: {
            trustworthy: boolean;
            score: number;
            positives: string[];
            negatives: string[];
        };

        analyzedAt: number;
    };

    // Keyword Analysis Results
    keywordAnalysis: {
        sourceKeywords: string[];

        analysisResults: Array<{
            keyword: string;
            searchVolume: number;
            cpc: number;
            competition: 'low' | 'medium' | 'high';
            difficulty: number;
            opportunity: number;
            potentialTraffic: number;
            relatedKeywords: string[];
        }>;

        primaryKeywords: string[];
        secondaryKeywords: string[];
        questionKeywords: string[];
        totalSearchVolume: number;
        averageCPC: number;

        analyzedAt: number;
    };

    // AI Generated Niche/Keywords
    aiNiche: {
        niche: string;
        suggestedTopics: string[];
        primaryKeywords: string[];
        contentAngles: string[];
        targetAudience: string;
        monetizationStrategy: string;

        generatedBy: 'gemini' | 'deepseek' | 'manual';
        generatedAt: number;
    };

    // Legacy fields (kept for backward compat)
    primaryKeywords: string[];
    secondaryKeywords: string[];
    questionKeywords: string[];
    competitorUrls: string[];
    contentGaps: string[];
    trafficPotential: number;
    difficultyScore: number;
    suggestedTopics: string[];
    suggestedCategories: string[];

    // Metadata
    researchedAt: number;
    notes: string;

    // Status
    transferredToWebsite: boolean;
    websiteCreatedAt?: number;
}
