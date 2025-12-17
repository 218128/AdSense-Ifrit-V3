'use client';

import { useState } from 'react';

export interface LogEntry {
    step: number;
    total: number;
    icon: string;
    message: string;
    status: 'pending' | 'active' | 'done' | 'error';
    detail?: string;
}

interface GenerationLogProps {
    entries: LogEntry[];
    isComplete: boolean;
    error?: string;
}

export default function GenerationLog({ entries, isComplete, error }: GenerationLogProps) {
    const [expanded, setExpanded] = useState(true);

    if (entries.length === 0) return null;

    return (
        <div className="bg-neutral-900 rounded-xl overflow-hidden shadow-lg max-w-2xl w-full">
            <div
                className="flex items-center justify-between px-4 py-3 bg-neutral-800 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-green-400 font-mono text-sm">⚡ Ifrit Engine</span>
                    {!isComplete && !error && (
                        <span className="animate-pulse text-yellow-400 text-xs">Running...</span>
                    )}
                    {isComplete && !error && (
                        <span className="text-green-400 text-xs">✓ Complete</span>
                    )}
                    {error && (
                        <span className="text-red-400 text-xs">✗ Error</span>
                    )}
                </div>
                <span className="text-neutral-500 text-sm">{expanded ? '▼' : '▶'}</span>
            </div>

            {expanded && (
                <div className="p-4 font-mono text-sm space-y-2 max-h-80 overflow-y-auto">
                    {entries.map((entry, i) => (
                        <div
                            key={i}
                            className={`flex items-start gap-3 ${entry.status === 'active' ? 'text-yellow-300' :
                                    entry.status === 'done' ? 'text-green-400' :
                                        entry.status === 'error' ? 'text-red-400' :
                                            'text-neutral-500'
                                }`}
                        >
                            <span className="text-neutral-600 w-10 flex-shrink-0">
                                [{entry.step}/{entry.total}]
                            </span>
                            <span className="flex-shrink-0">{entry.icon}</span>
                            <div className="flex-1">
                                <span>{entry.message}</span>
                                {entry.detail && (
                                    <span className="block text-xs text-neutral-500 mt-1">
                                        → {entry.detail}
                                    </span>
                                )}
                                {entry.status === 'active' && (
                                    <span className="inline-block ml-2 animate-pulse">▌</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {error && (
                        <div className="mt-3 p-3 bg-red-900/30 rounded text-red-400 text-xs">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Create initial log entries for generation process
 */
export function createInitialLogEntries(): LogEntry[] {
    return [
        { step: 1, total: 6, icon: '🔍', message: 'Scanning for trends...', status: 'pending' },
        { step: 2, total: 6, icon: '💰', message: 'Analyzing CPC potential...', status: 'pending' },
        { step: 3, total: 6, icon: '👤', message: 'Selecting author persona...', status: 'pending' },
        { step: 4, total: 6, icon: '📝', message: 'Choosing article template...', status: 'pending' },
        { step: 5, total: 6, icon: '✍️', message: 'Generating article content...', status: 'pending' },
        { step: 6, total: 6, icon: '💾', message: 'Saving article...', status: 'pending' },
    ];
}

/**
 * Update a specific log entry
 */
export function updateLogEntry(
    entries: LogEntry[],
    step: number,
    updates: Partial<LogEntry>
): LogEntry[] {
    return entries.map(entry =>
        entry.step === step ? { ...entry, ...updates } : entry
    );
}
