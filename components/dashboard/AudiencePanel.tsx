'use client';

/**
 * Audience Panel
 * FSD: components/dashboard/AudiencePanel.tsx
 *
 * Dashboard panel for audience growth metrics.
 * Shows owned vs rented audience, growth strategy, and recommendations.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Users,
    Mail,
    MessageCircle,
    TrendingUp,
    Target,
    Share2,
    RefreshCw,
    ChevronRight,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import {
    getAudienceMetrics,
    getAudienceSummary,
    analyzeGrowthStrategy,
    type AudienceMetrics,
    type GrowthStrategy,
} from '@/lib/growth';

export function AudiencePanel() {
    const [metrics, setMetrics] = useState<AudienceMetrics | null>(null);
    const [strategy, setStrategy] = useState<GrowthStrategy | null>(null);
    const [summary, setSummary] = useState<ReturnType<typeof getAudienceSummary> | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(() => {
        setLoading(true);
        try {
            const metricsData = getAudienceMetrics();
            const summaryData = getAudienceSummary();

            setMetrics(metricsData);
            setSummary(summaryData);

            if (metricsData) {
                setStrategy(analyzeGrowthStrategy(metricsData));
            }
        } catch (error) {
            console.error('Failed to load audience data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-green-600';
        if (score >= 40) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 70) return 'bg-green-500';
        if (score >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
        );
    }

    // Empty state
    if (!metrics && !summary?.totalReach) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-neutral-800">Audience Development</h3>
                </div>

                <div className="text-center py-8 bg-neutral-50 rounded-xl border border-neutral-200">
                    <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <h4 className="font-medium text-neutral-700 mb-2">Start Building Your Audience</h4>
                    <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-4">
                        Track your email lists, social followers, and community members to optimize for owned audience.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            Connect Email Provider
                        </button>
                    </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                        <p className="text-xs text-blue-800">
                            <strong>Tip:</strong> Email subscribers are 4x more valuable than social followers.
                            Focus on building owned audience for stable, repeatable revenue.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-neutral-800">Audience Development</h3>
                </div>
                <button
                    onClick={loadData}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                    <div className="text-xs text-indigo-600 mb-1">Total Reach</div>
                    <div className="text-xl font-bold text-indigo-800">
                        {summary?.totalReach.toLocaleString() || 0}
                    </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="text-xs text-green-600 mb-1">Owned Audience</div>
                    <div className="text-xl font-bold text-green-800">
                        {summary?.ownedAudience.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-green-600">{summary?.ownedPercentage || 0}% of total</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="text-xs text-neutral-500 mb-1">Monthly Growth</div>
                    <div className="text-xl font-bold text-neutral-800">
                        {summary?.monthlyGrowth ? `+${summary.monthlyGrowth}%` : '—'}
                    </div>
                </div>
            </div>

            {/* Channel Breakdown */}
            {metrics && (
                <div className="grid grid-cols-2 gap-3">
                    {/* Email */}
                    <div className="p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                            <Mail className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium">Email List</span>
                        </div>
                        <div className="text-lg font-bold">{metrics.emailList.totalSubscribers.toLocaleString()}</div>
                        <div className="flex gap-3 text-xs text-neutral-500 mt-1">
                            <span>{(metrics.emailList.openRate * 100).toFixed(1)}% open</span>
                            <span>{(metrics.emailList.clickRate * 100).toFixed(1)}% click</span>
                        </div>
                    </div>

                    {/* Social */}
                    <div className="p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                            <Share2 className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">Social</span>
                        </div>
                        <div className="text-lg font-bold">{metrics.social.totalFollowers.toLocaleString()}</div>
                        <div className="flex gap-3 text-xs text-neutral-500 mt-1">
                            <span>LI: {metrics.social.linkedinFollowers}</span>
                            <span>X: {metrics.social.twitterFollowers}</span>
                            <span>YT: {metrics.social.youtubeSubscribers}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Strategy Scores */}
            {strategy && (
                <div className="p-3 bg-neutral-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium">Growth Strategy</span>
                        <span className={`ml-auto text-sm font-bold ${getScoreColor(strategy.overallHealth)}`}>
                            {strategy.overallHealth}/100
                        </span>
                    </div>

                    {/* Score Bars */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-24 text-neutral-600">Owned Channels</span>
                            <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getScoreBg(strategy.ownedChannels)}`}
                                    style={{ width: `${strategy.ownedChannels}%` }}
                                />
                            </div>
                            <span className="text-xs w-8 text-right">{strategy.ownedChannels}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-24 text-neutral-600">Network Build</span>
                            <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getScoreBg(strategy.networkBuild)}`}
                                    style={{ width: `${strategy.networkBuild}%` }}
                                />
                            </div>
                            <span className="text-xs w-8 text-right">{strategy.networkBuild}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-24 text-neutral-600">Content Reuse</span>
                            <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getScoreBg(strategy.contentReuse)}`}
                                    style={{ width: `${strategy.contentReuse}%` }}
                                />
                            </div>
                            <span className="text-xs w-8 text-right">{strategy.contentReuse}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {strategy && strategy.recommendations.length > 0 && (
                <div className="space-y-1.5">
                    {strategy.recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-800">
                            <TrendingUp className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AudiencePanel;
