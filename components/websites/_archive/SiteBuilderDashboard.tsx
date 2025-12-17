'use client';

/**
 * Site Builder Dashboard
 * 
 * Real-time progress tracking UI for automated site building.
 * Shows progress bars, queue status, errors, and controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getEnabledProviderKeys } from '@/components/settings/SettingsView';
import { CostDashboard } from '@/components/dashboard';

interface QueueItem {
    id: string;
    type: string;
    topic: string;
    status: string;
    retries: number;
    published: boolean;
}

interface CompletedItem {
    topic: string;
    type: string;
    articleUrl?: string;
    provider: string;
}

interface ErrorItem {
    topic: string;
    error: string;
    willRetry: boolean;
    timestamp: number;
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
        totalPillars: number;
        clustersPerPillar: number;
    };
    progress: JobProgress;
    currentProvider?: string;
    currentItem?: string;
    queueSummary: QueueItem[];
    completedItems: CompletedItem[];
    recentErrors: ErrorItem[];
    createdAt: number;
    updatedAt: number;
    startedAt?: number;
    completedAt?: number;
}

interface SiteBuilderDashboardProps {
    onClose?: () => void;
}

export default function SiteBuilderDashboard({ onClose }: SiteBuilderDashboardProps) {
    const [job, setJob] = useState<JobSummary | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [hasJob, setHasJob] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Config form state
    const [showConfig, setShowConfig] = useState(false);
    const [config, setConfig] = useState({
        domain: '299riyal.store',
        siteName: '299Riyal',
        siteTagline: 'Best Tech Under 299 SAR',
        niche: 'Budget Tech Saudi Arabia',
        targetAudience: 'Saudi tech shoppers looking for quality tech at affordable prices',
        authorName: 'Omar Al-Rashid',
        authorRole: 'Tech Editor',
        authorExperience: '8+ years reviewing consumer electronics',
        pillars: [
            'Best Budget Smartphones Under 299 SAR',
            'Best Wireless Earbuds Under 299 SAR',
            'Best Smart Home Gadgets Under 299 SAR',
            'Best Gaming Accessories Under 299 SAR'
        ],
        clustersPerPillar: 4,
        includeAbout: true,
        includeEssentialPages: true,  // Privacy, Terms, Contact
        template: 'niche-authority' as 'niche-authority' | 'topical-magazine' | 'expert-hub'
    });

    // GitHub config
    const [githubToken, setGithubToken] = useState('');
    const [githubOwner, setGithubOwner] = useState('218128');
    const [githubRepo, setGithubRepo] = useState('299riyal-store-blog');

    // Fetch job status
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/site-builder');
            const data = await res.json();

            setHasJob(data.hasJob);
            setIsRunning(data.isRunning);
            setJob(data.job);

            // Show config form if no job
            if (!data.hasJob || data.job?.status === 'complete' || data.job?.status === 'cancelled') {
                setShowConfig(true);
            }
        } catch (err) {
            setError('Failed to fetch status');
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll for updates
    useEffect(() => {
        fetchStatus();

        const interval = setInterval(() => {
            if (isRunning) {
                fetchStatus();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [fetchStatus, isRunning]);

    // Load GitHub token on mount
    useEffect(() => {
        const token = localStorage.getItem('github_token') || '';
        setGithubToken(token);
    }, []);

    // Start job
    const startJob = async () => {
        setError(null);
        setLoading(true);

        const providerKeys = getEnabledProviderKeys();

        if (Object.keys(providerKeys).length === 0) {
            setError('No AI provider keys configured. Please add keys in Settings.');
            setLoading(false);
            return;
        }

        if (!githubToken) {
            setError('GitHub token required. Please connect GitHub in Settings.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/site-builder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        domain: config.domain,
                        siteName: config.siteName,
                        siteTagline: config.siteTagline,
                        niche: config.niche,
                        targetAudience: config.targetAudience,
                        template: config.template,
                        author: {
                            name: config.authorName,
                            role: config.authorRole,
                            experience: config.authorExperience
                        },
                        pillars: config.pillars,
                        clustersPerPillar: config.clustersPerPillar,
                        includeAbout: config.includeAbout,
                        includeEssentialPages: config.includeEssentialPages,
                        includeHomepage: false
                    },
                    providerKeys,
                    githubConfig: {
                        token: githubToken,
                        owner: githubOwner,
                        repo: githubRepo,
                        branch: 'main'
                    }
                })
            });

            const data = await res.json();

            if (data.success) {
                setShowConfig(false);
                setIsRunning(true);
                fetchStatus();
            } else {
                // Show detailed pre-flight errors if available
                if (data.preFlightReport) {
                    const errors = data.errors || [];
                    setError(`Pre-flight failed:\n• ${errors.join('\n• ')}`);
                } else {
                    setError(data.error);
                }
            }
        } catch (err) {
            setError('Failed to start job');
        } finally {
            setLoading(false);
        }
    };

    // Stop job
    const stopJob = async (cancel: boolean = false) => {
        try {
            await fetch(`/api/site-builder?action=${cancel ? 'cancel' : 'pause'}`, {
                method: 'DELETE'
            });
            fetchStatus();
        } catch (err) {
            setError('Failed to stop job');
        }
    };

    // Resume job
    const resumeJob = async () => {
        try {
            const res = await fetch('/api/site-builder', { method: 'PATCH' });
            const data = await res.json();

            if (data.success) {
                setIsRunning(true);
                fetchStatus();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to resume job');
        }
    };

    // Progress percentage
    const progressPercent = job?.progress
        ? Math.round((job.progress.completed / job.progress.total) * 100)
        : 0;

    // Status icon
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'complete': return '✅';
            case 'processing': return '🔄';
            case 'scheduled': return '🔁';
            case 'failed': return '❌';
            default: return '⏳';
        }
    };

    if (loading && !job) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            🏗️ Site Builder
                            {isRunning && <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded">Running</span>}
                        </h2>
                        {job && <p className="text-purple-100 text-sm">{job.config.domain}</p>}
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
                    )}
                </div>
            </div>

            {/* Error alert */}
            {error && (
                <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-800 text-sm">
                    ⚠️ {error}
                    <button onClick={() => setError(null)} className="ml-2 text-red-600 hover:text-red-800">×</button>
                </div>
            )}

            {/* Config Form */}
            {showConfig && (
                <div className="p-6 border-b">
                    <h3 className="font-semibold mb-4">Configure Site Building</h3>

                    {/* Template Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Template Style</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, template: 'niche-authority' })}
                                className={`p-3 border-2 rounded-lg text-left transition-all ${config.template === 'niche-authority'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-sm font-medium">🏛️ Niche Authority</div>
                                <div className="text-xs text-gray-500 mt-1">Clean, professional blog</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, template: 'topical-magazine' })}
                                className={`p-3 border-2 rounded-lg text-left transition-all ${config.template === 'topical-magazine'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-sm font-medium">📰 Magazine</div>
                                <div className="text-xs text-gray-500 mt-1">Multi-topic layout</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, template: 'expert-hub' })}
                                className={`p-3 border-2 rounded-lg text-left transition-all ${config.template === 'expert-hub'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-sm font-medium">🎓 Expert Hub</div>
                                <div className="text-xs text-gray-500 mt-1">High-CPC niches</div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                            <input
                                type="text"
                                value={config.domain}
                                onChange={e => setConfig({ ...config, domain: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                            <input
                                type="text"
                                value={config.siteName}
                                onChange={e => setConfig({ ...config, siteName: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Niche</label>
                        <input
                            type="text"
                            value={config.niche}
                            onChange={e => setConfig({ ...config, niche: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pillar Topics ({config.pillars.length})
                        </label>
                        {config.pillars.map((pillar, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={pillar}
                                    onChange={e => {
                                        const newPillars = [...config.pillars];
                                        newPillars[idx] = e.target.value;
                                        setConfig({ ...config, pillars: newPillars });
                                    }}
                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                />
                                <button
                                    onClick={() => setConfig({ ...config, pillars: config.pillars.filter((_, i) => i !== idx) })}
                                    className="text-red-500 hover:text-red-700 px-2"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setConfig({ ...config, pillars: [...config.pillars, ''] })}
                            className="text-purple-600 hover:text-purple-800 text-sm"
                        >
                            + Add Pillar
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clusters per Pillar</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={config.clustersPerPillar}
                                onChange={e => setConfig({ ...config, clustersPerPillar: parseInt(e.target.value) || 4 })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Repo</label>
                            <input
                                type="text"
                                value={`${githubOwner}/${githubRepo}`}
                                onChange={e => {
                                    const [owner, repo] = e.target.value.split('/');
                                    setGithubOwner(owner || '');
                                    setGithubRepo(repo || '');
                                }}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                placeholder="owner/repo"
                            />
                        </div>
                    </div>

                    {/* Essential Pages Toggle */}
                    <div className="mb-4 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.includeAbout}
                                onChange={e => setConfig({ ...config, includeAbout: e.target.checked })}
                                className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Include About Page</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.includeEssentialPages}
                                onChange={e => setConfig({ ...config, includeEssentialPages: e.target.checked })}
                                className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Include Essential Pages (Privacy, Terms, Contact)</span>
                        </label>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="text-sm text-gray-600">
                            📊 This will generate:
                            <ul className="mt-2 space-y-1">
                                <li>• {config.includeAbout ? 1 : 0} About page</li>
                                <li>• {config.includeEssentialPages ? 3 : 0} Essential pages (Privacy, Terms, Contact)</li>
                                <li>• {config.pillars.length} Pillar articles</li>
                                <li>• {config.pillars.length * config.clustersPerPillar} Cluster articles</li>
                                <li className="font-medium">= {(config.includeAbout ? 1 : 0) + (config.includeEssentialPages ? 3 : 0) + config.pillars.length + (config.pillars.length * config.clustersPerPillar)} total items</li>
                            </ul>
                            <p className="mt-2">⏱️ Estimated time: ~{Math.ceil(((config.includeAbout ? 1 : 0) + (config.includeEssentialPages ? 3 : 0) + config.pillars.length + (config.pillars.length * config.clustersPerPillar)) * 1.5)} minutes</p>
                        </div>
                    </div>

                    <button
                        onClick={startJob}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
                    >
                        {loading ? '⏳ Starting...' : '🚀 Start Building Site'}
                    </button>
                </div>
            )}

            {/* Progress Section */}
            {job && !showConfig && (
                <div className="p-6">
                    {/* Main Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                            <span className="text-sm text-gray-500">{progressPercent}%</span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-600">{job.progress.completed}</div>
                            <div className="text-xs text-green-700">Completed</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600">{job.progress.published}</div>
                            <div className="text-xs text-blue-700">Published</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-yellow-600">{job.progress.pending + job.progress.processing}</div>
                            <div className="text-xs text-yellow-700">Pending</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-600">{job.progress.failed}</div>
                            <div className="text-xs text-red-700">Failed</div>
                        </div>
                    </div>

                    {/* Current Activity */}
                    {job.currentItem && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-2">
                                <div className="animate-spin text-purple-600">⚡</div>
                                <div>
                                    <div className="text-sm font-medium text-purple-800">Processing: {job.currentItem}</div>
                                    <div className="text-xs text-purple-600">Provider: {job.currentProvider}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Queue */}
                    <div className="mb-6">
                        <h4 className="font-medium text-gray-700 mb-3">Content Queue</h4>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {job.queueSummary.slice(0, 10).map(item => (
                                <div
                                    key={item.id}
                                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${item.status === 'complete' ? 'bg-green-50' :
                                        item.status === 'processing' ? 'bg-purple-50' :
                                            item.status === 'failed' ? 'bg-red-50' :
                                                'bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{getStatusIcon(item.status)}</span>
                                        <span className="text-gray-800 truncate max-w-xs">{item.topic}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                                        {item.retries > 0 && (
                                            <span className="text-xs text-orange-600">↻ {item.retries}</span>
                                        )}
                                        {item.published && <span className="text-xs text-green-600">✓</span>}
                                    </div>
                                </div>
                            ))}
                            {job.queueSummary.length > 10 && (
                                <div className="text-center text-sm text-gray-500">
                                    +{job.queueSummary.length - 10} more items
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Errors */}
                    {job.recentErrors.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-medium text-red-700 mb-3">Recent Errors</h4>
                            <div className="space-y-2">
                                {job.recentErrors.map((err, idx) => (
                                    <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                                        <div className="font-medium text-red-800">{err.topic}</div>
                                        <div className="text-red-600 text-xs">{err.error}</div>
                                        {err.willRetry && (
                                            <div className="text-orange-600 text-xs mt-1">Will retry automatically</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Articles */}
                    {job.completedItems.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-medium text-green-700 mb-3">Published Articles</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {job.completedItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg text-sm">
                                        <span className="text-gray-800 truncate max-w-xs">{item.topic}</span>
                                        {item.articleUrl && (
                                            <a
                                                href={item.articleUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                View →
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cost Tracking */}
                    <div className="mb-6">
                        <details className="group">
                            <summary className="cursor-pointer flex items-center gap-2 font-medium text-gray-700 mb-3">
                                <span>💰 AI Cost Tracking</span>
                                <span className="text-xs text-gray-400 group-open:hidden">Click to expand</span>
                            </summary>
                            <CostDashboard />
                        </details>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-3">
                        {isRunning ? (
                            <>
                                <button
                                    onClick={() => stopJob(false)}
                                    className="flex-1 bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600"
                                >
                                    ⏸️ Pause
                                </button>
                                <button
                                    onClick={() => stopJob(true)}
                                    className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600"
                                >
                                    ⏹️ Cancel
                                </button>
                            </>
                        ) : job.status === 'paused' ? (
                            <>
                                <button
                                    onClick={resumeJob}
                                    className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600"
                                >
                                    ▶️ Resume
                                </button>
                                <button
                                    onClick={() => stopJob(true)}
                                    className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600"
                                >
                                    ⏹️ Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setShowConfig(true)}
                                className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700"
                            >
                                🚀 Start New Job
                            </button>
                        )}
                    </div>

                    {/* Job Info */}
                    <div className="mt-4 text-xs text-gray-500 text-center">
                        Job ID: {job.id} • Status: {job.status}
                        {job.status === 'running' && ' • This job will continue in the background'}
                    </div>
                </div>
            )}
        </div>
    );
}
