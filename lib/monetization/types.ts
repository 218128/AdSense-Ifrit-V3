/**
 * Monetization Types
 * FSD: lib/monetization/types.ts
 * 
 * Type definitions for monetization intelligence layer,
 * including AdSense integration and revenue tracking.
 */

// ============================================================================
// Ad Network Types
// ============================================================================

/**
 * Supported ad networks
 */
export type AdNetwork = 'adsense' | 'mediavine' | 'ezoic' | 'adthrive' | 'manual';

/**
 * Ad format types
 */
export type AdFormat =
    | 'display'           // Standard display ads
    | 'native'            // Native/in-feed ads
    | 'anchor'            // Sticky anchor ads
    | 'vignette'          // Full-screen interstitials
    | 'multiplex'         // Multiplex/related content
    | 'video'             // Video ads
    | 'auto';             // Auto ads

/**
 * Ad placement position
 */
export type AdPlacement =
    | 'header'
    | 'sidebar'
    | 'in_content'
    | 'after_paragraph_1'
    | 'after_paragraph_3'
    | 'mid_content'
    | 'after_content'
    | 'footer'
    | 'sticky';

// ============================================================================
// Revenue Data
// ============================================================================

/**
 * Single revenue data point
 */
export interface RevenueDataPoint {
    date: string;                        // YYYY-MM-DD
    pageViews: number;
    impressions: number;
    clicks: number;
    revenue: number;                     // In cents/smallest currency unit
    rpm: number;                         // Revenue per 1000 page views
    ctr: number;                         // Click-through rate
    cpc: number;                         // Cost per click
}

/**
 * Revenue attribution by content
 */
export interface ContentRevenue {
    contentId: string;
    contentTitle: string;
    contentUrl: string;
    campaignId?: string;
    authorId?: string;

    // Metrics
    pageViews: number;
    revenue: number;
    rpm: number;

    // Time-based
    firstRevenue?: number;               // Timestamp
    lastRevenue?: number;

    // Breakdown by date
    dailyData?: RevenueDataPoint[];
}

/**
 * Site-level revenue summary
 */
export interface SiteRevenue {
    siteId: string;
    domain: string;

    // Totals
    totalRevenue: number;
    totalPageViews: number;
    avgRPM: number;

    // By period
    today: RevenueDataPoint;
    yesterday: RevenueDataPoint;
    last7Days: RevenueDataPoint;
    last30Days: RevenueDataPoint;
    thisMonth: RevenueDataPoint;
    lastMonth: RevenueDataPoint;

    // Top performers
    topContent: ContentRevenue[];

    // Trend
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
}

// ============================================================================
// CPM Modeling
// ============================================================================

/**
 * Niche-based CPM data
 */
export interface NicheCPMData {
    niche: string;
    avgCPM: number;                      // Average CPM for this niche
    minCPM: number;
    maxCPM: number;
    sampleSize: number;                  // Number of data points
    lastUpdated: number;

    // Seasonal adjustments
    seasonalFactors: {
        q1: number;                      // Multiplier (1.0 = no change)
        q2: number;
        q3: number;
        q4: number;                      // Usually highest (holiday season)
    };

    // Traffic source impacts
    bySource?: {
        organic: number;
        social: number;
        direct: number;
        referral: number;
    };
}

/**
 * CPM prediction request
 */
export interface CPMPredictionRequest {
    niche: string;
    topic?: string;
    trafficSource?: keyof NicheCPMData['bySource'];
    month?: number;                      // 1-12
    geoTarget?: string;                  // Country code
}

/**
 * CPM prediction result
 */
export interface CPMPrediction {
    estimatedCPM: number;
    confidence: number;                  // 0-100
    range: { min: number; max: number };
    factors: string[];                   // Explanation of adjustments
}

// ============================================================================
// Ad Configuration
// ============================================================================

/**
 * Ad unit configuration
 */
export interface AdUnit {
    id: string;
    name: string;
    format: AdFormat;
    placement: AdPlacement;

    // Network-specific
    network: AdNetwork;
    networkAdUnitId?: string;            // e.g., AdSense ad-slot

