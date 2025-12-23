'use client';

/**
 * TrendCard Component
 * 
 * Displays a single trend item with selection checkbox.
 * Extracted from TrendScanner.tsx for component isolation.
 */

import { Check, ExternalLink } from 'lucide-react';
import type { TrendItem } from './trendTypes';
import { getSourceIcon, getSourceColor, CPC_THRESHOLD_HIGH, CPC_THRESHOLD_MEDIUM } from './trendUtils';

interface TrendCardProps {
    trend: TrendItem;
    isSelected: boolean;
    onToggleSelection: (topic: string) => void;
}

export function TrendCard({ trend, isSelected, onToggleSelection }: TrendCardProps) {
    const getCPCBadge = (cpcScore?: number) => {
        if (!cpcScore) return null;
        if (cpcScore >= CPC_THRESHOLD_HIGH) return (
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                💰 High CPC
            </span>
        );
        if (cpcScore >= CPC_THRESHOLD_MEDIUM) return (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                Medium CPC
            </span>
        );
        return null;
    };

    return (
        <div
            onClick={() => onToggleSelection(trend.topic)}
            className={`p-4 cursor-pointer transition-all hover:bg-neutral-50 ${isSelected ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
                }`}
        >
            <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all ${isSelected
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-neutral-300 hover:border-amber-400'
                    }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${getSourceColor(trend.source)}`}>
                                    {getSourceIcon(trend.source)}
                                    {trend.source}
                                </span>
                                {getCPCBadge(trend.cpcScore)}
                                {trend.niche && trend.niche !== trend.source && (
                                    <span className="text-xs text-neutral-500">
                                        {trend.niche}
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h5 className="font-medium text-neutral-800 line-clamp-2">
                                {trend.topic}
                            </h5>

                            {/* Context */}
                            {trend.context && (
                                <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                                    {trend.context.replace(/<[^>]*>/g, '').substring(0, 150)}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {trend.url && (
                                <a
                                    href={trend.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Open in new tab"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
