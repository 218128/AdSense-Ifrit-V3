/**
 * Revenue Tracker
 * FSD: lib/monetization/revenueTracker.ts
 * 
 * Tracks and aggregates revenue data across sites and content.
 * Provides attribution for campaigns and authors.
 */

import type {
    RevenueDataPoint,
    ContentRevenue,
    SiteRevenue,
    RevenueEvent,
    RevenueTrackingState,
    AdNetwork,
} from './types';

// ============================================================================
// State Management
// ============================================================================

let state: RevenueTrackingState = {
    lastSync: 0,
    syncStatus: 'idle',
    sites: {},
    content: {},
    events: [],
};

/**
 * Get current tracking state
 */
export function getTrackingState(): RevenueTrackingState {
    return { ...state };
}

/**
 * Reset tracking state
 */
export function resetTrackingState(): void {
    state = {
        lastSync: 0,
        syncStatus: 'idle',
        sites: {},
        content: {},
        events: [],
    };
}

// ============================================================================
// Event Recording
// ============================================================================

/**
 * Record a revenue event
 */
export function recordRevenueEvent(event: Omit<RevenueEvent, 'id' | 'timestamp'>): RevenueEvent {
    const fullEvent: RevenueEvent = {
        ...event,
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
    };

    state.events.push(fullEvent);

    // Update site aggregate
    updateSiteRevenue(event.siteId, fullEvent);

    // Update content aggregate if applicable
    if (event.contentId) {
        updateContentRevenue(event.contentId, event.siteId, fullEvent);
    }

    return fullEvent;
}

/**
 * Update site revenue aggregates
 */
function updateSiteRevenue(siteId: string, event: RevenueEvent): void {
    if (!state.sites[siteId]) {
        state.sites[siteId] = createEmptySiteRevenue(siteId);
    }

    const site = state.sites[siteId];
    site.totalRevenue += event.revenue;
    site.totalPageViews += event.pageViews;
    site.avgRPM = site.totalPageViews > 0
        ? (site.totalRevenue / site.totalPageViews) * 1000
        : 0;
}

/**
 * Update content revenue aggregates
 */
function updateContentRevenue(contentId: string, siteId: string, event: RevenueEvent): void {
    if (!state.content[contentId]) {
        state.content[contentId] = {
            contentId,
            contentTitle: '',
            contentUrl: '',
            campaignId: event.campaignId,
            authorId: event.authorId,
            pageViews: 0,
            revenue: 0,
            rpm: 0,
        };
    }

    const content = state.content[contentId];
    content.pageViews += event.pageViews;
    content.revenue += event.revenue;
    content.rpm = content.pageViews > 0
        ? (content.revenue / content.pageViews) * 1000
        : 0;

    if (!content.firstRevenue) content.firstRevenue = event.timestamp;
    content.lastRevenue = event.timestamp;
}

// ============================================================================
// Aggregation Helpers
// ============================================================================

/**
 * Create empty site revenue structure
 */
function createEmptySiteRevenue(siteId: string): SiteRevenue {
    const emptyDataPoint: RevenueDataPoint = {
        date: new Date().toISOString().split('T')[0],
        pageViews: 0,
        impressions: 0,
        clicks: 0,
        revenue: 0,
        rpm: 0,
        ctr: 0,
        cpc: 0,
    };

    return {
        siteId,
        domain: '',
        totalRevenue: 0,
        totalPageViews: 0,
        avgRPM: 0,
        today: { ...emptyDataPoint },
        yesterday: { ...emptyDataPoint },
        last7Days: { ...emptyDataPoint },
        last30Days: { ...emptyDataPoint },
        thisMonth: { ...emptyDataPoint },
        lastMonth: { ...emptyDataPoint },
        topContent: [],
        trend: 'stable',
        trendPercent: 0,
    };
}

/**
 * Aggregate revenue data points
 */
