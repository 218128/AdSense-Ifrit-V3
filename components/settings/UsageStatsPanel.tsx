'use client';

import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Download, Trash2 } from 'lucide-react';
import {
    getAllStats,
    getTotalStats,
    clearStats,
    exportUsageData,
    ProviderStats
} from '@/lib/ai/usageStats';

/**
 * Usage Statistics Panel
 * Shows AI API usage across providers
 */
export function UsageStatsPanel() {
    const [stats, setStats] = useState<ProviderStats[]>([]);
    const [total, setTotal] = useState({ totalRequests: 0, totalTokens: 0, totalCostUsd: 0, successRate: 100 });
    const [loading, setLoading] = useState(true);

    const loadStats = () => {
        setLoading(true);
        const allStats = getAllStats();
        const totalStats = getTotalStats();
        setStats(allStats.filter(s => s.totalRequests > 0));
        setTotal(totalStats);
        setLoading(false);
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleExport = () => {
        const data = exportUsageData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ifrit-usage-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        if (confirm('Clear all usage statistics? This cannot be undone.')) {
            clearStats();
            loadStats();
        }
    };

    const formatTokens = (tokens: number): string => {
        if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
        if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
        return tokens.toString();
    };

    const getProviderColor = (providerId: string): string => {
        const colors: Record<string, string> = {
            gemini: '#4285f4',
            deepseek: '#00d4aa',
            openrouter: '#ff6b35',
            vercel: '#000000',
            perplexity: '#20b2aa'
        };
        return colors[providerId] || '#666666';
    };

    if (loading) {
        return (
            <div className="p-4 text-center">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Usage Statistics</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadStats}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                        title="Export"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleClear}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        title="Clear"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{total.totalRequests}</div>
                    <div className="text-xs text-blue-600">Total Requests</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{formatTokens(total.totalTokens)}</div>
                    <div className="text-xs text-green-600">Total Tokens</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">${total.totalCostUsd.toFixed(2)}</div>
                    <div className="text-xs text-purple-600">Est. Cost</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{total.successRate}%</div>
                    <div className="text-xs text-orange-600">Success Rate</div>
                </div>
            </div>

            {/* Provider Breakdown */}
            {stats.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600">By Provider</h4>
                    <div className="divide-y">
                        {stats.map(stat => (
                            <div key={stat.providerId} className="py-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: getProviderColor(stat.providerId) }}
                                    />
                                    <span className="font-medium capitalize">{stat.providerId}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span>{stat.totalRequests} req</span>
                                    <span>{formatTokens(stat.totalInputTokens + stat.totalOutputTokens)} tok</span>
                                    <span>${stat.estimatedCostUsd.toFixed(2)}</span>
                                    <span>{stat.averageLatencyMs}ms avg</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
                    No usage data yet. Stats will appear after you generate content.
                </div>
            )}
        </div>
    );
}
