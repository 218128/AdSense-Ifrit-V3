/**
 * KeywordHunterV2 - Refactored Version
 * 
 * Uses Zustand store for clean state management:
 * - useKeywordStore: centralized state for keywords, analysis, selection, history
 * - Components: KeywordCard, AnalysisResultCard, CSVImporter
 * 
 * REFACTORED: Uses Zustand store (keywordStore) for state management.
 * MIGRATION: Uses dynamic import of aiServices. Engine accessible via @/lib/core.
 */

'use client';

import { useState } from 'react';
import {
    Zap,
    Search,
    History,
    Trash2,
    TreePine,
    Globe,
    FlaskConical
} from 'lucide-react';

// Zustand store
import { useKeywordStore, type EnrichedKeyword } from '@/stores/keywordStore';
import { useSettingsStore } from '@/stores/settingsStore';

// Import components
import {
    KeywordCard,
    AnalysisResultCard,
    CSVImporter,
    HistoryPanel,
    SelectionActionsBar,
    SavedAnalysesTable,
} from '../../shared/components';

// Utilities
import { parseCSV } from '../../shared/utils';

// Types
import type { KeywordItem, AnalyzedKeyword } from '@/lib/keywords/types';
import { ActionStatusBar } from '@/lib/shared/components';

// ============ PROPS ============

interface KeywordHunterV2Props {
    /** Callback when keyword is selected for use - now accepts EnrichedKeyword */
    onSelect?: (data: EnrichedKeyword) => void;
    /** Callback for multiple keywords */
    onSelectMultiple?: (data: EnrichedKeyword[]) => void;
    /** Callback to navigate to domain hunting */
    onNavigateToDomains?: (keywords: string[]) => void;
    /** Disabled state */
    disabled?: boolean;
}

// ============ COMPONENT ============

