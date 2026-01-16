/**
 * Logs Dashboard Component
 * FSD: features/logs/ui/LogsDashboard.tsx
 * 
 * Main dashboard for viewing historical app activity logs.
 * Integrates with unifiedLogStore for persistent log viewing.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useUnifiedLogStore, type LogFilter, type LogEntry } from '@/stores/unifiedLogStore';
import type { ActionCategory } from '@/lib/shared/types/globalActionStatus';

// ============================================================================
// Types
// ============================================================================

type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

// ============================================================================
// Sub-components
// ============================================================================

function LogLevelBadge({ level }: { level: LogEntry['level'] }) {
    const colors = {
        debug: 'bg-gray-100 text-gray-600',
        info: 'bg-blue-100 text-blue-700',
        warn: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level]}`}>
            {level.toUpperCase()}
        </span>
    );
}

function CategoryBadge({ category }: { category: ActionCategory }) {
    const colors: Record<string, string> = {
        campaign: 'bg-purple-100 text-purple-700',
        hosting: 'bg-green-100 text-green-700',
        wordpress: 'bg-blue-100 text-blue-700',
        translation: 'bg-indigo-100 text-indigo-700',
        ai: 'bg-orange-100 text-orange-700',
        network: 'bg-gray-100 text-gray-600',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[category] || 'bg-gray-100 text-gray-600'}`}>
            {category}
        </span>
    );
}

function LogRow({ log }: { log: LogEntry }) {
    const [expanded, setExpanded] = useState(false);
    const time = new Date(log.timestamp).toLocaleTimeString();

    return (
        <div
            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${log.level === 'error' ? 'bg-red-50/50' : ''}`}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="flex items-center gap-3 px-4 py-2">
                <span className="text-xs text-gray-400 w-20 shrink-0">{time}</span>
                <LogLevelBadge level={log.level} />
                <CategoryBadge category={log.category} />
                <span className="text-sm text-gray-500 shrink-0">{log.source}</span>
                <span className="text-sm text-gray-800 truncate flex-1">{log.message}</span>
            </div>
            {expanded && (
                <div className="px-4 py-3 bg-gray-50 text-sm">
                    <div className="grid grid-cols-2 gap-4 text-gray-600">
                        <div>
                            <span className="font-medium">Session:</span> {log.sessionId}
                        </div>
                        {log.actionId && (
                            <div>
                                <span className="font-medium">Action:</span> {log.actionId}
                            </div>
                        )}
                        {log.campaignId && (
                            <div>
                                <span className="font-medium">Campaign:</span> {log.campaignId}
                            </div>
                        )}
                        {log.siteId && (
                            <div>
                                <span className="font-medium">Site:</span> {log.siteId}
                            </div>
                        )}
                    </div>
                    {log.errorDetails && (
                        <div className="mt-3 p-3 bg-red-50 rounded border border-red-100">
                            <div className="font-medium text-red-700 mb-1">Error Details</div>
                            <div className="text-red-600 text-xs font-mono">
                                <div><strong>Source:</strong> {log.errorDetails.source}</div>
                                {log.errorDetails.code && <div><strong>Code:</strong> {log.errorDetails.code}</div>}
                                <div><strong>Message:</strong> {log.errorDetails.rawMessage}</div>
                                {log.errorDetails.httpStatus && <div><strong>HTTP:</strong> {log.errorDetails.httpStatus}</div>}
                            </div>
                        </div>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-3">
                            <div className="font-medium text-gray-700 mb-1">Metadata</div>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                                {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function LogsDashboard() {
    const { logs, getStats, exportLogs, clearOldLogs, clearAllLogs } = useUnifiedLogStore();
    const stats = getStats();

    // Filters
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchText, setSearchText] = useState('');

    // Build filter
    const filter = useMemo<LogFilter>(() => {
        const now = Date.now();
        const rangeMs: Record<TimeRange, number> = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            'all': 0,
        };

        return {
            fromTimestamp: timeRange !== 'all' ? now - rangeMs[timeRange] : undefined,
            levels: levelFilter !== 'all' ? [levelFilter as LogEntry['level']] : undefined,
            categories: categoryFilter !== 'all' ? [categoryFilter as ActionCategory] : undefined,
            searchText: searchText || undefined,
        };
    }, [timeRange, levelFilter, categoryFilter, searchText]);

    // Filter logs
    const filteredLogs = useMemo(() => {
        let result = [...logs];

        if (filter.fromTimestamp) {
            result = result.filter(l => l.timestamp >= filter.fromTimestamp!);
        }
        if (filter.levels?.length) {
            result = result.filter(l => filter.levels!.includes(l.level));
        }
        if (filter.categories?.length) {
            result = result.filter(l => filter.categories!.includes(l.category));
        }
        if (filter.searchText) {
            const search = filter.searchText.toLowerCase();
            result = result.filter(l =>
                l.message.toLowerCase().includes(search) ||
                l.source.toLowerCase().includes(search)
            );
        }

        return result.reverse(); // Most recent first
    }, [logs, filter]);

    const handleExport = () => {
        const json = exportLogs(filter);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ifrit-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Activity Logs</h2>
                        <p className="text-sm text-gray-500">
                            {stats.totalLogs} total logs • {stats.errorCount} errors • {stats.sessionCount} sessions
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Export JSON
                        </button>
                        <button
                            onClick={() => clearOldLogs(7)}
                            className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg"
                        >
                            Clear 7+ days
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 items-center">
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Time Range</label>
                    <select
                        value={timeRange}
                        onChange={e => setTimeRange(e.target.value as TimeRange)}
                        className="text-sm border border-gray-200 rounded px-2 py-1"
                    >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24h</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-gray-500 block mb-1">Level</label>
                    <select
                        value={levelFilter}
                        onChange={e => setLevelFilter(e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1"
                    >
                        <option value="all">All Levels</option>
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Errors Only</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-gray-500 block mb-1">Category</label>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1"
                    >
                        <option value="all">All Categories</option>
                        <option value="campaign">Campaign</option>
                        <option value="hosting">Hosting</option>
                        <option value="wordpress">WordPress</option>
                        <option value="translation">Translation</option>
                        <option value="ai">AI</option>
                        <option value="network">Network</option>
                    </select>
                </div>

                <div className="flex-1 min-w-48">
                    <label className="text-xs text-gray-500 block mb-1">Search</label>
                    <input
                        type="text"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        placeholder="Search messages..."
                        className="w-full text-sm border border-gray-200 rounded px-3 py-1"
                    />
                </div>

                <div className="text-sm text-gray-500 self-end pb-1">
                    Showing {filteredLogs.length} logs
                </div>
            </div>

            {/* Log List */}
            <div className="max-h-[600px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        <div className="text-4xl mb-2">📭</div>
                        <div>No logs match the current filters</div>
                    </div>
                ) : (
                    filteredLogs.map(log => (
                        <LogRow key={log.id} log={log} />
                    ))
                )}
            </div>
        </div>
    );
}
