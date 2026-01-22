/**
 * Analytics Module Index
 */

export type {
    ContentRecord,
    RecommendationScore,
    Recommendation,
    AnalyticsSummary
} from './recommendations';

export {
    getContentHistory,
    addContentToHistory,
    generateAnalytics,
    getQuickInsights
} from './recommendations';

// Predictive ROI
export type {
    ContentAttributes,
    ROIPrediction,
    PredictionFactor,
} from './predictiveROI';

export {
    predictContentROI,
    quickROICheck,
    recordContentPerformance,
} from './predictiveROI';