export default function KeywordHunterV2({
    onSelect,
    onSelectMultiple,
    onNavigateToDomains,
    disabled = false,
}: KeywordHunterV2Props) {
    // ============ ZUSTAND STORE ============

    const {
        // CSV keywords
        csvKeywords,
        addCSVKeywords,
        clearCSVKeywords,
        // Analysis
        analyzedKeywords,
        clearAnalyzedKeywords,
        isAnalyzing,
        runAnalysis,
        // Selection for keyword cards
        selectedKeywords,
        toggleSelect,
        isSelected,
        clearSelection,
        getSelectedCount,
        // Selection for analyzed cards
        selectedAnalyzedIds,
        toggleAnalyzedSelect,
        selectAllAnalyzed,
        clearAnalyzedSelection,
        isAnalyzedSelected,
        getSelectedAnalyzedCount,
        getSelectedAnalyzedKeywords,
        // Save functionality
        saveCurrentAnalysis,
        getEnrichedKeywords,
        // History
        history,
        loadHistoryItem,
        clearHistory,
        // Computed
        actionStatus,
        getAllKeywords,
        getEvergreenKeywords,
    } = useKeywordStore();

    // ============ LOCAL STATE ============

    const [showHistory, setShowHistory] = useState(false);
    // V5: Research state - loading only, results from store
    const [researching, setResearching] = useState(false);

    // Get research results for selected keywords from store
    const researchResults = useKeywordStore(state => state.researchResults);
    const addResearchResult = useKeywordStore(state => state.addResearchResult);
    const currentResearchResults = Array.from(selectedKeywords)
        .map(kw => researchResults[kw])
        .filter(Boolean)
        .flatMap(r => r?.findings || []);

    // Computed values
    const allKeywords = getAllKeywords();
    const evergreenKeywords = getEvergreenKeywords();
    const selectedCount = getSelectedCount();
    const hasSelection = selectedCount > 0;
    const selectedAnalyzedCount = getSelectedAnalyzedCount();

    // ============ HANDLERS ============

    const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const filename = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const parsed = parseCSV(content);
            addCSVKeywords(parsed, filename); // Track filename in history
        };
        reader.readAsText(file);

        // Reset input
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleAnalyze = async () => {
        if (selectedCount === 0) return;
        // Get selected keyword objects from allKeywords
        const toAnalyze = allKeywords.filter(k => selectedKeywords.has(k.keyword));
        await runAnalysis(toAnalyze);
        clearSelection();
    };

    // V5: Research trends for selected keywords using Capabilities system
    const handleResearchTrends = async () => {
        if (selectedCount === 0) return;

        setResearching(true);

        try {
            // Use aiServices capability system (handles provider selection + API keys)
            const { aiServices } = await import('@/lib/ai/services');

            const keywords = Array.from(selectedKeywords);
            const result = await aiServices.research(
                `Latest trends and statistics for: ${keywords.join(', ')}`,
                { researchType: 'quick' }
            );

            if (result.success) {
                let findings: string[] = [];

                // Try to extract from structured data first
                if (result.data && (result.data as { keyFindings?: string[] })?.keyFindings) {
                    findings = (result.data as { keyFindings: string[] }).keyFindings;
                }
                // Fallback: Parse text response
                else if (result.text) {
                    // Split by newlines or bullet points to get individual findings
                    findings = result.text
                        .split(/[\n•\-\*]/)
                        .map(s => s.trim())
                        .filter(s => s.length > 10); // Filter out short fragments

                    // If still nothing, use whole text
                    if (findings.length === 0) {
                        findings = [result.text];
                    }
                }

                if (findings.length > 0) {
                    // Save research results to store for each selected keyword
                    for (const keyword of keywords) {
                        addResearchResult(keyword, findings);
                    }
                    console.log('[Research] Saved findings:', findings.length);
                }
            } else if (result.error?.includes('No handlers')) {
                alert('No research provider configured. Go to Settings → Capabilities.');
            }
        } catch (err) {
            console.error('Research failed:', err);
        } finally {
            setResearching(false);
        }
    };

    // Single keyword - pass full EnrichedKeyword
    const handleUseKeyword = (kw: AnalyzedKeyword) => {
        if (onSelect) {
            const enriched = getEnrichedKeywords([kw.keyword])[0];
            if (enriched) {
                onSelect(enriched);
            }
        }
    };

    // Multiple keywords - pass full EnrichedKeyword[]
    const handleUseSelected = () => {
        const enriched = getEnrichedKeywords();
        if (onSelectMultiple && enriched.length > 0) {
            onSelectMultiple(enriched);
        } else if (onSelect && enriched.length > 0) {
            // Fallback: call onSelect for each
            enriched.forEach(e => onSelect(e));
        }
        clearAnalyzedSelection();
    };

    // Save selected to persistent table
    const handleSaveSelected = () => {
        saveCurrentAnalysis();
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

            {/* Action Status Bar */}
            {actionStatus && <ActionStatusBar status={actionStatus} className="mb-4" />}

            {/* History panel */}
            {showHistory && (
                <HistoryPanel
                    history={history}
                    onLoadItem={loadHistoryItem}
                    onClear={clearHistory}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {/* Import section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CSVImporter
                    onFileUpload={handleCSVImport}
                    onClear={clearCSVKeywords}
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleResearchTrends}
                                    disabled={researching || disabled}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                                >
                                    <FlaskConical className="w-4 h-4" />
                                    {researching ? 'Researching...' : `Research (${selectedCount})`}
                                </button>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || disabled}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                                >
                                    <Zap className="w-4 h-4" />
                                    Analyze ({selectedCount})
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allKeywords.map((kw) => (
                            <KeywordCard
                                key={kw.keyword}
                                keyword={kw}
                                isSelected={isSelected(kw.keyword)}
                                onSelect={() => toggleSelect(kw.keyword)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* V5: Research Results - from store */}
            {currentResearchResults.length > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FlaskConical className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold text-purple-900">Research Insights</span>
                        </div>
                        <span className="text-xs text-purple-500">
                            Saved to store
                        </span>
                    </div>
                    <ul className="space-y-1">
                        {currentResearchResults.map((finding, i) => (
                            <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                                <span className="text-purple-400 mt-0.5">•</span>
                                <span>{finding}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Analysis results */}
            {analyzedKeywords.length > 0 && (
                <div className="space-y-4 relative pb-20"> {/* Extra padding for sticky bar */}
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
                                onClick={clearAnalyzedKeywords}
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
                                isSelected={isAnalyzedSelected(kw.keyword)}
                                onToggleSelect={() => toggleAnalyzedSelect(kw.keyword)}
                                onUse={() => handleUseKeyword(kw)}
                            />
                        ))}
                    </div>

                    {/* Selection action bar */}
                    <SelectionActionsBar
                        selectedCount={selectedAnalyzedCount}
                        totalCount={analyzedKeywords.length}
                        onSelectAll={selectAllAnalyzed}
                        onClearSelection={clearAnalyzedSelection}
                        onUseSelected={handleUseSelected}
                        onSaveSelected={handleSaveSelected}
                    />
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

            {/* Saved Analyses Table */}
            <SavedAnalysesTable
                onUseKeywords={(keywords) => {
                    if (onSelectMultiple) {
                        onSelectMultiple(keywords);
                    }
                }}
            />
        </div>
    );
}
