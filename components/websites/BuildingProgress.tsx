'use client';

/**
 * Building Progress Component
 * 
 * Shows content generation progress for websites with status 'building'.
 * Polls /api/site-builder for job status and displays:
 * - Progress bar
 * - Current item being generated
 * - Completed/pending counts
 * - Errors (if any)
 * - Pause/Resume controls
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Play, Pause, XCircle, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface QueueItem {
    id: string;
    type: string;
    topic: string;
    status: string;
    retries: number;
    published: boolean;
}

interface JobProgress {
    total: number;
    completed: number;
    failed: number;
    retrying: number;
    published: number;
    pending: number;
    processing: number;
}

interface JobSummary {
    id: string;
    status: string;
    config: {
        domain: string;
        siteName: string;
        niche: string;
    };
    progress: JobProgress;
    currentProvider?: string;
    currentItem?: string;
    queueSummary: QueueItem[];
    recentErrors: Array<{ topic: string; error: string; willRetry: boolean }>;
}

interface BuildingProgressProps {
    domain: string;
    onComplete?: () => void;
}

export default function BuildingProgress({ domain, onComplete }: BuildingProgressProps) {
    const [job, setJob] = useState<JobSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/site-builder');
            const data = await res.json();

            if (data.success && data.job) {
                setJob(data.job);

                // Check if job completed
                if (data.job.status === 'complete' || data.job.status === 'cancelled') {
                    onComplete?.();
                }
            } else {
                // No active job
                setJob(null);
            }
        } catch (err) {
            setError('Failed to fetch build status');
        } finally {
            setLoading(false);
        }
    }, [onComplete]);

    // Poll for updates every 3 seconds when running
    useEffect(() => {
        fetchStatus();

        const interval = setInterval(() => {
            if (job?.status === 'running' || job?.status === 'pending') {
                fetchStatus();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchStatus, job?.status]);

    const pauseJob = async () => {
        try {
            await fetch('/api/site-builder?action=pause', { method: 'DELETE' });
            fetchStatus();
        } catch {
            setError('Failed to pause job');
        }
    };

    const resumeJob = async () => {
        try {
            await fetch('/api/site-builder', { method: 'PATCH' });
            fetchStatus();
        } catch {
            setError('Failed to resume job');
        }
    };

    const cancelJob = async () => {
        if (!confirm('Cancel content generation? Progress will be lost.')) return;
        try {
            await fetch('/api/site-builder?action=cancel', { method: 'DELETE' });
            fetchStatus();
            onComplete?.();
        } catch {
            setError('Failed to cancel job');
        }
    };

    if (loading) {
        return (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                <p className="mt-2 text-indigo-700">Loading build status...</p>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-green-600" />
                <p className="mt-2 text-neutral-700">No active build job</p>
            </div>
        );
    }

    const progressPercent = job.progress.total > 0
        ? Math.round((job.progress.completed / job.progress.total) * 100)
        : 0;

    const isRunning = job.status === 'running';
    const isPaused = job.status === 'paused';

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            🏗️ Building Website
                            {isRunning && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Running</span>}
                            {isPaused && <span className="text-xs bg-yellow-400/30 px-2 py-0.5 rounded">Paused</span>}
                        </h3>
                        <p className="text-indigo-100 text-sm">{job.config.niche}</p>
                    </div>
                    <div className="text-2xl font-bold">{progressPercent}%</div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-500">×</button>
                </div>
            )}

            <div className="p-6 space-y-6">
                {/* Progress Bar */}
                <div>
                    <div className="h-4 bg-indigo-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-xl font-bold text-green-600">{job.progress.completed}</div>
                        <div className="text-xs text-neutral-500">Completed</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-xl font-bold text-blue-600">{job.progress.published}</div>
                        <div className="text-xs text-neutral-500">Published</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-xl font-bold text-amber-600">{job.progress.pending}</div>
                        <div className="text-xs text-neutral-500">Pending</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                        <div className="text-xl font-bold text-red-600">{job.progress.failed}</div>
                        <div className="text-xs text-neutral-500">Failed</div>
                    </div>
                </div>

                {/* Current Item */}
                {job.currentItem && (
                    <div className="bg-white rounded-lg p-4 border border-indigo-100">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="font-medium">Generating:</span>
                            <span className="truncate">{job.currentItem}</span>
                        </div>
                        {job.currentProvider && (
                            <div className="text-xs text-neutral-500 mt-1">
                                Using: {job.currentProvider}
                            </div>
                        )}
                    </div>
                )}

                {/* Recent Errors */}
                {job.recentErrors.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                        <div className="font-medium text-red-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Recent Errors
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {job.recentErrors.map((err, idx) => (
                                <div key={idx} className="text-sm">
                                    <div className="text-red-800">{err.topic}</div>
                                    <div className="text-red-600 text-xs">{err.error}</div>
                                    {err.willRetry && (
                                        <div className="text-orange-600 text-xs">↻ Will retry</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Queue Preview */}
                <div className="bg-white rounded-lg p-4 border border-neutral-100">
                    <div className="font-medium text-neutral-700 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Content Queue ({job.queueSummary.length} items)
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {job.queueSummary.slice(0, 8).map(item => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between text-sm py-1 px-2 rounded ${item.status === 'complete' ? 'bg-green-50' :
                                        item.status === 'processing' ? 'bg-indigo-50' :
                                            item.status === 'failed' ? 'bg-red-50' :
                                                'bg-neutral-50'
                                    }`}
                            >
                                <span className="truncate flex-1">{item.topic}</span>
                                <span className="text-xs text-neutral-500 capitalize">{item.type}</span>
                            </div>
                        ))}
                        {job.queueSummary.length > 8 && (
                            <div className="text-center text-xs text-neutral-500 py-1">
                                +{job.queueSummary.length - 8} more items
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                    {isRunning ? (
                        <button
                            onClick={pauseJob}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600"
                        >
                            <Pause className="w-4 h-4" />
                            Pause
                        </button>
                    ) : isPaused ? (
                        <button
                            onClick={resumeJob}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                        >
                            <Play className="w-4 h-4" />
                            Resume
                        </button>
                    ) : null}

                    {(isRunning || isPaused) && (
                        <button
                            onClick={cancelJob}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
                        >
                            <XCircle className="w-4 h-4" />
                            Cancel
                        </button>
                    )}
                </div>

                {/* Estimated Time */}
                {isRunning && job.progress.pending > 0 && (
                    <div className="text-center text-xs text-neutral-500">
                        ⏱️ Estimated: ~{Math.ceil(job.progress.pending * 1.5)} minutes remaining
                    </div>
                )}
            </div>
        </div>
    );
}
