/**
 * Monetization Module - Barrel Export
 * FSD: lib/monetization/index.ts
 * 
 * Centralized exports for monetization intelligence layer.
 */

// ============================================================================
// Types
// ============================================================================

export type {
    // Ad Networks
    AdNetwork,
    AdFormat,
    AdPlacement,
    AdUnit,
    MonetizationStrategy,

    // Revenue
    RevenueDataPoint,
    ContentRevenue,
    SiteRevenue,
    RevenueEvent,
    RevenueTrackingState,

    // CPM
    NicheCPMData,
    CPMPredictionRequest,
    CPMPrediction,

    // AdSense
    AdSenseAccount,
    AdSenseReportRequest,
    AdSenseReportResponse,
} from './types';

export {
    DEFAULT_NICHE_CPM,
    DEFAULT_SEASONAL_FACTORS,
} from './types';

// ============================================================================
// CPM Modeling
// ============================================================================

export {
    predictCPM,
    estimateMonthlyRevenue,
    getTopNichesByCPM,
    getNicheCPMData,
} from './cpmModeler';

// ============================================================================
// Revenue Tracking
// ============================================================================

export {
    getTrackingState,
    resetTrackingState,
    recordRevenueEvent,
    getSiteRevenue,
    getContentRevenue,
    getCampaignRevenue,
    getAuthorRevenue,
    getTopContent,
    getTotalRevenueSummary,
    setSyncStatus,
    importRevenueData,
} from './revenueTracker';
