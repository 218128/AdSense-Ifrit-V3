/**
 * AnalysisResultCard Component
 * 
 * Displays CPC analysis result for a keyword.
 * Supports multi-selection for batch operations.
 */

'use client';

import {
    DollarSign,
    TrendingUp,
    Target,
    Zap,
    ArrowRight,
    Check
} from 'lucide-react';
import type { AnalyzedKeyword } from '@/lib/keywords/types';

// ============ PROPS ============

export interface AnalysisResultCardProps {
    /** Analyzed keyword data */
    keyword: AnalyzedKeyword;
    /** Use this keyword callback */
    onUse?: () => void;
    /** Whether this card is selected */
    isSelected?: boolean;
    /** Toggle selection callback */
    onToggleSelect?: () => void;
}

// ============ HELPERS ============

function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
}

function getIntentIcon(intent?: string) {
    switch (intent?.toLowerCase()) {
        case 'commercial':
            return <DollarSign className="w-4 h-4 text-green-500" />;
        case 'transactional':
            return <Target className="w-4 h-4 text-blue-500" />;
        case 'navigational':
            return <ArrowRight className="w-4 h-4 text-purple-500" />;
        default:
            return <TrendingUp className="w-4 h-4 text-neutral-500" />;
    }
}

function getCompetitionDots(level?: string) {
    const count = level?.toLowerCase() === 'high' ? 3 : level?.toLowerCase() === 'medium' ? 2 : 1;
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3].map(i => (
                <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i <= count ? 'bg-orange-500' : 'bg-neutral-200'
                        }`}
                />
            ))}
        </div>
    );
}

// ============ COMPONENT ============

export function AnalysisResultCard({
    keyword,
    onUse,
    isSelected = false,
    onToggleSelect,
}: AnalysisResultCardProps) {
    // Defensive: handle missing analysis
    const analysis = keyword.analysis || {
        keyword: keyword.keyword,
        niche: keyword.niche || 'General',
        estimatedCPC: '$0.50-2.00',
        estimatedVolume: '1K-10K',
        competition: 'Medium',
        score: 50,
        intent: 'informational',
        reasoning: 'Analysis pending',
    };

    return (
        <div
            className={`p-4 bg-white border rounded-xl hover:shadow-md transition-all cursor-pointer ${isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/30'
                    : 'border-neutral-200'
                }`}
            onClick={onToggleSelect}
        >
            {/* Header with checkbox */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                    {/* Selection checkbox */}
                    {onToggleSelect && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect();
                            }}
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-neutral-300 hover:border-indigo-400'
                                }`}
                        >
                            {isSelected && <Check className="w-3 h-3" />}
                        </button>
                    )}
                    <div className="flex-1">
                        <h4 className="font-semibold text-neutral-900 mb-1">
                            {keyword.keyword}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                            {getIntentIcon(analysis.intent)}
                            <span className="capitalize">{analysis.intent || 'informational'}</span>
                            <span className="text-neutral-300">•</span>
                            <span>{analysis.niche}</span>
                        </div>
                    </div>
                </div>

                {/* Score badge */}
                <div className={`px-3 py-1 rounded-full font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}
                </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-600 mb-1">Est. CPC</div>
                    <div className="font-semibold text-green-700">{analysis.estimatedCPC}</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-600 mb-1">Volume</div>
                    <div className="font-semibold text-blue-700">{analysis.estimatedVolume}</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <div className="text-xs text-orange-600 mb-1">Competition</div>
                    <div className="flex justify-center mt-1">
                        {getCompetitionDots(analysis.competition)}
                    </div>
                </div>
            </div>

            {/* Reasoning */}
            <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                {analysis.reasoning}
            </p>

            {/* Use button */}
            {onUse && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onUse();
                    }}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center justify-center gap-2"
                >
                    <Zap className="w-4 h-4" />
                    Use This Keyword
                </button>
            )}
        </div>
    );
}

