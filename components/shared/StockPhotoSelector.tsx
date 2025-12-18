'use client';

/**
 * Stock Photo Selector Component
 * 
 * Allows users to search and select stock photos from Unsplash/Pexels.
 * Triggered from article creation or editing.
 */

import { useState, useCallback } from 'react';
import { Search, X, Loader2, Image as ImageIcon, Check, ExternalLink } from 'lucide-react';

export interface StockPhoto {
    id: string;
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
    alt: string;
    photographer: string;
    attribution: string;
    source: 'unsplash' | 'pexels';
}

interface StockPhotoSelectorProps {
    onSelect: (photo: StockPhoto) => void;
    onClose: () => void;
    initialQuery?: string;
}

export function StockPhotoSelector({ onSelect, onClose, initialQuery = '' }: StockPhotoSelectorProps) {
    const [query, setQuery] = useState(initialQuery);
    const [photos, setPhotos] = useState<StockPhoto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<StockPhoto | null>(null);

    const searchPhotos = useCallback(async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // Get API keys from localStorage
            const unsplashKey = localStorage.getItem('ifrit_unsplash_key');
            const pexelsKey = localStorage.getItem('ifrit_pexels_key');

            if (!unsplashKey && !pexelsKey) {
                setError('Please add Unsplash or Pexels API key in Settings → Images');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/stock-photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query.trim(),
                    count: 9,
                    unsplashKey,
                    pexelsKey
                })
            });

            const data = await response.json();

            if (data.success) {
                setPhotos(data.photos);
                if (data.photos.length === 0) {
                    setError('No photos found. Try different keywords.');
                }
            } else {
                setError(data.error || 'Search failed');
            }
        } catch (err) {
            setError('Failed to search photos');
            console.error('Stock photo search error:', err);
        } finally {
            setLoading(false);
        }
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            searchPhotos();
        }
    };

    const handleSelect = () => {
        if (selectedPhoto) {
            onSelect(selectedPhoto);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold">Select Cover Image</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search for photos..."
                                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={searchPhotos}
                            disabled={loading || !query.trim()}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Search className="w-5 h-5" />
                            )}
                            Search
                        </button>
                    </div>
                </div>

                {/* Photo Grid */}
                <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                    {error && (
                        <div className="text-center py-8">
                            <p className="text-amber-600 mb-2">{error}</p>
                            {error.includes('Settings') && (
                                <p className="text-sm text-gray-500">
                                    Go to Settings → Images to add your API keys
                                </p>
                            )}
                        </div>
                    )}

                    {photos.length === 0 && !loading && !error && (
                        <div className="text-center py-12 text-gray-500">
                            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Search for photos to get started</p>
                            <p className="text-sm mt-1">Try keywords related to your article topic</p>
                        </div>
                    )}

                    {photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                            {photos.map((photo) => (
                                <button
                                    key={photo.id}
                                    onClick={() => setSelectedPhoto(photo)}
                                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${selectedPhoto?.id === photo.id
                                            ? 'border-indigo-600 ring-2 ring-indigo-200'
                                            : 'border-transparent hover:border-gray-300'
                                        }`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={photo.thumbUrl}
                                        alt={photo.alt}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Selected indicator */}
                                    {selectedPhoto?.id === photo.id && (
                                        <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}

                                    {/* Source badge */}
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full capitalize">
                                        {photo.source}
                                    </div>

                                    {/* Photographer on hover */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-end p-3">
                                        <p className="text-white text-sm truncate">
                                            📷 {photo.photographer}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        {selectedPhoto && (
                            <span className="flex items-center gap-1">
                                <Check className="w-4 h-4 text-green-600" />
                                {selectedPhoto.attribution}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!selectedPhoto}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Use Selected Photo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StockPhotoSelector;
