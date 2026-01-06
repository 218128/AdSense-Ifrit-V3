/**
 * Hunt Service - Business Logic Layer
 * FSD: features/hunt/lib/huntService.ts
 * 
 * Extracted from huntStore.ts to follow Separation of Concerns.
 * Contains all async operations and business logic for Hunt feature.
 * 
 * Pattern:
 * - Service handles: API calls, data transformation, orchestration
 * - Store handles: Pure state management (get/set only)
 */

import type { DomainProfile } from '@/lib/domains/types';
import type { QueuedDomain, OwnedDomain, ProfileStatus } from '../model/huntStore';

// ============================================================================
// Types
// ============================================================================

export interface ProfileGenerationResult {
    success: boolean;
    profile?: DomainProfile;
    error?: string;
}

export interface DomainPurchaseContext {
    spamzillaData?: {
        trustFlow?: number;
        citationFlow?: number;
        domainAuthority?: number;
        age?: number;
        majesticTopics?: string;
    };
    keywordContext?: {
        keywords: string[];
        research: Record<string, string[]>;
        niche?: string;
    };
}

// ============================================================================
// Profile Generation Service
// ============================================================================

/**
 * Generate a domain profile using AI analysis.
 * Pure async function - no store interaction.
 * 
 * @param domainName - The domain to generate profile for
 * @param context - Optional enrichment data from Spamzilla/keywords
 * @returns Profile generation result
 */
export async function generateDomainProfileAsync(
    domainName: string,
    context?: DomainPurchaseContext
): Promise<ProfileGenerationResult> {
    try {
        const { generateDomainProfile } = await import('@/lib/infrastructure/api/domainProfileAPI');

        const result = await generateDomainProfile(domainName, {
            spamzillaData: context?.spamzillaData ? {
                trustFlow: context.spamzillaData.trustFlow,
                citationFlow: context.spamzillaData.citationFlow,
                domainAuthority: context.spamzillaData.domainAuthority,
                age: context.spamzillaData.age,
                majesticTopics: context.spamzillaData.majesticTopics,
            } : undefined,
            keywordContext: context?.keywordContext,
        });

        if (result.success && result.profile) {
            return {
                success: true,
                profile: result.profile,
            };
        } else {
            return {
                success: false,
                error: result.error || 'Profile generation returned no data',
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Profile generation failed',
        };
    }
}

/**
 * Create an OwnedDomain entry from purchase queue data.
 * Pure function - transforms QueuedDomain to OwnedDomain.
 */
export function createOwnedDomainEntry(domainData: QueuedDomain): OwnedDomain {
    return {
        domain: domainData.domain,
        tld: domainData.tld,
        score: domainData.score,
        estimatedValue: domainData.estimatedValue,
        purchasedAt: Date.now(),
        profileStatus: 'pending' as ProfileStatus,
        associatedKeywords: domainData.keywordContext?.keywords || [],
        associatedTrends: [],
    };
}

/**
 * Extract context data from queued domain for profile generation.
 * Pure function - extracts relevant data for AI processing.
 */
export function extractPurchaseContext(domainData: QueuedDomain): DomainPurchaseContext {
    return {
        spamzillaData: domainData.spamzillaData ? {
            trustFlow: domainData.spamzillaData.trustFlow,
            citationFlow: domainData.spamzillaData.citationFlow,
            domainAuthority: domainData.spamzillaData.domainAuthority,
            age: domainData.spamzillaData.domainAge,
            majesticTopics: domainData.spamzillaData.majesticTopics,
        } : undefined,
        keywordContext: domainData.keywordContext,
    };
}

// ============================================================================
// Domain Acquisition Orchestration
// ============================================================================

/**
 * Handles the complete "purchase and generate profile" workflow.
 * Orchestrates the service layer, returns actions for store to execute.
 * 
 * @param domainData - The queued domain to process
 * @param callbacks - Callbacks for store updates
 */
export async function processDomainPurchase(
    domainData: QueuedDomain,
    callbacks: {
        onStarted: (domain: OwnedDomain) => void;
        onProfileSuccess: (domainName: string, profile: DomainProfile) => void;
        onProfileFailed: (domainName: string, error: string) => void;
    }
): Promise<void> {
    // 1. Create the owned domain entry
    const ownedDomain = createOwnedDomainEntry(domainData);
    ownedDomain.profileStatus = 'generating';

    // 2. Notify store to add entry
    callbacks.onStarted(ownedDomain);

    // 3. Extract context for profile generation
    const context = extractPurchaseContext(domainData);

    // 4. Generate profile
    const result = await generateDomainProfileAsync(domainData.domain, context);

    // 5. Update store based on result
    if (result.success && result.profile) {
        callbacks.onProfileSuccess(domainData.domain, result.profile);
    } else {
        callbacks.onProfileFailed(domainData.domain, result.error || 'Unknown error');
    }
}

// ============================================================================
// Domain Scoring (extracted for reuse)
// ============================================================================

/**
 * Calculate a composite domain score.
 * Pure function for scoring logic that was embedded elsewhere.
 */
export function calculateDomainScore(metrics: {
    trustFlow?: number;
    citationFlow?: number;
    domainAuthority?: number;
    domainAge?: number;
    hasSpamHistory?: boolean;
}): number {
    let score = 50; // Base score

    // Trust Flow (0-100) - High weight
    if (metrics.trustFlow !== undefined) {
        score += (metrics.trustFlow / 100) * 25;
    }

    // Citation Flow (0-100) - Medium weight
    if (metrics.citationFlow !== undefined) {
        score += (metrics.citationFlow / 100) * 15;
    }

    // Domain Authority (0-100) - Medium weight
    if (metrics.domainAuthority !== undefined) {
        score += (metrics.domainAuthority / 100) * 15;
    }

    // Domain Age bonus (older = better, max 10 points for 10+ years)
    if (metrics.domainAge !== undefined) {
        score += Math.min(metrics.domainAge, 10);
    }

    // Spam penalty
    if (metrics.hasSpamHistory) {
        score -= 25;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get recommendation text based on score.
 */
export function getScoreRecommendation(score: number): string {
    if (score >= 80) return 'Excellent - High quality domain';
    if (score >= 60) return 'Good - Worth acquiring';
    if (score >= 40) return 'Fair - Proceed with caution';
    if (score >= 20) return 'Poor - Not recommended';
    return 'Avoid - High risk domain';
}
