/**
 * Editorial Feature - Barrel Export
 * FSD: features/editorial/index.ts
 * 
 * Centralized exports for editorial review workflow.
 */

// ============================================================================
// Types
// ============================================================================

export type {
    // Core types
    ReviewItem,
    ReviewStatus,
    ReviewPriority,
    ContentRiskLevel,
    ReviewPolicy,

    // Checklist
    ReviewChecklistItem,
    ReviewChangeRequest,
    CitationValidationResult,

    // Queue
    ReviewQueueFilter,
    ReviewQueueSort,
    ReviewQueueStats,

    // Actions
    CreateReviewInput,
    ReviewDecision,
} from './model/reviewTypes';

export {
    DEFAULT_REVIEW_POLICY,
    DEFAULT_REVIEW_CHECKLIST,
    ReviewRequiredError,
} from './model/reviewTypes';

// ============================================================================
// Store
// ============================================================================

export {
    useReviewStore,
    selectPendingReviews,
    selectApprovedReviews,
    selectHighPriorityItems,
    selectItemsByStatus,
} from './model/reviewStore';

// ============================================================================
// Quality Gate
// ============================================================================

export type {
    QualityGateResult,
    QualityGateOptions,
} from './lib/qualityGate';

export {
    runQualityGate,
    enforceQualityGate,
    quickQualityCheck,
    isYMYLTopic,
    calculateQualityScore,
} from './lib/qualityGate';

// ============================================================================
// Smart Review System (Auto-approval with Learning)
// ============================================================================

export type {
    ReviewFeedback,
    TopicPerformance,
    LearningState,
    ContentImprovement,
    AutoReviewDecision,
} from './lib/smartReview';

export {
    // State
    getLearningState,
    resetLearningState,

    // Persistence (file/localStorage based)
    saveLearningState,
    loadLearningState,

    // Smart decisions
    calculateEffectiveThreshold,
    makeAutoReviewDecision,

    // Learning
    recordReviewFeedback,
    recordContentImprovement,

    // Content generation improvement
    getTopImprovementSignals,
    getPromptImprovements,
    getTopicRecommendations,

    // Statistics
    getLearningStats,
} from './lib/smartReview';

// ============================================================================
// Components
// ============================================================================

export { ReviewDashboard } from './components/ReviewDashboard';

