/**
 * Hunt Components Barrel File
 * 
 * Exports all Hunt-related components from the new subtabs structure.
 * Old DomainDomination code moved to _legacy/ folder.
 */

// Main dashboard
export { default as HuntDashboard } from './HuntDashboard';

// Subtab 1: Keywords/Niches
export { TrendScanner, KeywordHunter } from './subtabs/KeywordsNiches';
export type { TrendItem, SourceStatus, TrendScannerProps } from './subtabs/KeywordsNiches';

// Subtab 2: Domain Acquire
export { ExpiredDomainFinder, DomainScorer, PurchaseQueue, ScorerScoreCard } from './subtabs/DomainAcquire';

// Subtab 3: Flip Pipeline
export { FlipPipeline, StatCard, ProjectCard, ProjectForm, calculateROI, calculateStats } from './subtabs/FlipPipeline';

// Shared components
export { MetricTooltip, DataSourceBanner, CloudflareManager, DomainSources, FILTER_PRESETS, METRIC_EXPLANATIONS } from './shared';
