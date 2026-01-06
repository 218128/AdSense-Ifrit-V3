/**
 * useSiteAnalytics Hook
 * FSD: features/wordpress/hooks/useSiteAnalytics.ts
 * 
 * Fetches analytics data from Google APIs for WP Sites.
 * Integrates with Site Kit plugin data and Google APIs.
 */

import { useState, useCallback, useEffect } from 'react';
import { useGlobalActionStatus } from '@/lib/shared/hooks/useGlobalActionStatus';
import type { WPSite } from '../model/types';
import type {
    SiteAnalytics,
    MultiSiteAnalytics,
    SearchConsoleMetrics,
    AnalyticsMetrics,
} from '../model/analyticsTypes';

export interface UseSiteAnalyticsReturn {
    // State
    analytics: SiteAnalytics | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchAnalytics: (site: WPSite) => Promise<SiteAnalytics | null>;
    fetchMultiSiteAnalytics: (sites: WPSite[]) => Promise<MultiSiteAnalytics | null>;
    refreshAnalytics: () => Promise<void>;
}

export function useSiteAnalytics(site?: WPSite): UseSiteAnalyticsReturn {
    const [analytics, setAnalytics] = useState<SiteAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { trackAction } = useGlobalActionStatus();

    /**
     * Fetch analytics for a single site
     */
    const fetchAnalytics = useCallback(async (targetSite: WPSite): Promise<SiteAnalytics | null> => {
        setIsLoading(true);
        setError(null);

        return trackAction(
            `Fetching analytics for ${targetSite.domain}`,
            async (updateProgress) => {
                try {
                    updateProgress({ phase: 'starting', message: 'Connecting to Google APIs...' });

                    // Call our API route that handles Google API auth
                    const response = await fetch(`/api/wp-sites/${targetSite.id}/analytics`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (!response.ok) {
                        // If 401, user needs to connect Google account
                        if (response.status === 401) {
                            throw new Error('Google account not connected. Install Site Kit and connect your Google account.');
                        }
                        throw new Error('Failed to fetch analytics');
                    }

                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.error || 'Analytics fetch failed');
                    }

                    const siteAnalytics: SiteAnalytics = {
                        siteId: targetSite.id,
                        domain: targetSite.domain,
                        searchConsole: data.searchConsole,
                        analytics: data.analytics,
                        adsense: data.adsense,
                        pageSpeed: data.pageSpeed,
                        lastUpdated: new Date().toISOString(),
                    };

                    setAnalytics(siteAnalytics);
                    updateProgress({ phase: 'complete', message: 'Analytics loaded' });

                    return siteAnalytics;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch analytics';
                    setError(errorMsg);
                    updateProgress({ phase: 'complete', message: errorMsg, success: false });
                    return null;
                } finally {
                    setIsLoading(false);
                }
            },
            { feature: 'wp-sites', siteId: targetSite.id }
        );
    }, [trackAction]);

    /**
     * Fetch and aggregate analytics for multiple sites
     */
    const fetchMultiSiteAnalytics = useCallback(async (sites: WPSite[]): Promise<MultiSiteAnalytics | null> => {
        setIsLoading(true);
        setError(null);

        return trackAction(
            `Aggregating analytics for ${sites.length} sites`,
            async (updateProgress) => {
                try {
                    const siteAnalytics: SiteAnalytics[] = [];

                    for (let i = 0; i < sites.length; i++) {
                        const site = sites[i];
                        updateProgress({
                            phase: 'handler',
                            message: `Fetching ${site.domain}...`,
                            current: i + 1,
                            total: sites.length,
                        });

                        const response = await fetch(`/api/wp-sites/${site.id}/analytics`);

                        if (response.ok) {
                            const data = await response.json();
                            if (data.success) {
                                siteAnalytics.push({
                                    siteId: site.id,
                                    domain: site.domain,
                                    searchConsole: data.searchConsole,
                                    analytics: data.analytics,
                                    adsense: data.adsense,
                                    pageSpeed: data.pageSpeed,
                                    lastUpdated: new Date().toISOString(),
                                });
                            }
                        }
                    }

                    // Aggregate totals
                    const totals = {
                        clicks: 0,
                        impressions: 0,
                        sessions: 0,
                        revenue: 0,
                    };

                    let prevClicks = 0, prevSessions = 0, prevRevenue = 0;

                    for (const sa of siteAnalytics) {
                        if (sa.searchConsole?.current) {
                            totals.clicks += sa.searchConsole.current.clicks;
                            totals.impressions += sa.searchConsole.current.impressions;
                            prevClicks += sa.searchConsole.previous?.clicks || 0;
                        }
                        if (sa.analytics?.current) {
                            totals.sessions += sa.analytics.current.sessions;
                            prevSessions += sa.analytics.previous?.sessions || 0;
                        }
                        if (sa.adsense?.current) {
                            totals.revenue += sa.adsense.current.revenue;
                            prevRevenue += sa.adsense.previous?.revenue || 0;
                        }
                    }

                    const multiSite: MultiSiteAnalytics = {
                        sites: siteAnalytics,
                        totals,
                        trends: {
                            clicksChange: prevClicks > 0 ? ((totals.clicks - prevClicks) / prevClicks) * 100 : 0,
                            sessionsChange: prevSessions > 0 ? ((totals.sessions - prevSessions) / prevSessions) * 100 : 0,
                            revenueChange: prevRevenue > 0 ? ((totals.revenue - prevRevenue) / prevRevenue) * 100 : 0,
                        },
                        topSiteByClicks: siteAnalytics.sort((a, b) =>
                            (b.searchConsole?.current.clicks || 0) - (a.searchConsole?.current.clicks || 0)
                        )[0]?.domain,
                        topSiteByRevenue: siteAnalytics.sort((a, b) =>
                            (b.adsense?.current.revenue || 0) - (a.adsense?.current.revenue || 0)
                        )[0]?.domain,
                        lastUpdated: new Date().toISOString(),
                    };

                    updateProgress({ phase: 'complete', message: `Loaded ${siteAnalytics.length} sites` });
                    return multiSite;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Failed to aggregate analytics';
                    setError(errorMsg);
                    return null;
                } finally {
                    setIsLoading(false);
                }
            },
            { feature: 'wp-sites', siteId: 'multi' }
        );
    }, [trackAction]);

    /**
     * Refresh current site analytics
     */
    const refreshAnalytics = useCallback(async () => {
        if (site) {
            await fetchAnalytics(site);
        }
    }, [site, fetchAnalytics]);

    // Auto-fetch on mount if site provided
    useEffect(() => {
        if (site && !analytics) {
            fetchAnalytics(site);
        }
    }, [site, analytics, fetchAnalytics]);

    return {
        analytics,
        isLoading,
        error,
        fetchAnalytics,
        fetchMultiSiteAnalytics,
        refreshAnalytics,
    };
}

