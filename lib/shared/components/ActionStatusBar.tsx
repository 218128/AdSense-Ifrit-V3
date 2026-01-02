/**
 * ActionStatusBar - Real-time action status display
 * 
 * Shows current action phase, progress, and per-source status
 * with animated transitions and clear visual feedback.
 * 
 * ERRORS ARE PROMINENTLY DISPLAYED - not hidden in tooltips.
 * Failed sources persist so users can see what to fix.
 * 
 * @module shared/components
 */

'use client';

import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { ActionStatus, SourceActionStatus } from '@/lib/shared/types';

interface ActionStatusBarProps {
    status: ActionStatus;
    className?: string;
}

/**
 * Get icon for action phase
 */
function PhaseIcon({ phase, size = 'sm' }: { phase: ActionStatus['phase']; size?: 'sm' | 'md' }) {
    const sizeClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
    switch (phase) {
        case 'running':
            return <Loader2 className={`${sizeClass} animate-spin text-blue-500`} />;
        case 'success':
            return <CheckCircle className={`${sizeClass} text-green-500`} />;
        case 'error':
            return <XCircle className={`${sizeClass} text-red-500`} />;
        default:
            return null;
    }
}

/**
 * Progress bar component
 */
function ProgressBar({ current, total }: { current: number; total: number }) {
    const percent = Math.round((current / total) * 100);
    return (
        <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
            <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}

/**
 * Successful source badge (compact)
 */
function SuccessSourceBadge({ source }: { source: SourceActionStatus }) {
    return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-700">
            <CheckCircle className="w-3 h-3" />
            <span>{source.sourceName}</span>
            {source.count !== undefined && <span className="opacity-70">({source.count})</span>}
        </div>
    );
}

/**
 * Running source badge (showing loader)
 */
function RunningSourceBadge({ source }: { source: SourceActionStatus }) {
    return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 border border-blue-200 text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{source.sourceName}</span>
        </div>
    );
}

/**
 * FAILED source card - PROMINENTLY shows error message
 * This is NOT a small pill, it's a full card with the error visible
 */
function FailedSourceCard({ source }: { source: SourceActionStatus }) {
    return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-300">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-700">{source.sourceName}</span>
                    <span className="text-xs text-red-500 font-medium">FAILED</span>
                </div>
                {/* ERROR MESSAGE IS VISIBLE - NOT HIDDEN */}
                <p className="text-sm text-red-600 mt-1">
                    {source.error || 'Unknown error occurred'}
                </p>
            </div>
        </div>
    );
}

/**
 * ActionStatusBar component
 * 
 * Displays real-time status of async actions with:
 * - Current phase icon (spinner, check, x)
 * - Status message
 * - Progress bar for multi-step actions
 * - Per-source status - SUCCESS as pills, ERRORS as full cards
 */
export function ActionStatusBar({ status, className = '' }: ActionStatusBarProps) {
    // Don't render if idle
    if (status.phase === 'idle') return null;

    // Separate successful and failed sources
    const successSources = status.sources?.filter(s => s.phase === 'success') || [];
    const failedSources = status.sources?.filter(s => s.phase === 'error') || [];
    const runningSources = status.sources?.filter(s => s.phase === 'running') || [];

    // Determine if we have any failures
    const hasFailures = failedSources.length > 0;

    return (
        <div className={`rounded-lg transition-all duration-300 ${className} ${status.phase === 'running' ? 'bg-blue-50 border border-blue-200' :
                hasFailures ? 'bg-amber-50 border border-amber-300' :  // Mixed results
                    status.phase === 'success' ? 'bg-green-50 border border-green-200' :
                        status.phase === 'error' ? 'bg-red-50 border border-red-200' :
                            'bg-neutral-50 border border-neutral-200'
            }`}>
            {/* Main status section */}
            <div className="p-3">
                {/* Header row */}
                <div className="flex items-center gap-2">
                    <PhaseIcon phase={hasFailures ? 'error' : status.phase} size="md" />
                    <span className={`text-sm font-semibold ${status.phase === 'running' ? 'text-blue-700' :
                            hasFailures ? 'text-amber-700' :
                                status.phase === 'success' ? 'text-green-700' :
                                    status.phase === 'error' ? 'text-red-700' :
                                        'text-neutral-700'
                        }`}>
                        {status.message}
                    </span>
                </div>

                {/* Progress bar during running */}
                {status.progress && status.phase === 'running' && (
                    <div className="mt-2">
                        <div className="flex justify-between text-xs text-blue-600 mb-1">
                            <span>Sources</span>
                            <span>{status.progress.current}/{status.progress.total}</span>
                        </div>
                        <ProgressBar
                            current={status.progress.current}
                            total={status.progress.total}
                        />
                    </div>
                )}

                {/* Running sources */}
                {runningSources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {runningSources.map(source => (
                            <RunningSourceBadge key={source.sourceId} source={source} />
                        ))}
                    </div>
                )}

                {/* Successful sources - compact badges */}
                {successSources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {successSources.map(source => (
                            <SuccessSourceBadge key={source.sourceId} source={source} />
                        ))}
                    </div>
                )}
            </div>

            {/* FAILED SOURCES SECTION - Prominent, persistent, with full error messages */}
            {failedSources.length > 0 && (
                <div className="border-t border-red-200 bg-red-50/50 p-3 rounded-b-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700">
                            {failedSources.length} source{failedSources.length > 1 ? 's' : ''} failed
                        </span>
                    </div>
                    <div className="space-y-2">
                        {failedSources.map(source => (
                            <FailedSourceCard key={source.sourceId} source={source} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
