'use client';

/**
 * Revenue Panel
 * 
 * AdSense earnings dashboard with daily/weekly/monthly views.
 * Wires lib/monetization/adsenseClient to the Dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    DollarSign, TrendingUp, TrendingDown, RefreshCw,
    Calendar, BarChart3, ArrowUpRight, Clock
} from 'lucide-react';

interface EarningsData {
    today: number;
    yesterday: number;
    last7Days: number;
    last30Days: number;
    thisMonth: number;
    lastMonth: number;
    dailyTrend: Array<{ date: string; amount: number }>;
    topPages: Array<{ url: string; earnings: number; pageViews: number }>;
}

export function RevenuePanel() {
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const loadEarnings = useCallback(async () => {
        setLoading(true);
        try {
            // Check if AdSense OAuth is configured
            const { useSettingsStore } = await import('@/stores/settingsStore');
            const oauth = useSettingsStore.getState().adsenseOAuth;

            if (!oauth?.refreshToken) {
                setEarnings(null);
                return;
            }

            // Fetch from local revenue tracker
            const { getTotalRevenueSummary, getTopContent } = await import('@/lib/monetization');
            const summary = getTotalRevenueSummary();
            const topContent = getTopContent(5, 'revenue');

            // Build earnings data from tracker
            // Note: Revenue tracker aggregates don't have time-period breakdowns
            // Those come from actual AdSense sync via the API
            setEarnings({
                today: 0,       // Populated via AdSense sync
                yesterday: 0,   // Populated via AdSense sync
                last7Days: 0,   // Populated via AdSense sync
                last30Days: summary.totalRevenue,  // Total known revenue
                thisMonth: summary.totalRevenue,
                lastMonth: 0,
                dailyTrend: [],
                topPages: topContent.map(c => ({
                    url: c.contentUrl || c.contentId,
                    earnings: c.revenue,
                    pageViews: c.pageViews,
                })),
            });

            setLastSync(new Date());
        } catch (error) {
            console.error('Failed to load earnings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const syncFromAdSense = async () => {
        setSyncing(true);
        try {
            const response = await fetch('/api/monetization/adsense/sync', {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                // Update earnings with synced data if available
                if (data.earnings) {
                    setEarnings(prev => prev ? {
                        ...prev,
                        ...data.earnings,
                    } : prev);
                }
                setLastSync(new Date());
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        loadEarnings();
    }, [loadEarnings]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const getTrendIcon = (current: number, previous: number) => {
        if (current > previous) {
            return <TrendingUp className="w-4 h-4 text-green-500" />;
        } else if (current < previous) {
            return <TrendingDown className="w-4 h-4 text-red-500" />;
        }
        return null;
    };

    const getTrendPercent = (current: number, previous: number) => {
        if (previous === 0) return null;
        const change = ((current - previous) / previous) * 100;
        const isPositive = change >= 0;
        return (
            <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
            </div>
        );
    }

    if (!earnings) {
        return (
            <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">Connect AdSense</h3>
                <p className="text-neutral-500 max-w-md mx-auto mb-4">
                    Configure your AdSense OAuth credentials in Settings to view live revenue data.
                </p>
                <a
                    href="#settings"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Go to Settings
                    <ArrowUpRight className="w-4 h-4" />
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold">Revenue Dashboard</h3>
                </div>
                <div className="flex items-center gap-3">
                    {lastSync && (
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Synced {lastSync.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={syncFromAdSense}
                        disabled={syncing}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-neutral-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                </div>
            </div>

            {/* Primary Earnings Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-green-700">Today</span>
                        {getTrendIcon(earnings.today, earnings.yesterday)}
                    </div>
                    <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(earnings.today)}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                        vs {formatCurrency(earnings.yesterday)} yesterday
                        {getTrendPercent(earnings.today, earnings.yesterday)}
                    </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-600">Last 7 Days</span>
                        <Calendar className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div className="text-2xl font-bold text-neutral-800">
                        {formatCurrency(earnings.last7Days)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                        ~{formatCurrency(earnings.last7Days / 7)}/day avg
                    </div>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-600">Last 30 Days</span>
                        <Calendar className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div className="text-2xl font-bold text-neutral-800">
                        {formatCurrency(earnings.last30Days)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                        ~{formatCurrency(earnings.last30Days / 30)}/day avg
                    </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-indigo-700">This Month</span>
                        {getTrendIcon(earnings.thisMonth, earnings.lastMonth)}
                    </div>
                    <div className="text-2xl font-bold text-indigo-800">
                        {formatCurrency(earnings.thisMonth)}
                    </div>
                    <div className="text-xs text-indigo-600 mt-1">
                        vs {formatCurrency(earnings.lastMonth)} last month
                        {getTrendPercent(earnings.thisMonth, earnings.lastMonth)}
                    </div>
                </div>
            </div>

            {/* Daily Trend Chart Placeholder */}
            <div className="bg-white border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Daily Earnings Trend
                </h4>
                {earnings.dailyTrend.length > 0 ? (
                    <div className="h-48 flex items-end gap-1">
                        {earnings.dailyTrend.map((day, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                                style={{
                                    height: `${(day.amount / Math.max(...earnings.dailyTrend.map(d => d.amount))) * 100}%`,
                                    minHeight: '4px',
                                }}
                                title={`${day.date}: ${formatCurrency(day.amount)}`}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-48 flex items-center justify-center text-neutral-400">
                        <p>Sync with AdSense to view daily trends</p>
                    </div>
                )}
            </div>

            {/* Top Earning Content */}
            <div className="bg-white border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Top Earning Content
                </h4>
                {earnings.topPages.length > 0 ? (
                    <div className="space-y-1">
                        {/* Table Header */}
                        <div className="flex items-center gap-3 px-2 py-1 text-xs font-medium text-neutral-500 border-b">
                            <span className="w-6">#</span>
                            <span className="flex-1">Content</span>
                            <span className="w-20 text-right">Views</span>
                            <span className="w-20 text-right">Revenue</span>
                            <span className="w-20 text-right">RPM</span>
                        </div>
                        {/* Top Pages Rows */}
                        {earnings.topPages.map((page, i) => {
                            // Calculate RPM (Revenue Per Mille - per 1000 views)
                            const rpm = page.pageViews > 0
                                ? (page.earnings / page.pageViews) * 1000
                                : 0;
                            const rpmColor = rpm >= 10 ? 'text-green-600' : rpm >= 5 ? 'text-amber-600' : 'text-neutral-600';

                            return (
                                <div key={i} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg">
                                    <span className="text-sm font-medium text-neutral-400 w-6">#{i + 1}</span>
                                    <div className="flex-1 truncate text-sm" title={page.url}>{page.url}</div>
                                    <div className="w-20 text-right text-sm text-neutral-600">
                                        {page.pageViews.toLocaleString()}
                                    </div>
                                    <div className="w-20 text-right font-medium text-green-600">
                                        {formatCurrency(page.earnings)}
                                    </div>
                                    <div className={`w-20 text-right text-sm font-medium ${rpmColor}`}>
                                        ${rpm.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Summary Row */}
                        <div className="flex items-center gap-3 px-2 py-2 mt-2 border-t text-sm font-medium">
                            <span className="w-6"></span>
                            <span className="flex-1 text-neutral-500">Total</span>
                            <span className="w-20 text-right text-neutral-700">
                                {earnings.topPages.reduce((sum, p) => sum + p.pageViews, 0).toLocaleString()}
                            </span>
                            <span className="w-20 text-right text-green-700">
                                {formatCurrency(earnings.topPages.reduce((sum, p) => sum + p.earnings, 0))}
                            </span>
                            <span className="w-20 text-right text-neutral-500">
                                —
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="text-neutral-500 text-sm py-4 text-center">
                        Enable page-level reporting in AdSense to see top content
                    </p>
                )}
            </div>
        </div>
    );
}

export default RevenuePanel;
