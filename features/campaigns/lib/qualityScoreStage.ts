/**
 * Quality Score Stage
 * FSD: features/campaigns/lib/qualityScoreStage.ts
 * 
 * Phase 2 Integration: Quality scoring and review integration for pipeline.
 * Calculates E-E-A-T scores, fact-check scores, and creates review items.
 */

import type { Campaign, PipelineContext } from '../model/types';
import { calculateEEATScore, quickFactCheckScore } from '@/lib/contentQuality';
import {
    makeAutoReviewDecision,
    recordReviewFeedback,
    type ReviewItem,
    type CreateReviewInput,
} from '@/features/editorial';
import { useReviewStore } from '@/features/editorial';

// ============================================================================
// Types
// ============================================================================

export interface QualityScoreResult {
    eeat: {
        overall: number;
        experience: number;
        expertise: number;
        authoritativeness: number;
        trustworthiness: number;
    };
    factCheck: {
        score: number;
        claimDensity: number;
        hasAttributions: boolean;
    };
    combined: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
}

export interface ReviewDecisionResult {
    action: 'approve' | 'flag' | 'retry';
    confidence: number;
    reasons: string[];
    reviewItemId?: string;
    shouldRetryGeneration?: boolean;
}

// ============================================================================
// Quality Scoring
// ============================================================================

/**
 * Calculate comprehensive quality score for content
 */
export function scoreContentQuality(
    content: string,
    topic: string,
    authorId?: string
): QualityScoreResult {
    // E-E-A-T scoring
    const eeatResult = calculateEEATScore(content);

    // Fact check scoring
    const factCheck = quickFactCheckScore(content);

    // Combined score (70% E-E-A-T, 30% fact check)
    const combined = Math.round(
        (eeatResult.overall * 0.7) + (factCheck.score * 0.3)
    );

    // Grade calculation
    let grade: QualityScoreResult['grade'] = 'F';
    if (combined >= 90) grade = 'A';
    else if (combined >= 75) grade = 'B';
    else if (combined >= 60) grade = 'C';
    else if (combined >= 40) grade = 'D';

    return {
        eeat: {
            overall: eeatResult.overall,
            experience: eeatResult.experience.score,
            expertise: eeatResult.expertise.score,
            authoritativeness: eeatResult.authoritativeness.score,
            trustworthiness: eeatResult.trustworthiness.score,
        },
        factCheck: {
            score: factCheck.score,
            claimDensity: factCheck.claimDensity,
            hasAttributions: factCheck.hasAttributions,
        },
        combined,
        grade,
        recommendations: eeatResult.recommendations,
    };
}

/**
 * Apply quality score to pipeline context
 */
export function applyQualityScoreToContext(
    ctx: PipelineContext,
    score: QualityScoreResult
): void {
    ctx.qualityScore = {
        eeat: score.eeat.overall,
        experience: score.eeat.experience,
        expertise: score.eeat.expertise,
        authoritativeness: score.eeat.authoritativeness,
        trustworthiness: score.eeat.trustworthiness,
        factCheck: score.factCheck.score,
    };
}

// ============================================================================
// Review Integration
// ============================================================================

/**
 * Create review item from pipeline context
 */
export function createReviewItemFromContext(ctx: PipelineContext): CreateReviewInput {
    const qualityScore = ctx.qualityScore;

    return {
        campaignId: ctx.campaign.id,
        siteId: ctx.campaign.targetSiteId,
        title: ctx.content?.title || ctx.sourceItem.topic,
        content: ctx.content?.body || '',
        topic: ctx.sourceItem.topic,
        authorId: ctx.matchedAuthor?.id,
        authorName: ctx.matchedAuthor?.name,
    };
}

/**
 * Make smart review decision and update context
 * 
 * Behavior:
 * - approve: Auto-approved, publish normally
 * - flag: Below threshold but acceptable, publish and flag for learning
 * - retry: Very low quality, trigger regeneration
 */
export async function processSmartReview(
    ctx: PipelineContext,
    campaign: Campaign
): Promise<ReviewDecisionResult> {
    if (!ctx.content) {
        return {
            action: 'retry',
            confidence: 100,
            reasons: ['No content to review'],
            shouldRetryGeneration: true,
        };
    }

    // Create review input
    const reviewInput = createReviewItemFromContext(ctx);

    // Get store and create review item
    const store = useReviewStore.getState();
    const reviewItem = store.createReviewItem(reviewInput);

    // Make smart decision
    const decision = makeAutoReviewDecision(reviewItem);

    // Update context
    ctx.reviewItemId = reviewItem.id;

    if (decision.action === 'approve') {
        ctx.autoApproved = true;
        ctx.needsManualReview = false;
        // Process auto-approval in store
        store.processAutoApproval(reviewItem.id);
    } else if (decision.action === 'flag') {
        // Flag for learning, but still publish
        ctx.autoApproved = false;
        ctx.needsManualReview = true; // Flagged in dashboard for learning
        // Store will track this for learning
        store.flagForLearning?.(reviewItem.id);
    } else {
        // retry - very low quality
        ctx.autoApproved = false;
        ctx.needsManualReview = false;
    }

    return {
        action: decision.action,
        confidence: decision.confidence,
        reasons: decision.reasons,
        reviewItemId: reviewItem.id,
        shouldRetryGeneration: decision.shouldRetryGeneration,
    };
}

/**
 * Check if content should be published based on review decision
 * 
 * NEW BEHAVIOR: Always publish unless retry is triggered
 * - approve: publish with original status
 * - flag: publish with original status (flagged in dashboard for learning)
 * - retry: don't publish, regenerate content
 */
export function shouldPublish(
    ctx: PipelineContext,
    campaign: Campaign
): { publish: boolean; reason: string; shouldRetry?: boolean } {
    // If quality gate not enabled, always publish
    if (!campaign.aiConfig.qualityGateEnabled) {
        return { publish: true, reason: 'Quality gate disabled' };
    }

    // If auto-approved, publish normally
    if (ctx.autoApproved) {
        return { publish: true, reason: 'Auto-approved' };
    }

    // If flagged, still publish but mark for learning
    if (ctx.needsManualReview) {
        return {
            publish: true,
            reason: 'Publishing (flagged for learning)'
        };
    }

    // If we get here, it means retry was triggered
    return {
        publish: false,
        reason: 'Quality too low - regeneration triggered',
        shouldRetry: true
    };
}

/**
 * Get post status based on review decision
 * 
 * NEW BEHAVIOR: Always use original status
 * (flagged posts are tracked in dashboard, not by WP status)
 */
export function getPostStatusForReview(
    ctx: PipelineContext,
    originalStatus: Campaign['postStatus']
): 'publish' | 'draft' | 'pending' {
    // Always use original status - flagging is done in Ifrit dashboard
    return originalStatus;
}
