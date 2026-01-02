'use client';

/**
 * Campaign Card Component
 * FSD: features/campaigns/ui/CampaignCard.tsx
 */

import { useState } from 'react';
import {
    Play,
    Pause,
    Settings,
    Trash2,
    Clock,
    FileText,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Globe,
    Zap,
} from 'lucide-react';
import type { Campaign } from '../model/types';
import { useCampaignStore } from '../model/campaignStore';
import { useWPSitesLegacy } from '@/features/wordpress/model/wpSiteStore';

interface CampaignCardProps {
    campaign: Campaign;
    onEdit?: (campaign: Campaign) => void;
    onRun?: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onEdit, onRun }: CampaignCardProps) {
    const [running, setRunning] = useState(false);
    const { pauseCampaign, resumeCampaign, deleteCampaign } = useCampaignStore();
    const { sites } = useWPSitesLegacy();

    const targetSite = sites.find(s => s.id === campaign.targetSiteId);

    const handleToggleStatus = () => {
        if (campaign.status === 'active') {
            pauseCampaign(campaign.id);
        } else {
            resumeCampaign(campaign.id);
        }
    };

    const handleRun = async () => {
        setRunning(true);
        try {
            await onRun?.(campaign);
        } finally {
            setRunning(false);
        }
    };

    const handleDelete = () => {
        if (confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) {
            deleteCampaign(campaign.id);
        }
    };

    const statusConfig = {
        active: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Active' },
        paused: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Pause, label: 'Paused' },
        draft: { color: 'text-neutral-500', bg: 'bg-neutral-50', icon: FileText, label: 'Draft' },
    };

    const status = statusConfig[campaign.status];
    const StatusIcon = status.icon;

    const sourceTypeLabels = {
        keywords: 'Keywords',
        rss: 'RSS Feed',
        trends: 'Google Trends',
        manual: 'Manual Topics',
    };

    const scheduleLabel = campaign.schedule.type === 'manual'
        ? 'Manual'
        : campaign.schedule.type === 'interval'
            ? `Every ${campaign.schedule.intervalHours}h`
            : campaign.schedule.cronExpression || 'Scheduled';

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Header */}
            <div className={`px-4 py-3 ${status.bg} border-b border-neutral-200`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Zap className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900">{campaign.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <Globe className="w-3 h-3" />
                                {targetSite?.name || 'No target site'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center border-b border-neutral-100">
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">Generated</div>
                    <div className="font-bold text-neutral-900">{campaign.stats.totalGenerated}</div>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">Published</div>
                    <div className="font-bold text-green-600">{campaign.stats.totalPublished}</div>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">Failed</div>
                    <div className="font-bold text-red-600">{campaign.stats.totalFailed}</div>
                </div>
            </div>

            {/* Info */}
            <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-neutral-600">
                    <span>Source:</span>
                    <span className="font-medium text-neutral-900">
                        {sourceTypeLabels[campaign.source.type]}
                    </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                    <span>Schedule:</span>
                    <span className="font-medium text-neutral-900 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {scheduleLabel}
                    </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                    <span>Article Type:</span>
                    <span className="font-medium text-neutral-900 capitalize">
                        {campaign.aiConfig.articleType}
                    </span>
                </div>
                {campaign.schedule.lastRunAt && (
                    <div className="flex items-center justify-between text-neutral-600">
                        <span>Last Run:</span>
                        <span className="font-medium text-neutral-900">
                            {formatTimeAgo(campaign.schedule.lastRunAt)}
                        </span>
                    </div>
                )}
                {campaign.schedule.type !== 'manual' && campaign.schedule.nextRunAt && (
                    <div className="flex items-center justify-between text-neutral-600">
                        <span>Next Run:</span>
                        <span className="font-medium text-indigo-600">
                            {formatTimeUntil(campaign.schedule.nextRunAt)}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                <button
                    onClick={handleRun}
                    disabled={running || campaign.status === 'draft'}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    {running ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            Run Now
                        </>
                    )}
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleToggleStatus}
                        className={`p-2 rounded-lg transition-colors ${campaign.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-green-600 hover:bg-green-50'
                            }`}
                        title={campaign.status === 'active' ? 'Pause' : 'Resume'}
                    >
                        {campaign.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                    </button>
                    <button
                        onClick={() => onEdit?.(campaign)}
                        className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimeUntil(timestamp: number): string {
    const seconds = Math.floor((timestamp - Date.now()) / 1000);

    if (seconds <= 0) return 'due now';
    if (seconds < 60) return `in ${seconds}s`;
    if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `in ${Math.floor(seconds / 3600)}h`;
    return `in ${Math.floor(seconds / 86400)}d`;
}
