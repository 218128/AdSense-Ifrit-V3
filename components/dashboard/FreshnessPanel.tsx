'use client';

/**
 * Freshness Panel
 * 
 * Content freshness dashboard showing stale content and review queue.
 * Wires lib/seo/contentFreshnessManager to the Dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Clock, RefreshCw, AlertTriangle, CheckCircle,
    Calendar, FileText, ChevronRight, Timer
} from 'lucide-react';
import type { ContentFreshness } from '@/lib/seo/contentFreshnessManager';

export function FreshnessPanel() {
    const [staleContent, setStaleContent] = useState<ContentFreshness[]>([]);
    const [dueForReview, setDueForReview] = useState<ContentFreshness[]>([]);
    const [summary, setSummary] = useState({
        total: 0,
        fresh: 0,
        aging: 0,
        stale: 0,
        avgScore: 0,
    });
    const [loading, setLoading] = useState(true);

    const loadFreshness = useCallback(async () => {
        setLoading(true);
        try {
            const {
                getStaleContent,
                getContentDueForReview,
                getFreshnessSummary,
            } = await import('@/lib/seo/contentFreshnessManager');

            setStaleContent(getStaleContent(60, 10));
            setDueForReview(getContentDueForReview());
            setSummary(getFreshnessSummary());
        } catch (error) {
            console.error('Failed to load freshness data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleMarkUpdated = async (contentId: string) => {
        const { markAsUpdated } = await import('@/lib/seo/contentFreshnessManager');
        markAsUpdated(contentId);
        loadFreshness();
    };

    useEffect(() => {
        loadFreshness();
    }, [loadFreshness]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        if (score >= 40) return 'text-orange-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-amber-100';
        if (score >= 40) return 'bg-orange-100';
        return 'bg-red-100';
    };

    const getPriorityBadge = (priority: ContentFreshness['reviewPriority']) => {
        const colors = {
            critical: 'bg-red-100 text-red-700',
            high: 'bg-orange-100 text-orange-700',
            medium: 'bg-amber-100 text-amber-700',
            low: 'bg-green-100 text-green-700',
        };
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors[priority]}`}>
                {priority}
            </span>
        );
    };

    const getActionBadge = (action: ContentFreshness['suggestedAction']) => {
        const labels: Record<string, { label: string; color: string }> = {
            minor_update: { label: 'Minor Update', color: 'bg-blue-100 text-blue-700' },
            major_rewrite: { label: 'Major Rewrite', color: 'bg-purple-100 text-purple-700' },
            republish: { label: 'Republish', color: 'bg-indigo-100 text-indigo-700' },
            archive: { label: 'Archive', color: 'bg-neutral-100 text-neutral-700' },
            no_action: { label: 'No Action', color: 'bg-green-100 text-green-700' },
        };
        const config = labels[action] || labels.no_action;
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                {config.label}
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

    if (summary.total === 0) {
        return (
            <div className="text-center py-12">
                <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-700 mb-2">No Content Tracked</h3>
                <p className="text-neutral-500 max-w-md mx-auto">
                    Published articles will automatically be tracked for freshness.
                    Publish content to see freshness analytics.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold">Content Freshness</h3>
                </div>
                <button
                    onClick={loadFreshness}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-neutral-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-neutral-800">{summary.total}</div>
                    <div className="text-sm text-neutral-500">Total Content</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div className="text-2xl font-bold text-green-700">{summary.fresh}</div>
                    </div>
                    <div className="text-sm text-green-600">Fresh</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                    <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-amber-600" />
                        <div className="text-2xl font-bold text-amber-700">{summary.aging}</div>
                    </div>
                    <div className="text-sm text-amber-600">Aging</div>
                </div>
                <div className="p-4 bg-red-50 rounded-xl">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div className="text-2xl font-bold text-red-700">{summary.stale}</div>
                    </div>
                    <div className="text-sm text-red-600">Stale</div>
                </div>
                <div className={`p-4 rounded-xl ${getScoreBg(summary.avgScore)}`}>
                    <div className={`text-2xl font-bold ${getScoreColor(summary.avgScore)}`}>
                        {summary.avgScore}
                    </div>
                    <div className="text-sm text-neutral-600">Avg Score</div>
                </div>
            </div>

            {/* Freshness Distribution Bar */}
            <div className="bg-white border rounded-xl p-4">
                <h4 className="font-medium mb-3 text-sm text-neutral-700">Content Health Distribution</h4>
                <div className="h-4 flex rounded-full overflow-hidden">
                    {summary.fresh > 0 && (
                        <div
                            className="bg-green-500"
                            style={{ width: `${(summary.fresh / summary.total) * 100}%` }}
                            title={`Fresh: ${summary.fresh}`}
                        />
                    )}
                    {summary.aging > 0 && (
                        <div
                            className="bg-amber-400"
                            style={{ width: `${(summary.aging / summary.total) * 100}%` }}
                            title={`Aging: ${summary.aging}`}
                        />
                    )}
                    {summary.stale > 0 && (
                        <div
                            className="bg-red-500"
                            style={{ width: `${(summary.stale / summary.total) * 100}%` }}
                            title={`Stale: ${summary.stale}`}
                        />
                    )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Fresh ({summary.fresh})
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-400" /> Aging ({summary.aging})
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Stale ({summary.stale})
                    </span>
                </div>
            </div>

            {/* Due for Review */}
            {dueForReview.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-amber-800">
                        <Calendar className="w-4 h-4" />
                        Due for Review ({dueForReview.length})
                    </h4>
                    <div className="space-y-2">
                        {dueForReview.slice(0, 5).map((item) => (
                            <div
                                key={item.contentId}
                                className="flex items-center gap-3 p-2 bg-white rounded-lg"
                            >
                                <FileText className="w-4 h-4 text-neutral-400" />
                                <div className="flex-1 truncate text-sm">{item.title}</div>
                                {getPriorityBadge(item.reviewPriority)}
                                <button
                                    onClick={() => handleMarkUpdated(item.contentId)}
                                    className="text-xs text-indigo-600 hover:underline"
                                >
                                    Mark Updated
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stale Content List */}
            <div className="bg-white border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Stale Content
                </h4>
                {staleContent.length > 0 ? (
                    <div className="space-y-2">
                        {staleContent.map((item) => (
                            <div
                                key={item.contentId}
                                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getScoreBg(item.freshnessScore)}`}>
                                    <span className={`text-sm font-bold ${getScoreColor(item.freshnessScore)}`}>
                                        {item.freshnessScore}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{item.title}</div>
                                    <div className="text-xs text-neutral-500">
                                        Last updated: {new Date(item.lastUpdatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                {getActionBadge(item.suggestedAction)}
                                <button
                                    onClick={() => handleMarkUpdated(item.contentId)}
                                    className="p-2 hover:bg-white rounded-lg"
                                    title="Mark as updated"
                                >
                                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-neutral-500 text-sm py-4 text-center">
                        🎉 No stale content! All your content is fresh.
                    </p>
                )}
            </div>
        </div>
    );
}

export default FreshnessPanel;
