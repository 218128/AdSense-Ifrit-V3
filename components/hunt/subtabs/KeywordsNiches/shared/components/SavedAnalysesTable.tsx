/**
 * SavedAnalysesTable Component
 * 
 * Row-style table showing saved research+analyze sessions.
 * Users can load saved analyses to Domain Acquire at any time.
 */

'use client';

import { useState } from 'react';
import {
    Table,
    Trash2,
    Send,
    ChevronDown,
    ChevronRight,
    Bookmark
} from 'lucide-react';
import { useKeywordStore, type SavedAnalysis, type EnrichedKeyword } from '@/stores/keywordStore';

export interface SavedAnalysesTableProps {
    onUseKeywords?: (keywords: EnrichedKeyword[]) => void;
}

export function SavedAnalysesTable({ onUseKeywords }: SavedAnalysesTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const savedAnalyses = useKeywordStore(state => state.savedAnalyses);
    const deleteSavedAnalysis = useKeywordStore(state => state.deleteSavedAnalysis);
    const loadSavedAnalysis = useKeywordStore(state => state.loadSavedAnalysis);

    if (savedAnalyses.length === 0) {
        return null; // Don't show if empty
    }

    const handleUse = (analysis: SavedAnalysis) => {
        if (onUseKeywords) {
            onUseKeywords(analysis.keywords);
        } else {
            // Fallback: load into current view
            loadSavedAnalysis(analysis.id);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getAvgScore = (keywords: EnrichedKeyword[]) => {
        const scores = keywords.filter(k => k.analysis?.score).map(k => k.analysis!.score);
        if (scores.length === 0) return 0;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    };

    return (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Saved Research+Analyses</h3>
                <span className="text-xs text-amber-600 ml-auto">
                    {savedAnalyses.length} saved
                </span>
            </div>

            <div className="divide-y divide-neutral-100">
                {savedAnalyses.map((analysis) => (
                    <div key={analysis.id}>
                        {/* Main Row */}
                        <div className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50">
                            <button
                                onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
                                className="p-1 hover:bg-neutral-200 rounded"
                            >
                                {expandedId === analysis.id ? (
                                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-neutral-500" />
                                )}
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-neutral-900 truncate">
                                    {analysis.name || `Analysis ${formatDate(analysis.savedAt)}`}
                                </div>
                                <div className="text-xs text-neutral-500">
                                    {analysis.keywords.length} keywords • Avg Score: {getAvgScore(analysis.keywords)}
                                </div>
                            </div>

                            <div className="text-xs text-neutral-400">
                                {formatDate(analysis.savedAt)}
                            </div>

                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleUse(analysis)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Use these keywords"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteSavedAnalysis(analysis.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === analysis.id && (
                            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {analysis.keywords.slice(0, 6).map((kw, i) => (
                                        <div
                                            key={i}
                                            className="px-3 py-2 bg-white rounded-lg border border-neutral-200 text-sm"
                                        >
                                            <div className="font-medium text-neutral-900 truncate">
                                                {kw.keyword}
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                {kw.analysis?.estimatedCPC || 'N/A'} • Score: {kw.analysis?.score || 'N/A'}
                                            </div>
                                        </div>
                                    ))}
                                    {analysis.keywords.length > 6 && (
                                        <div className="px-3 py-2 text-sm text-neutral-500 flex items-center">
                                            +{analysis.keywords.length - 6} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
