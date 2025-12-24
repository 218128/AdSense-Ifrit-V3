/**
 * HistoryPanel Component
 * 
 * Displays analysis history with load/clear functionality.
 * Extracted from KeywordHunter.tsx for single responsibility.
 */

'use client';

import { Trash2 } from 'lucide-react';
import type { AnalysisHistoryItem } from '@/lib/keywords/types';

interface HistoryPanelProps {
    history: AnalysisHistoryItem[];
    onLoadItem: (item: AnalysisHistoryItem) => void;
    onClear: () => void;
    onClose: () => void;
}

export function HistoryPanel({ history, onLoadItem, onClear, onClose }: HistoryPanelProps) {
    if (history.length === 0) return null;

    return (
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">Analysis History</span>
                <button
                    onClick={onClear}
                    className="text-xs text-red-600 hover:text-red-700"
                >
                    <Trash2 className="w-3 h-3 inline mr-1" />
                    Clear
                </button>
            </div>
            <div className="space-y-2">
                {history.slice(0, 5).map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            onLoadItem(item);
                            onClose();
                        }}
                        className="w-full text-left px-3 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm"
                    >
                        <div className="font-medium">
                            {item.keywords.slice(0, 3).map(k => k.keyword).join(', ')}
                            {item.keywords.length > 3 && ` +${item.keywords.length - 3}`}
                        </div>
                        <div className="text-xs text-neutral-500">
                            {new Date(item.timestamp).toLocaleString()}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
