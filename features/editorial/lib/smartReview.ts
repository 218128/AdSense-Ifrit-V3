/**
 * Smart Review System
 * FSD: features/editorial/lib/smartReview.ts
 * 
 * Adaptive auto-approval system that learns from patterns.
 * Goal: 95% auto-review, 5% human review for edge cases.
 * 
 * Features:
 * - Adjustable auto-approval thresholds based on performance
 * - Learning from human review decisions
 * - Content generation improvement signals
 */

import type { ReviewItem, ReviewPolicy, ReviewDecision } from '../model/reviewTypes';
import { DEFAULT_REVIEW_POLICY } from '../model/reviewTypes';

// ============================================================================
// Types
// ============================================================================

/**
 * Review decision feedback for learning
 */
export interface ReviewFeedback {
    reviewItemId: string;
    decision: ReviewDecision;
    wasAutoApprovalCandidate: boolean;
    eeatScore: number;
    isYMYL: boolean;
    topic: string;
    reviewer?: string;
    feedbackNotes?: string;
    timestamp: number;
}

/**
 * Performance metrics for a topic/niche
 */
export interface TopicPerformance {
    topic: string;
    totalReviewed: number;
    autoApproved: number;
    humanApproved: number;
    humanRejected: number;
    changesRequested: number;

    // Outcome tracking (post-publish)
    publishedCount: number;
    avgPageViews?: number;
    avgEngagement?: number;

    // Calculated metrics
    autoApprovalAccuracy: number;        // % of auto-approved that performed well
    humanOverrideRate: number;           // % of auto-approvals overridden by human
    avgEEATScore: number;
}

/**
 * Learning state
 */
export interface LearningState {
    lastUpdated: number;
    totalFeedback: number;

    // Topic performance data
    topicPerformance: Record<string, TopicPerformance>;

    // Threshold adjustments
    thresholdAdjustments: {
        global: number;                  // Adjustment to base threshold
        ymyl: number;                    // Additional YMYL adjustment
        byTopic: Record<string, number>; // Per-topic adjustments
    };

    // Signal improvements
    contentImprovements: ContentImprovement[];
}

/**
 * Content generation improvement signal
 */
export interface ContentImprovement {
    id: string;
    category: 'experience' | 'expertise' | 'citations' | 'structure' | 'trust';
    signal: string;                      // What to improve
    frequency: number;                   // How often this issue appears
    suggestedPromptAddition?: string;    // Addition to AI prompt
    lastSeen: number;
}

/**
 * Auto-review decision
 */
export interface AutoReviewDecision {
    action: 'approve' | 'flag' | 'retry';  // Changed: 'flag' instead of 'review', 'retry' instead of 'reject'
    confidence: number;                  // 0-100
    reasons: string[];
    thresholdUsed: number;
    adjustments: string[];
    shouldRetryGeneration?: boolean;     // If true, regenerate content
}

// ============================================================================
// State Management
// ============================================================================

let learningState: LearningState = {
    lastUpdated: Date.now(),
    totalFeedback: 0,
    topicPerformance: {},
    thresholdAdjustments: {
        global: 0,
        ymyl: 0,
        byTopic: {},
    },
    contentImprovements: [],
};

/**
 * Get current learning state
 */
export function getLearningState(): LearningState {
    return { ...learningState };
}

/**
 * Reset learning state
 */
export function resetLearningState(): void {
    learningState = {
        lastUpdated: Date.now(),
        totalFeedback: 0,
        topicPerformance: {},
        thresholdAdjustments: {
            global: 0,
            ymyl: 0,
            byTopic: {},
        },
        contentImprovements: [],
    };
    saveLearningState(); // Persist reset
}

// ============================================================================
// File Persistence
// ============================================================================

const LEARNING_STATE_FILE = 'learning-state.json';

/**
 * Save learning state to file for persistence across sessions
 */
