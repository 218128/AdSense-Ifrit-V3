'use client';

/**
 * Batch Operations Panel Component
 * 
 * Multi-select articles and perform bulk operations.
 * Features:
 * - Select all / select none
 * - Bulk clean (remove AI artifacts)
 * - Bulk delete
 * - Bulk status change
 * - Bulk category assign
 */

import { useState } from 'react';
import {
    CheckSquare,
    Square,
    Trash2,
    Sparkles,
    Tag,
    FileCheck,
    Loader2,
    AlertTriangle,
    Check,
    X
} from 'lucide-react';

interface Article {
    id: string;
    title: string;
    slug: string;
    status: 'draft' | 'ready' | 'published';
    category: string;
    wordCount: number;
}

interface BatchOperationsPanelProps {
    domain: string;
    articles: Article[];
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    onOperationComplete: () => void;
}

export default function BatchOperationsPanel({
    domain,
    articles,
    selectedIds,
    onSelectionChange,
    onOperationComplete
}: BatchOperationsPanelProps) {
    const [loading, setLoading] = useState(false);
    const [operation, setOperation] = useState<string | null>(null);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    const selectedCount = selectedIds.size;
    const allSelected = selectedCount === articles.length && articles.length > 0;

    // Toggle all selection
    const toggleAll = () => {
        if (allSelected) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(articles.map(a => a.id)));
        }
    };

    // Execute batch operation
    const executeBatch = async (action: string, options?: Record<string, unknown>) => {
        if (selectedCount === 0) return;

        const confirmMessages: Record<string, string> = {
            clean: `Clean ${selectedCount} article(s)? This will remove AI artifacts.`,
            delete: `Delete ${selectedCount} article(s)? This cannot be undone.`,
            updateStatus: `Update status of ${selectedCount} article(s)?`,
            updateCategory: `Update category of ${selectedCount} article(s)?`
        };

        if (!confirm(confirmMessages[action] || `Perform ${action} on ${selectedCount} article(s)?`)) {
            return;
        }

        setLoading(true);
        setOperation(action);
        setResult(null);
        setShowStatusDropdown(false);
        setShowCategoryDropdown(false);

        try {
            const res = await fetch(`/api/websites/${domain}/content/batch-operations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    articleIds: Array.from(selectedIds),
                    options
                })
            });

            const data = await res.json();

            if (data.success) {
                setResult({
                    success: true,
                    message: `${data.successful}/${data.total} articles processed successfully`
                });
                onSelectionChange(new Set());
                onOperationComplete();
            } else {
                setResult({
                    success: false,
                    message: data.error || 'Operation failed'
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: 'Operation failed: ' + String(error)
            });
        } finally {
            setLoading(false);
            setOperation(null);
        }
    };

    // Get unique categories from articles
    const categories = [...new Set(articles.map(a => a.category))].filter(Boolean);

    if (articles.length === 0) return null;

    return (
        <div className="bg-white border border-neutral-200 rounded-lg p-3 mb-4">
            {/* Selection row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Select all toggle */}
                    <button
                        onClick={toggleAll}
                        className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
                    >
                        {allSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>

                    {selectedCount > 0 && (
                        <span className="text-sm text-indigo-600 font-medium">
                            {selectedCount} selected
                        </span>
                    )}
                </div>

                {/* Action buttons */}
                {selectedCount > 0 && (
                    <div className="flex items-center gap-2">
                        {/* Clean */}
                        <button
                            onClick={() => executeBatch('clean')}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                            title="Remove AI artifacts (citations, word counts, broken tables)"
                        >
                            {loading && operation === 'clean' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Clean
                        </button>

                        {/* Status dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                            >
                                <FileCheck className="w-3.5 h-3.5" />
                                Status
                            </button>
                            {showStatusDropdown && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                                    {['draft', 'ready', 'published'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => executeBatch('updateStatus', { status })}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 capitalize"
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Category dropdown */}
                        {categories.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50"
                                >
                                    <Tag className="w-3.5 h-3.5" />
                                    Category
                                </button>
                                {showCategoryDropdown && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                                        {categories.map(category => (
                                            <button
                                                key={category}
                                                onClick={() => executeBatch('updateCategory', { category })}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Delete */}
                        <button
                            onClick={() => executeBatch('delete')}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
                        >
                            {loading && operation === 'delete' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Result message */}
            {result && (
                <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {result.success ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        <AlertTriangle className="w-4 h-4" />
                    )}
                    {result.message}
                    <button
                        onClick={() => setResult(null)}
                        className="ml-auto hover:opacity-70"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}
