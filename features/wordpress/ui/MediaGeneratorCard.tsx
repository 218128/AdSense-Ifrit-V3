'use client';

/**
 * Media Generator Card
 * FSD: features/wordpress/ui/MediaGeneratorCard.tsx
 * 
 * On-demand image generation UI for WP Sites.
 * Uses images + search-images capabilities with SSE tracking.
 */

import { useState } from 'react';
import {
    Image,
    Sparkles,
    Search,
    Upload,
    Loader2,
    Check,
    X,
    RefreshCw
} from 'lucide-react';
import { useWPSiteMedia } from '../hooks/useWPSiteMedia';
import type { WPSite } from '../model/types';

interface MediaGeneratorCardProps {
    site: WPSite;
    defaultTopic?: string;
}

export function MediaGeneratorCard({ site, defaultTopic = '' }: MediaGeneratorCardProps) {
    const [topic, setTopic] = useState(defaultTopic);
    const [mode, setMode] = useState<'search' | 'ai'>('search');

    const {
        isGenerating,
        generatedImage,
        error,
        searchStockImage,
        generateAIImage,
        uploadToMediaLibrary,
        clearImage,
    } = useWPSiteMedia();

    const handleGenerate = async () => {
        if (!topic.trim()) return;

        if (mode === 'search') {
            await searchStockImage(topic);
        } else {
            await generateAIImage(topic);
        }
    };

    const handleUpload = async () => {
        if (!generatedImage) return;
        await uploadToMediaLibrary(site, generatedImage);
    };

    return (
        <div className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-4">
                <Image className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Generate Featured Image</h3>
            </div>

            {/* Topic Input */}
            <div className="space-y-3">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter topic or keyword..."
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    disabled={isGenerating}
                />

                {/* Mode Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('search')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${mode === 'search'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                        disabled={isGenerating}
                    >
                        <Search className="w-4 h-4" />
                        Stock (Free)
                    </button>
                    <button
                        onClick={() => setMode('ai')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${mode === 'ai'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                        disabled={isGenerating}
                    >
                        <Sparkles className="w-4 h-4" />
                        AI Generate
                    </button>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {mode === 'search' ? 'Searching...' : 'Generating...'}
                        </>
                    ) : (
                        <>
                            {mode === 'search' ? <Search className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            {mode === 'search' ? 'Search Stock Images' : 'Generate with AI'}
                        </>
                    )}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {error}
                    </p>
                </div>
            )}

            {/* Generated Image Preview */}
            {generatedImage && (
                <div className="mt-4 space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={generatedImage.url}
                            alt={generatedImage.alt}
                            className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${generatedImage.source === 'ai'
                                    ? 'bg-purple-500/80 text-white'
                                    : 'bg-green-500/80 text-white'
                                }`}>
                                {generatedImage.source === 'ai' ? 'AI' : 'Stock'}
                            </span>
                            {generatedImage.wpMediaId && (
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-500/80 text-white flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Uploaded
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {!generatedImage.wpMediaId ? (
                            <button
                                onClick={handleUpload}
                                disabled={isGenerating}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                Upload to {site.domain}
                            </button>
                        ) : (
                            <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600/20 text-green-600 rounded-md">
                                <Check className="w-4 h-4" />
                                Uploaded (ID: {generatedImage.wpMediaId})
                            </div>
                        )}
                        <button
                            onClick={clearImage}
                            className="px-3 py-2 border border-border rounded-md hover:bg-muted"
                            title="Clear and try again"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
