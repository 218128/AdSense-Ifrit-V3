'use client';

/**
 * Article Version History Component
 * 
 * Displays version history for an article with restore functionality.
 * Features:
 * - View all saved versions
 * - Preview version content
 * - Restore to previous version
 * - Visual diff comparison (future)
 */

import { useState, useEffect } from 'react';
import {
    History,
    RotateCcw,
    Eye,
    X,
    Loader2,
    Clock,
    FileText,
    AlertTriangle,
    Check
} from 'lucide-react';

interface ArticleVersion {
    id: string;
    title: string;
    contentPreview: string;
    content?: string;
    savedAt: number;
    reason: 'auto' | 'manual' | 'before-ai-refine' | 'before-edit';
    wordCount: number;
}

interface ArticleVersionHistoryProps {
    domain: string;
    articleId: string;
    currentTitle: string;
    onRestore?: () => void;
    onClose: () => void;
}

export default function ArticleVersionHistory({
    domain,
    articleId,
    currentTitle,
    onRestore,
    onClose
}: ArticleVersionHistoryProps) {
    const [versions, setVersions] = useState<ArticleVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch versions
    useEffect(() => {
        async function fetchVersions() {
            setLoading(true);
            try {
                const res = await fetch(`/api/websites/${domain}/content/${articleId}/versions`);
                const data = await res.json();
                if (data.success) {
                    setVersions(data.versions);
                }
            } catch (error) {
                console.error('Failed to fetch versions:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchVersions();
    }, [domain, articleId]);

    // Fetch full content for preview
    const handlePreview = async (version: ArticleVersion) => {
        setSelectedVersion(version);
        setPreviewContent(null);

        try {
            const res = await fetch(`/api/websites/${domain}/content/${articleId}/versions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId: version.id, getFullContent: true })
            });
            const data = await res.json();
            if (data.success) {
                setPreviewContent(data.version.content);
            }
        } catch (error) {
            console.error('Failed to fetch version content:', error);
        }
    };

    // Restore to version
    const handleRestore = async (versionId: string) => {
        if (!confirm('Restore article to this version? Current content will be saved as a new version.')) {
            return;
        }

        setRestoring(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/websites/${domain}/content/${articleId}/versions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId })
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Article restored successfully!' });
                onRestore?.();
                setTimeout(onClose, 1500);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to restore' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to restore version' });
        } finally {
            setRestoring(false);
        }
    };

    // Format time ago
    const formatTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    // Get reason label
    const getReasonLabel = (reason: string) => {
        switch (reason) {
            case 'auto': return 'Auto-saved';
            case 'manual': return 'Manual save';
            case 'before-ai-refine': return 'Before AI refine';
            case 'before-edit': return 'Before edit';
            default: return reason;
        }
    };

    // Get reason color
    const getReasonColor = (reason: string) => {
        switch (reason) {
            case 'auto': return 'bg-neutral-100 text-neutral-600';
            case 'manual': return 'bg-blue-100 text-blue-700';
            case 'before-ai-refine': return 'bg-purple-100 text-purple-700';
            case 'before-edit': return 'bg-amber-100 text-amber-700';
            default: return 'bg-neutral-100 text-neutral-600';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-semibold text-neutral-900">Version History</h2>
                        <span className="text-sm text-neutral-500">
                            {currentTitle}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-neutral-100 rounded"
                    >
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {message.type === 'success' ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                        {message.text}
                    </div>
                )}

                {/* Content */}
                <div className="flex h-[60vh]">
                    {/* Version List */}
                    <div className="w-1/3 border-r border-neutral-200 overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                            </div>
                        ) : versions.length === 0 ? (
                            <div className="text-center py-12 text-neutral-500">
                                <History className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                                <p>No versions saved yet</p>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Versions are saved automatically before edits
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100">
                                {versions.map((version, index) => (
                                    <button
                                        key={version.id}
                                        onClick={() => handlePreview(version)}
                                        className={`w-full text-left p-3 hover:bg-neutral-50 transition-colors ${selectedVersion?.id === version.id ? 'bg-indigo-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${getReasonColor(version.reason)}`}>
                                                {getReasonLabel(version.reason)}
                                            </span>
                                            <span className="text-xs text-neutral-400">
                                                {formatTimeAgo(version.savedAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-neutral-800 truncate">
                                            {version.title}
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            {version.wordCount} words
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview Area */}
                    <div className="w-2/3 flex flex-col">
                        {selectedVersion ? (
                            <>
                                {/* Preview Header */}
                                <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-neutral-500" />
                                        <span className="font-medium text-sm">{selectedVersion.title}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRestore(selectedVersion.id)}
                                        disabled={restoring}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {restoring ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        )}
                                        Restore This Version
                                    </button>
                                </div>

                                {/* Preview Content */}
                                <div className="flex-1 p-4 overflow-auto">
                                    {previewContent === null ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                                        </div>
                                    ) : (
                                        <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-mono bg-neutral-50 p-4 rounded-lg">
                                            {previewContent}
                                        </pre>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-neutral-400">
                                <div className="text-center">
                                    <Eye className="w-8 h-8 mx-auto mb-2" />
                                    <p>Select a version to preview</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
