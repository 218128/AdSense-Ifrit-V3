/**
 * KeywordCard Component
 * 
 * Displays a single keyword with selection and metadata.
 * Pure presentational component.
 */

'use client';

import {
    TrendingUp,
    Crown,
    Upload,
    TreePine,
    Sparkles
} from 'lucide-react';
import type { KeywordItem } from '@/lib/keywords/types';

// ============ PROPS ============

export interface KeywordCardProps {
    /** Keyword data */
    keyword: KeywordItem;
    /** Whether keyword is selected */
    isSelected: boolean;
    /** Toggle selection */
    onSelect: () => void;
}

// ============ HELPERS ============

function getSourceBadge(source: string) {
    const badges: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
        csv: { icon: <Upload className="w-3 h-3" />, bg: 'bg-blue-100', text: 'text-blue-700', label: 'CSV' },
        live: { icon: <TrendingUp className="w-3 h-3" />, bg: 'bg-green-100', text: 'text-green-700', label: 'Live' },
        evergreen: { icon: <TreePine className="w-3 h-3" />, bg: 'bg-amber-100', text: 'text-amber-700', label: 'Evergreen' },
        ai: { icon: <Sparkles className="w-3 h-3" />, bg: 'bg-purple-100', text: 'text-purple-700', label: 'AI' },
    };
    const badge = badges[source] || badges.csv;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${badge.bg} ${badge.text}`}>
            {badge.icon}
            {badge.label}
        </span>
    );
}

// ============ COMPONENT ============

export function KeywordCard({
    keyword,
    isSelected,
    onSelect,
}: KeywordCardProps) {
    return (
        <div
            onClick={onSelect}
            className={`
                p-4 rounded-xl border-2 cursor-pointer transition-all
                ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
                }
            `}
        >
            <div className="flex items-start justify-between gap-3">
                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-neutral-900 truncate">
                            {keyword.keyword}
                        </span>
                        {getSourceBadge(keyword.source)}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                        {keyword.niche && (
                            <span className="flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-500" />
                                {keyword.niche}
                            </span>
                        )}
                        {keyword.context && (
                            <span>{keyword.context}</span>
                        )}
                        {keyword.difficulty && (
                            <span className="text-orange-600">{keyword.difficulty}</span>
                        )}
                        {keyword.searchVolume && (
                            <span className="text-blue-600">{keyword.searchVolume}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
