/**
 * Site Analytics Types
 * FSD: features/wordpress/model/analyticsTypes.ts
 * 
 * Types for Google Search Console and Analytics data aggregation.
 */

// ============================================================================
// Search Console Types
// ============================================================================

export interface SearchConsoleMetrics {
    clicks: number;
    impressions: number;
    ctr: number;         // Click-through rate (0-1)
    position: number;    // Average position
    period: 'day' | 'week' | 'month';
    date: string;        // ISO date
}

export interface SearchQuery {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

export interface SearchPage {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

// ============================================================================
// Google Analytics Types
// ============================================================================

export interface AnalyticsMetrics {
    sessions: number;
    users: number;
    pageviews: number;
    bounceRate: number;       // 0-100
    avgSessionDuration: number; // seconds
    period: 'day' | 'week' | 'month';
    date: string;
}

export interface TrafficSource {
    source: string;        // e.g., 'google', 'direct', 'facebook'
    medium: string;        // e.g., 'organic', 'cpc', 'referral'
    sessions: number;
    users: number;
    percentage: number;    // 0-100
}

export interface TopPage {
    path: string;
    title: string;
    pageviews: number;
    avgTimeOnPage: number;
    bounceRate: number;
}

// ============================================================================
// AdSense Types (from Site Kit)
// ============================================================================

export interface AdSenseMetrics {
    revenue: number;           // USD
    clicks: number;
    impressions: number;
    ctr: number;               // 0-1
    rpm: number;               // Revenue per 1000 impressions
    period: 'day' | 'week' | 'month';
    date: string;
}

// ============================================================================
// PageSpeed Types
// ============================================================================

export interface PageSpeedMetrics {
    performance: number;       // 0-100
    accessibility: number;
    bestPractices: number;
    seo: number;
    lcp: number;               // Largest Contentful Paint (ms)
    fid: number;               // First Input Delay (ms)
    cls: number;               // Cumulative Layout Shift
    fetchedAt: string;
}

// ============================================================================
// Aggregated Site Analytics
// ============================================================================

export interface SiteAnalytics {
    siteId: string;
    domain?: string;  // Optional - derived from WPSite.domain

    // Search Console
    searchConsole?: {
        current: SearchConsoleMetrics;
        previous?: SearchConsoleMetrics;
        topQueries: SearchQuery[];
        topPages: SearchPage[];
    };

    // Google Analytics
    analytics?: {
        current: AnalyticsMetrics;
        previous?: AnalyticsMetrics;
        topSources: TrafficSource[];
        topPages: TopPage[];
    };

    // AdSense
    adsense?: {
        current: AdSenseMetrics;
        previous?: AdSenseMetrics;
    };

    // PageSpeed
    pageSpeed?: PageSpeedMetrics;

    // Metadata
    lastUpdated: string;
    hasError?: boolean;
    error?: string;
}

// ============================================================================
// Multi-Site Aggregation
// ============================================================================

export interface MultiSiteAnalytics {
    sites: SiteAnalytics[];

    // Totals across all sites
    totals: {
        clicks: number;
        impressions: number;
        sessions: number;
        revenue: number;
    };

    // Comparisons
    trends: {
        clicksChange: number;       // Percentage
        sessionsChange: number;
        revenueChange: number;
    };

    // Top performers
    topSiteByClicks?: string;
    topSiteByRevenue?: string;

    lastUpdated: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface AnalyticsAPIConfig {
    // Google OAuth tokens (stored securely)
    accessToken?: string;
    refreshToken?: string;

    // Site-specific property IDs
    searchConsoleProperty?: string;  // e.g., 'sc-domain:example.com'
    analyticsPropertyId?: string;    // e.g., 'properties/123456789'
    adsenseAccountId?: string;       // e.g., 'pub-1234567890'
}
