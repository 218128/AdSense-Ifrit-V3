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

// Standalone getter for non-hook contexts (e.g., WP Sites consuming Hunt artifacts)
import { useHuntStore as _huntStore } from './model/huntStore';
export const getOwnedDomains = () => _huntStore.getState().ownedDomains;

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
// Hunt Data Registry (BI & Data Linking)
// ============================================================================

export {
    useHuntDataRegistry,
    captureHuntDataForDomain,
    linkOwnedDomainToRegistry,
    getHuntContextForDomain,
    getHuntContextForSite,
    type DomainDataLink,
    type KeywordArticleTrack,
} from './model/huntDataRegistry';

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
// Hunt Service (Business Logic - SoC extracted from store)
// ============================================================================

export {
    generateDomainProfileAsync,
    processDomainPurchase,
    createOwnedDomainEntry,
    calculateDomainScore as calculateDomainScoreV2,
    getScoreRecommendation,
    type ProfileGenerationResult,
    type DomainPurchaseContext,
} from './lib/huntService';

// ============================================================================
// Launch Workflow (Hunt → Campaign)
// ============================================================================

export {
    launchCampaignFromHunt,
    quickLaunch,
    getReadyToLaunchDomains,
    getLaunchSuggestions,
    type LaunchConfig,
    type LaunchResult,
} from './lib/launchWorkflow';

// ============================================================================
// Keyword Clustering (Phase 2 Enhancement)
// ============================================================================

export {
    clusterKeywords,
    classifyIntent,
    getClusterSummary,
    findRelatedClusters,
    type KeywordCluster,
    type KeywordIntent,
    type ClusteredKeyword,
    type ClusterMetrics,
} from './lib/keywordClusterer';

// ============================================================================
// Trend Aggregation (Phase 2 Enhancement)
// ============================================================================

export {
    aggregateTrends,
    filterByMomentum,
    filterMultiSource,
    filterByRegion,
    getTopTrends,
    getExplodingTrends,
    getHighConfidenceTrends,
    type AggregatedTrend,
    type MomentumLevel,
    type AggregationResult,
} from './lib/trendAggregator';

// ============================================================================
// UI Components
// ============================================================================

export { LaunchCampaignButton, QuickLaunchCard } from './ui/LaunchCampaignButton';

// ============================================================================
// UI Components (re-exported from components/hunt until full migration)
// ============================================================================

export { HuntDashboard } from '@/components/hunt';
