'use client';

/**
 * AI Usage Panel
 * 
 * Shows AI usage statistics, cost tracking, and credit balance.
 * Wires up the previously unused lib/costTracker module.
 */

import { useState, useEffect } from 'react';
import {
    getUsageSummary,
    getTodayUsage,
    getSessionUsage,
    getCreditBalance,
    setCreditBalance,
    clearUsageRecords,
    exportUsageData,
    UsageSummary
} from '@/lib/costTracker';
import { formatCost, formatTokens, PROVIDER_PRICING } from '@/lib/providerPricing';

export function AIUsagePanel() {
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [viewMode, setViewMode] = useState<'session' | 'today'>('session');
    const [perplexityCredit, setPerplexityCredit] = useState<number>(5.00);
    const [editingCredit, setEditingCredit] = useState(false);
    const [creditInput, setCreditInput] = useState('');

    const loadData = () => {
        const records = viewMode === 'today' ? getTodayUsage() : getSessionUsage();
        setSummary(getUsageSummary(records));

        // Load Perplexity credit
        const credit = getCreditBalance('perplexity');
        if (credit) {
            setPerplexityCredit(credit.remaining);
        }
    };

    useEffect(() => {
        loadData();
    }, [viewMode]);

    const handleSaveCredit = () => {
        const value = parseFloat(creditInput);
        if (!isNaN(value) && value >= 0) {
            setCreditBalance('perplexity', value, 5.00);
            setPerplexityCredit(value);
            setEditingCredit(false);
            setCreditInput('');
        }
    };

    const handleExport = () => {
        const data = exportUsageData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-usage-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        if (confirm('Clear all usage records? This cannot be undone.')) {
            clearUsageRecords();
            loadData();
        }
    };

    if (!summary) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-20 bg-neutral-100 rounded-lg"></div>
                <div className="h-32 bg-neutral-100 rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('session')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'session'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                    >
                        This Session
                    </button>
                    <button
                        onClick={() => setViewMode('today')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'today'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                    >
                        Today
                    </button>
                </div>
                <button
                    onClick={loadData}
                    className="text-sm text-neutral-500 hover:text-neutral-700"
                >
                    ↻ Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-100">
                    <div className="text-2xl font-bold text-emerald-600">
                        {formatCost(summary.totalCost)}
                    </div>
                    <div className="text-xs text-emerald-700">Total Cost</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">
                        {summary.totalRequests}
                    </div>
                    <div className="text-xs text-blue-700">Requests</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
                    <div className="text-2xl font-bold text-purple-600">
                        {formatTokens(summary.totalInputTokens)}
                    </div>
                    <div className="text-xs text-purple-700">Input Tokens</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
                    <div className="text-2xl font-bold text-orange-600">
                        {formatTokens(summary.totalOutputTokens)}
                    </div>
                    <div className="text-xs text-orange-700">Output Tokens</div>
                </div>
            </div>

            {/* Perplexity Credit Tracker */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
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
                        style={{ width: `${Math.min((perplexityCredit / 5) * 100, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-purple-600 mt-1">
                    <span>Used: ${(5 - perplexityCredit).toFixed(2)}</span>
                    <span>$5.00 monthly</span>
                </div>
            </div>

            {/* Per-Provider Breakdown */}
            <div>
                <h4 className="font-medium text-neutral-700 mb-3">Cost by Provider</h4>
                {summary.byProvider.length === 0 ? (
                    <div className="text-neutral-400 text-sm text-center py-8 bg-neutral-50 rounded-lg">
                        No usage recorded yet. Generate some content to see stats.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {summary.byProvider.map(provider => {
                            const percentage = summary.totalCost > 0
                                ? (provider.totalCost / summary.totalCost) * 100
                                : 0;
                            const pricing = PROVIDER_PRICING[provider.provider];

                            return (
                                <div key={provider.provider} className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <div>
                                            <span className="font-medium text-neutral-800">
                                                {pricing?.name || provider.provider}
                                            </span>
                                            <span className="text-xs text-neutral-500 ml-2">
                                                {provider.totalRequests} requests
                                            </span>
                                        </div>
                                        <span className="font-bold text-neutral-800">
                                            {formatCost(provider.totalCost)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-neutral-200 rounded-full h-2">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-500 mt-1">
                                        <span>
                                            {formatTokens(provider.totalInputTokens)} in / {formatTokens(provider.totalOutputTokens)} out
                                        </span>
                                        <span>{percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
                <button
                    onClick={handleClear}
                    className="text-sm text-red-600 hover:text-red-800"
                >
                    Clear Records
                </button>
                <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                >
                    Export Usage Data
                </button>
            </div>
        </div>
    );
}
