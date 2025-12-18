'use client';

/**
 * Dev.to Publish Modal
 * 
 * Modal for publishing articles to Dev.to with:
 * - Content preview
 * - Tag selection
 * - Canonical URL setting
 * - Draft/Publish option
 */

import { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink, Check, Tag, Globe } from 'lucide-react';

interface DevToPublishModalProps {
    articleTitle: string;
    articleContent: string;   // Markdown content
    canonicalUrl: string;     // Original article URL
    niche?: string;
    onClose: () => void;
    onPublished?: (url: string) => void;
}

const DEVTO_TAG_SUGGESTIONS = [
    'webdev', 'programming', 'javascript', 'typescript', 'react', 'nextjs',
    'tutorial', 'productivity', 'career', 'beginners', 'devops', 'cloud',
    'security', 'ai', 'machinelearning', 'python', 'go', 'rust',
    'startup', 'saas', 'marketing', 'finance', 'crypto', 'blockchain'
];

export default function DevToPublishModal({
    articleTitle,
    articleContent,
    canonicalUrl,
    niche,
    onClose,
    onPublished
}: DevToPublishModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [publishAsDraft, setPublishAsDraft] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ url: string } | null>(null);

    // Load API key from localStorage
    useEffect(() => {
        const storedKey = localStorage.getItem('devto_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
    }, []);

    // Suggest tags based on niche
    useEffect(() => {
        if (niche && tags.length === 0) {
            const nicheTagMap: Record<string, string[]> = {
                'technology': ['webdev', 'programming', 'technology'],
                'finance': ['finance', 'productivity', 'career'],
                'health': ['health', 'productivity', 'beginners'],
                'marketing': ['marketing', 'startup', 'career'],
                'general': ['webdev', 'beginners', 'tutorial']
            };
            const suggested = nicheTagMap[niche.toLowerCase()] || nicheTagMap['general'];
            setTags(suggested.slice(0, 4));
        }
    }, [niche, tags.length]);

    const addTag = (tag: string) => {
        const cleanTag = tag.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        if (cleanTag && tags.length < 4 && !tags.includes(cleanTag)) {
            setTags([...tags, cleanTag]);
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const adaptContent = (content: string): string => {
        // Remove frontmatter
        let adapted = content.replace(/^---[\s\S]*?---\n\n?/, '');

        // Remove AdSense placeholders
        adapted = adapted.replace(/<!-- AD:?\w* -->/g, '');
        adapted = adapted.replace(/<script[^>]*adsbygoogle[^>]*>[\s\S]*?<\/script>/gi, '');

        // Add canonical note
        adapted += `\n\n---\n\n*Originally published at [${new URL(canonicalUrl).hostname}](${canonicalUrl})*`;

        // Clean up extra blank lines
        adapted = adapted.replace(/\n{3,}/g, '\n\n');

        return adapted;
    };

    const handlePublish = async () => {
        if (!apiKey) {
            setError('Dev.to API key required. Add it below or in Settings → Integrations.');
            return;
        }

        setPublishing(true);
        setError(null);

        try {
            // Save API key for future use
            localStorage.setItem('devto_api_key', apiKey);

            const adaptedContent = adaptContent(articleContent);

            const response = await fetch('/api/devto/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    article: {
                        title: articleTitle,
                        body_markdown: adaptedContent,
                        published: !publishAsDraft,
                        tags: tags.slice(0, 4),
                        canonical_url: canonicalUrl,
                        description: articleTitle.slice(0, 150)
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess({ url: data.article.url });
                onPublished?.(data.article.url);
            } else {
                setError(data.error || 'Failed to publish');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Publish failed');
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6l.02 2.44.04 2.45.56-.02c.41 0 .63-.07.83-.26.24-.24.26-.36.26-2.2 0-1.91-.02-1.96-.29-2.18zM0 4.94v14.12h24V4.94H0zM8.56 15.3c-.44.58-1.06.77-2.53.77H4.71V8.53h1.4c1.67 0 2.16.18 2.6.9.27.43.29.6.32 2.57.05 2.23-.02 2.73-.47 3.3zm5.09-5.47h-2.47v1.77h1.52v1.28l-.72.04-.75.03v1.77l1.22.03 1.2.04v1.28h-1.6c-1.53 0-1.6-.01-1.87-.3l-.3-.28v-3.16c0-3.02.01-3.18.25-3.48.23-.31.25-.31 1.88-.31h1.64v1.29zm4.68 5.45c-.17.43-.64.79-1 .79-.18 0-.45-.15-.67-.39-.32-.32-.45-.63-.82-2.08l-.9-3.39-.45-1.67h.76c.4 0 .75.02.75.05 0 .06 1.16 4.54 1.26 4.83.04.15.32-.47.73-1.64.37-1.07.76-2.16.87-2.42.19-.56.2-.58.56-.58.19 0 .42.04.52.09.08.04.09.07.04.16-.04.09-.13.37-.2.63-.07.25-.37 1.27-.65 2.26-.29.99-.72 2.5-.96 3.36z" />
                        </svg>
                        <h2 className="text-lg font-semibold">Publish to Dev.to</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Success State */}
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-800 mb-2">
                                {publishAsDraft ? 'Saved as Draft!' : 'Published!'}
                            </h3>
                            <p className="text-sm text-neutral-600 mb-4">
                                Your article is now on Dev.to
                            </p>
                            <a
                                href={success.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on Dev.to
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* Article Preview */}
                            <div className="bg-neutral-50 rounded-lg p-3">
                                <h4 className="font-medium text-neutral-800 truncate">{articleTitle}</h4>
                                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    Canonical: {canonicalUrl}
                                </p>
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Dev.to API Key
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Get from dev.to/settings/extensions"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    <a
                                        href="https://dev.to/settings/extensions"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline"
                                    >
                                        Get your API key here
                                    </a>
                                </p>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Tags (max 4)
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                        >
                                            #{tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="hover:text-indigo-900"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                {tags.length < 4 && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                    e.preventDefault();
                                                    addTag(tagInput);
                                                }
                                            }}
                                            placeholder="Add tag..."
                                            className="flex-1 px-2 py-1 border rounded text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addTag(tagInput)}
                                            className="px-2 py-1 bg-neutral-100 rounded text-sm hover:bg-neutral-200"
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {DEVTO_TAG_SUGGESTIONS.slice(0, 8).map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => addTag(tag)}
                                            disabled={tags.includes(tag) || tags.length >= 4}
                                            className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-xs hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Publish Option */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={publishAsDraft}
                                    onChange={(e) => setPublishAsDraft(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <span className="text-sm text-neutral-700">
                                    Save as draft (review before publishing)
                                </span>
                            </label>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="p-4 border-t bg-neutral-50 flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-neutral-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={publishing || !apiKey}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {publishing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Publishing...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="w-4 h-4" />
                                    {publishAsDraft ? 'Save Draft' : 'Publish Now'}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
