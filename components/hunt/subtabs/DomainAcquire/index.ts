/**
 * DomainAcquire Subtab - FSD Index
 * 
 * Exports features for the Domain Acquire workflow:
 * - Step 1: ExpiredDomainFinder (Find domains)
 * - Step 2: DomainScorer (Analyze domains)
 * - Step 3: PurchaseQueue (Purchase domains)
 * - Utility: QuickAnalyzer (One-click analysis)
 */

// ============ FEATURES ============

// Step 1: Find expired domains
export { default as ExpiredDomainFinder } from './features/ExpiredDomainFinder/ExpiredDomainFinder';

// Step 2: Analyze/Score domains
export { default as DomainScorer } from './features/DomainScorer/DomainScorer';
export { ScorerScoreCard } from './features/DomainScorer/ScorerScoreCard';

// Step 3: Purchase queue
export { default as PurchaseQueue } from './features/PurchaseQueue/PurchaseQueue';

// Utility: Quick domain analyzer
export { QuickAnalyzer } from './features/QuickAnalyzer';
