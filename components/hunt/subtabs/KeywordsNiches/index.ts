/**
 * KeywordsNiches Subtab - Index
 * 
 * Exports all components for the Keywords/Niches subtab.
 */

export { default as TrendScanner } from './TrendScanner';
export { default as KeywordHunter } from './KeywordHunter';

// Types
export type { TrendItem, SourceStatus, TrendScannerProps } from './trendTypes';

// Utilities
export { getSourceIcon, getSourceColor, formatTimeAgo, CPC_THRESHOLD_HIGH, CPC_THRESHOLD_MEDIUM } from './trendUtils';

// Components
export { TrendCard } from './TrendCard';
