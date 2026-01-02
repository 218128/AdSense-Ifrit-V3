'use client';

/**
 * Article Editor
 * 
 * Manual markdown editor with:
 * - Split view (edit + preview)
 * - Frontmatter helper
 * - SEO preview
 * - Save/Publish options
 */

import { useState, useMemo } from 'react';
import {
    FileText, Eye, Code, Save, Send, X, Info,
    Loader2, AlertTriangle, ExternalLink, Share2
} from 'lucide-react';
import DevToPublishModal from '../shared/DevToPublishModal';
import SocialShareModal from '../shared/SocialShareModal';
import { sanitizeHtml } from '@/lib/security/sanitize';

interface ArticleEditorProps {
    domain: string;
    niche: string;
    author: {
        name: string;
        role: string;
    };
    websiteCategories: string[];
    onSave: () => void;
    onClose: () => void;
    initialContent?: string;
    articleId?: string; // For editing existing articles
}

const FRONTMATTER_TEMPLATE = (title: string, author: string, category: string) => `---
title: "${title}"
date: "${new Date().toISOString().split('T')[0]}"
description: ""
author: "${author}"
category: "${category}"
tags: []
---

`;

export default function ArticleEditor({
    domain,
    niche,
    author,
    websiteCategories,
    onSave,
    onClose,
    initialContent = '',
    articleId
}: ArticleEditorProps) {
    const [content, setContent] = useState(initialContent || FRONTMATTER_TEMPLATE('', author.name, websiteCategories[0] || 'guides'));
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFrontmatterHelper, setShowFrontmatterHelper] = useState(!initialContent);
    const [showDevToModal, setShowDevToModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Parse frontmatter from content
    const parsedMeta = useMemo(() => {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;

        const fm = match[1];
        const getValue = (key: string) => {
            const m = fm.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm'));
            return m ? m[1].trim() : '';
        };

        return {
            title: getValue('title'),
            date: getValue('date'),
            description: getValue('description'),
            author: getValue('author'),
            category: getValue('category'),
        };
    }, [content]);

    // Word count
    const wordCount = useMemo(() => {
        const body = content.replace(/^---[\s\S]*?---/, '').trim();
        return body.split(/\s+/).filter(w => w.length > 0).length;
    }, [content]);

    // SEO analysis
    const seoAnalysis = useMemo(() => {
        const issues: string[] = [];
        const warnings: string[] = [];

        if (parsedMeta) {
            if (!parsedMeta.title) issues.push('Missing title');
            if (parsedMeta.title && parsedMeta.title.length > 60) warnings.push('Title too long (>60 chars)');
            if (!parsedMeta.description) issues.push('Missing meta description');
            if (parsedMeta.description && parsedMeta.description.length < 120) warnings.push('Description too short (<120 chars)');
            if (parsedMeta.description && parsedMeta.description.length > 160) warnings.push('Description too long (>160 chars)');
        }

        if (wordCount < 300) issues.push('Content too short (<300 words)');
        if (wordCount < 1000) warnings.push('Content could be longer for SEO');

        return { issues, warnings, score: Math.max(0, 100 - (issues.length * 25) - (warnings.length * 10)) };
    }, [parsedMeta, wordCount]);

    // Simple markdown preview
    const previewHtml = useMemo(() => {
        let body = content.replace(/^---[\s\S]*?---/, '').trim();

        // Very basic markdown to HTML conversion
        body = body
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/\n/g, '<br/>');

        return `<p class="mb-4">${body}</p>`;
    }, [content]);

    const handleSave = async (publish: boolean) => {
        if (!parsedMeta?.title) {
            setError('Title is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const body = content.replace(/^---[\s\S]*?---/, '').trim();
            const slug = parsedMeta.title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const endpoint = articleId
                ? `/api/websites/${domain}/content/${articleId}`
                : `/api/websites/${domain}/content`;

            const response = await fetch(endpoint, {
                method: articleId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: parsedMeta.title,
                    slug,
                    description: parsedMeta.description,
                    content: body,
                    category: parsedMeta.category || websiteCategories[0] || 'guides',
                    author: parsedMeta.author || author.name,
                    date: parsedMeta.date || new Date().toISOString().split('T')[0],
                    wordCount,
                    source: 'manual',
                    status: publish ? 'ready' : 'draft'
                })
            });

            const data = await response.json();

            if (data.success) {
                onSave();
            } else {
                setError(data.error || 'Failed to save');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const insertFrontmatter = (updates: Record<string, string>) => {
        let newContent = content;

        for (const [key, value] of Object.entries(updates)) {
            const regex = new RegExp(`^${key}:\\s*["']?[^"'\\n]*["']?`, 'm');
            if (newContent.match(regex)) {
                newContent = newContent.replace(regex, `${key}: "${value}"`);
            }
        }

        setContent(newContent);
    };

    return (
        /* U6 FIX: z-[100] ensures modal is above all content, inset-0 with items-center centers it */
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-bold text-lg">
                            {articleId ? 'Edit Article' : 'Create Article'}
                        </h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${seoAnalysis.score >= 80 ? 'bg-green-100 text-green-700' :
                            seoAnalysis.score >= 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            SEO: {seoAnalysis.score}%
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex bg-neutral-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('edit')}
                                className={`px-3 py-1 text-sm rounded ${viewMode === 'edit' ? 'bg-white shadow' : ''}`}
                            >
                                <Code className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('split')}
                                className={`px-3 py-1 text-sm rounded ${viewMode === 'split' ? 'bg-white shadow' : ''}`}
                            >
                                Split
                            </button>
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1 text-sm rounded ${viewMode === 'preview' ? 'bg-white shadow' : ''}`}
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded">
                            <X className="w-5 h-5 text-neutral-500" />
                        </button>
                    </div>
                </div>

                {/* Frontmatter Helper */}
                {showFrontmatterHelper && (
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-indigo-700">
                                <Info className="w-4 h-4" />
                                <span className="font-medium text-sm">Quick Metadata</span>
                            </div>
                            <button
                                onClick={() => setShowFrontmatterHelper(false)}
                                className="text-indigo-500 text-xs hover:underline"
                            >
                                Hide
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <input
                                type="text"
                                value={parsedMeta?.title || ''}
                                onChange={(e) => insertFrontmatter({ title: e.target.value })}
                                placeholder="Title"
                                className="px-3 py-2 border border-indigo-200 rounded-lg text-sm"
                            />
                            <input
                                type="text"
                                value={parsedMeta?.description || ''}
                                onChange={(e) => insertFrontmatter({ description: e.target.value })}
                                placeholder="Meta description (150-160 chars)"
                                className="px-3 py-2 border border-indigo-200 rounded-lg text-sm"
                            />
                            <select
                                value={parsedMeta?.category || ''}
                                onChange={(e) => insertFrontmatter({ category: e.target.value })}
                                className="px-3 py-2 border border-indigo-200 rounded-lg text-sm"
                            >
                                {websiteCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Editor Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Edit Pane */}
                    {(viewMode === 'edit' || viewMode === 'split') && (
                        <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-neutral-200' : 'w-full'} flex flex-col`}>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
                                placeholder="Start writing your article..."
                            />
                        </div>
                    )}

                    {/* Preview Pane */}
                    {(viewMode === 'preview' || viewMode === 'split') && (
                        <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-auto bg-neutral-50`}>
                            <div className="max-w-2xl mx-auto p-6">
                                {parsedMeta?.title && (
                                    <h1 className="text-3xl font-bold mb-4">{parsedMeta.title}</h1>
                                )}
                                <div
                                    className="prose prose-neutral"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-neutral-500">{wordCount} words</span>
                        {seoAnalysis.issues.length > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                {seoAnalysis.issues.length} issues
                            </span>
                        )}
                        {error && (
                            <span className="text-red-600">{error}</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowShareModal(true)}
                            disabled={!parsedMeta?.title}
                            className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowDevToModal(true)}
                            disabled={!parsedMeta?.title}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-900 disabled:opacity-50"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Dev.to
                        </button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Draft
                        </button>
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving || seoAnalysis.issues.length > 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Publish
                        </button>
                    </div>
                </div>
            </div>

            {/* Dev.to Publish Modal */}
            {showDevToModal && parsedMeta?.title && (
                <DevToPublishModal
                    articleTitle={parsedMeta.title}
                    articleContent={content}
                    canonicalUrl={`https://${domain}/${parsedMeta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    niche={niche}
                    onClose={() => setShowDevToModal(false)}
                    onPublished={(url) => {
                        console.log('Published to Dev.to:', url);
                    }}
                />
            )}

            {/* Social Share Modal */}
            {showShareModal && parsedMeta?.title && (
                <SocialShareModal
                    articleTitle={parsedMeta.title}
                    articleUrl={`https://${domain}/${parsedMeta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    articleExcerpt={parsedMeta.description}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
}
