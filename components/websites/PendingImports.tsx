'use client';

/**
 * Pending Imports Component
 * 
 * Shows files in the drafts folder with import controls.
 * Features:
 * - Manual scan button
 * - Auto-poll toggle (5 minute interval)
 * - Import single or all files
 * - Import history with success/fail status
 */

import { useState, useEffect, useCallback } from 'react';
import {
    FolderOpen,
    RefreshCw,
    Upload,
    Check,
    X,
    AlertTriangle,
    AlertCircle,
    Clock,
    FileText,
    Loader2,
    ToggleLeft,
    ToggleRight,
    History
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface PendingFile {
    filename: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    wordCount: number;
    createdAt: number;
    error?: string;
}

interface ImportRecord {
    filename: string;
    status: 'success' | 'failed' | 'retrying';
    error?: string;
    articleId?: string;
    importedAt: number;
    retryCount: number;
}

interface PendingImportsProps {
    domain: string;
    onImportComplete?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const AUTO_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const AUTO_POLL_KEY = 'ifrit_auto_poll_drafts';

// ============================================
// COMPONENT
// ============================================

export default function PendingImports({ domain, onImportComplete }: PendingImportsProps) {
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [history, setHistory] = useState<ImportRecord[]>([]);
    const [draftsFolder, setDraftsFolder] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState<string | null>(null);
    const [autoPoll, setAutoPoll] = useState(false);
    const [lastScan, setLastScan] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    // C6 FIX: Add error state for scan failures
    const [scanError, setScanError] = useState<string | null>(null);

    // Load auto-poll preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`${AUTO_POLL_KEY}_${domain}`);
            setAutoPoll(saved === 'true');
        }
    }, [domain]);

    // Scan drafts folder
    const scanDrafts = useCallback(async () => {
        setLoading(true);
        setScanError(null); // C6 FIX: Clear previous errors
        try {
            const res = await fetch(`/api/websites/${domain}/drafts`);
            const data = await res.json();

            if (data.success) {
                setPendingFiles(data.pendingFiles || []);
                setHistory(data.history || []);
                setDraftsFolder(data.draftsFolder || '');
                setLastScan(Date.now());
            } else {
                // C6 FIX: Set error from API response
                setScanError(data.error || 'Failed to scan drafts folder');
            }
        } catch (err) {
            console.error('Failed to scan drafts:', err);
            // C6 FIX: Set network/parse error
            setScanError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setLoading(false);
        }
    }, [domain]);

    // Initial scan
    useEffect(() => {
        scanDrafts();
    }, [scanDrafts]);

    // Auto-poll effect
    useEffect(() => {
        if (!autoPoll) return;

        const interval = setInterval(scanDrafts, AUTO_POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [autoPoll, scanDrafts]);

    // Toggle auto-poll
    const toggleAutoPoll = () => {
        const newValue = !autoPoll;
        setAutoPoll(newValue);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`${AUTO_POLL_KEY}_${domain}`, String(newValue));
        }
    };

    // Import single file
    const importFile = async (filename: string) => {
        setImporting(filename);
        try {
            const res = await fetch(`/api/websites/${domain}/drafts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();

            if (data.success) {
                scanDrafts();
                onImportComplete?.();
            }
        } catch (err) {
            console.error('Failed to import:', err);
        } finally {
            setImporting(null);
        }
    };

    // Import all files
    const importAll = async () => {
        setImporting('all');
        try {
            const res = await fetch(`/api/websites/${domain}/drafts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ importAll: true })
            });
            const data = await res.json();

            if (data.success) {
                scanDrafts();
                onImportComplete?.();
            }
        } catch (err) {
            console.error('Failed to import all:', err);
        } finally {
            setImporting(null);
        }
    };

    // Format time ago
    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-amber-600" />
                        <h3 className="font-semibold text-neutral-800">
                            Drafts Folder
                        </h3>
                        {pendingFiles.length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full font-medium">
                                {pendingFiles.length} pending
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Auto-poll toggle */}
                        <button
                            onClick={toggleAutoPoll}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${autoPoll
                                ? 'bg-green-100 text-green-700'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                            title={autoPoll ? 'Auto-scan every 5 min' : 'Enable auto-scan'}
                        >
                            {autoPoll ? (
                                <ToggleRight className="w-4 h-4" />
                            ) : (
                                <ToggleLeft className="w-4 h-4" />
                            )}
                            Auto
                        </button>

                        {/* Manual scan */}
                        <button
                            onClick={scanDrafts}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Scan
                        </button>

                        {/* History toggle */}
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${showHistory
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                        >
                            <History className="w-4 h-4" />
                            History
                        </button>
                    </div>
                </div>

                {/* Folder path */}
                {draftsFolder && (
                    <div className="mt-2 text-xs text-neutral-500 font-mono">
                        📁 {draftsFolder}
                        {lastScan && (
                            <span className="ml-2 text-neutral-400">
                                • Scanned {formatTimeAgo(lastScan)}
                            </span>
                        )}
                    </div>
                )}

                {/* C6 FIX: Error UI display */}
                {scanError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{scanError}</span>
                        <button
                            onClick={scanDrafts}
                            className="ml-auto text-xs underline hover:no-underline"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>

            {/* Pending Files */}
            {!showHistory && (
                <div className="p-4">
                    {pendingFiles.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No pending files</p>
                            <p className="text-xs mt-1">
                                Drop .md files in the drafts folder
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pendingFiles.map((file) => (
                                <div
                                    key={file.filename}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${file.error
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-neutral-50 border-neutral-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileText className={`w-5 h-5 flex-shrink-0 ${file.error ? 'text-red-500' : 'text-neutral-400'
                                            }`} />
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {file.title}
                                            </div>
                                            <div className="text-xs text-neutral-500 flex items-center gap-2">
                                                <span className="font-mono">{file.filename}</span>
                                                <span>•</span>
                                                <span>{file.wordCount.toLocaleString()} words</span>
                                                {file.category !== 'general' && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{file.category}</span>
                                                    </>
                                                )}
                                            </div>
                                            {file.error && (
                                                <div className="text-xs text-red-600 mt-1">
                                                    ⚠️ {file.error}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => importFile(file.filename)}
                                        disabled={!!importing || !!file.error}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {importing === file.filename ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        Import
                                    </button>
                                </div>
                            ))}

                            {/* Import All button */}
                            {pendingFiles.filter(f => !f.error).length > 1 && (
                                <button
                                    onClick={importAll}
                                    disabled={!!importing}
                                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {importing === 'all' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    Import All ({pendingFiles.filter(f => !f.error).length} files)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* History View */}
            {showHistory && (
                <div className="p-4">
                    {history.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No import history yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((record, idx) => (
                                <div
                                    key={`${record.filename}-${idx}`}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${record.status === 'success'
                                        ? 'bg-green-50 border-green-200'
                                        : record.status === 'failed'
                                            ? 'bg-red-50 border-red-200'
                                            : 'bg-amber-50 border-amber-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {record.status === 'success' ? (
                                            <Check className="w-5 h-5 text-green-600" />
                                        ) : record.status === 'failed' ? (
                                            <X className="w-5 h-5 text-red-600" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-amber-600" />
                                        )}
                                        <div>
                                            <div className="font-medium text-sm">
                                                {record.filename}
                                            </div>
                                            <div className="text-xs text-neutral-500">
                                                {record.status === 'success' && 'External import'}
                                                {record.status === 'failed' && (record.error || 'Import failed')}
                                                {record.status === 'retrying' && `Retrying (${record.retryCount})`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-neutral-400">
                                        {formatTimeAgo(record.importedAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
