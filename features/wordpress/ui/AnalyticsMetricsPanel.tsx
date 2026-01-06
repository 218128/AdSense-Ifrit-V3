'use client';

/**
 * Analytics Metrics Panel
 * FSD: features/wordpress/ui/AnalyticsMetricsPanel.tsx
 * 
 * Key metrics panel for WP Sites view showing:
 * - Search Console: clicks, impressions, CTR, position
 * - Analytics: sessions, users, pageviews
 * - AdSense: revenue, RPM
 * - PageSpeed: Core Web Vitals
 */

import { useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Search,
    Users,
    DollarSign,
    Gauge,
    RefreshCw,
    Loader2,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';
import { useSiteAnalytics, generateMockAnalytics } from '../hooks/useSiteAnalytics';
import type { WPSite } from '../model/types';
import type { SiteAnalytics } from '../model/analyticsTypes';

interface AnalyticsMetricsPanelProps {
    site: WPSite;
    useMockData?: boolean;  // For development without Google API
}

export function AnalyticsMetricsPanel({ site, useMockData = true }: AnalyticsMetricsPanelProps) {
    const { analytics, isLoading, error, refreshAnalytics } = useSiteAnalytics(site);
    const [mockData] = useState<SiteAnalytics | null>(() =>
        useMockData ? generateMockAnalytics(site) : null
    );

    const data = useMockData ? mockData : analytics;

    const formatNumber = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toFixed(0);
    };

    const formatCurrency = (n: number) => `$${n.toFixed(2)}`;
    const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`;
    const formatChange = (current: number, previous: number) => {
        if (!previous) return null;
        const change = ((current - previous) / previous) * 100;
        return { value: change, isPositive: change >= 0 };
    };

    if (isLoading) {
        return (
            <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading analytics...</span>
                </div>
            </div>
        );
    }

    if (error && !useMockData) {
        return (
            <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                    <div>
                        <p className="font-medium">Analytics not available</p>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                    <a
                        href="https://wordpress.org/plugins/google-site-kit/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        Install Site Kit by Google
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="border border-border rounded-lg p-6 bg-card">
                <p className="text-center text-muted-foreground">No analytics data available</p>
            </div>
        );
    }

    return (
        <div className="border border-border rounded-lg bg-card">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-medium flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-primary" />
                    Analytics Overview
                    {useMockData && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-600 rounded-full">
                            Demo Data
                        </span>
                    )}
                </h3>
                <button
                    onClick={refreshAnalytics}
                    disabled={isLoading}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    title="Refresh analytics"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                {/* Search Console - Clicks */}
                {data.searchConsole && (
                    <MetricCard
                        icon={<Search className="w-4 h-4" />}
                        label="Clicks"
                        value={formatNumber(data.searchConsole.current.clicks)}
                        change={formatChange(
                            data.searchConsole.current.clicks,
                            data.searchConsole.previous?.clicks || 0
                        )}
                        color="blue"
                    />
                )}

                {/* Search Console - Impressions */}
                {data.searchConsole && (
                    <MetricCard
                        icon={<Search className="w-4 h-4" />}
                        label="Impressions"
                        value={formatNumber(data.searchConsole.current.impressions)}
                        change={formatChange(
                            data.searchConsole.current.impressions,
                            data.searchConsole.previous?.impressions || 0
                        )}
                        color="purple"
                    />
                )}

                {/* Analytics - Sessions */}
                {data.analytics && (
                    <MetricCard
                        icon={<Users className="w-4 h-4" />}
                        label="Sessions"
                        value={formatNumber(data.analytics.current.sessions)}
                        change={formatChange(
                            data.analytics.current.sessions,
                            data.analytics.previous?.sessions || 0
                        )}
                        color="green"
                    />
                )}

                {/* AdSense - Revenue */}
                {data.adsense && (
                    <MetricCard
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Revenue"
                        value={formatCurrency(data.adsense.current.revenue)}
                        change={formatChange(
                            data.adsense.current.revenue,
                            data.adsense.previous?.revenue || 0
                        )}
                        color="emerald"
                    />
                )}
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 pb-4">
                {data.searchConsole && (
                    <>
                        <SmallMetric
                            label="CTR"
                            value={formatPercent(data.searchConsole.current.ctr)}
                        />
                        <SmallMetric
                            label="Avg Position"
                            value={data.searchConsole.current.position.toFixed(1)}
                        />
                    </>
                )}
                {data.adsense && (
                    <>
                        <SmallMetric
                            label="RPM"
                            value={`$${data.adsense.current.rpm.toFixed(2)}`}
                        />
                        <SmallMetric
                            label="Ad Clicks"
                            value={formatNumber(data.adsense.current.clicks)}
                        />
                    </>
                )}
            </div>

            {/* PageSpeed */}
            {data.pageSpeed && (
                <div className="border-t border-border p-4">
                    <p className="text-sm text-muted-foreground mb-2">Core Web Vitals</p>
                    <div className="grid grid-cols-4 gap-2">
                        <VitalScore label="Performance" score={data.pageSpeed.performance} />
                        <VitalScore label="SEO" score={data.pageSpeed.seo} />
                        <VitalScore label="Accessibility" score={data.pageSpeed.accessibility} />
                        <VitalScore label="Best Practices" score={data.pageSpeed.bestPractices} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Sub-components
// ============================================================================

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    change?: { value: number; isPositive: boolean } | null;
    color: 'blue' | 'purple' | 'green' | 'emerald';
}

function MetricCard({ icon, label, value, change, color }: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-600',
        purple: 'bg-purple-500/10 text-purple-600',
        green: 'bg-green-500/10 text-green-600',
        emerald: 'bg-emerald-500/10 text-emerald-600',
    };

    return (
        <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded ${colorClasses[color]}`}>
                    {icon}
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{value}</span>
                {change && (
                    <span className={`text-xs flex items-center gap-0.5 ${change.isPositive ? 'text-green-600' : 'text-red-500'
                        }`}>
                        {change.isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                        ) : (
                            <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(change.value).toFixed(1)}%
                    </span>
                )}
            </div>
        </div>
    );
}

interface SmallMetricProps {
    label: string;
    value: string;
}

function SmallMetric({ label, value }: SmallMetricProps) {
    return (
        <div className="text-center p-2 rounded bg-muted/20">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    );
}

interface VitalScoreProps {
    label: string;
    score: number;
}

function VitalScore({ label, score }: VitalScoreProps) {
    const getColor = (s: number) => {
        if (s >= 90) return 'text-green-600 bg-green-500/10';
        if (s >= 50) return 'text-amber-600 bg-amber-500/10';
        return 'text-red-600 bg-red-500/10';
    };

    return (
        <div className="text-center">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${getColor(score)}`}>
                {score}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
    );
}
