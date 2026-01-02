/**
 * SelectionActionsBar Component
 * 
 * Shows action buttons when keywords are selected.
 * Appears as a sticky bar at the bottom of the keyword list.
 */

'use client';

import {
    CheckSquare,
    Square,
    Send,
    Save,
    X
} from 'lucide-react';

export interface SelectionActionsBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onUseSelected: () => void;
    onSaveSelected: () => void;
}

export function SelectionActionsBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onClearSelection,
    onUseSelected,
    onSaveSelected,
}: SelectionActionsBarProps) {
    if (selectedCount === 0) return null;

    const allSelected = selectedCount === totalCount;

    return (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg p-4 flex items-center justify-between gap-4 z-10">
            {/* Left side: Selection info */}
            <div className="flex items-center gap-3">
                <button
                    onClick={allSelected ? onClearSelection : onSelectAll}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                    {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                        <Square className="w-4 h-4" />
                    )}
                    {allSelected ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-neutral-500">
                    {selectedCount} of {totalCount} selected
                </span>
                <button
                    onClick={onClearSelection}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                    title="Clear selection"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onSaveSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-lg text-sm font-medium transition-colors"
                >
                    <Save className="w-4 h-4" />
                    Save Research+Analyze
                </button>
                <button
                    onClick={onUseSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                >
                    <Send className="w-4 h-4" />
                    Use Selected ({selectedCount})
                </button>
            </div>
        </div>
    );
}
