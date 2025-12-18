'use client';

/**
 * Trend Scanner Component
 * 
 * Scans for live trends from Google Trends and high-CPC keywords.
 * Allows users to write articles from discovered trends.
 */

import { useState, useCallback } from 'react';
import { TrendingUp, Loader2, Zap, DollarSign, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';

interface TrendItem {
    topic: string;
    context: string;
    source: 'live' | 'fallback';
    cpcScore?: number;
    niche?: string;
}

interface TrendScannerProps {
    onSelectTrend?: (trend: TrendItem) => void;
}

export default function TrendScanner({ onSelectTrend }: TrendScannerProps) {
    const [trends, setTrends] = useState<TrendItem[]>([]);
    const [highCpcKeywords, setHighCpcKeywords] = useState<TrendItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasScanned, setHasScanned] = useState(false);

    const scanTrends = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/scan-trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            const data = await response.json();

            if (data.success !== false) {
                setTrends(data.liveTraends || []);
                setHighCpcKeywords(data.highCpcKeywords || []);
                setHasScanned(true);
            } else {
                setError(data.error || 'Failed to scan trends');
            }
        } catch (err) {
            setError('Failed to connect to trend scanner');
            console.error('Trend scan error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <div className="space-y-4">
            {/* Header with Scan Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <h4 className="font-semibold text-neutral-800">Live Trend Scanner</h4>
                </div>
                <button
                    onClick={scanTrends}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scanning...
                        </>
                    ) : hasScanned ? (
                        <>
                            <RefreshCw className="w-4 h-4" />
                            Rescan
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4" />
                            Discover Trends
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Results Grid */}
            {hasScanned && !loading && (
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Live Trends */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Live Trends ({trends.length})
                        </h5>
                        {trends.length === 0 ? (
                            <p className="text-sm text-blue-600">No live trends available</p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {trends.map((trend, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white p-3 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-neutral-800 truncate">
                                                    {trend.topic}
                                                </p>
                                                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                                                    {trend.context}
                                                </p>
                                            </div>
                                            {onSelectTrend && (
                                                <button
                                                    onClick={() => onSelectTrend(trend)}
                                                    className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-all flex items-center gap-1"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    Write
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* High-CPC Keywords */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        <h5 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            High-CPC Keywords ({highCpcKeywords.length})
                        </h5>
                        {highCpcKeywords.length === 0 ? (
                            <p className="text-sm text-green-600">No high-CPC keywords found</p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {highCpcKeywords.map((kw, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white p-3 rounded-lg border border-green-100 hover:border-green-300 transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm text-neutral-800 truncate">
                                                        {kw.topic}
                                                    </p>
                                                    {kw.niche && (
                                                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                                            {kw.niche}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                                                    {kw.context}
                                                </p>
                                            </div>
                                            {onSelectTrend && (
                                                <button
                                                    onClick={() => onSelectTrend(kw)}
                                                    className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-all flex items-center gap-1"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    Write
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!hasScanned && !loading && (
                <div className="text-center py-8 text-neutral-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Click "Discover Trends" to scan for live trends and high-CPC keywords</p>
                </div>
            )}
        </div>
    );
}