export async function saveLearningState(): Promise<boolean> {
    try {
        // Browser: use localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('ifrit-learning-state', JSON.stringify(learningState));
            return true;
        }

        // Server: use file system
        const fs = await import('fs/promises');
        const path = await import('path');
        const dataDir = path.join(process.cwd(), '.data');

        // Ensure directory exists
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }

        const filePath = path.join(dataDir, LEARNING_STATE_FILE);
        await fs.writeFile(filePath, JSON.stringify(learningState, null, 2));
        console.log('[SmartReview] Learning state saved to file');
        return true;
    } catch (error) {
        console.error('[SmartReview] Failed to save learning state:', error);
        return false;
    }
}

/**
 * Load learning state from file
 */
export async function loadLearningState(): Promise<boolean> {
    try {
        // Browser: use localStorage
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ifrit-learning-state');
            if (stored) {
                learningState = JSON.parse(stored);
                console.log(`[SmartReview] Loaded learning state: ${learningState.totalFeedback} feedback items`);
                return true;
            }
            return false;
        }

        // Server: use file system
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), '.data', LEARNING_STATE_FILE);

        const data = await fs.readFile(filePath, 'utf-8');
        learningState = JSON.parse(data);
        console.log(`[SmartReview] Loaded learning state: ${learningState.totalFeedback} feedback items`);
        return true;
    } catch (error) {
        // File doesn't exist yet - that's okay
        console.log('[SmartReview] No existing learning state found, starting fresh');
        return false;
    }
}

// Auto-load on module initialization (browser only)
if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ifrit-learning-state');
    if (stored) {
        try {
            learningState = JSON.parse(stored);
        } catch (e) {
            // Ignore parse errors
        }
    }
}

// ============================================================================
// Smart Threshold Calculation
// ============================================================================

/**
 * Calculate effective threshold for a topic
 */
export function calculateEffectiveThreshold(
    topic: string,
    isYMYL: boolean,
    basePolicy: ReviewPolicy = DEFAULT_REVIEW_POLICY
): number {
    let threshold = basePolicy.autoApproveAboveScore;

    // Apply global adjustment (learned from all feedback)
    threshold += learningState.thresholdAdjustments.global;

    // Apply YMYL adjustment
    if (isYMYL) {
        threshold += learningState.thresholdAdjustments.ymyl;
        threshold = Math.max(threshold, basePolicy.ymylMinScore);
    }

    // Apply topic-specific adjustment
    const topicAdjustment = learningState.thresholdAdjustments.byTopic[topic.toLowerCase()];
    if (topicAdjustment) {
        threshold += topicAdjustment;
    }

    // Clamp to valid range
    return Math.max(50, Math.min(100, threshold));
}

/**
 * Smart auto-review decision
 */
export function makeAutoReviewDecision(
    reviewItem: ReviewItem,
    policy: ReviewPolicy = DEFAULT_REVIEW_POLICY
): AutoReviewDecision {
    const reasons: string[] = [];
    const adjustments: string[] = [];

    // Get topic performance if available
    const topicPerf = learningState.topicPerformance[reviewItem.topic.toLowerCase()];

    // Calculate effective threshold
    const effectiveThreshold = calculateEffectiveThreshold(
        reviewItem.topic,
        reviewItem.riskLevel === 'ymyl',
        policy
    );

    if (effectiveThreshold !== policy.autoApproveAboveScore) {
        adjustments.push(`Threshold adjusted from ${policy.autoApproveAboveScore} to ${effectiveThreshold}`);
    }

    // Check score against threshold
    const score = reviewItem.overallQualityScore;
    let action: 'approve' | 'flag' | 'retry';
    let confidence = 70;
    let shouldRetryGeneration = false;

    // Very low score threshold - trigger retry
    const VERY_LOW_THRESHOLD = Math.max(40, effectiveThreshold - 30);

    if (score >= effectiveThreshold) {
        // High score - auto-approve
        action = 'approve';
        reasons.push(`Score ${score} exceeds threshold ${effectiveThreshold}`);

        // Boost confidence based on track record
        if (topicPerf && topicPerf.autoApprovalAccuracy > 90) {
            confidence = 95;
            adjustments.push('High topic accuracy boosted confidence');
        } else {
            confidence = 85;
        }
    } else if (score >= VERY_LOW_THRESHOLD) {
        // Below threshold but not terrible - FLAG for learning, continue publishing
        action = 'flag';
        reasons.push(`Score ${score} below threshold ${effectiveThreshold} - flagged for learning`);
        confidence = 70;

        // Add specific improvement suggestions
        if (reviewItem.eeatScore.experience.score < 60) {
            reasons.push('Low experience signals - will learn from performance');
        }
        if (reviewItem.citationValidation.validatedCount < 3) {
            reasons.push('Few validated citations - monitoring for improvement');
        }
        if (topicPerf && topicPerf.humanOverrideRate > 20) {
            reasons.push(`Topic has ${topicPerf.humanOverrideRate.toFixed(0)}% override rate`);
        }
    } else {
        // Very low score - trigger retry for better generation
        action = 'retry';
        shouldRetryGeneration = true;
        reasons.push(`Score ${score} very low (below ${VERY_LOW_THRESHOLD}) - retry generation`);
        confidence = 90;

        // Add specific issues
        const weakest = getWeakestDimension(reviewItem);
        reasons.push(`Weakest area: ${weakest.dimension} (${weakest.score})`);
    }

    return {
        action,
        confidence,
        reasons,
        thresholdUsed: effectiveThreshold,
        adjustments,
        shouldRetryGeneration,
    };
}

