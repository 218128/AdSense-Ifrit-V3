/**
 * Monetization Module - Barrel Export
 * FSD: lib/monetization/index.ts
 * 
 * Centralized exports for monetization intelligence layer.
 * 
 * NOTE: adsenseClient is NOT exported here because it uses google-auth-library
 * which is server-only. Import it directly: `@/lib/monetization/adsenseClient`
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

    // AdSense types (client-safe)
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

// ============================================================================
// AdSense Client (SERVER-ONLY)
// ============================================================================
// 
// Do NOT export from here - uses google-auth-library which is server-only.
// Import directly from '@/lib/monetization/adsenseClient' in API routes only.
//
// export { ... } from './adsenseClient';

