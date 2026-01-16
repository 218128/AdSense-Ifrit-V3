/**
 * WP Sites Type Definitions
 * FSD: features/wordpress/model/wpSiteTypes.ts
 * 
 * Clean data model for WordPress Sites (separate from Legacy Websites).
 * Designed for AdSense-ready WordPress sites with Hostinger integration.
 */

// ============================================================================
// WP Site Entity
// ============================================================================

/**
 * WordPress site type for stack recommendations
 */
export type WPSiteType = 'authority' | 'affiliate' | 'magazine' | 'business' | 'general';

/**
 * AdSense application status
 */
export type AdsenseStatus = 'not-applied' | 'pending' | 'approved' | 'rejected';

/**
 * Site connection status
 */
export type WPConnectionStatus = 'connected' | 'error' | 'pending' | 'provisioning';

/**
 * Hosting provider
 */
export type HostingProvider = 'hostinger' | 'bluehost' | 'siteground' | 'wpengine' | 'other';

/**
 * WordPress Site - Full entity with all fields for AdSense success
 * 
 * This type extends the base WPSite with additional AdSense and Hostinger fields.
 * All new fields are OPTIONAL to maintain backward compatibility with existing data.
 */
export interface WPSite {
    // ─────────────────────────────────────────────────────────────────────────
    // Identity (Core fields from legacy)
    // ─────────────────────────────────────────────────────────────────────────
    id: string;                          // UUID
    name: string;                        // Display name
    url: string;                         // Full URL with https://
    domain?: string;                     // Domain extracted from URL (e.g., "example.com")
    niche?: string;                      // Topic area (optional for migration)
    siteType?: WPSiteType;               // Site type for recommendations

    // ─────────────────────────────────────────────────────────────────────────
    // Credentials
    // ─────────────────────────────────────────────────────────────────────────
    username: string;                    // WP admin username
    appPassword: string;                 // WP Application Password (encrypted)

    // ─────────────────────────────────────────────────────────────────────────
    // Connection Status
    // ─────────────────────────────────────────────────────────────────────────
    status: WPConnectionStatus;
    lastError?: string;                  // Last error message
    lastCheckedAt?: number;              // Last connection test timestamp

    // ─────────────────────────────────────────────────────────────────────────
    // AdSense Readiness (all optional for backward compat)
    // ─────────────────────────────────────────────────────────────────────────
    adsenseStatus?: AdsenseStatus;
    adsensePublisherId?: string;         // pub-XXXXXXXXXX
    adsTxtConfigured?: boolean;          // ads.txt present and valid
    sslEnabled?: boolean;                // HTTPS enabled

    // ─────────────────────────────────────────────────────────────────────────
    // Content Stats (for AdSense approval - need 15+ articles)
    // ─────────────────────────────────────────────────────────────────────────
    articleCount?: number;               // Total posts
    publishedArticleCount?: number;      // Published posts
    totalWordCount?: number;             // Approximate total words

    // ─────────────────────────────────────────────────────────────────────────
    // Essential Pages (Required for AdSense) - all optional for migration
    // ─────────────────────────────────────────────────────────────────────────
    hasAboutPage?: boolean;
    hasContactPage?: boolean;
    hasPrivacyPolicy?: boolean;
    hasTermsOfService?: boolean;
    hasDisclaimer?: boolean;

    // ─────────────────────────────────────────────────────────────────────────
    // Theme & Plugins (SEO + Ads plugins required for success)
    // ─────────────────────────────────────────────────────────────────────────
    activeTheme?: WPTheme;
    installedPlugins?: WPPlugin[];
    seoPluginActive?: boolean;           // Rank Math/Yoast detected
    adsPluginActive?: boolean;           // Ad Inserter/etc detected
    cachePluginActive?: boolean;         // Speed plugin detected

    // ─────────────────────────────────────────────────────────────────────────
    // Synced WordPress Data
    // ─────────────────────────────────────────────────────────────────────────
    categories?: WPCategory[];
    tags?: WPTag[];
    authors?: WPAuthor[];
    syncedAt?: number;                   // Last sync timestamp

    // ─────────────────────────────────────────────────────────────────────────
    // Hostinger Integration (optional)
    // ─────────────────────────────────────────────────────────────────────────
    hostingProvider?: HostingProvider;
    hostingerAccountId?: string;         // Hostinger order ID for MCP
    hostingerSubscriptionId?: string;    // Subscription ID for API calls
    provisionedVia?: 'hostinger-mcp' | 'manual';

