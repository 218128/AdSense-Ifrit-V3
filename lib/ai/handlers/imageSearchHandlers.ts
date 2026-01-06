/**
 * Image Search Handlers
 * FSD: lib/ai/handlers/imageSearchHandlers.ts
 * 
 * Handlers for the `search-images` capability.
 * Sources: Unsplash, Pexels, Brave Search, Perplexity
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Unsplash Handler
// ============================================================================

async function executeUnsplash(options: ExecuteOptions): Promise<ExecuteResult> {
    const startTime = Date.now();

    try {
        // Get API key from settings via context or dynamic import
        let apiKey = options.context?.unsplashKey as string;

        if (!apiKey) {
            // Try to get from settings store (client-side only)
            if (typeof window !== 'undefined') {
                const { useSettingsStore } = await import('@/stores/settingsStore');
                apiKey = useSettingsStore.getState().integrations.unsplashKey;
            }
        }

        if (!apiKey) {
            return {
                success: false,
                error: 'Unsplash API key not configured. Add it in Settings → Integrations.',
                handlerUsed: 'unsplash',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const query = encodeURIComponent(options.prompt);
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${query}&per_page=5&orientation=landscape`,
            {
                headers: {
                    'Authorization': `Client-ID ${apiKey}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                error: `Unsplash API error: ${response.status} - ${error}`,
                handlerUsed: 'unsplash',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return {
                success: false,
                error: `No images found for: ${options.prompt}`,
                handlerUsed: 'unsplash',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Return structured data with multiple results
        const images = data.results.map((photo: {
            id: string;
            urls: { regular: string; small: string; thumb: string };
            alt_description?: string;
            description?: string;
            user: { name: string };
            links: { html: string };
        }) => ({
            id: photo.id,
            url: photo.urls.regular,
            thumbnailUrl: photo.urls.small,
            alt: photo.alt_description || photo.description || options.prompt,
            attribution: `Photo by ${photo.user.name} on Unsplash`,
            sourceUrl: photo.links.html,
            source: 'unsplash',
        }));

        return {
            success: true,
            data: images,
            text: images[0]?.url,  // First image URL as text for simple usage
            handlerUsed: 'unsplash',
            source: 'integration',
            latencyMs: Date.now() - startTime,
            metadata: { totalResults: data.total, returned: images.length },
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unsplash search failed',
            handlerUsed: 'unsplash',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };
    }
}

// ============================================================================
// Pexels Handler
// ============================================================================

async function executePexels(options: ExecuteOptions): Promise<ExecuteResult> {
    const startTime = Date.now();

    try {
        let apiKey = options.context?.pexelsKey as string;

        if (!apiKey) {
            if (typeof window !== 'undefined') {
                const { useSettingsStore } = await import('@/stores/settingsStore');
                apiKey = useSettingsStore.getState().integrations.pexelsKey;
            }
        }

        if (!apiKey) {
            return {
                success: false,
                error: 'Pexels API key not configured. Add it in Settings → Integrations.',
                handlerUsed: 'pexels',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const query = encodeURIComponent(options.prompt);
        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`,
            {
                headers: {
                    'Authorization': apiKey,
                },
            }
        );

        if (!response.ok) {
            return {
                success: false,
                error: `Pexels API error: ${response.status}`,
                handlerUsed: 'pexels',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const data = await response.json();

        if (!data.photos || data.photos.length === 0) {
            return {
                success: false,
                error: `No images found for: ${options.prompt}`,
                handlerUsed: 'pexels',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const images = data.photos.map((photo: {
            id: number;
            src: { large: string; medium: string; small: string };
            alt?: string;
            photographer: string;
            url: string;
        }) => ({
            id: String(photo.id),
            url: photo.src.large,
            thumbnailUrl: photo.src.medium,
            alt: photo.alt || options.prompt,
            attribution: `Photo by ${photo.photographer} on Pexels`,
            sourceUrl: photo.url,
            source: 'pexels',
        }));

        return {
            success: true,
            data: images,
            text: images[0]?.url,
            handlerUsed: 'pexels',
            source: 'integration',
            latencyMs: Date.now() - startTime,
            metadata: { totalResults: data.total_results, returned: images.length },
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Pexels search failed',
            handlerUsed: 'pexels',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };
    }
}

// ============================================================================
// Brave Search Handler (Free Commercial Images)
// ============================================================================

async function executeBraveSearch(options: ExecuteOptions): Promise<ExecuteResult> {
    const startTime = Date.now();

    try {
        // Use research capability to find free commercial images
        const response = await fetch('/api/capabilities/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Find 3 free commercially usable image URLs for: "${options.prompt}". 
                         Search specifically on Unsplash, Pexels, Pixabay, or other free stock sources.
                         Return a JSON array with objects containing: url, alt, source
                         Example: [{"url": "https://...", "alt": "description", "source": "pixabay"}]`,
                context: options.context,
            }),
        });

        if (!response.ok) {
            return {
                success: false,
                error: 'Brave search API failed',
                handlerUsed: 'brave-search',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const data = await response.json();

        if (!data.success || !data.text) {
            return {
                success: false,
                error: data.error || 'No results from Brave search',
                handlerUsed: 'brave-search',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Try to parse JSON from response
        try {
            const jsonMatch = data.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const images = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    data: images,
                    text: images[0]?.url,
                    handlerUsed: 'brave-search',
                    source: 'integration',
                    latencyMs: Date.now() - startTime,
                };
            }
        } catch {
            // Fall back to extracting URLs
        }

        // Extract URLs from text response
        const urlMatches = data.text.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/gi) || [];
        const images = urlMatches.slice(0, 3).map((url: string, i: number) => ({
            id: `brave-${i}`,
            url,
            alt: options.prompt,
            source: 'brave-search',
        }));

        return {
            success: images.length > 0,
            data: images,
            text: images[0]?.url,
            error: images.length === 0 ? 'No image URLs found' : undefined,
            handlerUsed: 'brave-search',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Brave search failed',
            handlerUsed: 'brave-search',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };
    }
}

// ============================================================================
// Perplexity Handler (AI-powered image search)
// ============================================================================

async function executePerplexity(options: ExecuteOptions): Promise<ExecuteResult> {
    const startTime = Date.now();

    // Perplexity uses the research capability with specific handler
    try {
        const response = await fetch('/api/capabilities/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Find direct URLs to free, commercially usable images for: "${options.prompt}".
                         Only return image URLs from legitimate free stock photo sites.
                         Format: one URL per line, no explanations.`,
                preferredHandler: 'perplexity',
                context: options.context,
            }),
        });

        if (!response.ok) {
            return {
                success: false,
                error: 'Perplexity API failed',
                handlerUsed: 'perplexity-images',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const data = await response.json();

        if (!data.success) {
            return {
                success: false,
                error: data.error || 'Perplexity search failed',
                handlerUsed: 'perplexity-images',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Extract URLs from response
        const urlMatches = data.text?.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/gi) || [];
        const images = urlMatches.slice(0, 3).map((url: string, i: number) => ({
            id: `perplexity-${i}`,
            url,
            alt: options.prompt,
            source: 'perplexity',
        }));

        return {
            success: images.length > 0,
            data: images,
            text: images[0]?.url,
            error: images.length === 0 ? 'No image URLs found' : undefined,
            handlerUsed: 'perplexity-images',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Perplexity search failed',
            handlerUsed: 'perplexity-images',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };
    }
}

// ============================================================================
// Export Handlers
// ============================================================================

export const imageSearchHandlers: CapabilityHandler[] = [
    {
        id: 'unsplash',
        name: 'Unsplash',
        source: 'integration',
        capabilities: ['search-images'],
        priority: 90,  // High priority - reliable free stock
        isAvailable: true,
        requiresApiKey: true,
        apiKeySettingName: 'unsplashKey',
        execute: executeUnsplash,
    },
    {
        id: 'pexels',
        name: 'Pexels',
        source: 'integration',
        capabilities: ['search-images'],
        priority: 85,
        isAvailable: true,
        requiresApiKey: true,
        apiKeySettingName: 'pexelsKey',
        execute: executePexels,
    },
    {
        id: 'brave-search',
        name: 'Brave Search',
        source: 'integration',
        capabilities: ['search-images'],
        priority: 70,  // Lower - uses research capability
        isAvailable: true,
        requiresApiKey: false,  // Uses research handler's key
        execute: executeBraveSearch,
    },
    {
        id: 'perplexity-images',
        name: 'Perplexity Images',
        source: 'integration',
        capabilities: ['search-images'],
        priority: 75,
        isAvailable: true,
        requiresApiKey: false,  // Uses research handler's key
        execute: executePerplexity,
    },
];
