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
 * REFACTORED: Extracted types, utils, and TrendCard into separate files.
 */

import { useState, useCallback, useEffect } from 'react';
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

// Extracted types
import type { TrendItem, SourceStatus, TrendScannerProps } from './trendTypes';

// Extracted utilities
import { formatTimeAgo, CPC_THRESHOLD_MEDIUM } from './trendUtils';

// Extracted components
import { TrendCard } from './TrendCard';

export default function TrendScanner({ onSelectKeywords }: TrendScannerProps) {
    const [trends, setTrends] = useState<TrendItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasScanned, setHasScanned] = useState(false);
    const [sources, setSources] = useState<Record<string, SourceStatus>>({});
    const [braveApiKey, setBraveApiKey] = useState<string | null>(null);

    // Selection state
    const [selectedTrends, setSelectedTrends] = useState<Set<string>>(new Set());

    // UI state
    const [showTips, setShowTips] = useState(true);
    const [visibleCount, setVisibleCount] = useState(10);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

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

    // Note: Reddit integration removed - they block both server and client requests (CORS)

    const scanTrends = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSources({});
        setSelectedTrends(new Set());
        setVisibleCount(10);

        try {
            // Fetch from server API (Hacker News, Google News, Product Hunt)
            // Note: Reddit is not available - they block both server and client requests (CORS)
            const response = await fetch('/api/trends/multi-source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    braveApiKey,
                    categories: ['technology', 'business', 'finance', 'health'],
                    useAIAnalysis: false
                })
            });

            const data = await response.json();

            if (data.success) {
                setTrends(data.trends || []);
                setSources(data.sources || {});
                setHasScanned(true);
                setLastScanTime(new Date());

                if (data.trends.length === 0) {
                    setError('No trends found. Try again in a few minutes.');
                }
            } else {
                setError(data.error || 'Failed to scan trends');
            }
        } catch (err) {
            setError('Failed to connect to trend scanner');
            console.error('Trend scan error:', err);
        } finally {
            setLoading(false);
        }
    }, [braveApiKey]);

    const toggleSelection = (topic: string) => {
        const newSelection = new Set(selectedTrends);
        if (newSelection.has(topic)) {
            newSelection.delete(topic);
        } else {
            newSelection.add(topic);
        }
        setSelectedTrends(newSelection);
    };

    const selectAll = () => {
        setSelectedTrends(new Set(trends.map(t => t.topic)));
    };

    const clearSelection = () => {
        setSelectedTrends(new Set());
    };

    const handleSendToAnalysis = () => {
        if (onSelectKeywords && selectedTrends.size > 0) {
            onSelectKeywords(Array.from(selectedTrends));
        }
    };

    const highCPCCount = trends.filter(t => (t.cpcScore || 0) >= CPC_THRESHOLD_MEDIUM).length;
    const visibleTrends = trends.slice(0, visibleCount);

    return (
        <div className="space-y-4">
            {/* Educational Tips Banner */}
            {showTips && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-900">How to Use Live Trends</h4>
                                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                    <li>• <strong>High CPC trends</strong> = More AdSense revenue potential</li>
                                    <li>• <strong>Select trending topics</strong> → Send to Analyze for domain hunting</li>
                                    <li>• <strong>Breaking news</strong> = Write article FAST for first-mover advantage</li>
                                    <li>• <strong>Multiple sources</strong> confirm trend = Higher confidence</li>
                                </ul>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTips(false)}
                            className="text-blue-400 hover:text-blue-600 text-sm"
                        >
                            Hide
                        </button>
                    </div>
                </div>
            )}

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
                                Updated {formatTimeAgo(lastScanTime)}
                            </div>
                        )}
                        <button
                            onClick={scanTrends}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                        >
                            {loading ? (
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
                {Object.keys(sources).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-100">
                        <span className="text-xs text-neutral-500">Sources:</span>
                        {Object.entries(sources).map(([key, status]) => (
                            <div
                                key={key}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.success
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-600 border border-red-200'
                                    }`}
                            >
                                {status.success ? (
                                    <CheckCircle className="w-3 h-3" />
                                ) : (
                                    <XCircle className="w-3 h-3" />
                                )}
                                <span className="capitalize">{key.replace('_', ' ')}</span>
                                {status.success && <span className="opacity-70">({status.count})</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selection Actions Bar */}
            {hasScanned && trends.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-neutral-600">
                                {selectedTrends.size > 0 ? (
                                    <span className="font-medium text-amber-600">
                                        {selectedTrends.size} selected
                                    </span>
                                ) : (
                                    'Click trends to select for analysis'
                                )}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={selectAll}
                                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="text-xs px-2 py-1 text-neutral-500 hover:bg-neutral-50 rounded"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-xs text-neutral-500 flex items-center gap-2">
                                <BarChart3 className="w-3 h-3" />
                                <span>{highCPCCount} high-CPC</span>
                                <span>•</span>
                                <span>{trends.length} total</span>
                            </div>

                            {selectedTrends.size > 0 && onSelectKeywords && (
                                <button
                                    onClick={handleSendToAnalysis}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 shadow-md transition-all"
                                >
                                    <Target className="w-4 h-4" />
                                    Analyze Selected ({selectedTrends.size})
                                </button>
                            )}
                        </div>
                    </div>
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
            {hasScanned && !loading && trends.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-neutral-100">
                        {visibleTrends.map((trend, idx) => (
                            <TrendCard
                                key={idx}
                                trend={trend}
                                isSelected={selectedTrends.has(trend.topic)}
                                onToggleSelection={toggleSelection}
                            />
                        ))}
                    </div>

                    {/* Load More */}
                    {trends.length > visibleCount && (
                        <div className="p-4 bg-neutral-50 border-t border-neutral-100 text-center">
                            <button
                                onClick={() => setVisibleCount(v => v + 10)}
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
                                onClick={() => setVisibleCount(10)}
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
            {!hasScanned && !loading && (
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
                        onClick={scanTrends}
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
                    onClick={() => setShowTips(true)}
                    className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600"
                >
                    <Info className="w-3 h-3" />
                    Show tips
                </button>
            )}
        </div>
    );
}
