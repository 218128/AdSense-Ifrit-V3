/**
 * SourceStatusBar Component
 * 
 * Displays status pills for each trend source.
 * Extracted from TrendScanner.tsx for single responsibility.
 */

'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import type { SourceStatus } from '../../features/TrendScanner/types';

interface SourceStatusBarProps {
    sources: Record<string, SourceStatus>;
}

export function SourceStatusBar({ sources }: SourceStatusBarProps) {
    const entries = Object.entries(sources);

    if (entries.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-100">
            <span className="text-xs text-neutral-500">Sources:</span>
            {entries.map(([key, status]) => (
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
    );
}