    // ─────────────────────────────────────────────────────────────────────────
    // Hunt Profile Data (Artifact loaded from Hunt feature)
    // WP Sites OWNS this copy - can enrich with additional data over time
    // ─────────────────────────────────────────────────────────────────────────
    profileData?: {
        // Initial data from Hunt Profile Artifact
        niche: string;
        primaryKeywords: string[];
        secondaryKeywords: string[];
        questionKeywords: string[];
        suggestedTopics: string[];
        notes?: string;

        // Artifact source tracking
        sourceDomain: string;              // Domain the profile was generated for
        loadedFromHuntAt: number;          // When artifact was loaded
        lastEnrichedAt?: number;           // When WP Sites enriched with more data

        // Future: Additional enrichment data
        enrichedKeywords?: string[];       // Keywords added by WP Sites capabilities
        enrichedTopics?: string[];         // Topics added by research
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Ifrit Plugin Integration
    // ─────────────────────────────────────────────────────────────────────────
    ifritPluginActive?: boolean;          // ifrit-connector plugin detected
    ifritPluginVersion?: string;          // Plugin version
    ifritToken?: string;                  // API token for ifrit-connector (encrypted)
    ifritWebhookConfigured?: boolean;     // Webhook URL set in plugin

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// WP Article Entity
// ============================================================================

/**
 * Article source type
 */
export type ArticleSource = 'ai-generated' | 'manual' | 'imported' | 'campaign';

/**
 * Local article status (before WP sync)
 */
export type LocalArticleStatus = 'draft' | 'ready' | 'publishing' | 'published' | 'failed';

/**
 * WordPress post status
 */
export type WPPostStatus = 'publish' | 'draft' | 'pending' | 'private' | 'future';

/**
 * Schema.org type for structured data
 */
export type SchemaType = 'Article' | 'FAQPage' | 'HowTo' | 'Review' | 'Product';

/**
 * WordPress Article - Content for publishing to WP sites
 */
export interface WPArticle {
    // ─────────────────────────────────────────────────────────────────────────
    // Identity
    // ─────────────────────────────────────────────────────────────────────────
    id: string;                          // Local UUID
    siteId: string;                      // FK to WPSite.id
    wpPostId?: number;                   // WP post ID after publish
    wpPostUrl?: string;                  // Live URL

    // ─────────────────────────────────────────────────────────────────────────
    // Content
    // ─────────────────────────────────────────────────────────────────────────
    title: string;
    content: string;                     // HTML content
    excerpt?: string;
    slug?: string;                       // URL slug

    // ─────────────────────────────────────────────────────────────────────────
    // Taxonomy
    // ─────────────────────────────────────────────────────────────────────────
    categoryId?: number;                 // WP category ID
    categoryName?: string;               // Category name (for display)
    tagIds?: number[];                   // WP tag IDs
    authorId?: number;                   // WP author ID

    // ─────────────────────────────────────────────────────────────────────────
    // Media
    // ─────────────────────────────────────────────────────────────────────────
    featuredImageId?: number;            // WP media ID
    featuredImageUrl?: string;           // Image URL
    inlineImages?: WPMediaReference[];

    // ─────────────────────────────────────────────────────────────────────────
    // SEO
    // ─────────────────────────────────────────────────────────────────────────
    metaTitle?: string;                  // SEO title (for Rank Math/Yoast)
    metaDescription?: string;            // SEO description
    focusKeyword?: string;               // Primary keyword
    schemaType?: SchemaType;             // Schema.org type
    schemaData?: Record<string, unknown>; // Full schema JSON

    // ─────────────────────────────────────────────────────────────────────────
    // Generation & Humanization
    // ─────────────────────────────────────────────────────────────────────────
    source: ArticleSource;
    aiProvider?: string;                 // 'gemini' | 'deepseek' | etc
    aiModel?: string;                    // Specific model used
    wordCount: number;
    readingTimeMinutes?: number;

    // Humanization settings applied
    humanizationApplied?: boolean;
    humanizationConfig?: HumanizationConfig;

    // ─────────────────────────────────────────────────────────────────────────
    // Status
    // ─────────────────────────────────────────────────────────────────────────
    localStatus: LocalArticleStatus;
    wpStatus?: WPPostStatus;
    publishedAt?: number;
    lastPublishError?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// Humanization Configuration
// ============================================================================

/**
 * Humanization intensity level
 */
export type HumanizationIntensity = 'light' | 'moderate' | 'heavy';

/**
 * Humanization configuration for making AI content more human-like
 */
export interface HumanizationConfig {
    // AI Pattern Removal
    removeAIPatterns: boolean;           // Remove "Certainly", "Indeed", etc.
    addContractions: boolean;            // "It is" → "It's"

    // Human Touch
    addConversationalHooks: boolean;     // "Here's the thing:", "Let me explain"
    varySentenceLength: boolean;         // Break long sentences, vary structure
    injectOpinions: boolean;             // "In my experience", "I recommend"

    // Intensity
    intensityLevel: HumanizationIntensity;

    // E-E-A-T Enhancement
    addEEATSignals: boolean;             // Experience, Expertise, Authority, Trust
    authorName?: string;
    authorCredentials?: string;
    yearsExperience?: number;
    addFirstHandExperience?: boolean;    // "When I tested...", "After using..."
}

/**
 * Default humanization configuration
 */
export const DEFAULT_HUMANIZATION_CONFIG: HumanizationConfig = {
    removeAIPatterns: true,
    addContractions: true,
    addConversationalHooks: true,
    varySentenceLength: true,
    injectOpinions: true,
    intensityLevel: 'moderate',
    addEEATSignals: true,
    addFirstHandExperience: true,
};

// ============================================================================
// WP Site Configuration (Setup/Provisioning)
// ============================================================================

/**
 * Configuration for creating/setting up a new WP site
 */
export interface WPSiteConfig {
    // ─────────────────────────────────────────────────────────────────────────
    // Basic
    // ─────────────────────────────────────────────────────────────────────────
    siteType: WPSiteType;
    niche: string;
    targetAudience: string;

    // ─────────────────────────────────────────────────────────────────────────
    // Branding
    // ─────────────────────────────────────────────────────────────────────────
    siteName: string;
    tagline?: string;
    logoUrl?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // Author
    // ─────────────────────────────────────────────────────────────────────────
    authorName: string;
    authorRole?: string;
    authorBio?: string;
    authorCredentials?: string[];

    // ─────────────────────────────────────────────────────────────────────────
    // Content Strategy
    // ─────────────────────────────────────────────────────────────────────────
    contentPillars?: string[];           // Main topic categories
    targetArticleCount?: number;         // Goal (min 15 for AdSense)
    articleTypes?: ('pillar' | 'how-to' | 'listicle' | 'review' | 'comparison')[];

    // ─────────────────────────────────────────────────────────────────────────
    // Theme & Plugins
    // ─────────────────────────────────────────────────────────────────────────
    recommendedTheme?: string;
    recommendedPlugins?: string[];

    // ─────────────────────────────────────────────────────────────────────────
    // Humanization Defaults
    // ─────────────────────────────────────────────────────────────────────────
    defaultHumanization?: HumanizationConfig;

    // ─────────────────────────────────────────────────────────────────────────
    // Hostinger Provisioning
    // ─────────────────────────────────────────────────────────────────────────
    hostingerOrderId?: string;           // Existing order to use
    autoProvision?: boolean;             // Auto-provision via Hostinger MCP
}

// ============================================================================
// Supporting Types (WordPress API)
// ============================================================================

export interface WPTheme {
    name: string;
    displayName?: string;
    version?: string;
    active: boolean;
    adsenseOptimized?: boolean;
}

export interface WPPlugin {
    name: string;
    slug: string;
    status: 'active' | 'inactive' | 'not-installed';
    category: 'seo' | 'ads' | 'speed' | 'security' | 'other';
    recommended?: boolean;
}

export interface WPCategory {
    id: number;
    name: string;
    slug: string;
    parent?: number;
    count?: number;
}

export interface WPTag {
    id: number;
    name: string;
    slug: string;
    count?: number;
}

export interface WPAuthor {
    id: number;
    name: string;
    slug: string;
    avatar_urls?: Record<string, string>;
}

export interface WPMediaReference {
    id: number;
    url: string;
    alt?: string;
    caption?: string;
}

// ============================================================================
// AdSense Readiness Types
// ============================================================================

/**
 * Individual check in AdSense readiness report
 */
export interface AdSenseCheck {
    name: string;
    passed: boolean;
    message: string;
    required: boolean;
}

/**
 * Complete AdSense readiness report
 */
export interface AdSenseReadinessReport {
    ready: boolean;
    score: number;                       // 0-100
    checks: {
        // Content Requirements
        hasMinimumArticles: boolean;     // ≥15 articles
        articleWordCountOk: boolean;     // 500-1500+ words avg
        hasOriginalContent: boolean;

        // Essential Pages
        hasAboutPage: boolean;
        hasContactPage: boolean;
        hasPrivacyPolicy: boolean;
        hasTermsOfService: boolean;

        // Technical
        sslEnabled: boolean;
        mobileResponsive: boolean;
        fastLoadSpeed: boolean;

        // SEO
        seoPluginActive: boolean;
        hasXmlSitemap: boolean;

        // Compliance
        adsTxtReady: boolean;
    };
    recommendations: string[];
}

// ============================================================================
// Hostinger MCP Types
// ============================================================================

/**
 * Hostinger hosting order
 */
export interface HostingerOrder {
    id: string;
    subscriptionId: string;
    domain?: string;
    status: 'active' | 'pending' | 'suspended';
    plan: string;
    expiresAt?: number;
}

/**
 * Hostinger site provision request
 */
export interface HostingerProvisionRequest {
    orderId: string;
    domain: string;
    wpAdminUsername: string;
    wpAdminPassword: string;
    wpAdminEmail: string;
    siteTitle: string;
    autoInstallPlugins?: string[];       // Plugin slugs to auto-install
    autoInstallTheme?: string;           // Theme slug to install
}

/**
 * Hostinger provision result
 */
export interface HostingerProvisionResult {
    success: boolean;
    siteUrl?: string;
    wpAdminUrl?: string;
    error?: string;
    steps: {
        step: string;
        status: 'pending' | 'in-progress' | 'completed' | 'failed';
        message?: string;
    }[];
}
