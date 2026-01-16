/**
 * Image Generator Service
 * FSD: features/campaigns/lib/imageGenerator.ts
 * 
 * SoC: Separated from generators.ts
 * Responsibility: Generate and manage images for articles
 * 
 * @deprecated For new code, use MediaAssetService from '@/lib/media' instead.
 * This file is maintained for backward compatibility with existing campaign workflows.
 * Consider migrating to MediaAssetService for:
 * - Template-based image slots
 * - Aggregated search with scoring
 * - Full SEO validation
 */

import type { Campaign, PipelineContext } from '../model/types';
import { buildImagePrompt } from './prompts';

// ============================================================================
// Types
// ============================================================================

export type ImageType = 'cover' | 'inline' | 'og-image' | 'twitter-card';

export interface ImageResult {
    url: string;
    alt: string;
}

export interface InlineImageResult extends ImageResult {
    position: 'after-intro' | 'after-h2' | 'before-conclusion' | 'inline';
}

export interface GeneratedImages {
    cover?: ImageResult;
    inline?: InlineImageResult[];
    _failures?: Array<{ type: string; error: string }>;
}

export interface ImageProgressStatus {
    phase: 'starting' | 'cover' | 'inline' | 'complete';
    message: string;
    current?: number;
    total?: number;
}

export type ImageProgressCallback = (status: ImageProgressStatus) => void;

// ============================================================================
// Image Generation - Main Entry
// ============================================================================

/**
 * Generate images using capabilities with fallback chain:
 * - AI generation via 'images' capability
 * - Stock search via 'search-images' capability (fallback)
 * 
 * @param title - The article title for image generation
 * @param aiConfig - Campaign AI configuration
 * @param onProgress - Optional progress callback for SSE tracking
 * @param content - Optional HTML content to extract section titles for inline images
 * @returns Generated images with potential failures tracked
 */
export async function generateImages(
    title: string,
    aiConfig: Campaign['aiConfig'],
    onProgress?: ImageProgressCallback,
    content?: string
): Promise<GeneratedImages> {
    const images: GeneratedImages = {};
    const failures: Array<{ type: string; error: string }> = [];

    // Get placements from config (default: cover only)
    const placements = aiConfig.imagePlacements || ['cover'];
    const inlineCount = Math.min(aiConfig.inlineImageCount ?? 2, 5);
    const totalImages = (placements.includes('cover') ? 1 : 0) + (placements.includes('inline') ? inlineCount : 0);
    let currentImage = 0;

    // Extract H2 section titles from content for section-relevant inline images
    const sectionTitles: string[] = [];
    if (content) {
        const h2Matches = [...content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)];
        sectionTitles.push(...h2Matches.map(m => m[1].trim()));
    }

    onProgress?.({ phase: 'starting', message: `Generating ${totalImages} images...`, current: 0, total: totalImages });

    // Generate cover image
    if (placements.includes('cover')) {
        onProgress?.({ phase: 'cover', message: 'Generating cover image...', current: currentImage, total: totalImages });
        const result = await generateSingleImage(title, 'cover', aiConfig);
        currentImage++;
        if (result) {
            images.cover = result;
            onProgress?.({ phase: 'cover', message: 'Cover image ready', current: currentImage, total: totalImages });
        } else {
            failures.push({ type: 'cover', error: 'All image sources failed' });
            onProgress?.({ phase: 'cover', message: '⚠️ Cover image failed - check API keys', current: currentImage, total: totalImages });
        }
    }

    // Generate inline images if configured
    if (placements.includes('inline')) {
        const inlineImages: InlineImageResult[] = [];

        // Use configurable inline image count (default: 2, max: 5)
        const positions: Array<'after-intro' | 'after-h2' | 'before-conclusion' | 'inline'> = [
            'after-intro', 'after-h2', 'after-h2', 'after-h2', 'before-conclusion'
        ];

        // Calculate which section titles to use (skip first few, distribute evenly)
        const step = sectionTitles.length > inlineCount
            ? Math.floor(sectionTitles.length / inlineCount)
            : 1;

        for (let i = 0; i < inlineCount; i++) {
            // Use section title if available, otherwise fall back to generic
            const sectionIdx = Math.min(1 + (i * step), sectionTitles.length - 1);
            const sectionTitle = sectionTitles[sectionIdx] || null;
            const searchQuery = sectionTitle
                ? sectionTitle  // Use section title for relevant images
                : `${title} - illustration ${i + 1}`;  // Fallback to generic

            onProgress?.({
                phase: 'inline',
                message: `Generating inline image ${i + 1}${sectionTitle ? ` for "${sectionTitle.slice(0, 30)}..."` : ''}...`,
                current: currentImage,
                total: totalImages
            });

            const position = positions[i] || 'inline';
            const result = await generateSingleImage(
                searchQuery,
                'inline',
                aiConfig
            );
            currentImage++;
            if (result) {
                inlineImages.push({ ...result, position });
            } else {
                failures.push({ type: `inline-${i + 1}`, error: 'All image sources failed' });
                onProgress?.({ phase: 'inline', message: `⚠️ Inline image ${i + 1} failed`, current: currentImage, total: totalImages });
            }
        }

        if (inlineImages.length > 0) {
            images.inline = inlineImages;
        }
    }

    // Report summary with failures
    const successCount = (images.cover ? 1 : 0) + (images.inline?.length || 0);
    const failCount = failures.length;
    const summary = failCount > 0
        ? `⚠️ ${successCount} generated, ${failCount} failed`
        : `✅ ${successCount} images ready`;

    onProgress?.({ phase: 'complete', message: summary, current: totalImages, total: totalImages });

    // Attach failures to result for tracking
    if (failures.length > 0) {
        images._failures = failures;
    }

    return images;
}

