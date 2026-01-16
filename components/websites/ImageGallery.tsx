'use client';

/**
 * Image Gallery Component
 * 
 * @legacy - LEGACY Websites Component
 * This component is for the Legacy Websites system (GitHub/Vercel).
 * For WP Sites, use the WordPress Media Library via uploadMedia().
 * 
 * @deprecated Use WP Sites media features instead for new development.
 * 
 * Displays and manages images for articles.
 * Features:
 * - Grid view of all images
 * - Upload new images (drag & drop)
 * - Edit alt text and captions
 * - Delete unused images
 * - Filter by article
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Image as ImageIcon,
    Upload,
    Trash2,
    Edit3,
    X,
    Check,
    Loader2,
    Filter,
    AlertTriangle,
    FolderOpen
} from 'lucide-react';

interface ImageInfo {
    id: string;
    url: string;
    filename: string;
    type: 'cover' | 'content';
    articleSlug: string;
    articleId?: string;
    articleTitle?: string;
    alt?: string;
    caption?: string;
    sizeBytes: number;
    createdAt: number;
}

interface ImageGalleryProps {
    domain: string;
    articleSlug?: string; // If provided, filter to this article
    onSelect?: (image: ImageInfo) => void; // For picker mode
    pickerMode?: boolean;
}

export default function ImageGallery({
    domain,
    articleSlug,
    onSelect,
    pickerMode = false
}: ImageGalleryProps) {
    const [images, setImages] = useState<ImageInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'cover' | 'content' | 'orphaned'>('all');
    const [editingImage, setEditingImage] = useState<string | null>(null);
    const [editAlt, setEditAlt] = useState('');
    const [editCaption, setEditCaption] = useState('');
    const [selectedArticle, setSelectedArticle] = useState<string>(articleSlug || '');
    const [articles, setArticles] = useState<{ slug: string; title: string }[]>([]);
    const [totalSizeMB, setTotalSizeMB] = useState('0');
    const [dragOver, setDragOver] = useState(false);

    // Fetch images
    const fetchImages = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/websites/${domain}/images`;
            const params = new URLSearchParams();

            if (selectedArticle) params.append('articleSlug', selectedArticle);
            if (filter !== 'all') params.append('type', filter);

            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                setImages(data.images);
                setTotalSizeMB(data.totalSizeMB);
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
        } finally {
            setLoading(false);
        }
    }, [domain, selectedArticle, filter]);

    // Fetch articles for filter dropdown
    useEffect(() => {
        async function fetchArticles() {
            try {
                const res = await fetch(`/api/websites/${domain}/content`);
                const data = await res.json();
                if (data.success) {
                    setArticles(data.articles.map((a: { slug: string; title: string }) => ({
                        slug: a.slug,
                        title: a.title
                    })));
                }
            } catch (error) {
                console.error('Failed to fetch articles:', error);
            }
        }
        fetchArticles();
    }, [domain]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    // Handle file upload
    const handleUpload = async (files: FileList, targetSlug?: string) => {
        const slug = targetSlug || selectedArticle;
        if (!slug) {
            alert('Please select an article first');
            return;
        }

        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('articleSlug', slug);
                formData.append('type', 'content'); // Default to content
                formData.append('alt', file.name.replace(/\.[^/.]+$/, ''));

                await fetch(`/api/websites/${domain}/images`, {
                    method: 'POST',
                    body: formData
                });
            }
            fetchImages();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    };

    // Handle delete
    const handleDelete = async (image: ImageInfo) => {
        if (!confirm(`Delete ${image.filename}?`)) return;

        try {
            await fetch(`/api/websites/${domain}/images`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleSlug: image.articleSlug,
                    filename: image.filename,
                    type: image.type
                })
            });
            fetchImages();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    // Handle edit save
    const handleSaveEdit = async (image: ImageInfo) => {
        try {
            await fetch(`/api/websites/${domain}/images`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleSlug: image.articleSlug,
                    filename: image.filename,
                    type: image.type,
                    alt: editAlt,
                    caption: editCaption
                })
            });
            setEditingImage(null);
            fetchImages();
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    // Start editing
    const startEdit = (image: ImageInfo) => {
        setEditingImage(image.id);
        setEditAlt(image.alt || '');
        setEditCaption(image.caption || '');
    };

    // Format file size
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    if (loading && images.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            {!pickerMode && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-semibold text-neutral-900">Image Gallery</h3>
                        <span className="text-sm text-neutral-500">
                            {images.length} images ({totalSizeMB} MB)
                        </span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Article filter */}
                {!articleSlug && (
                    <select
                        value={selectedArticle}
                        onChange={(e) => setSelectedArticle(e.target.value)}
                        className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm"
                    >
                        <option value="">All Articles</option>
                        {articles.map(a => (
                            <option key={a.slug} value={a.slug}>{a.title}</option>
                        ))}
                    </select>
                )}

                {/* Type filter */}
                <div className="flex items-center gap-1">
                    <Filter className="w-4 h-4 text-neutral-400" />
                    {['all', 'cover', 'content', 'orphaned'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as typeof filter)}
                            className={`px-2 py-1 text-xs rounded ${filter === f
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Drop zone */}
            {selectedArticle && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                >
                    {uploading ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            <span className="text-sm text-neutral-600">Uploading...</span>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                            <p className="text-sm text-neutral-600">
                                Drop images here or{' '}
                                <label className="text-indigo-600 hover:underline cursor-pointer">
                                    browse
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => e.target.files && handleUpload(e.target.files)}
                                    />
                                </label>
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                                WebP, PNG, JPG, GIF accepted
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Image Grid */}
            {images.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                    <p>No images found</p>
                    {filter === 'orphaned' && (
                        <p className="text-sm text-neutral-400 mt-1">
                            All images are linked to articles ✓
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image, idx) => (
                        <div
                            key={`${image.id}_${idx}`}  // U10 FIX: Add index for unique key
                            className={`relative group rounded-lg overflow-hidden border ${pickerMode ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500' : ''
                                } ${!image.articleId ? 'border-amber-300 bg-amber-50' : 'border-neutral-200'}`}
                            onClick={() => pickerMode && onSelect?.(image)}
                        >
                            {/* Image */}
                            <div className="aspect-video bg-neutral-100 relative">
                                <img
                                    src={`/api/websites/${domain}/static${image.url}`}
                                    alt={image.alt || image.filename}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f5f5f5" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3ENo preview%3C/text%3E%3C/svg%3E';
                                    }}
                                />

                                {/* Type badge */}
                                <span className={`absolute top-2 left-2 px-1.5 py-0.5 text-xs rounded ${image.type === 'cover'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {image.type}
                                </span>

                                {/* Orphaned warning */}
                                {!image.articleId && (
                                    <span className="absolute top-2 right-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    </span>
                                )}

                                {/* Actions overlay */}
                                {!pickerMode && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startEdit(image); }}
                                            className="p-2 bg-white rounded-full hover:bg-neutral-100"
                                            title="Edit metadata"
                                        >
                                            <Edit3 className="w-4 h-4 text-neutral-700" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(image); }}
                                            className="p-2 bg-white rounded-full hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-2">
                                <p className="text-xs font-medium text-neutral-700 truncate">
                                    {image.filename}
                                </p>
                                <p className="text-xs text-neutral-400">
                                    {formatSize(image.sizeBytes)}
                                </p>
                                {image.articleTitle && (
                                    <p className="text-xs text-neutral-500 truncate mt-1">
                                        📄 {image.articleTitle}
                                    </p>
                                )}
                            </div>

                            {/* Edit modal */}
                            {editingImage === image.id && (
                                <div className="absolute inset-0 bg-white p-3 flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium">Edit Metadata</span>
                                        <button onClick={() => setEditingImage(null)}>
                                            <X className="w-4 h-4 text-neutral-400" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={editAlt}
                                        onChange={(e) => setEditAlt(e.target.value)}
                                        placeholder="Alt text"
                                        className="w-full px-2 py-1.5 text-xs border rounded mb-2"
                                    />
                                    <input
                                        type="text"
                                        value={editCaption}
                                        onChange={(e) => setEditCaption(e.target.value)}
                                        placeholder="Caption (optional)"
                                        className="w-full px-2 py-1.5 text-xs border rounded mb-2"
                                    />
                                    <button
                                        onClick={() => handleSaveEdit(image)}
                                        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                                    >
                                        <Check className="w-3 h-3" />
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
