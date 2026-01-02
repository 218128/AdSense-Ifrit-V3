/**
 * SourceStatusBar Component
 * 
 * Displays clickable status pills for each trend source.
 * Shows error reason on hover for failed sources.
 */

'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { SourceStatus } from '../../features/TrendScanner/types';

interface SourceStatusBarProps {
    sources: Record<string, SourceStatus>;
    activeSource?: string | null;
    onSourceClick?: (sourceId: string | null) => void;
}

export function SourceStatusBar({ sources, activeSource, onSourceClick }: SourceStatusBarProps) {
    const entries = Object.entries(sources);

    if (entries.length === 0) return null;

    const handleClick = (key: string) => {
        if (!onSourceClick) return;
        onSourceClick(activeSource === key ? null : key);
    };

    return (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-100">
            <span className="text-xs text-neutral-500">Sources:</span>
            {/* All button */}
            {onSourceClick && (
                <button
                    onClick={() => onSourceClick(null)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${activeSource === null
                            ? 'bg-blue-100 text-blue-700 border border-blue-300 ring-1 ring-blue-400'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200'
                        }`}
                >
                    All
                </button>
            )}
            {entries.map(([key, status]) => {
                const isActive = activeSource === key;
                const displayName = key.replace(/_/g, ' ').replace('-trends', '');

                return (
                    <div key={key} className="relative group">
                        <button
                            onClick={() => handleClick(key)}
                            disabled={!onSourceClick}
                            title={status.error ? `Error: ${status.error}` : undefined}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${isActive ? 'ring-2 ring-offset-1 ring-blue-400' : ''
                                } ${status.success
                                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                } ${onSourceClick ? 'cursor-pointer' : ''}`}
                        >
                            {status.success ? (
                                <CheckCircle className="w-3 h-3" />
                            ) : (
                                <XCircle className="w-3 h-3" />
                            )}
                            <span className="capitalize">{displayName}</span>
                            {status.success && <span className="opacity-70">({status.count})</span>}
                        </button>

                        {/* Error tooltip on hover */}
                        {!status.success && status.error && (
                            <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-red-900 text-white text-xs rounded-lg shadow-lg">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold capitalize">{displayName} Failed</p>
                                        <p className="opacity-90 mt-1">{status.error}</p>
                                    </div>
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-red-900" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
