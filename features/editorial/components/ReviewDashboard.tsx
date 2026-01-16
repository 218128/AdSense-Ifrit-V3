'use client';

/**
 * Review Dashboard Component
 * FSD: features/editorial/components/ReviewDashboard.tsx
 * 
 * Main dashboard for editorial review workflow.
 * Shows queue statistics, pending items, and quick actions.
 */

import React, { useMemo, useState } from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Filter,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Edit,
    Eye,
    Star,
    Zap,
    FileText,
    TrendingUp,
} from 'lucide-react';
import { useReviewStore, selectPendingReviews, selectHighPriorityItems } from '../model/reviewStore';
import type { ReviewItem, ReviewStatus, ReviewPriority } from '../model/reviewTypes';

// ============================================================================
// Utility Functions
// ============================================================================

function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
}

function getStatusColor(status: ReviewStatus): string {
    switch (status) {
        case 'pending_review': return 'bg-yellow-100 text-yellow-700';
        case 'in_review': return 'bg-blue-100 text-blue-700';
        case 'changes_requested': return 'bg-orange-100 text-orange-700';
        case 'approved': return 'bg-green-100 text-green-700';
        case 'auto_approved': return 'bg-emerald-100 text-emerald-700';
        case 'rejected': return 'bg-red-100 text-red-700';
        default: return 'bg-neutral-100 text-neutral-700';
    }
}

function getPriorityColor(priority: ReviewPriority): string {
    switch (priority) {
        case 'urgent': return 'text-red-600';
        case 'high': return 'text-orange-600';
        case 'normal': return 'text-blue-600';
        case 'low': return 'text-neutral-500';
    }
}

function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
}

// ============================================================================
// Stats Cards
// ============================================================================

