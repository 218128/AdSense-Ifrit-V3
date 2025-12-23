/**
 * KeywordHunterV2 - Refactored Version
 * 
 * Uses modular hooks and components for clean separation:
 * - useKeywordImport: Handles CSV and evergreen sources
 * - useKeywordSelection: Handles selection state
 * - useKeywordAnalysis: Handles CPC analysis with history
 * - Components: KeywordCard, AnalysisResultCard, CSVImporter
 */

'use client';

import { useState } from 'react';
import {
    Zap,
    Search,
    History,
    Trash2,
    TreePine,
    Globe
} from 'lucide-react';

// Import hooks
import {
    useKeywordImport,
    useKeywordSelection,
    useKeywordAnalysis,
} from '@/components/hunt/keywords/hooks';

// Import components
import {
    KeywordCard,
    AnalysisResultCard,
    CSVImporter,
} from '@/components/hunt/keywords/components';

// Types
import type { AnalyzedKeyword } from '@/lib/keywords/types';

// ============ PROPS ============

interface KeywordHunterV2Props {
    /** Callback when keyword is selected for use */
    onSelect?: (data: { topic: string; context: string; source: 'live' | 'fallback' | 'csv_import' }) => void;
    /** Callback to navigate to domain hunting */
    onNavigateToDomains?: (keywords: string[]) => void;
    /** Disabled state */
    disabled?: boolean;
}

// ============ COMPONENT ============

export default function KeywordHunterV2({
    onSelect,
    onNavigateToDomains,
    disabled = false,
}: KeywordHunterV2Props) {
    // ============ HOOKS ============

    const {
        csvKeywords,
        handleCSVImport,
        clearCSV,
        evergreenKeywords,
        allKeywords,
    } = useKeywordImport();

    const {
        selectedKeywords,
        toggleSelect,
        isSelected,
        clearSelection,
        selectedCount,
        hasSelection,
    } = useKeywordSelection();

    const {
        analyzedKeywords,
        isAnalyzing,
        history,
        loadHistoryItem,
        clearHistory,
        runAnalysis,
        clearResults,
    } = useKeywordAnalysis();

    // ============ LOCAL STATE ============

    const [showHistory, setShowHistory] = useState(false);

    // ============ HANDLERS ============

    const handleAnalyze = async () => {
        if (selectedCount === 0) return;
        await runAnalysis(selectedKeywords);
        clearSelection();
    };

    const handleUseKeyword = (kw: AnalyzedKeyword) => {
        if (onSelect) {
            onSelect({
                topic: kw.keyword,
                context: `${kw.analysis.niche} - ${kw.analysis.estimatedCPC}`,
                source: kw.source === 'csv' ? 'csv_import' : 'fallback',
            });
        }
    };

    const handleHuntDomains = () => {
        if (onNavigateToDomains && analyzedKeywords.length > 0) {
            onNavigateToDomains(analyzedKeywords.map(k => k.keyword));
        }
    };

    // ============ RENDER ============

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Search className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-xl font-bold text-neutral-900">Keyword Hunter</h2>
                </div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-3 py-2 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 text-sm flex items-center gap-2"
                >
                    <History className="w-4 h-4" />
                    History ({history.length})
                </button>
            </div>

            {/* History panel */}
            {showHistory && history.length > 0 && (
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">Analysis History</span>
                        <button
                            onClick={clearHistory}
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
                                    loadHistoryItem(item);
                                    setShowHistory(false);
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
            )}

            {/* Import section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CSVImporter
                    onFileUpload={handleCSVImport}
                    onClear={clearCSV}
                    importedCount={csvKeywords.length}
                />

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <TreePine className="w-5 h-5 text-amber-600" />
                        <span className="font-semibold text-sm text-amber-800">Evergreen Keywords</span>
                    </div>
                    <p className="text-xs text-amber-600">
                        {evergreenKeywords.length} high-CPC keywords always available
                    </p>
                </div>
            </div>

            {/* Keyword selection */}
            {allKeywords.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-neutral-900">
                            Select Keywords to Analyze ({allKeywords.length} available)
                        </h3>
                        {hasSelection && (
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || disabled}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                Analyze ({selectedCount})
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allKeywords.map((kw) => (
                            <KeywordCard
                                key={kw.keyword}
                                keyword={kw}
                                isSelected={isSelected(kw.keyword)}
                                onSelect={() => toggleSelect(kw)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Analysis results */}
            {analyzedKeywords.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-neutral-900">
                            Analysis Results ({analyzedKeywords.length})
                        </h3>
                        <div className="flex gap-2">
                            {onNavigateToDomains && (
                                <button
                                    onClick={handleHuntDomains}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
                                >
                                    <Globe className="w-4 h-4" />
                                    Hunt Domains
                                </button>
                            )}
                            <button
                                onClick={clearResults}
                                className="px-3 py-2 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 text-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analyzedKeywords.map((kw) => (
                            <AnalysisResultCard
                                key={kw.keyword}
                                keyword={kw}
                                onUse={() => handleUseKeyword(kw)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {allKeywords.length === 0 && analyzedKeywords.length === 0 && (
                <div className="p-12 text-center text-neutral-500 bg-neutral-50 rounded-xl">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No keywords yet</p>
                    <p className="text-sm mt-1">
                        Import keywords from CSV or use the evergreen high-CPC keywords.
                    </p>
                </div>
            )}
        </div>
    );
}