// ============================================================================
// Mock Data Generator (for development without Google API)
// ============================================================================

export function generateMockAnalytics(site: WPSite): SiteAnalytics {
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

    const currentSearchConsole: SearchConsoleMetrics = {
        clicks: randomInt(500, 5000),
        impressions: randomInt(10000, 100000),
        ctr: randomFloat(0.02, 0.08),
        position: randomFloat(5, 25),
        period: 'week',
        date: new Date().toISOString(),
    };

    const currentAnalytics: AnalyticsMetrics = {
        sessions: randomInt(1000, 10000),
        users: randomInt(800, 8000),
        pageviews: randomInt(2000, 20000),
        bounceRate: randomFloat(40, 70),
        avgSessionDuration: randomFloat(60, 180),
        period: 'week',
        date: new Date().toISOString(),
    };

    return {
        siteId: site.id,
        domain: site.domain,
        searchConsole: {
            current: currentSearchConsole,
            previous: {
                ...currentSearchConsole,
                clicks: Math.floor(currentSearchConsole.clicks * randomFloat(0.8, 1.2)),
                impressions: Math.floor(currentSearchConsole.impressions * randomFloat(0.8, 1.2)),
            },
            topQueries: [
                { query: 'best coffee maker', clicks: randomInt(50, 200), impressions: randomInt(500, 2000), ctr: 0.1, position: 8 },
                { query: 'coffee brewing tips', clicks: randomInt(30, 150), impressions: randomInt(300, 1500), ctr: 0.08, position: 12 },
                { query: 'how to make coffee', clicks: randomInt(20, 100), impressions: randomInt(200, 1000), ctr: 0.06, position: 15 },
            ],
            topPages: [
                { page: '/best-coffee-makers/', clicks: randomInt(100, 500), impressions: randomInt(1000, 5000), ctr: 0.1, position: 5 },
                { page: '/coffee-brewing-guide/', clicks: randomInt(80, 400), impressions: randomInt(800, 4000), ctr: 0.08, position: 8 },
            ],
        },
        analytics: {
            current: currentAnalytics,
            previous: {
                ...currentAnalytics,
                sessions: Math.floor(currentAnalytics.sessions * randomFloat(0.85, 1.15)),
            },
            topSources: [
                { source: 'google', medium: 'organic', sessions: randomInt(500, 3000), users: randomInt(400, 2500), percentage: 60 },
                { source: 'direct', medium: '(none)', sessions: randomInt(200, 1000), users: randomInt(150, 800), percentage: 25 },
                { source: 'facebook', medium: 'social', sessions: randomInt(50, 300), users: randomInt(40, 250), percentage: 10 },
            ],
            topPages: [
                { path: '/best-coffee-makers/', title: 'Best Coffee Makers 2026', pageviews: randomInt(500, 2000), avgTimeOnPage: 120, bounceRate: 45 },
                { path: '/coffee-brewing-guide/', title: 'Complete Coffee Guide', pageviews: randomInt(400, 1500), avgTimeOnPage: 180, bounceRate: 35 },
            ],
        },
        adsense: {
            current: {
                revenue: randomFloat(50, 500),
                clicks: randomInt(100, 1000),
                impressions: randomInt(5000, 50000),
                ctr: randomFloat(0.01, 0.03),
                rpm: randomFloat(2, 8),
                period: 'week',
                date: new Date().toISOString(),
            },
            previous: {
                revenue: randomFloat(40, 450),
                clicks: randomInt(80, 900),
                impressions: randomInt(4000, 45000),
                ctr: randomFloat(0.01, 0.03),
                rpm: randomFloat(2, 8),
                period: 'week',
                date: new Date().toISOString(),
            },
        },
        pageSpeed: {
            performance: randomInt(70, 95),
            accessibility: randomInt(85, 100),
            bestPractices: randomInt(80, 100),
            seo: randomInt(90, 100),
            lcp: randomFloat(1.5, 3.5),
            fid: randomFloat(50, 150),
            cls: randomFloat(0.01, 0.15),
            fetchedAt: new Date().toISOString(),
        },
        lastUpdated: new Date().toISOString(),
    };
}
