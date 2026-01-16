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
        // Get API key from context (must be passed from client via route)
        // SoC: Handlers receive keys via context, never access stores directly
        const apiKey = options.context?.unsplashKey as string;

        if (!apiKey) {
            return {
                success: false,
                error: 'Unsplash API key not provided. Ensure key is passed via context from client.',
                handlerUsed: 'unsplash',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Truncate long queries to improve search results (Unsplash fails on very specific queries)
        const truncatedPrompt = options.prompt.length > 50
            ? options.prompt.substring(0, 50).trim()
            : options.prompt;
        const query = encodeURIComponent(truncatedPrompt);
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
            width: number;
            height: number;
            alt_description?: string;
            description?: string;
            user: { name: string };
            links: { html: string };
        }) => ({
            id: photo.id,
            url: photo.urls.regular,
            thumbnailUrl: photo.urls.small,
            width: photo.width,
            height: photo.height,
            alt: photo.alt_description || photo.description || options.prompt,
            photographer: photo.user.name,
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
        // Get API key from context (must be passed from client via route)
        // SoC: Handlers receive keys via context, never access stores directly
        const apiKey = options.context?.pexelsKey as string;

        if (!apiKey) {
            return {
                success: false,
                error: 'Pexels API key not provided. Ensure key is passed via context from client.',
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
            width: number;
            height: number;
            src: { large: string; medium: string; small: string };
            alt?: string;
            photographer: string;
            url: string;
        }) => ({
            id: String(photo.id),
            url: photo.src.large,
            thumbnailUrl: photo.src.medium,
            width: photo.width,
            height: photo.height,
            alt: photo.alt || options.prompt,
            photographer: photo.photographer,
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
// Brave Search Handler (Direct API Call)
// ============================================================================

async function executeBraveSearch(options: ExecuteOptions): Promise<ExecuteResult> {
    const startTime = Date.now();

    // Get API key from context (must be passed from client via route)
    // SoC: Handlers receive keys via context, never access stores directly
    const apiKey = options.context?.braveApiKey as string;

    if (!apiKey) {
        return {
            success: false,
            error: 'Brave API key not provided. Ensure key is passed via context from client.',
            handlerUsed: 'brave-search',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };
    }

    try {
        const query = encodeURIComponent(options.prompt);
        // Brave Image Search API - per docs: https://api-dashboard.search.brave.com/app/documentation/image-search
        // Valid safesearch values: 'strict' (default) or 'off'
        const response = await fetch(
            `https://api.search.brave.com/res/v1/images/search?q=${query}&count=5&safesearch=strict`,
            {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            return {
                success: false,
                error: `Brave API error: ${response.status}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`,
                handlerUsed: 'brave-search',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return {
                success: false,
                error: `No images found for: ${options.prompt}`,
                handlerUsed: 'brave-search',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Map Brave API response to standard image format
        const images = data.results.map((img: {
            title?: string;
            url?: string;
            properties?: { url?: string; width?: number; height?: number };
            thumbnail?: { src?: string; width?: number; height?: number };
            source?: string;
        }, i: number) => ({
            id: `brave-${i}`,
            url: img.properties?.url || img.thumbnail?.src,
            thumbnailUrl: img.thumbnail?.src,
            width: img.properties?.width || img.thumbnail?.width,
            height: img.properties?.height || img.thumbnail?.height,
            alt: img.title || options.prompt,
            sourceUrl: img.url,
            source: 'brave-search',
        }));

        return {
            success: true,
            data: images,
            text: images[0]?.url,
            handlerUsed: 'brave-search',
            source: 'integration',
            latencyMs: Date.now() - startTime,
            metadata: { returned: images.length },
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
// Perplexity Handler (Direct API Call with Sonar model)
// ============================================================================

async function executePerplexity(options: ExecuteOptions): Promise<ExecuteResult> {
    const startTime = Date.now();

    // Get API key from context (must be passed from client via route)
    const apiKey = options.context?.perplexityApiKey as string;

    if (!apiKey) {
        return {
            success: false,
            error: 'Perplexity API key not provided. Ensure key is passed via context from client.',
            handlerUsed: 'perplexity-images',
            source: 'integration',
            latencyMs: Date.now() - startTime,
        };
    }

    try {
        // Per Perplexity docs: https://docs.perplexity.ai/guides/returning-images
        // Use return_images: true with sonar models to get native image URLs
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar',  // Sonar model supports return_images
                messages: [
                    {
                        role: 'user',
                        content: `Find high-quality images related to: "${options.prompt}"`,
                    },
                ],
                return_images: true,  // KEY: Request native image URLs
                // Optional domain filtering for stock sources
                image_domain_filter: options.context?.imageDomainFilter as string[] || undefined,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            return {
                success: false,
                error: `Perplexity API error: ${response.status}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`,
                handlerUsed: 'perplexity-images',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        const data = await response.json();

        // Extract images from native API response (per documentation)
        // The `images` field contains URLs when return_images=true
        const nativeImages = data.images || [];

        if (!nativeImages.length) {
            // Fallback: try extracting from text content if API didn't return images
            const content = data.choices?.[0]?.message?.content || '';
            const urlMatches = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi) || [];

            if (urlMatches.length > 0) {
                const images = urlMatches.slice(0, 5).map((url: string, i: number) => ({
                    id: `perplexity-${i}`,
                    url: url.trim(),
                    alt: options.prompt,
                    source: 'perplexity',
                }));

                return {
                    success: true,
                    data: images,
                    text: images[0]?.url,
                    handlerUsed: 'perplexity-images',
                    source: 'integration',
                    latencyMs: Date.now() - startTime,
                    metadata: { returned: images.length, method: 'text-extraction' },
                };
            }

            return {
                success: false,
                error: 'No image URLs found in Perplexity response',
                handlerUsed: 'perplexity-images',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Map native images array to standard format
        const images = nativeImages.slice(0, 5).map((url: string, i: number) => ({
            id: `perplexity-${i}`,
            url: typeof url === 'string' ? url : (url as { url?: string }).url || '',
            alt: options.prompt,
            source: 'perplexity',
        })).filter((img: { url: string }) => img.url);

        return {
            success: true,
            data: images,
            text: images[0]?.url,
            handlerUsed: 'perplexity-images',
            source: 'integration',
            latencyMs: Date.now() - startTime,
            metadata: { returned: images.length, method: 'native-api' },
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
        name: 'Brave Search Images',
        source: 'integration',
        capabilities: ['search-images'],
        priority: 70,  // Lower - depends on research capability
        isAvailable: true,
        requiresApiKey: true,  // Requires Brave API key via research capability
        apiKeySettingName: 'braveApiKey',  // Uses get key for research
        execute: executeBraveSearch,
    },
    {
        id: 'perplexity-images',
        name: 'Perplexity Images',
        source: 'integration',
        capabilities: ['search-images'],
        priority: 75,
        isAvailable: true,
        requiresApiKey: true,  // Requires Perplexity API key via research capability
        apiKeySettingName: 'perplexityKey',  // Uses perplexity provider key
        execute: executePerplexity,
    },
];
