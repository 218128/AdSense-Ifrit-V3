/**
 * KeywordsNiches Subtab - FSD Index
 * 
 * Exports features and shared components following Feature-Sliced Design.
 */

// ============ FEATURES ============

// TrendScanner feature
export { default as TrendScanner } from './features/TrendScanner/TrendScanner';
export { TrendCard } from './features/TrendScanner/TrendCard';
export type { TrendItem, SourceStatus, TrendScannerProps } from './features/TrendScanner/types';
export { getSourceIcon, getSourceColor, formatTimeAgo, CPC_THRESHOLD_HIGH, CPC_THRESHOLD_MEDIUM } from './features/TrendScanner/utils';

// KeywordHunter feature
export { default as KeywordHunter } from './features/KeywordHunter/KeywordHunter';

// ============ SHARED ============

// Shared components
export {
    TipSection,
    SourceStatusBar,
    SelectionBar,
    HistoryPanel,
    KeywordCard,
    AnalysisResultCard,
    CSVImporter,
} from './shared/components';

// Shared utilities
export { parseCSV } from './shared/utils';
