'use client';

/**
 * Analytics Panel
 * 
 * Content strategy analytics and recommendations.
 * Wires lib/analytics/recommendations to the Dashboard.
 */

import { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, Target, Lightbulb, RefreshCw,
    AlertCircle, CheckCircle, Info, DollarSign, FileText
} from 'lucide-react';
import {
    getContentHistory,
    generateAnalytics,
    AnalyticsSummary,
    Recommendation
} from '@/lib/analytics/recommendations';

export function AnalyticsPanel() {
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    const loadAnalytics = () => {
        setLoading(true);
        try {
            const history = getContentHistory();
            if (history.length > 0) {
                const analyticsSummary = generateAnalytics();
                setSummary(analyticsSummary);
            } else {
                setSummary(null);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);


    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-amber-100';
        return 'bg-red-100';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">No Analytics Data Yet</h3>
                <p className="text-neutral-500 max-w-md mx-auto">
                    Generate some articles to see content strategy analytics and personalized recommendations.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold">Content Strategy Analytics</h3>
                </div>
                <button
                    onClick={loadAnalytics}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-neutral-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Score Overview */}
            <div className="grid grid-cols-5 gap-4">
                <div className={`p-4 rounded-xl ${getScoreBg(summary.score.overall)}`}>
                    <div className={`text-3xl font-bold ${getScoreColor(summary.score.overall)}`}>
                        {summary.score.overall}
                    </div>
                    <div className="text-sm text-neutral-600">Overall Score</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-neutral-800">{summary.score.cpcOptimization}</div>
                    <div className="text-sm text-neutral-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> CPC Optimization
                    </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-neutral-800">{summary.score.contentDiversity}</div>
                    <div className="text-sm text-neutral-500 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Content Diversity
                    </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-neutral-800">{summary.score.nicheBalance}</div>
                    <div className="text-sm text-neutral-500 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Niche Balance
                    </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-neutral-800">{summary.score.publishingFrequency}</div>
                    <div className="text-sm text-neutral-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Publishing
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                <div>
                    <div className="text-2xl font-bold text-indigo-700">{summary.totalArticles}</div>
                    <div className="text-sm text-indigo-600">Total Articles</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-indigo-700">{summary.avgWordCount.toLocaleString()}</div>
                    <div className="text-sm text-indigo-600">Avg Word Count</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-indigo-700">${summary.avgCPCScore.toFixed(2)}</div>
                    <div className="text-sm text-indigo-600">Avg CPC Score</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-indigo-700">{Object.keys(summary.nicheDistribution).length}</div>
                    <div className="text-sm text-indigo-600">Niches Covered</div>
                </div>
            </div>

            {/* Niche Distribution */}
            <div className="bg-white border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    Niche Distribution
                </h4>
                <div className="space-y-2">
                    {Object.entries(summary.nicheDistribution)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([niche, count]) => (
                            <div key={niche} className="flex items-center gap-3">
                                <div className="w-32 text-sm font-medium truncate">{niche}</div>
                                <div className="flex-1 h-4 bg-neutral-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${(count / summary.totalArticles) * 100}%` }}
                                    />
                                </div>
                                <div className="w-12 text-right text-sm text-neutral-600">{count}</div>
                            </div>
                        ))}
                </div>
                {summary.underutilizedNiches.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-amber-700">
                            💡 Underutilized: {summary.underutilizedNiches.slice(0, 3).join(', ')}
                        </p>
                    </div>
                )}
            </div>

            {/* Recommendations */}
            <div className="bg-white border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Recommendations
                </h4>
                {summary.recommendations.length > 0 ? (
                    <div className="space-y-3">
                        {summary.recommendations.slice(0, 5).map((rec, i) => (
                            <RecommendationCard key={i} recommendation={rec} />
                        ))}
                    </div>
                ) : (
                    <p className="text-neutral-500 text-sm">
                        No recommendations at this time. Keep up the great work!
                    </p>
                )}
            </div>
        </div>
    );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
    const getPriorityColor = (type: string) => {
        switch (type) {
            case 'high_priority': return 'border-l-red-500 bg-red-50';
            case 'medium_priority': return 'border-l-amber-500 bg-amber-50';
            case 'low_priority': return 'border-l-green-500 bg-green-50';
            default: return 'border-l-blue-500 bg-blue-50';
        }
    };

    return (
        <div className={`border-l-4 rounded-r-lg p-3 ${getPriorityColor(recommendation.type)}`}>
            <div className="flex items-start gap-2">
                <div className="flex-1">
                    <h5 className="font-medium text-sm">{recommendation.title}</h5>
                    <p className="text-xs text-neutral-600 mt-0.5">{recommendation.description}</p>
                    <p className="text-xs text-indigo-600 mt-1 font-medium">
                        → {recommendation.action}
                    </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${recommendation.impact === 'high' ? 'bg-red-100 text-red-700' :
                    recommendation.impact === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                    {recommendation.impact} impact
                </span>
            </div>
        </div>
    );
}

export default AnalyticsPanel;
