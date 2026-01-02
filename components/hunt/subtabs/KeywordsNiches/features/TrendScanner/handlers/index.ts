/**
 * TrendScanner Handlers Index
 * 
 * Re-exports all handler functions for the TrendScanner feature.
 * 
 * @module TrendScanner/handlers
 */

// Handler creators
export { createHandleScan, handleScan } from './handleScan';
export type { HandleScanParams } from './handleScan';

export { createHandleSendToAnalysis, handleSendToAnalysis } from './handleSendToAnalysis';
export type { HandleSendToAnalysisParams } from './handleSendToAnalysis';

export { createHandleResearchTrends, handleResearchTrends } from './handleResearchTrends';
export type { HandleResearchTrendsParams, ResearchResult } from './handleResearchTrends';
