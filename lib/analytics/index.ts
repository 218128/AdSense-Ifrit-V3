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
