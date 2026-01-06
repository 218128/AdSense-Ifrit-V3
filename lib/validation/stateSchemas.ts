/**
 * State Validation Schemas
 * FSD: lib/validation/stateSchemas.ts
 * 
 * Phase 3: Zod schemas for validating persisted state
 * Ensures data integrity when loading from localStorage/database
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const TimestampSchema = z.number().int().positive();

export const IdSchema = z.string().min(1).regex(/^[a-z]+_\d+_[a-z0-9]+$/i);

// ============================================================================
// Campaign Schemas
// ============================================================================

export const SourceTypeSchema = z.enum([
    'keywords',
    'rss',
    'trends',
    'manual',
    'translation',
]);

export const ArticleTypeSchema = z.enum([
    'how-to',
    'listicle',
    'pillar',
    'cluster',
    'review',
]);

export const CampaignStatusSchema = z.enum([
    'draft',
    'active',
    'paused',
    'completed',
]);

export const AIConfigSchema = z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    targetLength: z.number().int().min(100).max(10000).default(1500),
    articleType: ArticleTypeSchema.default('how-to'),
    useResearch: z.boolean().default(true),
    includeImages: z.boolean().default(true),
    includeFAQ: z.boolean().default(true),
    optimizeForSEO: z.boolean().default(true),
    includeSchema: z.boolean().default(false),
    enableSpinner: z.boolean().default(false),
    spinnerMode: z.enum(['light', 'moderate', 'aggressive']).optional(),
    imagePlacements: z.array(z.enum(['cover', 'inline'])).optional(),
    imageProvider: z.string().optional(),
});

export const ScheduleConfigSchema = z.object({
    type: z.enum(['manual', 'hourly', 'daily', 'weekly']),
    intervalHours: z.number().int().min(1).optional(),
    maxPosts: z.number().int().min(1).default(10),
    nextRunAt: TimestampSchema.optional(),
    lastRunAt: TimestampSchema.optional(),
});

export const CampaignStatsSchema = z.object({
    totalGenerated: z.number().int().min(0).default(0),
    totalPublished: z.number().int().min(0).default(0),
    totalFailed: z.number().int().min(0).default(0),
});

export const CampaignSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100),
    status: CampaignStatusSchema,
    sourceType: SourceTypeSchema,
    targetSiteId: z.string().min(1),
    targetCategoryId: z.number().int().optional(),
    targetAuthorId: z.number().int().optional(),
    postStatus: z.enum(['draft', 'publish', 'pending']).default('draft'),
    aiConfig: AIConfigSchema,
    schedule: ScheduleConfigSchema,
    stats: CampaignStatsSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
});

// ============================================================================
// WordPress Site Schemas
// ============================================================================

export const WPConnectionStatusSchema = z.enum([
    'untested',
    'connected',
    'failed',
    'timeout',
]);

export const AdSenseStatusSchema = z.enum([
    'not-applied',
    'pending',
    'approved',
    'rejected',
]);

export const WPSiteProfileDataSchema = z.object({
    niche: z.string(),
    primaryKeywords: z.array(z.string()),
    secondaryKeywords: z.array(z.string()),
    questionKeywords: z.array(z.string()),
    suggestedTopics: z.array(z.string()),
    notes: z.string().optional(),
    sourceDomain: z.string(),
    loadedFromHuntAt: TimestampSchema,
}).optional();

export const WPSiteSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100),
    url: z.string().url(),
    username: z.string().min(1),
    appPassword: z.string().min(1),
    niche: z.string().optional(),
    connectionStatus: WPConnectionStatusSchema.default('untested'),
    adsenseStatus: AdSenseStatusSchema.default('not-applied'),
    articleCount: z.number().int().min(0).default(0),
    publishedArticleCount: z.number().int().min(0).default(0),
    hasAboutPage: z.boolean().default(false),
    hasContactPage: z.boolean().default(false),
    hasPrivacyPolicy: z.boolean().default(false),
    hasTermsOfService: z.boolean().default(false),
    hasDisclaimer: z.boolean().default(false),
    profileData: WPSiteProfileDataSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
});

// ============================================================================
// Hunt Schemas
// ============================================================================

export const ProfileStatusSchema = z.enum([
    'pending',
    'generating',
    'success',
    'failed',
]);

export const DomainProfileSchema = z.object({
    niche: z.string().optional(),
    primaryKeywords: z.array(z.string()).optional(),
    secondaryKeywords: z.array(z.string()).optional(),
    questionKeywords: z.array(z.string()).optional(),
    suggestedTopics: z.array(z.string()).optional(),
    notes: z.string().optional(),
});

export const OwnedDomainSchema = z.object({
    domain: z.string().min(1),
    tld: z.string().min(1),
    score: z.number().min(0).max(100),
    estimatedValue: z.number().min(0).optional(),
    purchasedAt: TimestampSchema,
    profileStatus: ProfileStatusSchema,
    profile: DomainProfileSchema.optional(),
    profileError: z.string().optional(),
    associatedKeywords: z.array(z.string()),
    associatedTrends: z.array(z.string()),
    siteCreated: z.boolean().optional(),
});

// ============================================================================
// Store State Schemas
// ============================================================================

export const CampaignStoreStateSchema = z.object({
    campaigns: z.array(CampaignSchema),
    runHistory: z.array(z.object({
        id: z.string(),
        campaignId: z.string(),
        startedAt: TimestampSchema,
        completedAt: TimestampSchema.optional(),
        status: z.enum(['running', 'completed', 'failed', 'partial']),
        postsGenerated: z.number().int().min(0),
        postsPublished: z.number().int().min(0),
        errors: z.array(z.object({
            stage: z.string(),
            message: z.string(),
            timestamp: TimestampSchema,
        })),
    })),
    activeCampaignId: z.string().nullable(),
});

export const WPSitesStoreStateSchema = z.object({
    sites: z.record(z.string(), WPSiteSchema),
    articles: z.record(z.string(), z.array(z.any())), // Articles are more flexible
    activeSiteId: z.string().nullable(),
    activeArticleId: z.string().nullable(),
});

export const HuntStoreStateSchema = z.object({
    ownedDomains: z.array(OwnedDomainSchema),
    analyzeQueue: z.array(z.any()), // Flexible queue items
    purchaseQueue: z.array(z.any()),
    watchlist: z.array(z.any()),
});

// ============================================================================
// Validation Utilities
// ============================================================================

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: z.ZodError };

/**
 * Safely parse and validate data
 */
export function validateState<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): ValidationResult<T> {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

/**
 * Parse with defaults for missing fields
 */
export function parseWithDefaults<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    fallback: T
): T {
    const result = schema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    console.warn('[Validation] Using fallback due to validation errors:', result.error.issues);
    return fallback;
}

/**
 * Get human-readable validation errors
 */
export function formatValidationErrors(error: z.ZodError): string[] {
    return error.issues.map(issue => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
    });
}

/**
 * Validate persisted localStorage state before loading
 */
export function validatePersistedState<T>(
    key: string,
    schema: z.ZodSchema<T>,
    fallback: T
): T {
    if (typeof window === 'undefined') return fallback;

    try {
        const stored = localStorage.getItem(key);
        if (!stored) return fallback;

        const parsed = JSON.parse(stored);
        const stateData = parsed?.state || parsed;

        const result = schema.safeParse(stateData);
        if (result.success) {
            return result.data;
        }

        console.warn(`[Validation] Invalid state for ${key}:`,
            formatValidationErrors(result.error));
        return fallback;
    } catch (error) {
        console.warn(`[Validation] Failed to parse ${key}:`, error);
        return fallback;
    }
}