// ============================================================================
// Single Image Generation
// ============================================================================

/**
 * Generate a single image using AI first, then stock search fallback
 */
export async function generateSingleImage(
    topic: string,
    type: ImageType,
    aiConfig: Campaign['aiConfig']
): Promise<ImageResult | null> {
    // Get ALL provider keys AND integration keys from client-side
    let providerKeys: Record<string, string> = {};
    let integrationKeys: Record<string, string> = {};
    try {
        const { getAllProviderKeys, getAllIntegrationKeys } = await import('@/lib/ai/utils/getCapabilityKey');
        providerKeys = await getAllProviderKeys();
        integrationKeys = await getAllIntegrationKeys();
    } catch {
        // KeyManager not available
    }

    // Strategy: Use mediaSourcePreference from config (default: 'both')
    const pref = aiConfig.mediaSourcePreference || 'both';
    let sources: string[];
    if (pref === 'ai') {
        sources = ['ai'];  // AI only
    } else if (pref === 'search') {
        sources = ['search'];  // Search only
    } else {
        // 'both' - determine order based on imageProvider
        const preferAI = aiConfig.imageProvider === 'gemini' || aiConfig.imageProvider === 'dalle';
        sources = preferAI ? ['ai', 'search'] : ['search', 'ai'];
    }

    for (const source of sources) {
        try {
            const capability = source === 'ai' ? 'images' : 'search-images';
            const prompt = source === 'ai'
                ? buildImagePrompt(topic)
                : topic;  // search-images just needs the topic/keyword

            // Get handler-specific model from settings (client-side)
            // This fixes the model passthrough issue - server can't access localStorage
            let handlerModel: string | undefined;
            if (source === 'ai' && aiConfig.imageProvider) {
                try {
                    const { useSettingsStore } = await import('@/stores/settingsStore');
                    // Use composite key format: capabilityId:providerId
                    const handlerModelKey = `images:${aiConfig.imageProvider}`;
                    handlerModel = useSettingsStore.getState().getHandlerModel(
                        handlerModelKey,
                        aiConfig.imageProvider as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity' | 'vercel'
                    );
                } catch {
                    // settingsStore not available
                }
            }

            // Pass integration keys at top level (route merges into context)
            // SoC: Infrastructure code retrieves keys, passes to route, route passes to handlers

            const response = await fetch(`/api/capabilities/${capability}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: handlerModel,  // Pass handler-specific model from settings
                    preferredHandler: aiConfig.imageProvider
                        ? `${aiConfig.imageProvider}`
                        : undefined,
                    topic,
                    itemType: type,
                    // Enable aggregated search with scoring when configured (default: true)
                    aggregated: capability === 'search-images' && (aiConfig.enableImageScoring !== false),
                    // Integration keys at top level for route to extract
                    ...integrationKeys,
                    // Provider keys stay in context for AI handlers
                    context: Object.keys(providerKeys).length > 0 ? { providerKeys } : undefined,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.text) {
                    console.log(`[ImageGenerator] ${type} via ${data.handlerUsed} in ${data.latencyMs}ms`);
                    return { url: data.text, alt: topic };
                }
            }
        } catch (error) {
            console.warn(`[ImageGenerator] ${source} failed for ${type}:`, error);
        }
    }

    console.warn(`[ImageGenerator] All sources failed for ${type}: ${topic}`);
    return null;
}

// ============================================================================
// Enhanced Parallel Image Generation (NEW ARCHITECTURE)
// ============================================================================

/**
 * Image result with source metadata for persistence
 */
export interface EnhancedImageResult {
    id: string;
    url: string;
    alt: string;
    source: 'ai' | 'unsplash' | 'pexels' | 'brave' | 'serper' | 'perplexity';
    score: number;
    width?: number;
    height?: number;
    photographer?: string;
    photographerUrl?: string;
    license?: string;
}

/**
 * Result from enhanced image generation
 */
export interface EnhancedImagesResult {
    /** Selected cover for immediate use */
    cover?: ImageResult;
    /** Selected inline images for immediate use */
    inline?: InlineImageResult[];
    /** ALL collected images (both AI and search) for persistence */
    allAssets: EnhancedImageResult[];
    /** Timing and source information */
    metadata: {
        aiSuccess: boolean;
        searchSuccess: boolean;
        totalCollected: number;
        sourceCounts: Record<string, number>;
        latencyMs: number;
    };
}

/**
 * Enhanced image generation - runs BOTH AI and Search in PARALLEL
 * 
 * This is the NEW recommended approach that:
 * 1. Runs AI generation and aggregated stock search simultaneously
 * 2. Collects ALL results (not just first success)
 * 3. Scores and ranks all images
 * 4. Returns best images for immediate use
 * 5. Returns all images for MediaAssetLibrary persistence
 * 
 * @param title - Article title for image prompts
 * @param aiConfig - Campaign AI configuration
 * @param onProgress - Optional progress callback
 * @param content - Optional HTML content for section-based inline image queries
 * @returns Enhanced result with selections AND full collection
 */
export async function generateImagesEnhanced(
    title: string,
    aiConfig: Campaign['aiConfig'],
    onProgress?: ImageProgressCallback,
    content?: string
): Promise<EnhancedImagesResult> {
    const startTime = Date.now();
    const allAssets: EnhancedImageResult[] = [];
    const sourceCounts: Record<string, number> = {};
    let aiSuccess = false;
    let searchSuccess = false;

    // Extract H2 section titles from content for section-relevant searches
    const sectionTitles: string[] = [];
    if (content) {
        const h2Matches = [...content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)];
        sectionTitles.push(...h2Matches.map(m => m[1].trim()));
    }
    const hasContentSections = sectionTitles.length > 0;

    onProgress?.({ phase: 'starting', message: 'Collecting images from AI + Stock...', current: 0, total: 2 });

    // Get ALL provider keys AND integration keys from client-side
    let providerKeys: Record<string, string> = {};
    let integrationKeys: Record<string, string> = {};
    try {
        const { getAllProviderKeys, getAllIntegrationKeys } = await import('@/lib/ai/utils/getCapabilityKey');
        providerKeys = await getAllProviderKeys();
        integrationKeys = await getAllIntegrationKeys();
    } catch {
        // KeyManager not available
    }

    // Determine which sources to run based on preference
    const pref = aiConfig.mediaSourcePreference || 'both';
    const runAI = pref === 'ai' || pref === 'both';
    const runSearch = pref === 'search' || pref === 'both';

    // Run AI and Search in PARALLEL
    const tasks: Array<Promise<void>> = [];

    // AI Generation Task
    if (runAI) {
        tasks.push((async () => {
            try {
                onProgress?.({ phase: 'cover', message: 'AI generating images...', current: 0, total: 2 });

                const response = await fetch('/api/capabilities/images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: buildImagePrompt(title),
                        preferredHandler: aiConfig.imageProvider || 'gemini',
                        topic: title,
                        itemType: 'cover',
                        context: Object.keys(providerKeys).length > 0 ? { providerKeys } : undefined,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.text) {
                        aiSuccess = true;
                        const asset: EnhancedImageResult = {
                            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            url: data.text,
                            alt: title,
                            source: 'ai',
                            score: 85, // AI images get high base score for uniqueness
                        };
                        allAssets.push(asset);
                        sourceCounts['ai'] = (sourceCounts['ai'] || 0) + 1;
                        console.log(`[ImageGenerator] AI image collected: ${data.handlerUsed}`);
                    }
                }
            } catch (error) {
                console.warn('[ImageGenerator] AI generation failed:', error);
            }
        })());
    }

    // Aggregated Stock Search Task
    if (runSearch) {
        tasks.push((async () => {
            try {
                onProgress?.({ phase: 'inline', message: 'Searching stock sources...', current: 1, total: 2 });

                // Build search queries: main title + section titles for relevance
                const searchQueries = [title];
                if (hasContentSections) {
                    // Add up to 3 section titles for section-relevant images
                    const sectionSampleSize = Math.min(3, sectionTitles.length);
                    const step = Math.floor(sectionTitles.length / sectionSampleSize);
                    for (let i = 0; i < sectionSampleSize; i++) {
                        const idx = Math.min(1 + (i * step), sectionTitles.length - 1);
                        searchQueries.push(sectionTitles[idx]);
                    }
                }

                // Search for each query
                for (const query of searchQueries) {
                    const response = await fetch('/api/capabilities/search-images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: query,
                            topic: query,
                            aggregated: true, // Run ALL handlers in parallel
                            ...integrationKeys,
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            searchSuccess = true;
                            const images = Array.isArray(data.data) ? data.data : [data.data];

                            for (const img of images) {
                                const source = detectSource(img);
                                const asset: EnhancedImageResult = {
                                    id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                    url: typeof img === 'string' ? img : img.url || img.src,
                                    // Use the query as alt for better section relevance
                                    alt: typeof img === 'object' ? (img.alt || img.description || query) : query,
                                    source,
                                    score: scoreImage(img, query),
                                    width: typeof img === 'object' ? img.width : undefined,
                                    height: typeof img === 'object' ? img.height : undefined,
                                    photographer: typeof img === 'object' ? img.photographer : undefined,
                                    photographerUrl: typeof img === 'object' ? img.photographerUrl : undefined,
                                };
                                allAssets.push(asset);
                                sourceCounts[source] = (sourceCounts[source] || 0) + 1;
                            }
                            console.log(`[ImageGenerator] Stock search "${query.slice(0, 30)}..." collected ${images.length} images`);
                        }
                    }
                }
            } catch (error) {
                console.warn('[ImageGenerator] Stock search failed:', error);
            }
        })());
    }

    // Wait for all tasks
    await Promise.allSettled(tasks);

    // Sort by score (highest first)
    allAssets.sort((a, b) => b.score - a.score);

    // Select best images for immediate use
    const placements = aiConfig.imagePlacements || ['cover'];
    const inlineCount = Math.min(aiConfig.inlineImageCount ?? 2, 5);

    let cover: ImageResult | undefined;
    const inline: InlineImageResult[] = [];
    const positions: Array<'after-intro' | 'after-h2' | 'before-conclusion' | 'inline'> = [
        'after-intro', 'after-h2', 'before-conclusion', 'inline', 'inline'
    ];

    if (placements.includes('cover') && allAssets.length > 0) {
        const best = allAssets[0];
        cover = { url: best.url, alt: best.alt };
    }

    if (placements.includes('inline')) {
        const startIdx = cover ? 1 : 0;
        for (let i = 0; i < inlineCount && (startIdx + i) < allAssets.length; i++) {
            const asset = allAssets[startIdx + i];
            inline.push({
                url: asset.url,
                alt: asset.alt,
                position: positions[i] || 'inline',
            });
        }
    }

    const latencyMs = Date.now() - startTime;

    onProgress?.({
        phase: 'complete',
        message: `✅ Collected ${allAssets.length} images from ${Object.keys(sourceCounts).length} sources`,
        current: 2,
        total: 2,
    });

    console.log(`[ImageGenerator] Enhanced complete: ${allAssets.length} total, AI=${aiSuccess}, Search=${searchSuccess}, ${latencyMs}ms`);

    return {
        cover,
        inline: inline.length > 0 ? inline : undefined,
        allAssets,
        metadata: {
            aiSuccess,
            searchSuccess,
            totalCollected: allAssets.length,
            sourceCounts,
            latencyMs,
        },
    };
}

/**
 * Detect source from image data
 */
function detectSource(img: unknown): EnhancedImageResult['source'] {
    if (typeof img !== 'object' || !img) return 'ai';
    const obj = img as Record<string, unknown>;

    if (obj.source) return obj.source as EnhancedImageResult['source'];
    if (typeof obj.url === 'string') {
        const url = obj.url.toLowerCase();
        if (url.includes('unsplash')) return 'unsplash';
        if (url.includes('pexels')) return 'pexels';
        if (url.includes('brave')) return 'brave';
        if (url.includes('serper')) return 'serper';
    }
    return 'perplexity'; // Default for ambiguous sources
}

/**
 * Score an image for ranking
 * Higher score = better match for the topic
 */
function scoreImage(img: unknown, topic: string): number {
    let score = 50; // Base score

    if (typeof img !== 'object' || !img) return score;
    const obj = img as Record<string, unknown>;

    // Higher resolution = higher score
    if (typeof obj.width === 'number' && obj.width >= 1200) score += 15;
    if (typeof obj.width === 'number' && obj.width >= 1920) score += 10;

    // Alt text / description match
    const alt = String(obj.alt || obj.description || '').toLowerCase();
    const topicWords = topic.toLowerCase().split(/\s+/);
    const matches = topicWords.filter(word => alt.includes(word)).length;
    score += matches * 5;

    // Photographer credit (higher quality sources)
    if (obj.photographer) score += 5;

    // Cap at 100
    return Math.min(score, 100);
}

