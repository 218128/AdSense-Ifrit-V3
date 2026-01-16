/**
 * Author Matcher for Pipeline
 * FSD: features/campaigns/lib/authorMatcher.ts
 * 
 * Phase 2 Integration: Matches authors to content in the pipeline.
 * Validates author health and provides fallback strategies.
 */

import type { Campaign, PipelineContext } from '../model/types';
import { useAuthorStore } from '@/features/authors';
import {
    findAuthorForTopic,
    calculateAuthorHealthScore,
    canPublishWithAuthor,
    type AuthorProfile,
    type AuthorHealthScore,
} from '@/features/authors';

// ============================================================================
// Types
// ============================================================================

export interface AuthorMatchResult {
    author: AuthorProfile | null;
    healthScore: AuthorHealthScore | null;
    matchScore: number;
    canPublish: boolean;
    reason?: string;
}

export interface AuthorMatchOptions {
    requireMinHealthScore?: number;
    fallbackToGeneric?: boolean;
    topic?: string;
}

// ============================================================================
// Author Matching
// ============================================================================

/**
 * Match author for pipeline context
 * Considers campaign settings, topic relevance, and health requirements
 */
export function matchAuthorForPipeline(
    campaign: Campaign,
    topic: string,
    options?: AuthorMatchOptions
): AuthorMatchResult {
    const store = useAuthorStore.getState();
    const minHealthScore = options?.requireMinHealthScore || campaign.authorHealthMinScore || 40;

    // Case 1: Campaign has specific author assigned
    if (campaign.authorId) {
        const author = store.getAuthor(campaign.authorId);

        if (!author) {
            return {
                author: null,
                healthScore: null,
                matchScore: 0,
                canPublish: false,
                reason: `Assigned author ${campaign.authorId} not found`,
            };
        }

        const healthScore = calculateAuthorHealthScore(author);
        const publishCheck = canPublishWithAuthor(author);

        // Check health requirements
        if (campaign.aiConfig.authorHealthRequired && healthScore.score < minHealthScore) {
            return {
                author,
                healthScore,
                matchScore: 100, // Directly assigned
                canPublish: false,
                reason: `Author health ${healthScore.score} below required ${minHealthScore}`,
            };
        }

        return {
            author,
            healthScore,
            matchScore: 100,
            canPublish: publishCheck.allowed,
            reason: publishCheck.reason,
        };
    }

    // Case 2: Auto-match by topic
    const matchResult = findAuthorForTopic(topic, campaign.targetSiteId);

    if (matchResult.primary) {
        const author = matchResult.primary.author;
        const healthScore = calculateAuthorHealthScore(author);
        const publishCheck = canPublishWithAuthor(author);

        // Check health requirements for auto-matched author
        if (campaign.aiConfig.authorHealthRequired && healthScore.score < minHealthScore) {
            // Try alternates
            for (const alt of matchResult.alternatives) {
                const altHealth = calculateAuthorHealthScore(alt.author);
                if (altHealth.score >= minHealthScore) {
                    const altPublish = canPublishWithAuthor(alt.author);
                    return {
                        author: alt.author,
                        healthScore: altHealth,
                        matchScore: alt.matchScore,
                        canPublish: altPublish.allowed,
                        reason: altPublish.reason,
                    };
                }
            }

            // No healthy author found
            if (options?.fallbackToGeneric) {
                return {
                    author: null,
                    healthScore: null,
                    matchScore: 0,
                    canPublish: true,
                    reason: 'Using generic author (no healthy author found)',
                };
            }

            return {
                author,
                healthScore,
                matchScore: matchResult.primary.matchScore,
                canPublish: false,
                reason: `Best match health ${healthScore.score} below required ${minHealthScore}`,
            };
        }

        return {
            author,
            healthScore,
            matchScore: matchResult.primary.matchScore,
            canPublish: publishCheck.allowed,
            reason: publishCheck.reason,
        };
    }

    // Case 3: No author found
    if (options?.fallbackToGeneric) {
        return {
            author: null,
            healthScore: null,
            matchScore: 0,
            canPublish: true,
            reason: 'No author available, using generic attribution',
        };
    }

    return {
        author: null,
        healthScore: null,
        matchScore: 0,
        canPublish: false,
        reason: 'No suitable author found for topic',
    };
}

/**
 * Update pipeline context with matched author
 */
export function applyAuthorToContext(
    ctx: PipelineContext,
    matchResult: AuthorMatchResult
): void {
    if (matchResult.author) {
        ctx.matchedAuthor = {
            id: matchResult.author.id,
            name: matchResult.author.name,
            headline: matchResult.author.headline,
            avatarUrl: matchResult.author.avatarUrl,
            healthScore: matchResult.healthScore?.score,
        };
    }
}

/**
 * Validate author can be used for publishing
 */
export function validateAuthorForPublishing(
    ctx: PipelineContext,
    campaign: Campaign
): { valid: boolean; reason?: string } {
    // If no author matching required, always valid
    if (!campaign.aiConfig.authorHealthRequired && !campaign.authorId) {
        return { valid: true };
    }

    // If author was matched, check if they can publish
    if (ctx.matchedAuthor) {
        const minScore = campaign.authorHealthMinScore || 40;
        if (ctx.matchedAuthor.healthScore && ctx.matchedAuthor.healthScore < minScore) {
            return {
                valid: false,
                reason: `Author health ${ctx.matchedAuthor.healthScore} below required ${minScore}`,
            };
        }
        return { valid: true };
    }

    // If author required but none matched
    if (campaign.authorId) {
        return { valid: false, reason: 'Required author not available' };
    }

    return { valid: true };
}
