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
            'content',
            async (tracker) => {
                try {
                    tracker.step('Searching Unsplash, Pexels...');

                    // Get integration keys from client-side
                    // SoC: Hook retrieves keys, passes to route, route passes to handlers
                    let integrationKeys: Record<string, string> = {};
                    try {
                        const { getAllIntegrationKeys } = await import('@/lib/ai/utils/getCapabilityKey');
                        integrationKeys = await getAllIntegrationKeys();
                    } catch {
                        // KeyManager not available
                    }

                    const response = await fetch('/api/capabilities/search-images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: query,
                            topic: query,
                            itemType: 'featured',
                            // Pass integration keys at top level for route to extract
                            ...integrationKeys,
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
                    tracker.complete(`Found via ${data.handlerUsed}`);

                    return asset;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Search failed';
                    setError(errorMsg);
                    tracker.fail(errorMsg);
                    return null;
                } finally {
                    setIsGenerating(false);
                }
            }
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
            'content',
            async (tracker) => {
                try {
                    tracker.step('Generating with AI...');

                    // Get provider keys from client-side
                    // SoC: Hook retrieves keys, passes to route
                    let providerKeys: Record<string, string> = {};
                    try {
                        const { getAllProviderKeys } = await import('@/lib/ai/utils/getCapabilityKey');
                        providerKeys = await getAllProviderKeys();
                    } catch {
                        // KeyManager not available
                    }

                    const response = await fetch('/api/capabilities/images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: `Professional featured image for: ${prompt}. Modern, clean design suitable for blog header.`,
                            topic: prompt,
                            itemType: 'featured',
                            // Provider keys in context for AI handlers
                            context: Object.keys(providerKeys).length > 0 ? { providerKeys } : undefined,
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
                    tracker.complete(`Generated via ${data.handlerUsed}`);

                    return asset;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Generation failed';
                    setError(errorMsg);
                    tracker.fail(errorMsg);
                    return null;
                } finally {
                    setIsGenerating(false);
                }
            }
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
            `Uploading to ${site.domain ?? site.url} Media Library`,
            'wordpress',
            async (tracker) => {
                try {
                    tracker.step('Downloading image...');

                    // Fetch the image
                    const imageResponse = await fetch(image.url);
                    if (!imageResponse.ok) {
                        throw new Error('Failed to download image');
                    }

                    const imageBlob = await imageResponse.blob();

                    tracker.step('Uploading to WordPress...');

                    // Upload to WP
                    const { uploadMedia } = await import('../api/wordpressApi');
                    const uploadResult = await uploadMedia(site, {
                        file: imageBlob,  // Use Blob directly
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
                    tracker.complete(`Uploaded! ID: ${uploadResult.data.id}`);

                    return updatedAsset;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Upload failed';
                    setError(errorMsg);
                    tracker.fail(errorMsg);
                    return null;
                } finally {
                    setIsGenerating(false);
                }
            }
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
