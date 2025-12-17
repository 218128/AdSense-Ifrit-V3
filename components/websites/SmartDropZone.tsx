'use client';

/**
 * Smart Drop Zone
 * 
 * Drag-and-drop zone for markdown articles with:
 * - Auto-detection of article type from frontmatter
 * - Smart routing to matching website sections
 * - Date best practices for AdSense
 * - Manual override for category selection
 */

import { useState, useCallback } from 'react';
import { Upload, FileText, Check, AlertTriangle, ChevronDown, Loader2, X } from 'lucide-react';

interface SmartDropZoneProps {
    domain: string;
    niche: string;
    websiteCategories: string[]; // Available categories in the website
    onArticleSaved: () => void;
}

interface ParsedArticle {
    title: string;
    date: string;
    description: string;
    author: string;
    category: string;
    tags: string[];
    template: string;
    content: string;
    wordCount: number;
}

interface RoutingRecommendation {
    suggestedCategory: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
    alternatives: string[];
}

// Category mappings for smart routing
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'how-to': ['how to', 'guide', 'tutorial', 'step-by-step', 'learn', 'beginner'],
    'reviews': ['review', 'best', 'top', 'comparison', 'vs', 'versus', 'rating'],
    'guides': ['guide', 'complete', 'ultimate', 'comprehensive', 'definitive'],
    'tutorials': ['tutorial', 'how to', 'learn', 'course', 'training'],
    'news': ['news', 'update', 'announcement', 'release', 'launch'],
    'tips': ['tips', 'tricks', 'hacks', 'advice', 'secrets'],
    'listicles': ['best', 'top', 'things', 'ways', 'reasons', 'list'],
    'comparisons': ['vs', 'versus', 'comparison', 'compare', 'alternative']
};

