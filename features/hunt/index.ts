/**
 * Hunt Feature - Barrel Export
 * FSD: features/hunt/index.ts
 * 
 * Exports all Hunt-related stores, types, and utilities.
 */

// ============================================================================
// Stores
// ============================================================================

export {
    useHuntStore,
    type AnalyzeCandidate,
    type QueuedDomain,
    type WatchlistDomain,
    type ProfileStatus,
    type OwnedDomain,
    type PurchasedDomain,
    type SelectedKeyword,
    type SelectedTrend,
    selectAnalyzeQueue,
    selectPurchaseQueue,
    selectWatchlist,
    selectSelectedDomains,
    selectOwnedDomains,
    selectPurchasedDomains,
    selectSelectedKeywords,
    selectSelectedTrends,
} from './model/huntStore';

export {
    useDomainAcquireStore,
    type FilterState,
} from './model/domainAcquireStore';

export {
    useKeywordStore,
    type EnrichedKeyword,
    type SavedAnalysis,
    type ResearchResult as KeywordResearchResult,
    type CSVImportRecord,
    selectCSVKeywords,
    selectAnalyzedKeywords,
    selectHistory,
    selectResearchResults as selectKeywordResearchResults,
    selectCSVImportHistory,
} from './model/keywordStore';

export {
    useTrendStore,
    type ResearchResult as TrendResearchResult,
    type ScanHistoryItem,
    selectTrends,
    selectSources,
    selectIsScanning,
    selectError,
    selectResearchResults as selectTrendResearchResults,
    selectScanHistory,
} from './model/trendStore';

export {
    useFlipStore,
    selectProjects,
    selectStats,
} from './model/flipStore';

// ============================================================================
// External Types (re-exported for convenience)
// ============================================================================

export type { TrendItem, SourceStatus } from '@/components/hunt/subtabs/KeywordsNiches/features/TrendScanner/types';
export type { FlipProject, FlipStage, FlipStats } from '@/lib/flip/types';
export type { DomainProfile } from '@/lib/domains/types';

// ============================================================================
// AI Helpers
// ============================================================================

export {
    analyzeNiche,
    expandKeywords,
    scoreDomain,
    type NicheAnalysis,
    type KeywordExpansion,
    type DomainScore,
} from './lib/huntHelpers';

// ============================================================================
// UI Components (re-exported from components/hunt until full migration)
// ============================================================================

export { HuntDashboard } from '@/components/hunt';
