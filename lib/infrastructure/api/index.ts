/**
 * API Infrastructure Index
 * 
 * External API services.
 * 
 * @module infrastructure/api
 */

// Trend API
export {
    fetchTrendsAggregate,
    DEFAULT_TREND_SOURCES,
} from './trendAPI';
export type { TrendSource, FetchTrendsResult } from './trendAPI';

// Keyword API
export {
    analyzeKeywords,
    researchKeywords,
} from './keywordAPI';
export type { AnalyzeKeywordsResult } from './keywordAPI';
