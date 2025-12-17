'use client';

/**
 * AI Cost Dashboard
 * 
 * Visual dashboard for tracking AI provider usage and costs.
 * Shows session/daily costs, per-provider breakdown, and credit management.
 */

import React, { useState, useEffect } from 'react';
import {
    getUsageSummary,
    getTodayUsage,
    getSessionUsage,
    getCreditBalance,
    setCreditBalance,
    clearUsageRecords,
    UsageSummary
} from '@/lib/costTracker';
import { formatCost, formatTokens, PROVIDER_PRICING } from '@/lib/providerPricing';

interface CostDashboardProps {
    compact?: boolean;
    onClose?: () => void;
}

export default function CostDashboard({ compact = false, onClose }: CostDashboardProps) {
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [todaySummary, setTodaySummary] = useState<UsageSummary | null>(null);
    const [perplexityCredit, setPerplexityCredit] = useState<number>(5.00);
    const [editingCredit, setEditingCredit] = useState(false);
    const [creditInput, setCreditInput] = useState('');
    const [viewMode, setViewMode] = useState<'session' | 'today' | 'all'>('session');

    const loadData = () => {
        const sessionRecords = getSessionUsage();
        const todayRecords = getTodayUsage();

        setSummary(getUsageSummary(sessionRecords));
        setTodaySummary(getUsageSummary(todayRecords));

        // Load Perplexity credit
        const credit = getCreditBalance('perplexity');
        if (credit) {
            setPerplexityCredit(credit.remaining);
        }
    };

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const handleSaveCredit = () => {
        const value = parseFloat(creditInput);
        if (!isNaN(value) && value >= 0) {
            setCreditBalance('perplexity', value, 5.00);
            setPerplexityCredit(value);
            setEditingCredit(false);
            setCreditInput('');
        }
    };

    const handleClearRecords = () => {
        if (confirm('Clear all usage records? This cannot be undone.')) {
            clearUsageRecords();
            loadData();
        }
    };

    const currentSummary = viewMode === 'today' ? todaySummary : summary;

    if (!currentSummary) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                </div>
            </div>
        );
    }

    // Compact view for embedding in other dashboards
    if (compact) {
        return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        <span className="font-medium text-green-800">AI Costs</span>
                    </div>
                    <span className="text-lg font-bold text-green-700">
                        {formatCost(currentSummary.totalCost)}
                    </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-green-700">
                    <div>
                        <span className="block text-green-500">Requests</span>
                        {currentSummary.totalRequests}
                    </div>
                    <div>
                        <span className="block text-green-500">Tokens</span>
                        {formatTokens(currentSummary.totalInputTokens + currentSummary.totalOutputTokens)}
                    </div>
                    <div>
                        <span className="block text-green-500">Avg/Req</span>
                        {formatCost(currentSummary.avgCostPerRequest)}
                    </div>
                </div>
            </div>
        );
    }

    // Full dashboard view
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        💰 AI Cost Tracker
                    </h2>
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold">
                            {formatCost(currentSummary.totalCost)}
                        </span>
                        {onClose && (
                            <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* View Mode Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['session', 'today'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === mode
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {mode === 'session' ? 'This Session' : 'Today'}
                        </button>
                    ))}
                </div>

                {/* Perplexity Credit */}
                <div className="mb-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-800">Perplexity Pro Credit</span>
                        {editingCredit ? (
                            <div className="flex items-center gap-2">
                                <span className="text-purple-600">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={creditInput}
                                    onChange={e => setCreditInput(e.target.value)}
                                    className="w-20 px-2 py-1 border rounded text-sm"
                                    placeholder="4.86"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSaveCredit}
                                    className="text-green-600 hover:text-green-800"
                                >
                                    ✓
                                </button>
                                <button
                                    onClick={() => setEditingCredit(false)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setEditingCredit(true);
                                    setCreditInput(perplexityCredit.toFixed(2));
                                }}
                                className="text-purple-600 hover:text-purple-800 text-sm"
                            >
                                ${perplexityCredit.toFixed(2)} remaining (edit)
                            </button>
                        )}
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-3">
                        <div
                            className="bg-purple-600 h-3 rounded-full transition-all"
                            style={{ width: `${(perplexityCredit / 5) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-purple-600 mt-1">
                        <span>Used: ${(5 - perplexityCredit).toFixed(2)}</span>
                        <span>$5.00 monthly</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {currentSummary.totalRequests}
                        </div>
                        <div className="text-xs text-blue-700">Requests</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {formatTokens(currentSummary.totalInputTokens)}
                        </div>
                        <div className="text-xs text-green-700">Input Tokens</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {formatTokens(currentSummary.totalOutputTokens)}
                        </div>
                        <div className="text-xs text-orange-700">Output Tokens</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {formatCost(currentSummary.avgCostPerRequest)}
                        </div>
                        <div className="text-xs text-purple-700">Avg/Request</div>
                    </div>
                </div>

                {/* Per-Provider Breakdown */}
                <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-3">Cost by Provider</h3>
                    <div className="space-y-3">
                        {currentSummary.byProvider.length === 0 ? (
                            <div className="text-gray-500 text-sm text-center py-4">
                                No usage recorded yet
                            </div>
                        ) : (
                            currentSummary.byProvider.map(provider => {
                                const percentage = currentSummary.totalCost > 0
                                    ? (provider.totalCost / currentSummary.totalCost) * 100
                                    : 0;
                                const pricing = PROVIDER_PRICING[provider.provider];

                                return (
                                    <div key={provider.provider} className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <span className="font-medium text-gray-800">
                                                    {pricing?.name || provider.provider}
                                                </span>
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {provider.totalRequests} requests
                                                </span>
                                            </div>
                                            <span className="font-bold text-gray-800">
                                                {formatCost(provider.totalCost)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>
                                                {formatTokens(provider.totalInputTokens)} in / {formatTokens(provider.totalOutputTokens)} out
                                            </span>
                                            <span>{percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Cost Estimation */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-yellow-800 mb-2">📊 Cost Estimation</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                        <p>
                            <strong>Per article:</strong> ~{formatCost(currentSummary.avgCostPerRequest)}
                            (based on {currentSummary.totalRequests} requests)
                        </p>
                        <p>
                            <strong>Full site (20 articles):</strong> ~{formatCost(currentSummary.avgCostPerRequest * 20)}
                        </p>
                        <p>
                            <strong>Remaining with $5 credit:</strong> ~{Math.floor(perplexityCredit / (currentSummary.avgCostPerRequest || 0.01))} articles
                        </p>
                    </div>
                </div>

                {/* Cost-Effectiveness Analysis */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-blue-800 mb-3">⚖️ Cost-Effectiveness Analysis</h4>

                    {/* Your actual stats */}
                    <div className="bg-white/50 rounded p-3 mb-3">
                        <div className="text-sm text-blue-700 font-medium mb-2">Your Generation Stats</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Articles: <strong>{currentSummary.totalRequests}</strong></div>
                            <div>Total: <strong>{formatCost(currentSummary.totalCost)}</strong></div>
                            <div>Per Article: <strong>{formatCost(currentSummary.avgCostPerRequest)}</strong></div>
                            <div>Words/Article: <strong>~2,500</strong></div>
                        </div>
                    </div>

                    {/* Comparison table */}
                    <table className="w-full text-xs">
                        <thead className="text-blue-600">
                            <tr>
                                <th className="text-left py-1">Method</th>
                                <th className="text-right py-1">Per Article</th>
                                <th className="text-right py-1">17 Articles</th>
                                <th className="text-right py-1">Savings</th>
                            </tr>
                        </thead>
                        <tbody className="text-blue-800">
                            <tr className="bg-green-100/50">
                                <td className="py-1">✓ Your AI ({currentSummary.byProvider[0]?.provider || 'Perplexity'})</td>
                                <td className="text-right font-bold">{formatCost(currentSummary.avgCostPerRequest)}</td>
                                <td className="text-right font-bold">{formatCost(currentSummary.totalCost)}</td>
                                <td className="text-right text-green-600">—</td>
                            </tr>
                            <tr>
                                <td className="py-1">Fiverr (budget)</td>
                                <td className="text-right">$5</td>
                                <td className="text-right">$85</td>
                                <td className="text-right text-green-600">
                                    {((85 - currentSummary.totalCost) / 85 * 100).toFixed(0)}% saved
                                </td>
                            </tr>
                            <tr className="bg-white/30">
                                <td className="py-1">Freelancer (mid-tier)</td>
                                <td className="text-right">$25</td>
                                <td className="text-right">$425</td>
                                <td className="text-right text-green-600">
                                    {((425 - currentSummary.totalCost) / 425 * 100).toFixed(0)}% saved
                                </td>
                            </tr>
                            <tr>
                                <td className="py-1">Content agency</td>
                                <td className="text-right">$100</td>
                                <td className="text-right">$1,700</td>
                                <td className="text-right text-green-600">
                                    {((1700 - currentSummary.totalCost) / 1700 * 100).toFixed(0)}% saved
                                </td>
                            </tr>
                            <tr className="bg-white/30">
                                <td className="py-1">Your time (@ $30/hr)</td>
                                <td className="text-right">$60</td>
                                <td className="text-right">$1,020</td>
                                <td className="text-right text-green-600">
                                    {((1020 - currentSummary.totalCost) / 1020 * 100).toFixed(0)}% saved
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-3 p-2 bg-green-100 rounded text-green-800 text-xs text-center">
                        <strong>Verdict:</strong> 🎉 {currentSummary.totalCost < 1 ? 'EXTREMELY' : 'VERY'} cost-effective!
                        You're paying <strong>{formatCost(currentSummary.avgCostPerRequest)}</strong>/article vs
                        industry average of <strong>$25-100</strong>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={handleClearRecords}
                        className="text-sm text-red-600 hover:text-red-800"
                    >
                        Clear Records
                    </button>
                    <button
                        onClick={loadData}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}
