'use client';

/**
 * Run History Panel
 * FSD: features/campaigns/ui/RunHistoryPanel.tsx
 * 
 * Shows campaign run history with status, posts generated, and errors.
 */

import { useState } from 'react';
import {
    History,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    FileText,
    RefreshCw,
} from 'lucide-react';
import { useCampaignStore } from '../model/campaignStore';
import type { CampaignRun } from '../model/types';

interface RunHistoryPanelProps {
    campaignId: string;
    limit?: number;
}

export function RunHistoryPanel({ campaignId, limit = 10 }: RunHistoryPanelProps) {
    const { getRunHistory } = useCampaignStore();
    const runs = getRunHistory(campaignId, limit);
    const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

    if (runs.length === 0) {
        return (
            <div className="bg-neutral-50 rounded-lg p-6 text-center">
                <History className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-neutral-500">No runs yet</p>
                <p className="text-xs text-neutral-400 mt-1">Click &quot;Run Now&quot; to generate content</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <History className="w-4 h-4" />
                Run History
            </h3>
            <div className="space-y-2">
                {runs.map((run) => (
                    <RunCard
                        key={run.id}
                        run={run}
                        expanded={expandedRunId === run.id}
                        onToggle={() => setExpandedRunId(
                            expandedRunId === run.id ? null : run.id
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Run Card Component
// ============================================================================

interface RunCardProps {
    run: CampaignRun;
    expanded: boolean;
    onToggle: () => void;
}

function RunCard({ run, expanded, onToggle }: RunCardProps) {
    const statusConfig = {
        running: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Running' },
        completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
        failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
        partial: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Partial' },
    };

    const status = statusConfig[run.status];
    const StatusIcon = status.icon;

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const duration = run.completedAt
        ? Math.round((run.completedAt - run.startedAt) / 1000)
        : null;

    return (
        <div className={`rounded-lg border ${status.bg} border-neutral-200 overflow-hidden`}>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${status.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                    <div className="text-left">
                        <div className="text-sm font-medium text-neutral-900">
                            {status.label}
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatTime(run.startedAt)}
                            {duration && ` • ${duration}s`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                        <span className="text-green-600 font-medium">{run.postsPublished}</span>
                        <span className="text-neutral-400"> / </span>
                        <span className="text-neutral-600">{run.postsGenerated}</span>
                        <span className="text-neutral-400 text-xs ml-1">posts</span>
                    </div>
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                </div>
            </button>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-neutral-200 bg-white">
                    {/* Items */}
                    {run.items.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <div className="text-xs font-medium text-neutral-500 uppercase">Items</div>
                            {run.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between text-sm p-2 bg-neutral-50 rounded"
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-neutral-400" />
                                        <span className="text-neutral-700">
                                            {item.title || item.topic}
                                        </span>
                                        {item.wordCount && (
                                            <span className="text-xs text-neutral-400">
                                                {item.wordCount} words
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.status === 'done' && item.wpPostUrl && (
                                            <a
                                                href={item.wpPostUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                        <ItemStatusBadge status={item.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Errors */}
                    {run.errors.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <div className="text-xs font-medium text-red-500 uppercase">Errors</div>
                            {run.errors.map((error, i) => (
                                <div
                                    key={i}
                                    className="text-sm p-2 bg-red-50 text-red-700 rounded border border-red-100"
                                >
                                    <span className="font-medium capitalize">{error.stage}:</span>{' '}
                                    {error.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Item Status Badge
// ============================================================================

function ItemStatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string }> = {
        pending: { bg: 'bg-neutral-100', text: 'text-neutral-600' },
        researching: { bg: 'bg-blue-100', text: 'text-blue-600' },
        generating: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
        imaging: { bg: 'bg-purple-100', text: 'text-purple-600' },
        publishing: { bg: 'bg-amber-100', text: 'text-amber-600' },
        done: { bg: 'bg-green-100', text: 'text-green-600' },
        failed: { bg: 'bg-red-100', text: 'text-red-600' },
    };

    const style = config[status] || config.pending;

    return (
        <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text} capitalize`}>
            {status}
        </span>
    );
}
