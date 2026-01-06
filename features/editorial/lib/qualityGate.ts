/**
 * Quality Gate
 * FSD: features/editorial/lib/qualityGate.ts
 * 
 * Pipeline integration for quality checks and review gates.
 * Enforces minimum scores and routes content to review when needed.
 */

import type { ReviewPolicy, CreateReviewInput, ReviewItem } from '../model/reviewTypes';
import { ReviewRequiredError, DEFAULT_REVIEW_POLICY } from '../model/reviewTypes';
import { useReviewStore } from '../model/reviewStore';
import { calculateEEATScore } from '@/lib/contentQuality';
import { quickAIOverviewCheck } from '@/lib/seo';
import { requiresHumanExpertise } from '@/features/authors';

// ============================================================================
// Types
// ============================================================================

/**
 * Quality gate result
 */
export interface QualityGateResult {
    passed: boolean;
    autoApproved: boolean;
    requiresReview: boolean;
    reviewItem?: ReviewItem;

    scores: {
        eeat: number;
        experience: number;
        expertise: number;
        authoritativeness: number;
        trustworthiness: number;
        aiOverview: number;
        overall: number;
    };

    issues: string[];
    warnings: string[];
}

/**
 * Options for quality gate check
 */
export interface QualityGateOptions {
    campaignId: string;
    siteId: string;
    topic: string;
    authorId?: string;
    authorName?: string;
    runItemId?: string;

    policy?: Partial<ReviewPolicy>;
    skipReviewCreation?: boolean;        // Just check, don't create review item
    forceManualReview?: boolean;
}

// ============================================================================
// Quality Check Functions
// ============================================================================

/**
 * Detect if topic is YMYL
 */
export function isYMYLTopic(topic: string, policy?: ReviewPolicy): boolean {
    const p = policy || DEFAULT_REVIEW_POLICY;
    const topicLower = topic.toLowerCase();
    return p.ymylTopics.some(t => topicLower.includes(t));
}

/**
 * Calculate overall quality score
 */
export function calculateQualityScore(html: string): {
    eeat: ReturnType<typeof calculateEEATScore>;
    aiOverview: ReturnType<typeof quickAIOverviewCheck>;
    overall: number;
} {
    const eeat = calculateEEATScore(html);
    const aiOverview = quickAIOverviewCheck(html);

    const overall = Math.round(
        (eeat.overall * 0.7) + (aiOverview.score * 0.3)
    );

    return { eeat, aiOverview, overall };
}

/**
 * Check content against quality thresholds
 */
function checkThresholds(
    scores: ReturnType<typeof calculateQualityScore>,
    policy: ReviewPolicy,
    topic: string
): { issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];

    const isYMYL = isYMYLTopic(topic, policy);
    const minScore = isYMYL ? policy.ymylMinScore : policy.minEEATScore;

    // Critical issues (would fail quality gate)
    if (scores.eeat.overall < minScore) {
        issues.push(`E-E-A-T score ${scores.eeat.overall} below minimum ${minScore}`);
    }

    if (scores.eeat.experience.score < policy.minExperienceScore) {
        issues.push(`Experience score ${scores.eeat.experience.score} below minimum ${policy.minExperienceScore}`);
    }

    if (scores.eeat.expertise.score < policy.minExpertiseScore) {
        issues.push(`Expertise score ${scores.eeat.expertise.score} below minimum ${policy.minExpertiseScore}`);
    }

    if (scores.eeat.citationAnalysis.total < policy.minCitationCount) {
        issues.push(`Only ${scores.eeat.citationAnalysis.total} citations, minimum ${policy.minCitationCount} required`);
    }

    // Warnings (may need attention but won't fail)
    if (scores.eeat.citationAnalysis.byTier.problematic > 0) {
        warnings.push(`${scores.eeat.citationAnalysis.byTier.problematic} citations from problematic sources`);
    }

    if (scores.eeat.citationAnalysis.failed > 0) {
        warnings.push(`${scores.eeat.citationAnalysis.failed} citations could not be validated`);
    }

    if (scores.eeat.trustworthiness.score < 60) {
        warnings.push('Consider adding more trust signals (disclosures, dates, attribution)');
    }

    if (isYMYL && !requiresHumanExpertise(topic)) {
        warnings.push('YMYL topic detected - extra scrutiny recommended');
    }

    return { issues, warnings };
}

