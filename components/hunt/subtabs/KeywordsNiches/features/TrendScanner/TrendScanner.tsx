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
    BarChart3
} from 'lucide-react';

// Zustand store
import { useTrendStore } from '@/stores/trendStore';

// Extracted types
import type { TrendScannerProps } from './types';

// Extracted utilities
import { formatTimeAgo, CPC_THRESHOLD_MEDIUM } from './utils';

// Extracted components
import { TrendCard } from './TrendCard';
import { TipSection, SourceStatusBar, SelectionBar } from '../../shared/components';

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
        scanTrends,
        visibleCount,
        showMore,
        showTips,
        toggleTips,
    } = useTrendStore();

    // ============ LOCAL STATE ============
    const [braveApiKey, setBraveApiKey] = useState<string | null>(null);

    // Computed values
    const hasScanned = trends.length > 0 || lastScanTime !== null;
    const selectedCount = getSelectedCount();
    const visibleTrends = trends.slice(0, visibleCount);
    const highCPCCount = trends.filter(t => (t.cpcScore || 0) >= CPC_THRESHOLD_MEDIUM).length;

    // ============ EFFECTS ============

    // Load Brave API key from localStorage
    useEffect(() => {
        try {
            const keys = localStorage.getItem('ifrit_mcp_api_keys');
            if (keys) {
                const parsed = JSON.parse(keys);
                if (parsed['brave-search']) {
                    setBraveApiKey(parsed['brave-search']);
                }
            }
        } catch { }
    }, []);

    // ============ HANDLERS ============

    const handleScan = () => {
        scanTrends(braveApiKey);
    };

    const handleSendToAnalysis = () => {
        if (onSelectKeywords && selectedCount > 0) {
            onSelectKeywords(getSelectedTopics());
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

                {/* Source Status Pills */}
                <SourceStatusBar sources={sources} />
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

                    {/* Load More */}
                    {trends.length > visibleCount && (
                        <div className="p-4 bg-neutral-50 border-t border-neutral-100 text-center">
                            <button
                                onClick={showMore}
                                className="flex items-center gap-2 mx-auto px-4 py-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-all"
                            >
                                <ChevronDown className="w-4 h-4" />
                                Load More ({trends.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}

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
