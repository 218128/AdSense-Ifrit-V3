'use client';

/**
 * Live Trend Scanner - Enhanced Version
 * 
 * Multi-source real-time trend detection with:
 * - Hacker News, Google News, Product Hunt, Brave Search
 * - Educational tips for users
 * - Keyword selection for analysis
 * - Full-width, more LIVE UI
 * 
 * REFACTORED: Uses Zustand store (trendStore) for state management.
 */

import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Loader2,
    Zap,
    RefreshCw,
    CheckCircle,
    XCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Target,
    Lightbulb,
    Timer,
    BarChart3,
    FlaskConical
} from 'lucide-react';

// Zustand store
import { useTrendStore } from '@/stores/trendStore';
import { useSettingsStore } from '@/stores/settingsStore';

// Extracted types
import type { TrendScannerProps } from './types';

// Extracted utilities
import { formatTimeAgo, CPC_THRESHOLD_MEDIUM } from './utils';

// Extracted components
import { TrendCard } from './TrendCard';
import { TipSection, SourceStatusBar, SelectionBar } from '../../shared/components';
import { ActionStatusBar } from '@/lib/shared/components';

export default function TrendScanner({ onSelectKeywords }: TrendScannerProps) {
    // ============ ZUSTAND STORE ============
    const {
        trends,
        sources,
        lastScanTime,
        isScanning,
        error,
        selectedTrends,
        toggleTrendSelection,
        selectAllTrends,
        clearTrendSelection,
        getSelectedCount,
        isTrendSelected,
        getSelectedTopics,
        getSelectedTrendItems,
        scanTrends,
        visibleCount,
        showMore,
        showTips,
        toggleTips,
        // Source filtering
        activeSource,
        setActiveSource,
        getFilteredTrends,
        // Load more
        loadMoreTrends,
        isLoadingMore,
        // Research - now persisted
        researchResults,
        addResearchResult,
        // Action status
        actionStatus,
        // Source settings (for reactive configuration)
        sourceSettings,
        setSourceSettings,
    } = useTrendStore();

    // ============ LOCAL STATE ============
    const [braveApiKey, setBraveApiKey] = useState<string | null>(null);

    // Computed values - use filtered trends
    const filteredTrends = getFilteredTrends();
    const hasScanned = trends.length > 0 || lastScanTime !== null;
    const selectedCount = getSelectedCount();
    const visibleTrends = filteredTrends.slice(0, visibleCount);
    const highCPCCount = filteredTrends.filter(t => (t.cpcScore || 0) >= CPC_THRESHOLD_MEDIUM).length;
    const showLoadMore = filteredTrends.length > visibleCount;

    // V5: Research state - loading only, results from store
    const [researching, setResearching] = useState(false);

    // V6: Perplexity SDK additional data
    const [researchCitations, setResearchCitations] = useState<string[]>([]);
    const [researchRelatedQuestions, setResearchRelatedQuestions] = useState<string[]>([]);

    // Get research results for selected topics from store
    const selectedTopics = getSelectedTopics();
    const currentResearchResults = selectedTopics
        .map(topic => researchResults[topic])
        .filter(Boolean)
        .flatMap(r => r?.findings || []);

    // ============ EFFECTS ============

    // C9 FIX: Get Brave API key from Zustand store instead of localStorage
    const braveApiKeyFromStore = useSettingsStore(state => {
        const braveKey = state.mcpServers.apiKeys?.['brave-search'];
        if (typeof braveKey === 'string') return braveKey;
        if (braveKey && typeof braveKey === 'object') {
            return (braveKey as { key?: string }).key || '';
        }

        // Fallback to perplexity
        const perplexityKey = state.providerKeys?.perplexity?.[0];
        if (typeof perplexityKey === 'string') return perplexityKey;
        if (perplexityKey && typeof perplexityKey === 'object') {
            return (perplexityKey as { key?: string }).key || '';
        }

        return '';
    });

    useEffect(() => {
        if (braveApiKeyFromStore) {
            setBraveApiKey(braveApiKeyFromStore);
        }
    }, [braveApiKeyFromStore]);

    // ============ HANDLERS ============

    const handleScan = () => {
        scanTrends(braveApiKey);
    };

    const handleSendToAnalysis = () => {
        if (onSelectKeywords && selectedCount > 0) {
            onSelectKeywords(getSelectedTopics());
        }
    };

    // V5: Research selected trends using Capabilities system
    const handleResearchTrends = async () => {
        if (selectedCount === 0) return;

        setResearching(true);
        setResearchCitations([]);
        setResearchRelatedQuestions([]);

        try {
            // Use aiServices capability system (handles provider selection + API keys)
            const { aiServices } = await import('@/lib/ai/services');

            const topics = getSelectedTopics();
            const result = await aiServices.research(
                `Research these trending topics for monetization potential and content opportunities: ${topics.join(', ')}`,
                { researchType: 'deep' }
            );

            if (result.success) {
                let findings: string[] = [];

                // Try structured data first (from Perplexity SDK)
                const data = result.data as {
                    keyFindings?: string[];
                    citations?: string[];
                    relatedQuestions?: string[];
                } | undefined;

                if (data?.keyFindings) {
                    findings = data.keyFindings;
                } else if (result.text) {
                    // Parse text response
                    findings = result.text
                        .split(/[\n•\-\*]/)
                        .map(s => s.trim())
                        .filter(s => s.length > 10);

                    if (findings.length === 0) {
                        findings = [result.text];
                    }
                }

                // Capture Perplexity SDK additional data
                if (data?.citations) {
                    setResearchCitations(data.citations);
                }
                if (data?.relatedQuestions) {
                    setResearchRelatedQuestions(data.relatedQuestions);
                }

                if (findings.length > 0) {
                    // Save research results to store for each selected topic
                    for (const topic of topics) {
                        addResearchResult(topic, findings);
                    }
                    console.log('[TrendResearch] Saved findings:', findings.length, 'citations:', data?.citations?.length || 0);
                }
            } else if (result.error?.includes('No handlers')) {
                alert('No research provider configured. Go to Settings → Capabilities to set up a handler.');
            }
        } catch (err) {
            console.error('Trend research failed:', err);
        } finally {
            setResearching(false);
        }
    };


    return (
        <div className="space-y-4">
            {/* Educational Tips Banner */}
            {showTips && <TipSection onHide={toggleTips} />}

            {/* Header with Controls */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-800">Live Trend Scanner</h4>
                            <p className="text-xs text-neutral-500">
                                Multi-source real-time trends • Hacker News, Google News, Product Hunt
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {lastScanTime && (
                            <div className="flex items-center gap-1 text-xs text-neutral-500">
                                <Timer className="w-3 h-3" />
                                Updated {formatTimeAgo(new Date(lastScanTime))}
                            </div>
                        )}
                        <button
                            onClick={handleScan}
                            disabled={isScanning}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : hasScanned ? (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh Trends
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Discover Trends
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Source Status & Filter */}
                <SourceStatusBar
                    sources={sources}
                    activeSource={activeSource}
                    onSourceClick={(id) => {
                        // If clicking active source, clear it (toggle off)
                        // If clicking new source, set it
                        setActiveSource(activeSource === id ? null : id);
                    }}
                />

                {/* Source Configuration Panel - Dynamic based on selection */}
                <div className="mt-4 pb-2 border-b border-neutral-100 bg-neutral-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            {activeSource ? 'Source Configuration' : 'Global Scan Settings'}
                        </label>
                        {activeSource && (
                            <span className="text-xs text-amber-600 font-medium">
                                Configuring: {activeSource.replace('-trends', '').replace('news', ' News')}
                            </span>
                        )}
                    </div>

                    {!activeSource && (
                        <p className="text-xs text-neutral-400 italic">
                            Select a specific source above to customize its search parameters.
                            Currently scanning all sources with default settings.
                        </p>
                    )}

                    {/* Brave Search Config */}
                    {activeSource === 'brave-search-trends' && (
                        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search Query (e.g., 'latest AI agents', 'crypto analysis')"
                                    className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    value={sourceSettings['brave-search-trends']?.query || ''}
                                    onChange={(e) => setSourceSettings('brave-search-trends', { query: e.target.value })}
                                />
                                <select
                                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                    value={sourceSettings['brave-search-trends']?.freshness || ''}
                                    onChange={(e) => setSourceSettings('brave-search-trends', { freshness: e.target.value })}
                                >
                                    <option value="">Any Time</option>
                                    <option value="pd">Past Day</option>
                                    <option value="pw">Past Week</option>
                                    <option value="pm">Past Month</option>
                                </select>
                            </div>
                            <p className="text-[10px] text-neutral-400">
                                Leave query empty to scan general technology trends.
                            </p>
                        </div>
                    )}

                    {/* Google News Config */}
                    {activeSource === 'googlenews-trends' && (
                        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <input
                                type="text"
                                placeholder="Topic (e.g., 'Technology', 'Science', 'Local')"
                                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                value={sourceSettings['googlenews-trends']?.topic || ''}
                                onChange={(e) => setSourceSettings('googlenews-trends', { topic: e.target.value })}
                            />
                            <p className="text-[10px] text-neutral-400">
                                Leave empty to scan Top Stories (Headlines).
                            </p>
                        </div>
                    )}

                    {/* Feed Sources (No Config) */}
                    {(activeSource === 'hackernews-trends' || activeSource === 'producthunt-trends') && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-2 text-sm text-neutral-600 bg-white border border-neutral-200 p-2 rounded-md">
                                <Info className="w-4 h-4 text-blue-500" />
                                <span>Scanning live global feed. No filtering applied to preserve trend integrity.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Real-time Action Status */}
                <ActionStatusBar status={actionStatus} className="mt-3" />
            </div>

            {/* Selection Actions Bar */}
            {hasScanned && trends.length > 0 && (
                <SelectionBar
                    selectedCount={selectedCount}
                    totalCount={trends.length}
                    highValueCount={highCPCCount}
                    onSelectAll={selectAllTrends}
                    onClear={clearTrendSelection}
                    onAction={onSelectKeywords ? handleSendToAnalysis : undefined}
                    actionLabel="Analyze Selected"
                    emptyMessage="Click trends to select for analysis"
                />
            )}

            {/* V5: Research Button & Results */}
            {hasScanned && selectedCount > 0 && (
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleResearchTrends}
                        disabled={researching}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 self-start"
                    >
                        <FlaskConical className="w-4 h-4" />
                        {researching ? 'Researching...' : `Research (${selectedCount})`}
                    </button>
                </div>
            )}

            {/* V5: Research Results Panel - from store */}
            {currentResearchResults.length > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                            <FlaskConical className="w-4 h-4" />
                            Research Insights ({currentResearchResults.length})
                        </h4>
                        <span className="text-xs text-purple-500">
                            Saved to store
                        </span>
                    </div>
                    <ul className="space-y-2">
                        {currentResearchResults.map((finding, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-purple-800">
                                <span className="text-purple-400 mt-0.5">•</span>
                                <span>{finding}</span>
                            </li>
                        ))}
                    </ul>

                    {/* V6: Citations from Perplexity SDK */}
                    {researchCitations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-xs font-semibold text-indigo-700 mb-2">
                                🔗 Sources ({researchCitations.length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {researchCitations.slice(0, 6).map((url, i) => (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-indigo-600 hover:underline bg-white px-2 py-1 rounded border border-indigo-100"
                                    >
                                        {new URL(url).hostname}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* V6: Related Questions as trend ideas */}
                    {researchRelatedQuestions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-xs font-semibold text-amber-700 mb-2">
                                💡 Related Trend Ideas:
                            </p>
                            <div className="space-y-1">
                                {researchRelatedQuestions.slice(0, 4).map((q, i) => (
                                    <div key={i} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                        {q}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
                    <XCircle className="w-5 h-5 mt-0.5" />
                    <div>
                        <p className="font-medium">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Trends List - Full Width */}
            {hasScanned && !isScanning && trends.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-neutral-100">
                        {visibleTrends.map((trend, idx) => (
                            <TrendCard
                                key={idx}
                                trend={trend}
                                isSelected={isTrendSelected(trend.topic)}
                                onToggleSelection={toggleTrendSelection}
                            />
                        ))}
                    </div>

                    {/* Load More - Fetches NEW data from sources */}
                    <div className="p-4 bg-neutral-50 border-t border-neutral-100 text-center">
                        <button
                            onClick={() => loadMoreTrends(braveApiKey)}
                            disabled={isLoadingMore}
                            className="flex items-center gap-2 mx-auto px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 rounded-lg transition-all font-medium"
                        >
                            {isLoadingMore ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Fetching More...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Load More Trends
                                </>
                            )}
                        </button>
                    </div>

                    {/* Show Less */}
                    {visibleCount > 10 && (
                        <div className="p-2 bg-neutral-50 border-t border-neutral-100 text-center">
                            <button
                                onClick={() => useTrendStore.getState().resetVisibility()}
                                className="flex items-center gap-1 mx-auto text-xs text-neutral-500 hover:text-neutral-700"
                            >
                                <ChevronUp className="w-3 h-3" />
                                Show Less
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!hasScanned && !isScanning && (
                <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-amber-600" />
                    </div>
                    <h4 className="font-bold text-neutral-800 mb-2">Discover Breaking Trends</h4>
                    <p className="text-neutral-500 mb-4 max-w-md mx-auto">
                        Scan multiple sources for real-time trending topics. Find high-CPC keywords
                        and breaking news before your competitors.
                    </p>
                    <button
                        onClick={handleScan}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 shadow-md transition-all"
                    >
                        <Zap className="w-5 h-5" />
                        Start Scanning
                    </button>
                </div>
            )}

            {/* Source Legend */}
            {!showTips && hasScanned && (
                <button
                    onClick={toggleTips}
                    className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600"
                >
                    <Info className="w-3 h-3" />
                    Show tips
                </button>
            )}
        </div>
    );
}
