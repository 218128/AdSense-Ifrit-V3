'use client';

/**
 * Pages Tab Component
 * 
 * Manage structural pages (About, Contact, Privacy, Terms)
 * Features:
 * - View/edit existing pages
 * - Create missing pages
 * - Generate default pages
 */

import { useState, useEffect, useCallback } from 'react';
import {
    FileText,
    Plus,
    Edit,
    Check,
    X,
    Loader2,
    RefreshCw,
    Eye,
    Sparkles,
    Save,
    Download
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface StructuralPage {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    structuralType: 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer';
    wordCount: number;
    status: string;
    lastModifiedAt: number;
}

interface PagesTabProps {
    domain: string;
    onRefresh?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const PAGE_TYPES = [
    { type: 'about', label: 'About', icon: '👤', description: 'About your site and team' },
    { type: 'contact', label: 'Contact', icon: '📧', description: 'How visitors can reach you' },
    { type: 'privacy', label: 'Privacy Policy', icon: '🔒', description: 'Data collection and usage' },
    { type: 'terms', label: 'Terms of Service', icon: '📜', description: 'Usage terms and conditions' },
    { type: 'disclaimer', label: 'Disclaimer', icon: '⚠️', description: 'Legal disclaimers' },
] as const;

// ============================================
// COMPONENT
// ============================================

export default function PagesTab({ domain, onRefresh }: PagesTabProps) {
    const [pages, setPages] = useState<StructuralPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [editingPage, setEditingPage] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch pages
    const fetchPages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/websites/${domain}/pages`);
            const data = await res.json();
            if (data.success) {
                setPages(data.pages || []);
            }
        } catch (err) {
            console.error('Failed to fetch pages:', err);
        } finally {
            setLoading(false);
        }
    }, [domain]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    // Create default pages
    const createDefaults = async () => {
        setCreating(true);
        try {
            const res = await fetch(`/api/websites/${domain}/pages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createDefaults' })
            });
            const data = await res.json();
            if (data.success) {
                setPages(data.pages || []);
                onRefresh?.();
            }
        } catch (err) {
            console.error('Failed to create defaults:', err);
        } finally {
            setCreating(false);
        }
    };

    // Sync pages from GitHub
    const syncFromGitHub = async () => {
        const githubToken = localStorage.getItem('ifrit_github_token');
        if (!githubToken) {
            setSyncMessage('❌ GitHub token required. Configure in Settings.');
            return;
        }

        setSyncing(true);
        setSyncMessage(null);

        try {
            const res = await fetch(`/api/websites/${domain}/pages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'syncFromGitHub',
                    githubToken
                })
            });
            const data = await res.json();
            if (data.success) {
                setPages(data.pages || []);
                setSyncMessage(`✅ ${data.message}${data.errors ? ` (${data.errors.join(', ')})` : ''}`);
                onRefresh?.();
            } else {
                setSyncMessage(`❌ ${data.error}`);
            }
        } catch (err) {
            console.error('Failed to sync from GitHub:', err);
            setSyncMessage('❌ Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    // Start editing a page
    const startEdit = (page: StructuralPage) => {
        setEditingPage(page.structuralType);
        setEditContent(page.content);
        setEditTitle(page.title);
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingPage(null);
        setEditContent('');
        setEditTitle('');
    };

    // Save page
    const savePage = async () => {
        if (!editingPage) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/websites/${domain}/pages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageType: editingPage,
                    title: editTitle,
                    content: editContent,
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchPages();
                cancelEdit();
                onRefresh?.();
            }
        } catch (err) {
            console.error('Failed to save page:', err);
        } finally {
            setSaving(false);
        }
    };

    // Format date
    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get page by type
    const getPageByType = (type: string) => {
        return pages.find(p => p.structuralType === type);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-800">Structural Pages</h3>
                    <p className="text-sm text-neutral-500">
                        Manage About, Contact, Privacy, and Terms pages
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {syncMessage && (
                        <span className={`text-sm ${syncMessage.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                            {syncMessage}
                        </span>
                    )}
                    {pages.length === 0 && (
                        <>
                            <button
                                onClick={syncFromGitHub}
                                disabled={syncing}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                                title="Import existing pages from GitHub repo"
                            >
                                {syncing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Sync from GitHub
                            </button>
                            <button
                                onClick={createDefaults}
                                disabled={creating}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                            >
                                {creating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                Generate New
                            </button>
                        </>
                    )}
                    <button
                        onClick={fetchPages}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>
            </div>

            {/* Pages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PAGE_TYPES.map(({ type, label, icon, description }) => {
                    const page = getPageByType(type);
                    const isEditing = editingPage === type;

                    return (
                        <div
                            key={type}
                            className={`border rounded-xl overflow-hidden ${page ? 'bg-white border-neutral-200' : 'bg-neutral-50 border-dashed border-neutral-300'
                                } ${isEditing ? 'ring-2 ring-blue-500' : ''}`}
                        >
                            {/* Page Header */}
                            <div className="p-4 border-b bg-gradient-to-r from-neutral-50 to-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{icon}</span>
                                        <div>
                                            <h4 className="font-medium text-neutral-800">{label}</h4>
                                            <p className="text-xs text-neutral-500">{description}</p>
                                        </div>
                                    </div>
                                    {page && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                            ✓ Published
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Page Content */}
                            {isEditing ? (
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                                            Content (Markdown)
                                        </label>
                                        <textarea
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            rows={8}
                                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            onClick={cancelEdit}
                                            className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg text-sm"
                                        >
                                            <X className="w-4 h-4 inline mr-1" />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={savePage}
                                            disabled={saving}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : page ? (
                                <div className="p-4">
                                    <div className="text-sm text-neutral-600 mb-3">
                                        {page.wordCount} words • Updated {formatDate(page.lastModifiedAt)}
                                    </div>
                                    <div className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-700 max-h-32 overflow-hidden">
                                        <pre className="whitespace-pre-wrap font-sans line-clamp-4">
                                            {page.content.substring(0, 300)}...
                                        </pre>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <button
                                            onClick={() => startEdit(page)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <a
                                            href={`https://${domain}/${type}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Preview
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 text-center">
                                    <p className="text-sm text-neutral-500 mb-3">
                                        This page hasn&apos;t been created yet
                                    </p>
                                    <button
                                        onClick={() => {
                                            setEditingPage(type);
                                            setEditTitle(`${label} - ${domain}`);
                                            setEditContent(`# ${label}\n\nAdd your content here...`);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg mx-auto"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Page
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Folder Location */}
            <div className="text-xs text-neutral-400 font-mono bg-neutral-50 p-3 rounded-lg">
                📁 Storage: websites/{domain}/content/pages/
            </div>
        </div>
    );
}