function aggregateDataPoints(points: RevenueDataPoint[]): RevenueDataPoint {
    if (points.length === 0) {
        return {
            date: new Date().toISOString().split('T')[0],
            pageViews: 0,
            impressions: 0,
            clicks: 0,
            revenue: 0,
            rpm: 0,
            ctr: 0,
            cpc: 0,
        };
    }

    const totals = points.reduce((acc, p) => ({
        pageViews: acc.pageViews + p.pageViews,
        impressions: acc.impressions + p.impressions,
        clicks: acc.clicks + p.clicks,
        revenue: acc.revenue + p.revenue,
    }), { pageViews: 0, impressions: 0, clicks: 0, revenue: 0 });

    return {
        date: points[0].date,
        ...totals,
        rpm: totals.pageViews > 0 ? (totals.revenue / totals.pageViews) * 1000 : 0,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.revenue / totals.clicks : 0,
    };
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get revenue for a specific site
 */
export function getSiteRevenue(siteId: string): SiteRevenue | undefined {
    return state.sites[siteId];
}

/**
 * Get revenue for specific content
 */
export function getContentRevenue(contentId: string): ContentRevenue | undefined {
    return state.content[contentId];
}

/**
 * Get revenue by campaign
 */
export function getCampaignRevenue(campaignId: string): {
    totalRevenue: number;
    totalPageViews: number;
    avgRPM: number;
    contentCount: number;
    content: ContentRevenue[];
} {
    const campaignContent = Object.values(state.content)
        .filter(c => c.campaignId === campaignId);

    const total = campaignContent.reduce((acc, c) => ({
        revenue: acc.revenue + c.revenue,
        pageViews: acc.pageViews + c.pageViews,
    }), { revenue: 0, pageViews: 0 });

    return {
        totalRevenue: total.revenue,
        totalPageViews: total.pageViews,
        avgRPM: total.pageViews > 0 ? (total.revenue / total.pageViews) * 1000 : 0,
        contentCount: campaignContent.length,
        content: campaignContent,
    };
}

/**
 * Get revenue by author
 */
export function getAuthorRevenue(authorId: string): {
    totalRevenue: number;
    totalPageViews: number;
    avgRPM: number;
    contentCount: number;
} {
    const authorContent = Object.values(state.content)
        .filter(c => c.authorId === authorId);

    const total = authorContent.reduce((acc, c) => ({
        revenue: acc.revenue + c.revenue,
        pageViews: acc.pageViews + c.pageViews,
    }), { revenue: 0, pageViews: 0 });

    return {
        totalRevenue: total.revenue,
        totalPageViews: total.pageViews,
        avgRPM: total.pageViews > 0 ? (total.revenue / total.pageViews) * 1000 : 0,
        contentCount: authorContent.length,
    };
}

/**
 * Get top performing content
 */
export function getTopContent(limit = 10, sortBy: 'revenue' | 'pageViews' | 'rpm' = 'revenue'): ContentRevenue[] {
    return Object.values(state.content)
        .sort((a, b) => b[sortBy] - a[sortBy])
        .slice(0, limit);
}

/**
 * Get revenue summary across all sites
 */
export function getTotalRevenueSummary(): {
    totalRevenue: number;
    totalPageViews: number;
    avgRPM: number;
    siteCount: number;
    contentCount: number;
} {
    const sites = Object.values(state.sites);
    const content = Object.values(state.content);

    const total = sites.reduce((acc, s) => ({
        revenue: acc.revenue + s.totalRevenue,
        pageViews: acc.pageViews + s.totalPageViews,
    }), { revenue: 0, pageViews: 0 });

    return {
        totalRevenue: total.revenue,
        totalPageViews: total.pageViews,
        avgRPM: total.pageViews > 0 ? (total.revenue / total.pageViews) * 1000 : 0,
        siteCount: sites.length,
        contentCount: content.length,
    };
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Update sync status
 */
export function setSyncStatus(status: RevenueTrackingState['syncStatus'], error?: string): void {
    state.syncStatus = status;
    state.syncError = error;
    if (status === 'idle') {
        state.lastSync = Date.now();
    }
}

/**
 * Import revenue data from external source
 */
export function importRevenueData(data: {
    siteId: string;
    domain: string;
    dataPoints: RevenueDataPoint[];
}): void {
    const { siteId, domain, dataPoints } = data;

    if (!state.sites[siteId]) {
        state.sites[siteId] = createEmptySiteRevenue(siteId);
    }

    const site = state.sites[siteId];
    site.domain = domain;

    // Aggregate all data points
    const allData = aggregateDataPoints(dataPoints);
    site.totalRevenue = allData.revenue;
    site.totalPageViews = allData.pageViews;
    site.avgRPM = allData.rpm;

    // Calculate trend
    if (dataPoints.length >= 14) {
        const recent = dataPoints.slice(-7);
        const previous = dataPoints.slice(-14, -7);

        const recentTotal = recent.reduce((s, p) => s + p.revenue, 0);
        const previousTotal = previous.reduce((s, p) => s + p.revenue, 0);

        if (previousTotal > 0) {
            const change = ((recentTotal - previousTotal) / previousTotal) * 100;
            site.trendPercent = Math.round(change);
            site.trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
        }
    }

    state.lastSync = Date.now();
}