function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    color
}: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    trend?: { value: number; label: string };
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className={`text-xs flex items-center gap-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        <TrendingUp className="w-3 h-3" />
                        {trend.value >= 0 ? '+' : ''}{trend.value}%
                    </span>
                )}
            </div>
            <div className="mt-3">
                <p className="text-2xl font-bold text-neutral-900">{value}</p>
                <p className="text-sm text-neutral-500">{title}</p>
            </div>
        </div>
    );
}

// ============================================================================
// Review Item Row
// ============================================================================

interface ReviewItemRowProps {
    item: ReviewItem;
    onSelect: (id: string) => void;
    isSelected: boolean;
}

function ReviewItemRow({ item, onSelect, isSelected }: ReviewItemRowProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`bg-white border rounded-lg overflow-hidden transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-neutral-200'
                }`}
        >
            {/* Main Row */}
            <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-neutral-50"
                onClick={() => onSelect(item.id)}
            >
                {/* Score */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                    <span className={`text-lg font-bold ${getScoreColor(item.overallQualityScore)}`}>
                        {item.overallQualityScore}
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-neutral-900 truncate">
                            {item.title}
                        </h3>
                        {item.autoApprovalEligible && (
                            <span title="Auto-approval eligible">
                                <Zap className="w-4 h-4 text-yellow-500" />
                            </span>
                        )}
                        {item.riskLevel === 'ymyl' && (
                            <span title="YMYL Content">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-neutral-500 truncate">
                        {item.topic} • {item.wordCount} words • {formatTimeAgo(item.createdAt)}
                    </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                    </span>
                    <span className={`text-sm ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="p-1 hover:bg-neutral-100 rounded"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-neutral-100 pt-3">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-neutral-500">Experience</p>
                            <p className={`font-medium ${getScoreColor(item.eeatScore.experience.score)}`}>
                                {item.eeatScore.experience.score}
                            </p>
                        </div>
                        <div>
                            <p className="text-neutral-500">Expertise</p>
                            <p className={`font-medium ${getScoreColor(item.eeatScore.expertise.score)}`}>
                                {item.eeatScore.expertise.score}
                            </p>
                        </div>
                        <div>
                            <p className="text-neutral-500">Authority</p>
                            <p className={`font-medium ${getScoreColor(item.eeatScore.authoritativeness.score)}`}>
                                {item.eeatScore.authoritativeness.score}
                            </p>
                        </div>
                        <div>
                            <p className="text-neutral-500">Trust</p>
                            <p className={`font-medium ${getScoreColor(item.eeatScore.trustworthiness.score)}`}>
                                {item.eeatScore.trustworthiness.score}
                            </p>
                        </div>
                    </div>

                    {/* Citations */}
                    <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-neutral-500">
                            Citations: {item.citationValidation.totalCitations}
                            ({item.citationValidation.validatedCount} verified)
                        </span>
                        {item.citationValidation.issues.length > 0 && (
                            <span className="text-orange-600">
                                {item.citationValidation.issues.length} issues
                            </span>
                        )}
                    </div>

                    {/* Recommendations */}
                    {item.eeatScore.recommendations.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs text-neutral-500 mb-1">Recommendations:</p>
                            <ul className="text-sm text-neutral-600 space-y-1">
                                {item.eeatScore.recommendations.slice(0, 3).map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            Review
                        </button>
                        {item.autoApprovalEligible && item.status === 'pending_review' && (
                            <button className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Auto-Approve
                            </button>
                        )}
                        {item.status !== 'approved' && item.status !== 'auto_approved' && (
                            <button className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 flex items-center gap-1">
                                <Edit className="w-3.5 h-3.5" />
                                Edit Content
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function ReviewDashboard() {
    const {
        items,
        selectedItemId,
        selectItem,
        getQueueStats,
        getFilteredItems,
        filter,
        setFilter,
        sort,
        setSort,
        clearFilters,
    } = useReviewStore();

    const stats = useMemo(() => getQueueStats(), [items]);
    const filteredItems = useMemo(() => getFilteredItems(), [items, filter, sort]);

    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Editorial Review</h1>
                    <p className="text-neutral-500">
                        {stats.pending} pending • {stats.inReview} in review • {stats.approved + stats.autoApproved} approved
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 border rounded-lg flex items-center gap-2 ${Object.keys(filter).length > 0
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-neutral-300 hover:bg-neutral-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {Object.keys(filter).length > 0 && (
                            <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                                {Object.keys(filter).length}
                            </span>
                        )}
                    </button>
                    <button
                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatsCard
                    title="Pending Review"
                    value={stats.pending}
                    icon={Clock}
                    color="bg-yellow-100 text-yellow-600"
                />
                <StatsCard
                    title="High Priority"
                    value={stats.byPriority.high + stats.byPriority.urgent}
                    icon={AlertTriangle}
                    color="bg-red-100 text-red-600"
                />
                <StatsCard
                    title="Auto-Approved"
                    value={stats.autoApproved}
                    icon={Zap}
                    color="bg-emerald-100 text-emerald-600"
                />
                <StatsCard
                    title="Avg E-E-A-T Score"
                    value={stats.avgEEATScore}
                    icon={Star}
                    color="bg-blue-100 text-blue-600"
                />
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                            <select
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                                value={filter.status?.[0] || ''}
                                onChange={(e) => setFilter({
                                    ...filter,
                                    status: e.target.value ? [e.target.value as ReviewStatus] : undefined
                                })}
                            >
                                <option value="">All</option>
                                <option value="pending_review">Pending</option>
                                <option value="in_review">In Review</option>
                                <option value="changes_requested">Changes Requested</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Priority</label>
                            <select
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                                value={filter.priority?.[0] || ''}
                                onChange={(e) => setFilter({
                                    ...filter,
                                    priority: e.target.value ? [e.target.value as ReviewPriority] : undefined
                                })}
                            >
                                <option value="">All</option>
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Sort By</label>
                            <select
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                                value={sort}
                                onChange={(e) => setSort(e.target.value as typeof sort)}
                            >
                                <option value="priority">Priority</option>
                                <option value="created_desc">Newest First</option>
                                <option value="created_asc">Oldest First</option>
                                <option value="score_desc">Highest Score</option>
                                <option value="score_asc">Lowest Score</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Queue */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-neutral-900">Review Queue</h2>
                    <span className="text-sm text-neutral-500">{filteredItems.length} items</span>
                </div>

                {filteredItems.length > 0 ? (
                    <div className="space-y-2">
                        {filteredItems.map(item => (
                            <ReviewItemRow
                                key={item.id}
                                item={item}
                                onSelect={selectItem}
                                isSelected={selectedItemId === item.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
                        <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                        <h3 className="font-medium text-neutral-600 mb-1">No Items to Review</h3>
                        <p className="text-sm text-neutral-400">
                            Run a campaign to generate content for review
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
