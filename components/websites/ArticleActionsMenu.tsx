'use client';

/**
 * Article Actions Menu
 * 
 * Dropdown menu for article-level actions:
 * - SEO Audit
 * - Syndicate to Dev.to
 * - Copy URL
 * - Delete
 */

import { useState } from 'react';
import {
    MoreVertical,
    Search,
    Share2,
    Link,
    Trash2,
    Loader2,
    CheckCircle,
    AlertTriangle,
    ExternalLink
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

interface ArticleActionsMenuProps {
    domain: string;
    articleSlug: string;
    articleTitle: string;
    canonicalUrl: string;
    onDelete?: () => void;
}

interface SEOAuditResult {
    score: number;
    issues: Array<{
        type: 'error' | 'warning' | 'info';
        message: string;
        fix: string;
    }>;
}

export default function ArticleActionsMenu({
    domain,
    articleSlug,
    articleTitle,
    canonicalUrl,
    onDelete
}: ArticleActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [syndicating, setSyndicating] = useState(false);
    const [syndicateResult, setSyndicateResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);
    const [auditing, setAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<SEOAuditResult | null>(null);
    const [showAuditModal, setShowAuditModal] = useState(false);

    // C3 FIX: Get Dev.to key from Zustand store instead of localStorage
    const devtoApiKey = useSettingsStore(state => state.integrations.devtoKey);

    const handleSyndicateToDevto = async () => {
        if (!devtoApiKey) {
            setSyndicateResult({ success: false, error: 'Dev.to API key not configured. Add it in Settings → Integrations.' });
            return;
        }

        setSyndicating(true);
        setSyndicateResult(null);

        try {
            const response = await fetch('/api/test-devto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: devtoApiKey,
                    action: 'publish',
                    article: {
                        title: articleTitle,
                        canonical_url: canonicalUrl,
                        published: true,
                        tags: [domain.split('.')[0].replace(/-/g, '')],
                        body_markdown: `Originally published at [${domain}](${canonicalUrl})\n\nRead the full article at the link above.`
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                setSyndicateResult({ success: true, url: data.article?.url });
            } else {
                setSyndicateResult({ success: false, error: data.error || 'Syndication failed' });
            }
        } catch (err) {
            setSyndicateResult({ success: false, error: 'Network error' });
        } finally {
            setSyndicating(false);
        }
    };

    const handleSEOAudit = async () => {
        setAuditing(true);
        setAuditResult(null);

        try {
            const response = await fetch('/api/seo/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain,
                    slug: articleSlug
                })
            });

            const data = await response.json();

            if (data.success) {
                setAuditResult(data.audit);
                setShowAuditModal(true);
            } else {
                setAuditResult({ score: 0, issues: [{ type: 'error', message: data.error || 'Audit failed', fix: 'Try again' }] });
                setShowAuditModal(true);
            }
        } catch (err) {
            setAuditResult({ score: 0, issues: [{ type: 'error', message: 'Network error', fix: 'Check connection' }] });
            setShowAuditModal(true);
        } finally {
            setAuditing(false);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(canonicalUrl);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 hover:bg-neutral-100 rounded"
            >
                <MoreVertical className="w-4 h-4 text-neutral-500" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 py-1">
                        {/* SEO Audit */}
                        <button
                            onClick={() => { handleSEOAudit(); setIsOpen(false); }}
                            disabled={auditing}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                            {auditing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4 text-blue-500" />
                            )}
                            SEO Audit
                        </button>

                        {/* Syndicate to Dev.to */}
                        <button
                            onClick={() => { handleSyndicateToDevto(); setIsOpen(false); }}
                            disabled={syndicating}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                            {syndicating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Share2 className="w-4 h-4 text-purple-500" />
                            )}
                            Syndicate to Dev.to
                        </button>

                        {/* Copy URL */}
                        <button
                            onClick={handleCopyUrl}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                            <Link className="w-4 h-4 text-neutral-500" />
                            Copy URL
                        </button>

                        <hr className="my-1 border-neutral-100" />

                        {/* Delete */}
                        <button
                            onClick={() => { onDelete?.(); setIsOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </>
            )}

            {/* Syndication Result Toast */}
            {syndicateResult && (
                <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg ${syndicateResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        {syndicateResult.success ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Published to Dev.to!</p>
                                    {syndicateResult.url && (
                                        <a
                                            href={syndicateResult.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-green-600 hover:underline flex items-center gap-1"
                                        >
                                            View article <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <p className="text-sm text-red-800">{syndicateResult.error}</p>
                            </>
                        )}
                        <button
                            onClick={() => setSyndicateResult(null)}
                            className="ml-4 text-neutral-400 hover:text-neutral-600"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* SEO Audit Modal */}
            {showAuditModal && auditResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-auto">
                        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                            <h3 className="font-bold">SEO Audit Results</h3>
                            <button onClick={() => setShowAuditModal(false)} className="text-neutral-400 hover:text-neutral-600">
                                ×
                            </button>
                        </div>
                        <div className="p-4">
                            {/* Score */}
                            <div className={`text-center p-4 rounded-lg mb-4 ${auditResult.score >= 80 ? 'bg-green-50' :
                                auditResult.score >= 50 ? 'bg-amber-50' : 'bg-red-50'
                                }`}>
                                <div className={`text-4xl font-bold ${auditResult.score >= 80 ? 'text-green-600' :
                                    auditResult.score >= 50 ? 'text-amber-600' : 'text-red-600'
                                    }`}>
                                    {auditResult.score}/100
                                </div>
                                <div className="text-sm text-neutral-600 mt-1">SEO Score</div>
                            </div>

                            {/* Issues */}
                            <div className="space-y-2">
                                {auditResult.issues.length === 0 ? (
                                    <p className="text-center text-green-600">No issues found! Great SEO.</p>
                                ) : (
                                    auditResult.issues.map((issue, i) => (
                                        <div key={i} className={`p-3 rounded-lg ${issue.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
                                            issue.type === 'warning' ? 'bg-amber-50 border-l-4 border-amber-500' :
                                                'bg-blue-50 border-l-4 border-blue-500'
                                            }`}>
                                            <p className="text-sm font-medium">{issue.message}</p>
                                            <p className="text-xs text-neutral-600 mt-1">Fix: {issue.fix}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
