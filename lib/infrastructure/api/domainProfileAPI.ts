/**
 * Domain Profile Infrastructure API
 * 
 * Following the architecture pattern from keywords_capabilities_architecture.md:
 * - Calls the unified capability system
 * - Normalizes snake_case → camelCase responses
 * - Handles result.data and result.text fallback
 */

import type { DomainProfile } from '@/lib/domains/types';

// ============================================
// Types
// ============================================

export interface GenerateProfileOptions {
    /** Session ID for SSE status streaming */
    sessionId?: string;
    /** SpamZilla metrics if available */
    spamzillaData?: {
        trustFlow?: number;
        citationFlow?: number;
        domainAuthority?: number;
        age?: number;
        szScore?: number;
        majesticTopics?: string;
    };
    /** Keyword context from Keyword Hunter */
    keywordContext?: {
        keywords: string[];
        research: Record<string, string[]>;
        niche?: string;
        enrichment?: Record<string, unknown>;
    };
    /** Domain score from analysis */
    domainScore?: {
        overall: number;
        recommendation: string;
        risks: Array<{ description: string }>;
    };
}

export interface ProfileGenerateResult {
    success: boolean;
    profile?: DomainProfile;
    error?: string;
}

// ============================================
// Raw AI Response Type (snake_case from AI)
// ============================================

interface RawAIProfileResponse {
    // snake_case versions (AI returns these)
    niche?: string;
    primary_keywords?: string[];
    secondary_keywords?: string[];
    question_keywords?: string[];
    suggested_topics?: string[];
    // camelCase versions (sometimes AI uses these)
    primaryKeywords?: string[];
    secondaryKeywords?: string[];
    questionKeywords?: string[];
    suggestedTopics?: string[];
}

// ============================================
// Normalization (snake_case → camelCase)
// ============================================

/**
 * Normalize AI response to TypeScript interface
 * Handles both snake_case and camelCase field names
 */
function normalizeProfileResponse(
    domain: string,
    raw: RawAIProfileResponse
): DomainProfile {
    return {
        domain,
        niche: String(raw.niche || 'General'),
        primaryKeywords: Array.isArray(raw.primary_keywords)
            ? raw.primary_keywords
            : Array.isArray(raw.primaryKeywords)
                ? raw.primaryKeywords
                : [],
        secondaryKeywords: Array.isArray(raw.secondary_keywords)
            ? raw.secondary_keywords
            : Array.isArray(raw.secondaryKeywords)
                ? raw.secondaryKeywords
                : [],
        questionKeywords: Array.isArray(raw.question_keywords)
            ? raw.question_keywords
            : Array.isArray(raw.questionKeywords)
                ? raw.questionKeywords
                : [],
        suggestedTopics: Array.isArray(raw.suggested_topics)
            ? raw.suggested_topics
            : Array.isArray(raw.suggestedTopics)
                ? raw.suggestedTopics
                : [],
        researchedAt: Date.now(),
    };
}

// ============================================
// API Function
// ============================================

/**
 * Generate a domain profile using AI capabilities
 * 
 * @param domain - Domain name to analyze
 * @param options - Configuration including API key and context
 * @returns Normalized domain profile
 */
export async function generateDomainProfile(
    domain: string,
    options: GenerateProfileOptions = {}
): Promise<ProfileGenerateResult> {
    try {
        // Get API key using standard capability pattern
        const { getCapabilityKey } = await import('@/lib/ai/utils');
        const apiKey = await getCapabilityKey();

        const response = await fetch('/api/domain-profiles/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain,
                sessionId: options.sessionId,
                spamzillaData: options.spamzillaData,
                keywordContext: options.keywordContext,
                domainScore: options.domainScore,
                apiKey, // Pass API key to route (same pattern as /api/capabilities)
                saveProfile: true,  // Save to file for WP Sites access
            }),
        });

        const result = await response.json();

        if (!result.success) {
            console.error('[DomainProfileAPI] Generation failed:', result.error);
            return { success: false, error: result.error };
        }

        // Normalize the profile response (snake_case → camelCase)
        const normalized = normalizeProfileResponse(domain, result.profile || result.aiResult || {});

        console.log('[DomainProfileAPI] Profile generated and normalized for:', domain);

        return {
            success: true,
            profile: normalized,
        };
    } catch (error) {
        console.error('[DomainProfileAPI] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Save a domain profile to storage
 */
export async function saveDomainProfile(profile: DomainProfile): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/domain-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile),
        });

        return response.json();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
