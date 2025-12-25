'use client';

/**
 * Bulk Article Queue
 * 
 * Generate multiple articles at once with:
 * - Multi-keyword input (one per line)
 * - Queue visualization with status per article
 * - Progress tracking
 * - Cancel individual or all
 */

import { useState, useCallback } from 'react';
import {
    Plus, X, Play, Pause, Trash2, Check, AlertTriangle,
    Loader2, FileText, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

interface BulkArticleQueueProps {
    domain: string;
    niche: string;
    onComplete: () => void;
}

interface QueueItem {
    id: string;
    keyword: string;
    status: 'pending' | 'generating' | 'completed' | 'error' | 'cancelled';
    progress?: number;
    error?: string;
    articleId?: string;
}

export default function BulkArticleQueue({
    domain,
    niche,
    onComplete
}: BulkArticleQueueProps) {
    const [keywords, setKeywords] = useState('');
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showQueue, setShowQueue] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Get tokens and provider keys from store
    const integrations = useSettingsStore(state => state.integrations);
    const storeProviderKeys = useSettingsStore(state => state.providerKeys);
    const enabledProviders = useSettingsStore(state => state.enabledProviders);

    const addToQueue = () => {
        const newKeywords = keywords
            .split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 0)
            .filter(k => !queue.some(q => q.keyword === k)); // Avoid duplicates

        if (newKeywords.length === 0) return;

        const newItems: QueueItem[] = newKeywords.map(keyword => ({
            id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            keyword,
            status: 'pending'
        }));

        setQueue(prev => [...prev, ...newItems]);
        setKeywords('');
    };

    const removeFromQueue = (id: string) => {
        setQueue(prev => prev.filter(q => q.id !== id));
    };

    const clearQueue = () => {
        setQueue([]);
        setIsRunning(false);
        setIsPaused(false);
        setCurrentIndex(0);
    };

    const generateArticle = async (item: QueueItem): Promise<boolean> => {
        // Get tokens from store
        const { githubToken, githubUser } = integrations;

        // Get AI provider keys from store
        const getProviderKeys = () => {
            const result: Record<string, string[]> = {};
            const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'] as const;

            for (const provider of providers) {
                const isEnabled = enabledProviders.includes(provider);
                const keys = storeProviderKeys[provider] || [];

                if (isEnabled && keys.length > 0) {
                    result[provider] = keys.map(k => k.key);
                } else {
                    result[provider] = [];
                }
            }
            return result;
        };

        const providerKeys = getProviderKeys();

        // U8 FIX: Validate required fields before API call
        if (!githubUser) {
            console.error('[BulkQueue] GitHub username not configured');
            return false;
        }

        if (!Object.values(providerKeys).some(keys => keys.length > 0)) {
            console.error('[BulkQueue] No AI provider keys configured');
            return false;
        }

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: item.keyword,
                    niche,
                    articleType: 'cluster',
                    // U8 FIX: Pass geminiKey like GenerateArticleModal
                    geminiKey: providerKeys.gemini?.[0] || '',
                    providerKeys,
                    options: {
                        tone: 'professional',
                        targetLength: 1500,
                        includeEeat: true,
                        optimizeForAiOverview: true,
                    },
                    saveToWebsite: domain,
                    githubConfig: {
                        token: githubToken,
                        owner: githubUser,  // U8 FIX: No empty string fallback
                        repo: domain.replace(/\./g, '-'),
                        branch: 'main'
                    }
                })
            });

            const data = await response.json();
            return data.success;
        } catch {
            return false;
        }
    };

    const runQueue = useCallback(async () => {
        setIsRunning(true);
        setIsPaused(false);

        const pendingItems = queue.filter(q => q.status === 'pending');

        for (let i = 0; i < pendingItems.length; i++) {
            // Check if paused or stopped
            if (isPaused) {
                break;
            }

            const item = pendingItems[i];
            setCurrentIndex(queue.findIndex(q => q.id === item.id));

            // Update status to generating
            setQueue(prev => prev.map(q =>
                q.id === item.id ? { ...q, status: 'generating' as const } : q
            ));

            // Generate article
            const success = await generateArticle(item);

            // Update status based on result
            setQueue(prev => prev.map(q =>
                q.id === item.id
                    ? { ...q, status: success ? 'completed' as const : 'error' as const }
                    : q
            ));

            // Small delay between requests to avoid rate limiting
            if (i < pendingItems.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        setIsRunning(false);
        onComplete();
    }, [queue, isPaused, domain, niche, onComplete]);

    const togglePause = () => {
        setIsPaused(!isPaused);
    };

    const getStatusIcon = (status: QueueItem['status']) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-neutral-400" />;
            case 'generating': return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
            case 'completed': return <Check className="w-4 h-4 text-green-500" />;
            case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'cancelled': return <X className="w-4 h-4 text-neutral-400" />;
        }
    };

    const stats = {
        total: queue.length,
        pending: queue.filter(q => q.status === 'pending').length,
        completed: queue.filter(q => q.status === 'completed').length,
        errors: queue.filter(q => q.status === 'error').length,
    };

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-neutral-900">Bulk Article Queue</h3>
                    </div>
                    {queue.length > 0 && (
                        <button
                            onClick={() => setShowQueue(!showQueue)}
                            className="text-neutral-400 hover:text-neutral-600"
                        >
                            {showQueue ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Keyword Input */}
            <div className="p-4 border-b border-neutral-100">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Add Keywords (one per line)
                </label>
                <textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder={`best ${niche} tools 2025\nhow to choose ${niche} software\n${niche} beginner guide`}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isRunning}
                />
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-neutral-500">
                        {keywords.split('\n').filter(k => k.trim()).length} keywords entered
                    </span>
                    <button
                        onClick={addToQueue}
                        disabled={!keywords.trim() || isRunning}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        Add to Queue
                    </button>
                </div>
            </div>

            {/* Queue Stats */}
            {queue.length > 0 && (
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm">
                            <span className="text-neutral-600">
                                <strong>{stats.total}</strong> total
                            </span>
                            <span className="text-neutral-500">
                                <strong>{stats.pending}</strong> pending
                            </span>
                            <span className="text-green-600">
                                <strong>{stats.completed}</strong> done
                            </span>
                            {stats.errors > 0 && (
                                <span className="text-red-600">
                                    <strong>{stats.errors}</strong> failed
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {isRunning ? (
                                <button
                                    onClick={togglePause}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm rounded-lg hover:bg-amber-200"
                                >
                                    <Pause className="w-4 h-4" />
                                    Pause
                                </button>
                            ) : (
                                <button
                                    onClick={runQueue}
                                    disabled={stats.pending === 0}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    <Play className="w-4 h-4" />
                                    Start
                                </button>
                            )}
                            <button
                                onClick={clearQueue}
                                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-600 text-sm rounded-lg hover:bg-neutral-200"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Queue List */}
            {showQueue && queue.length > 0 && (
                <div className="max-h-64 overflow-auto">
                    <div className="divide-y divide-neutral-100">
                        {queue.map((item, index) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between px-4 py-2 ${item.status === 'generating' ? 'bg-indigo-50' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(item.status)}
                                    <span className={`text-sm ${item.status === 'completed' ? 'text-green-700' :
                                        item.status === 'error' ? 'text-red-700' :
                                            item.status === 'generating' ? 'text-indigo-700 font-medium' :
                                                'text-neutral-700'
                                        }`}>
                                        {item.keyword}
                                    </span>
                                </div>
                                {item.status === 'pending' && !isRunning && (
                                    <button
                                        onClick={() => removeFromQueue(item.id)}
                                        className="p-1 text-neutral-400 hover:text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                {item.status === 'error' && item.error && (
                                    <span className="text-xs text-red-500">{item.error}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {queue.length === 0 && (
                <div className="p-6 text-center text-neutral-500 text-sm">
                    Add keywords above to start bulk generation
                </div>
            )}
        </div>
    );
}