export default function SmartDropZone({
    domain,
    niche,
    websiteCategories,
    onArticleSaved
}: SmartDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [parsedArticle, setParsedArticle] = useState<ParsedArticle | null>(null);
    const [routing, setRouting] = useState<RoutingRecommendation | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    const parseMarkdown = (content: string): ParsedArticle | null => {
        // Extract frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            setError('Invalid markdown: Missing frontmatter (---). Add YAML frontmatter at the start.');
            return null;
        }

        const frontmatter = frontmatterMatch[1];
        const body = content.slice(frontmatterMatch[0].length).trim();

        // Parse YAML frontmatter
        const getValue = (key: string): string => {
            const match = frontmatter.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm'));
            return match ? match[1].trim() : '';
        };

        const getTags = (): string[] => {
            const match = frontmatter.match(/tags:\s*\[(.*?)\]/);
            if (match) {
                return match[1].split(',').map(t => t.trim().replace(/["']/g, ''));
            }
            return [];
        };

        const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;

        return {
            title: getValue('title'),
            date: getValue('date') || new Date().toISOString().split('T')[0],
            description: getValue('description'),
            author: getValue('author'),
            category: getValue('category'),
            tags: getTags(),
            template: getValue('template'),
            content: body,
            wordCount
        };
    };

    const detectRouting = (article: ParsedArticle): RoutingRecommendation => {
        const titleLower = article.title.toLowerCase();
        const categoryLower = article.category.toLowerCase();
        const tagsLower = article.tags.map(t => t.toLowerCase());

        // Find best matching category
        let bestMatch = '';
        let highestScore = 0;
        const alternatives: string[] = [];

        for (const webCategory of websiteCategories) {
            const webCatLower = webCategory.toLowerCase();
            let score = 0;

            // Exact match in frontmatter category
            if (categoryLower === webCatLower) {
                score += 10;
            }

            // Partial match in category
            if (categoryLower.includes(webCatLower) || webCatLower.includes(categoryLower)) {
                score += 5;
            }

            // Check keywords
            const keywords = CATEGORY_KEYWORDS[webCatLower] || [webCatLower];
            for (const keyword of keywords) {
                if (titleLower.includes(keyword)) score += 3;
                if (tagsLower.some(t => t.includes(keyword))) score += 2;
            }

            if (score > 0) {
                if (score > highestScore) {
                    if (bestMatch) alternatives.push(bestMatch);
                    highestScore = score;
                    bestMatch = webCategory;
                } else {
                    alternatives.push(webCategory);
                }
            }
        }

        // Determine confidence
        let confidence: 'high' | 'medium' | 'low' = 'low';
        let reason = 'No strong category match found';

        if (highestScore >= 10) {
            confidence = 'high';
            reason = 'Exact category match in frontmatter';
        } else if (highestScore >= 5) {
            confidence = 'medium';
            reason = 'Partial match based on title and tags';
        } else if (highestScore > 0) {
            confidence = 'low';
            reason = 'Weak keyword match';
        }

        // Default to first category if no match
        if (!bestMatch && websiteCategories.length > 0) {
            bestMatch = websiteCategories[0];
            reason = 'No match found, using default category';
        }

        return {
            suggestedCategory: bestMatch,
            confidence,
            reason,
            alternatives: alternatives.slice(0, 3)
        };
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);
        setSuccess(false);

        const file = e.dataTransfer.files[0];
        if (!file || !file.name.endsWith('.md')) {
            setError('Please drop a Markdown (.md) file');
            return;
        }

        const content = await file.text();
        const parsed = parseMarkdown(content);

        if (parsed) {
            // Validate minimum requirements
            if (!parsed.title) {
                setError('Article missing required field: title');
                return;
            }
            if (parsed.wordCount < 300) {
                setError(`Article too short (${parsed.wordCount} words). Minimum 300 words for AdSense.`);
                return;
            }

            setParsedArticle(parsed);
            const routingResult = detectRouting(parsed);
            setRouting(routingResult);
            setSelectedCategory(routingResult.suggestedCategory);
        }
    }, [websiteCategories]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleSave = async () => {
        if (!parsedArticle || !selectedCategory) return;

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/websites/${domain}/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: parsedArticle.title,
                    slug: parsedArticle.title.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                    description: parsedArticle.description,
                    content: parsedArticle.content,
                    category: selectedCategory,
                    tags: parsedArticle.tags,
                    author: parsedArticle.author,
                    date: parsedArticle.date,
                    wordCount: parsedArticle.wordCount,
                    source: 'external',
                    status: 'ready'
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    setParsedArticle(null);
                    setRouting(null);
                    setSuccess(false);
                    onArticleSaved();
                }, 2000);
            } else {
                setError(data.error || 'Failed to save article');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setParsedArticle(null);
        setRouting(null);
        setError(null);
        setSelectedCategory('');
    };

    // Show drop zone when no article is being reviewed
    if (!parsedArticle) {
        return (
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400'
                    }`}
            >
                <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-neutral-400'}`} />
                <p className="font-medium text-neutral-700">
                    {isDragging ? 'Drop your article here' : 'Drag & Drop Markdown File'}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                    .md files with YAML frontmatter
                </p>
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    // Show article review and routing
    return (
        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
            {/* Article Preview Header */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h4 className="font-medium text-neutral-900 line-clamp-1">{parsedArticle.title}</h4>
                        <p className="text-xs text-neutral-500">{parsedArticle.wordCount} words • {parsedArticle.author || 'Unknown author'}</p>
                    </div>
                </div>
                <button onClick={handleCancel} className="p-1 hover:bg-neutral-200 rounded">
                    <X className="w-4 h-4 text-neutral-500" />
                </button>
            </div>

            {/* Routing Recommendation */}
            {routing && (
                <div className="p-4 border-b border-neutral-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-700">Category Placement</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${routing.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                routing.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-neutral-100 text-neutral-600'
                            }`}>
                            {routing.confidence} confidence
                        </span>
                    </div>

                    {/* Category Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            className="w-full flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:border-neutral-300"
                        >
                            <span className="font-medium">{selectedCategory || 'Select category'}</span>
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                        </button>

                        {showCategoryDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                {websiteCategories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setShowCategoryDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 hover:bg-neutral-50 ${cat === selectedCategory ? 'bg-indigo-50 text-indigo-700' : ''
                                            } ${cat === routing.suggestedCategory ? 'font-medium' : ''
                                            }`}
                                    >
                                        {cat}
                                        {cat === routing.suggestedCategory && (
                                            <span className="ml-2 text-xs text-indigo-500">Recommended</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-neutral-500 mt-2">{routing.reason}</p>
                </div>
            )}

            {/* Actions */}
            <div className="p-4 flex items-center justify-between gap-3">
                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                        <Check className="w-4 h-4" />
                        Article saved successfully!
                    </div>
                )}
                {!error && !success && <div />}

                <div className="flex gap-2">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedCategory}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Save to {selectedCategory}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
