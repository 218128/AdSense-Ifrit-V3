/**
 * DomainFilters Component
 * 
 * Filter controls for domain list.
 * Pure presentational component.
 */

'use client';

import {
    Filter,
    Search,
    X
} from 'lucide-react';
import type { DomainSource, QualityTier } from '@/lib/domains/types';

// ============ PROPS ============

export interface DomainFiltersProps {
    /** Keyword filter value */
    keyword: string;
    /** Update keyword */
    onKeywordChange: (keyword: string) => void;
    /** Source filter */
    sourceFilter: DomainSource | 'all';
    /** Update source filter */
    onSourceFilterChange: (source: DomainSource | 'all') => void;
    /** Tier filter */
    tierFilter: QualityTier | 'all';
    /** Update tier filter */
    onTierFilterChange: (tier: QualityTier | 'all') => void;
    /** Minimum score filter */
    minScore: number;
    /** Update min score */
    onMinScoreChange: (score: number) => void;
    /** Reset all filters */
    onReset: () => void;
    /** Total domain count */
    totalCount: number;
    /** Filtered domain count */
    filteredCount: number;
}

// ============ CONSTANTS ============

const SOURCE_OPTIONS: { value: DomainSource | 'all'; label: string }[] = [
    { value: 'all', label: 'All Sources' },
    { value: 'manual', label: '📝 Manual' },
    { value: 'free', label: '🆓 Free' },
    { value: 'spamzilla', label: '🔥 SpamZilla' },
    { value: 'premium', label: '⭐ Premium' },
];

const TIER_OPTIONS: { value: QualityTier | 'all'; label: string }[] = [
    { value: 'all', label: 'All Tiers' },
    { value: 'gold', label: '🥇 Gold' },
    { value: 'silver', label: '🥈 Silver' },
    { value: 'bronze', label: '🥉 Bronze' },
    { value: 'avoid', label: '⚠️ Avoid' },
];

// ============ COMPONENT ============

export function DomainFilters({
    keyword,
    onKeywordChange,
    sourceFilter,
    onSourceFilterChange,
    tierFilter,
    onTierFilterChange,
    minScore,
    onMinScoreChange,
    onReset,
    totalCount,
    filteredCount,
}: DomainFiltersProps) {
    const hasFilters = keyword || sourceFilter !== 'all' || tierFilter !== 'all' || minScore > 0;

    return (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-neutral-600" />
                    <span className="font-semibold text-sm text-neutral-800">Filters</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                        Showing {filteredCount} of {totalCount}
                    </span>
                    {hasFilters && (
                        <button
                            onClick={onReset}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Keyword search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => onKeywordChange(e.target.value)}
                        placeholder="Filter by keyword..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>

                {/* Source filter */}
                <select
                    value={sourceFilter}
                    onChange={(e) => onSourceFilterChange(e.target.value as DomainSource | 'all')}
                    className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                    {SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {/* Tier filter */}
                <select
                    value={tierFilter}
                    onChange={(e) => onTierFilterChange(e.target.value as QualityTier | 'all')}
                    className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                    {TIER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {/* Min score */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                        Min Score:
                    </span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => onMinScoreChange(Number(e.target.value))}
                        className="flex-1"
                    />
                    <span className="text-xs font-medium text-neutral-700 w-8">
                        {minScore}
                    </span>
                </div>
            </div>
        </div>
    );
}
