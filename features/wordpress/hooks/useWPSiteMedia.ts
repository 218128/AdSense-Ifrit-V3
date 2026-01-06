/**
 * useWPSiteMedia Hook
 * FSD: features/wordpress/hooks/useWPSiteMedia.ts
 * 
 * On-demand image generation for WP Sites using:
 * - `images` capability (AI generation)
 * - `search-images` capability (Stock search)
 * 
 * Integrates with GlobalActionStatus for SSE tracking.
 */

import { useState, useCallback } from 'react';
import { useGlobalActionStatus } from '@/lib/shared/hooks/useGlobalActionStatus';
import type { WPSite } from '../model/types';

export interface GeneratedMediaAsset {
    url: string;
    alt: string;
    wpMediaId?: number;
    wpMediaUrl?: string;
    source: 'ai' | 'stock';
}

export interface UseWPSiteMediaReturn {
    // State
    isGenerating: boolean;
    generatedImage: GeneratedMediaAsset | null;
    error: string | null;

    // Actions
    generateFeaturedImage: (topic: string) => Promise<GeneratedMediaAsset | null>;
    uploadToMediaLibrary: (site: WPSite, image: GeneratedMediaAsset) => Promise<GeneratedMediaAsset | null>;
    searchStockImage: (query: string) => Promise<GeneratedMediaAsset | null>;
    generateAIImage: (prompt: string) => Promise<GeneratedMediaAsset | null>;
    clearImage: () => void;
}

export function useWPSiteMedia(): UseWPSiteMediaReturn {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<GeneratedMediaAsset | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { trackAction } = useGlobalActionStatus();

    /**
     * Search for stock images using search-images capability
     */
    const searchStockImage = useCallback(async (query: string): Promise<GeneratedMediaAsset | null> => {
        setIsGenerating(true);
        setError(null);

        return trackAction(
            `Searching stock images for "${query}"`,
            async (updateProgress) => {
                try {
                    updateProgress({ phase: 'starting', message: 'Searching Unsplash, Pexels...' });

                    const response = await fetch('/api/capabilities/search-images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: query,
                            topic: query,
                            itemType: 'featured',
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Stock search failed');
                    }

                    const data = await response.json();

                    if (!data.success || !data.text) {
                        throw new Error(data.error || 'No images found');
                    }

                    const asset: GeneratedMediaAsset = {
                        url: data.text,
                        alt: query,
                        source: 'stock',
                    };

                    setGeneratedImage(asset);
                    updateProgress({ phase: 'complete', message: `Found via ${data.handlerUsed}` });

                    return asset;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Search failed';
                    setError(errorMsg);
                    updateProgress({ phase: 'complete', message: errorMsg, success: false });
                    return null;
                } finally {
                    setIsGenerating(false);
                }
            },
            { feature: 'wp-sites', siteId: 'media' }
        );
    }, [trackAction]);

    /**
     * Generate AI image using images capability
     */
    const generateAIImage = useCallback(async (prompt: string): Promise<GeneratedMediaAsset | null> => {
        setIsGenerating(true);
        setError(null);

        return trackAction(
            `Generating AI image`,
            async (updateProgress) => {
                try {
                    updateProgress({ phase: 'starting', message: 'Generating with AI...' });

                    const response = await fetch('/api/capabilities/images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: `Professional featured image for: ${prompt}. Modern, clean design suitable for blog header.`,
                            topic: prompt,
                            itemType: 'featured',
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('AI generation failed');
                    }

                    const data = await response.json();

                    if (!data.success || !data.text) {
                        throw new Error(data.error || 'Generation failed');
                    }

                    const asset: GeneratedMediaAsset = {
                        url: data.text,
                        alt: prompt,
                        source: 'ai',
                    };

                    setGeneratedImage(asset);
                    updateProgress({ phase: 'complete', message: `Generated via ${data.handlerUsed}` });

                    return asset;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Generation failed';
                    setError(errorMsg);
                    updateProgress({ phase: 'complete', message: errorMsg, success: false });
                    return null;
                } finally {
                    setIsGenerating(false);
                }
            },
            { feature: 'wp-sites', siteId: 'media' }
        );
    }, [trackAction]);

    /**
     * Generate featured image - tries stock first (free), then AI
     */
    const generateFeaturedImage = useCallback(async (topic: string): Promise<GeneratedMediaAsset | null> => {
        // Try stock first (free)
        let result = await searchStockImage(topic);

        // Fallback to AI if stock fails
        if (!result) {
            result = await generateAIImage(topic);
        }

        return result;
    }, [searchStockImage, generateAIImage]);

    /**
     * Upload generated image to WP Media Library
     */
    const uploadToMediaLibrary = useCallback(async (
        site: WPSite,
        image: GeneratedMediaAsset
    ): Promise<GeneratedMediaAsset | null> => {
        setIsGenerating(true);
        setError(null);

        return trackAction(
            `Uploading to ${site.domain} Media Library`,
            async (updateProgress) => {
                try {
                    updateProgress({ phase: 'starting', message: 'Downloading image...' });

                    // Fetch the image
                    const imageResponse = await fetch(image.url);
                    if (!imageResponse.ok) {
                        throw new Error('Failed to download image');
                    }

                    const imageBlob = await imageResponse.blob();
                    const imageBuffer = await imageBlob.arrayBuffer();

                    updateProgress({ phase: 'handler', message: 'Uploading to WordPress...' });

                    // Upload to WP
                    const { uploadMedia } = await import('../api/wordpressApi');
                    const uploadResult = await uploadMedia(site, {
                        file: new Uint8Array(imageBuffer),
                        filename: `featured-${Date.now()}.jpg`,
                        mimeType: 'image/jpeg',
                        alt_text: image.alt,
                    });

                    if (!uploadResult.success || !uploadResult.data) {
                        throw new Error(uploadResult.error || 'Upload failed');
                    }

                    const updatedAsset: GeneratedMediaAsset = {
                        ...image,
                        wpMediaId: uploadResult.data.id,
                        wpMediaUrl: uploadResult.data.source_url,
                    };

                    setGeneratedImage(updatedAsset);
                    updateProgress({ phase: 'complete', message: `Uploaded! ID: ${uploadResult.data.id}` });

                    return updatedAsset;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Upload failed';
                    setError(errorMsg);
                    updateProgress({ phase: 'complete', message: errorMsg, success: false });
                    return null;
                } finally {
                    setIsGenerating(false);
                }
            },
            { feature: 'wp-sites', siteId: site.id }
        );
    }, [trackAction]);

    const clearImage = useCallback(() => {
        setGeneratedImage(null);
        setError(null);
    }, []);

    return {
        isGenerating,
        generatedImage,
        error,
        generateFeaturedImage,
        uploadToMediaLibrary,
        searchStockImage,
        generateAIImage,
        clearImage,
    };
}
