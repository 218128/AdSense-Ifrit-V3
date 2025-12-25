/**
 * Configuration Schemas - Zod validation for Settings
 * 
 * Validates all configuration before it's stored.
 * Part of the Enterprise Configuration Hub.
 */

import { z } from 'zod';

// ============ API KEY SCHEMAS ============

export const StoredKeySchema = z.object({
    key: z.string().min(10, 'API key must be at least 10 characters'),
    label: z.string().optional(),
    validated: z.boolean().default(false),
    validatedAt: z.number().optional(),
});

export type StoredKeyInput = z.input<typeof StoredKeySchema>;

// Provider IDs
export const ProviderIdSchema = z.enum(['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

// ============ INTEGRATION SCHEMAS ============

export const IntegrationsSchema = z.object({
    githubToken: z.string(),
    githubUser: z.string(),
    vercelToken: z.string(),
    vercelUser: z.string(),
    spamzillaKey: z.string(),
    namecheapUser: z.string(),
    namecheapKey: z.string(),
    unsplashKey: z.string(),
    pexelsKey: z.string(),
});

export type IntegrationsInput = z.input<typeof IntegrationsSchema>;

// ============ ADSENSE SCHEMAS ============

export const AdsenseConfigSchema = z.object({
    publisherId: z.string().regex(/^(ca-pub-\d+)?$/, 'Invalid AdSense publisher ID format').or(z.literal('')),
    leaderboardSlot: z.string(),
    articleSlot: z.string(),
    multiplexSlot: z.string(),
});

export type AdsenseConfigInput = z.input<typeof AdsenseConfigSchema>;

// ============ MCP SCHEMAS ============

export const MCPServerConfigSchema = z.object({
    enabled: z.array(z.string()),
    apiKeys: z.record(z.string(), z.string()),
});

export type MCPServerConfigInput = z.input<typeof MCPServerConfigSchema>;

// ============ VALIDATION UTILITIES ============

export interface ValidationResult<T> {
    valid: boolean;
    data?: T;
    errors: ValidationError[];
}

export interface ValidationError {
    path: string;
    message: string;
}

/**
 * Validate data against a Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    const result = schema.safeParse(data);

    if (result.success) {
        return {
            valid: true,
            data: result.data,
            errors: [],
        };
    }

    return {
        valid: false,
        errors: result.error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message,
        })),
    };
}

/**
 * Validate a stored key
 */
export function validateStoredKey(key: unknown): ValidationResult<z.infer<typeof StoredKeySchema>> {
    return validate(StoredKeySchema, key);
}

/**
 * Validate an API key string (quick check)
 */
export function isValidApiKeyFormat(key: string): boolean {
    // Basic checks: not empty, reasonable length, no whitespace
    return (
        typeof key === 'string' &&
        key.length >= 10 &&
        key.length <= 200 &&
        !/\s/.test(key)
    );
}

/**
 * Validate AdSense publisher ID format
 */
export function isValidAdsensePublisherId(id: string): boolean {
    if (!id) return true; // Empty is valid (not configured)
    return /^ca-pub-\d+$/.test(id);
}

/**
 * Validate GitHub token format
 */
export function isValidGitHubToken(token: string): boolean {
    if (!token) return true; // Empty is valid (not configured)
    // GitHub tokens start with 'ghp_', 'gho_', 'ghu_', 'ghs_', or 'ghr_'
    return /^(ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36,}$/.test(token) ||
        // Or classic tokens (40 hex chars)
        /^[a-f0-9]{40}$/i.test(token);
}

/**
 * Validate Vercel token format
 */
export function isValidVercelToken(token: string): boolean {
    if (!token) return true; // Empty is valid (not configured)
    // Vercel tokens are typically 24+ characters
    return token.length >= 24;
}