/**
 * Get the weakest E-E-A-T dimension
 */
function getWeakestDimension(item: ReviewItem): { dimension: string; score: number } {
    const dimensions = [
        { dimension: 'Experience', score: item.eeatScore.experience.score },
        { dimension: 'Expertise', score: item.eeatScore.expertise.score },
        { dimension: 'Authoritativeness', score: item.eeatScore.authoritativeness.score },
        { dimension: 'Trustworthiness', score: item.eeatScore.trustworthiness.score },
    ];

    return dimensions.sort((a, b) => a.score - b.score)[0];
}

// ============================================================================
// Learning Functions
// ============================================================================

/**
 * Record feedback from a review decision
 */
export function recordReviewFeedback(feedback: ReviewFeedback): void {
    learningState.totalFeedback++;
    learningState.lastUpdated = Date.now();

    const topicKey = feedback.topic.toLowerCase();

    // Initialize topic performance if needed
    if (!learningState.topicPerformance[topicKey]) {
        learningState.topicPerformance[topicKey] = {
            topic: feedback.topic,
            totalReviewed: 0,
            autoApproved: 0,
            humanApproved: 0,
            humanRejected: 0,
            changesRequested: 0,
            publishedCount: 0,
            autoApprovalAccuracy: 100,
            humanOverrideRate: 0,
            avgEEATScore: 0,
        };
    }

    const perf = learningState.topicPerformance[topicKey];
    perf.totalReviewed++;

    // Update running average E-E-A-T score
    perf.avgEEATScore = (perf.avgEEATScore * (perf.totalReviewed - 1) + feedback.eeatScore) / perf.totalReviewed;

    // Track decision type
    switch (feedback.decision.status) {
        case 'approved':
            if (feedback.wasAutoApprovalCandidate) {
                // Human confirmed auto-approval
                perf.autoApproved++;
            } else {
                perf.humanApproved++;
            }
            break;
        case 'rejected':
            if (feedback.wasAutoApprovalCandidate) {
                // Human rejected auto-approval candidate - important learning!
                perf.humanRejected++;
                adjustThresholdUp(topicKey, feedback.isYMYL);
            } else {
                perf.humanRejected++;
            }
            break;
        case 'changes_requested':
            perf.changesRequested++;
            if (feedback.wasAutoApprovalCandidate) {
                // Slight adjustment needed
                adjustThresholdUp(topicKey, feedback.isYMYL, 0.5);
            }
            break;
    }

    // Recalculate derived metrics
    if (perf.autoApproved > 0) {
        // How often auto-approvals get overridden
        const overrides = perf.humanRejected + perf.changesRequested;
        perf.humanOverrideRate = (overrides / perf.autoApproved) * 100;
    }

    // Auto-save after recording feedback
    saveLearningState();
}

/**
 * Adjust threshold upward (more strict) for a topic
 */