    // Behavior
    enabled: boolean;
    lazyLoad: boolean;
    refreshInterval?: number;            // Seconds, 0 = no refresh

    // Responsive
    responsive: boolean;
    minWidth?: number;
    maxWidth?: number;
}

/**
 * Monetization strategy for a site
 */
export interface MonetizationStrategy {
    siteId: string;
    primaryNetwork: AdNetwork;

    // Ad configuration
    adUnits: AdUnit[];
    autoAdsEnabled: boolean;

    // Thresholds
    adsPerPage: number;
    wordCountForAds: number;             // Min word count to show ads

    // AdSense specific
    adsensePublisherId?: string;
    adsenseClientId?: string;

    // Revenue goals
    monthlyRevenueTarget?: number;
    rpmTarget?: number;
}

// ============================================================================
// AdSense API Types
// ============================================================================

/**
 * AdSense account info
 */
export interface AdSenseAccount {
    id: string;
    name: string;
    reportingTimeZone: string;
    createTime: string;
    pendingTasks: string[];
}

/**
 * AdSense report request
 */
export interface AdSenseReportRequest {
    startDate: { year: number; month: number; day: number };
    endDate: { year: number; month: number; day: number };
    dimensions?: ('DATE' | 'PAGE_URL' | 'AD_UNIT_NAME' | 'COUNTRY_CODE')[];
    metrics?: ('PAGE_VIEWS' | 'IMPRESSIONS' | 'CLICKS' | 'ESTIMATED_EARNINGS')[];
    orderBy?: { dimension?: string; metric?: string; ascending?: boolean }[];
    filters?: { dimension: string; value: string }[];
}

/**
 * AdSense report response
 */
export interface AdSenseReportResponse {
    headers: string[];
    rows: Array<{
        cells: Array<{ value: string }>;
    }>;
    totals?: {
        cells: Array<{ value: string }>;
    };
    warnings?: string[];
}

// ============================================================================
// Revenue Tracking
// ============================================================================

/**
 * Revenue attribution event
 */
export interface RevenueEvent {
    id: string;
    timestamp: number;

    // Attribution
    siteId: string;
    contentId?: string;
    campaignId?: string;
    authorId?: string;

    // Metrics
    pageViews: number;
    impressions: number;
    clicks: number;
    revenue: number;

    // Source
    network: AdNetwork;
    adFormat?: AdFormat;
}

/**
 * Revenue tracking state
 */
export interface RevenueTrackingState {
    lastSync: number;
    syncStatus: 'idle' | 'syncing' | 'error';
    syncError?: string;

    // Data
    sites: Record<string, SiteRevenue>;
    content: Record<string, ContentRevenue>;

    // Historical
    events: RevenueEvent[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default CPM data by niche
 */
export const DEFAULT_NICHE_CPM: Record<string, Partial<NicheCPMData>> = {
    'technology': { avgCPM: 350, minCPM: 200, maxCPM: 600 },
    'personal finance': { avgCPM: 500, minCPM: 300, maxCPM: 800 },
    'health': { avgCPM: 400, minCPM: 250, maxCPM: 700 },
    'insurance': { avgCPM: 1200, minCPM: 800, maxCPM: 2000 },
    'legal': { avgCPM: 800, minCPM: 500, maxCPM: 1500 },
    'travel': { avgCPM: 300, minCPM: 150, maxCPM: 500 },
    'food': { avgCPM: 250, minCPM: 150, maxCPM: 400 },
    'lifestyle': { avgCPM: 200, minCPM: 100, maxCPM: 350 },
    'gaming': { avgCPM: 280, minCPM: 150, maxCPM: 450 },
    'education': { avgCPM: 350, minCPM: 200, maxCPM: 550 },
};

/**
 * Seasonal CPM multipliers (Q4 is typically highest)
 */
export const DEFAULT_SEASONAL_FACTORS = {
    q1: 0.85,   // Post-holiday dip
    q2: 0.95,   // Gradual recovery
    q3: 1.0,    // Back to school
    q4: 1.25,   // Holiday shopping peak
};
