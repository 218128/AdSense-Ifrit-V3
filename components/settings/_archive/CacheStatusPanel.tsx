'use client';

/**
 * Cache Status Panel
 * 
 * V4 Feature: Shows prompt cache statistics in Settings
 * - Tracked prompts count
 * - Cache hits (for implicit caching)
 * - Estimated savings
 */

import { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import { clearExpiredCaches, getCacheStats } from '@/lib/ai/cacheManager';

interface CacheStats {
    totalCaches: number;
    totalHits: number;
    byType: Record<string, number>;
    estimatedSavings: string;
}

export default function CacheStatusPanel() {
    const [stats, setStats] = useState<CacheStats | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = () => {
        setLoading(true);
        const cacheStats = getCacheStats();
        setStats(cacheStats);
        setLoading(false);
    };

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleClearOld = () => {
        const removed = clearExpiredCaches();
        if (removed > 0) {
            alert(`Cleared ${removed} old cache entries`);
        } else {
            alert('No old cache entries to clear');
        }
        loadStats();
    };

    if (loading || !stats) {
        return (
            <div className="p-4 bg-neutral-50 rounded-lg flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm text-neutral-500">Loading cache stats...</span>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium text-purple-900">V4 Implicit Cache Tracking</h4>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadStats}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"
                        title="Refresh stats"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleClearOld}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Clear old entries"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {stats.totalCaches === 0 ? (
                <div className="text-sm text-purple-600">
                    No cache data yet. Gemini 2.5+ models cache prompts automatically.
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white p-2 rounded border border-purple-100">
                            <div className="text-2xl font-bold text-purple-700">
                                {stats.totalCaches}
                            </div>
                            <div className="text-xs text-purple-500">Tracked Prompts</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-purple-100">
                            <div className="text-2xl font-bold text-green-600">
                                {stats.totalHits}
                            </div>
                            <div className="text-xs text-green-500">Cache Hits</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-purple-100">
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                                <span className="text-sm font-medium text-indigo-600">
                                    {stats.estimatedSavings.replace(/~|potential savings/g, '').trim() || '0%'}
                                </span>
                            </div>
                            <div className="text-xs text-indigo-500">Est. Savings</div>
                        </div>
                    </div>

                    {/* Type Breakdown */}
                    {Object.keys(stats.byType).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {Object.entries(stats.byType).map(([type, count]) => (
                                <span key={type} className="px-2 py-1 bg-white border border-purple-100 rounded text-xs text-purple-700 capitalize">
                                    {type}: {count}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Info */}
                    <div className="text-xs text-purple-700 bg-purple-100/50 p-2 rounded">
                        💡 Gemini 2.5+ uses implicit caching. Keep consistent prefixes in prompts for automatic savings.
                    </div>
                </div>
            )}
        </div>
    );
}
