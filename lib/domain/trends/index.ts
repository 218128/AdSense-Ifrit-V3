/**
 * Trends Domain Layer Index
 * 
 * Pure business logic functions for trend processing.
 * No React, no API calls, no side effects.
 * 
 * @module domain/trends
 */

// Deduplication
export { deduplicateTrends, countDuplicates } from './deduplicateTrends';

// Filtering
export {
    filterTrendsBySource,
    getUniqueSources,
    countTrendsBySource,
} from './filterTrendsBySource';

// Source status extraction
export {
    extractSourceStatuses,
    countSuccessfulSources,
    countFailedSources,
    getTotalItemCount,
} from './extractSourceStatuses';
export type { RawSourceData } from './extractSourceStatuses';