// ============================================================================
// Main Quality Gate
// ============================================================================

/**
 * Run content through quality gate
 * Returns result indicating if content passed, was auto-approved, or needs review
 */
export function runQualityGate(
    title: string,
    html: string,
    options: QualityGateOptions
): QualityGateResult {
    const policy: ReviewPolicy = {
        ...DEFAULT_REVIEW_POLICY,
        ...options.policy,
    };

    // Calculate scores
    const scores = calculateQualityScore(html);

    // Check thresholds
    const { issues, warnings } = checkThresholds(scores, policy, options.topic);

    // Determine outcome
    const passed = issues.length === 0;
    const isYMYL = isYMYLTopic(options.topic, policy);

    let autoApproved = false;
    let requiresReview = false;
    let reviewItem: ReviewItem | undefined;

    if (passed) {
        // Check for auto-approval
        if (policy.enableAutoApproval &&
            scores.overall >= policy.autoApproveAboveScore) {

            // YMYL always requires review if policy says so
            if (isYMYL && policy.ymylRequiresManualReview) {
                requiresReview = true;
            }
            // Check citation requirements
            else if (policy.autoApproveRequiresCitations &&
                scores.eeat.citationAnalysis.total < policy.minCitationCount) {
                requiresReview = true;
            }
            // Auto-approve
            else {
                autoApproved = true;
            }
        } else {
            // Needs manual review
            requiresReview = true;
        }
    } else {
        // Failed quality gate - still route to review for potential fixes
        requiresReview = true;
    }

    // Force manual review if requested
    if (options.forceManualReview) {
        autoApproved = false;
        requiresReview = true;
    }

    // Create review item if needed
    if (requiresReview && !options.skipReviewCreation) {
        const store = useReviewStore.getState();

        const input: CreateReviewInput = {
            campaignId: options.campaignId,
            siteId: options.siteId,
            title,
            content: html,
            topic: options.topic,
            authorId: options.authorId,
            authorName: options.authorName,
            runItemId: options.runItemId,
        };

        reviewItem = store.createReviewItem(input);

        // Process auto-approval if eligible
        if (autoApproved) {
            store.processAutoApproval(reviewItem.id);
        }
    }

    return {
        passed,
        autoApproved,
        requiresReview,
        reviewItem,
        scores: {
            eeat: scores.eeat.overall,
            experience: scores.eeat.experience.score,
            expertise: scores.eeat.expertise.score,
            authoritativeness: scores.eeat.authoritativeness.score,
            trustworthiness: scores.eeat.trustworthiness.score,
            aiOverview: scores.aiOverview.score,
            overall: scores.overall,
        },
        issues,
        warnings,
    };
}

/**
 * Strict quality gate that throws if content fails
 */
export function enforceQualityGate(
    title: string,
    html: string,
    options: QualityGateOptions
): QualityGateResult {
    const result = runQualityGate(title, html, options);

    if (!result.passed && result.reviewItem) {
        throw new ReviewRequiredError(
            `Content failed quality gate: ${result.issues.join(', ')}`,
            result.reviewItem,
            result.issues.join('; ')
        );
    }

    return result;
}

/**
 * Quick score check without creating review item
 */
export function quickQualityCheck(html: string, topic: string): {
    score: number;
    passed: boolean;
    isYMYL: boolean;
} {
    const scores = calculateQualityScore(html);
    const policy = DEFAULT_REVIEW_POLICY;
    const isYMYL = isYMYLTopic(topic, policy);
    const minScore = isYMYL ? policy.ymylMinScore : policy.minEEATScore;

    return {
        score: scores.overall,
        passed: scores.overall >= minScore,
        isYMYL,
    };
}
