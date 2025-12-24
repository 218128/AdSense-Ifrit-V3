/**
 * SelectionBar Component
 * 
 * Reusable selection controls bar with:
 * - Selected count display
 * - Select All / Clear buttons
 * - Stats display
 * - Primary action button
 * 
 * Extracted from TrendScanner.tsx for reusability.
 */

'use client';

import { BarChart3, Target } from 'lucide-react';

interface SelectionBarProps {
    selectedCount: number;
    totalCount: number;
    highValueCount?: number;
    onSelectAll: () => void;
    onClear: () => void;
    onAction?: () => void;
    actionLabel?: string;
    emptyMessage?: string;
}

export function SelectionBar({
    selectedCount,
    totalCount,
    highValueCount,
    onSelectAll,
    onClear,
    onAction,
    actionLabel = 'Analyze Selected',
    emptyMessage = 'Click items to select',
}: SelectionBarProps) {
    return (
        <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600">
                        {selectedCount > 0 ? (
                            <span className="font-medium text-amber-600">
                                {selectedCount} selected
                            </span>
                        ) : (
                            emptyMessage
                        )}
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={onSelectAll}
                            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                            Select All
                        </button>
                        <button
                            onClick={onClear}
                            className="text-xs px-2 py-1 text-neutral-500 hover:bg-neutral-50 rounded"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-xs text-neutral-500 flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" />
                        {highValueCount !== undefined && (
                            <>
                                <span>{highValueCount} high-CPC</span>
                                <span>•</span>
                            </>
                        )}
                        <span>{totalCount} total</span>
                    </div>

                    {selectedCount > 0 && onAction && (
                        <button
                            onClick={onAction}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all"
                        >
                            <Target className="w-4 h-4" />
                            {actionLabel} ({selectedCount})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