function adjustThresholdUp(topic: string, isYMYL: boolean, factor: number = 1): void {
    const adjustment = 2 * factor; // +2 points per rejection

    // Apply to topic
    const current = learningState.thresholdAdjustments.byTopic[topic] || 0;
    learningState.thresholdAdjustments.byTopic[topic] = Math.min(15, current + adjustment);

    // Also adjust YMYL if applicable
    if (isYMYL) {
        learningState.thresholdAdjustments.ymyl = Math.min(10,
            learningState.thresholdAdjustments.ymyl + adjustment * 0.5
        );
    }
}

/**
 * Record content improvement signal
 */
export function recordContentImprovement(
    category: ContentImprovement['category'],
    signal: string,
    suggestedPromptAddition?: string
): void {
    // Check if we already have this signal
    const existing = learningState.contentImprovements.find(
        i => i.category === category && i.signal === signal
    );

    if (existing) {
        existing.frequency++;
        existing.lastSeen = Date.now();
    } else {
        learningState.contentImprovements.push({
            id: `imp_${Date.now()}`,
            category,
            signal,
            frequency: 1,
            suggestedPromptAddition,
            lastSeen: Date.now(),
        });
    }
}

// ============================================================================
// Content Generation Improvement
// ============================================================================

/**
 * Get top improvement signals for content generation prompts
 */
export function getTopImprovementSignals(limit: number = 5): ContentImprovement[] {
    return [...learningState.contentImprovements]
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, limit);
}

/**
 * Get prompt additions based on learned improvements
 */
export function getPromptImprovements(): string[] {
    const top = getTopImprovementSignals(3);
    return top
        .filter(i => i.suggestedPromptAddition)
        .map(i => i.suggestedPromptAddition!);
}

/**
 * Get topic-specific recommendations for content generation
 */
export function getTopicRecommendations(topic: string): {
    minTargetScore: number;
    focusAreas: string[];
    avoidPatterns: string[];
} {
    const topicKey = topic.toLowerCase();
    const perf = learningState.topicPerformance[topicKey];

    if (!perf) {
        // No data - use defaults
        return {
            minTargetScore: 75,
            focusAreas: ['Add more first-hand experience signals', 'Include authoritative citations'],
            avoidPatterns: [],
        };
    }

    const minTargetScore = calculateEffectiveThreshold(topic, false) + 5;
    const focusAreas: string[] = [];
    const avoidPatterns: string[] = [];

    // Based on track record
    if (perf.humanOverrideRate > 10) {
        focusAreas.push('This topic has higher rejection rate - be thorough');
    }
    if (perf.avgEEATScore < 70) {
        focusAreas.push('Focus on improving E-E-A-T signals');
    }

    // Get common improvement signals for this category
    const relevantImprovements = learningState.contentImprovements
        .filter(i => i.frequency >= 2)
        .slice(0, 3);

    for (const imp of relevantImprovements) {
        focusAreas.push(imp.signal);
    }

    return {
        minTargetScore,
        focusAreas,
        avoidPatterns,
    };
}

// ============================================================================
// Statistics & Reporting
// ============================================================================

/**
 * Get overall learning statistics
 */
export function getLearningStats(): {
    totalFeedback: number;
    topicsTracked: number;
    avgAutoApprovalRate: number;
    avgHumanOverrideRate: number;
    topProblematicTopics: string[];
    improvementCount: number;
} {
    const topics = Object.values(learningState.topicPerformance);

    let totalAutoApproved = 0;
    let totalReviewed = 0;
    let totalOverrideRate = 0;

    for (const t of topics) {
        totalAutoApproved += t.autoApproved;
        totalReviewed += t.totalReviewed;
        totalOverrideRate += t.humanOverrideRate;
    }

    const topProblematic = topics
        .filter(t => t.humanOverrideRate > 15)
        .sort((a, b) => b.humanOverrideRate - a.humanOverrideRate)
        .slice(0, 5)
        .map(t => t.topic);

    return {
        totalFeedback: learningState.totalFeedback,
        topicsTracked: topics.length,
        avgAutoApprovalRate: totalReviewed > 0 ? (totalAutoApproved / totalReviewed) * 100 : 0,
        avgHumanOverrideRate: topics.length > 0 ? totalOverrideRate / topics.length : 0,
        topProblematicTopics: topProblematic,
        improvementCount: learningState.contentImprovements.length,
    };
}
