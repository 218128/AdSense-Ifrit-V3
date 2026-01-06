/**
 * Image Generator Service
 * FSD: features/campaigns/lib/imageGenerator.ts
 * 
 * SoC: Separated from generators.ts
 * Responsibility: Generate and manage images for articles
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
 * @returns Generated images with potential failures tracked
 */
export async function generateImages(
    title: string,
    aiConfig: Campaign['aiConfig'],
    onProgress?: ImageProgressCallback
): Promise<GeneratedImages> {
    const images: GeneratedImages = {};
    const failures: Array<{ type: string; error: string }> = [];

    // Get placements from config (default: cover only)
    const placements = aiConfig.imagePlacements || ['cover'];
    const totalImages = (placements.includes('cover') ? 1 : 0) + (placements.includes('inline') ? 2 : 0);
    let currentImage = 0;

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

        // Generate up to 2 inline images
        for (let i = 0; i < 2; i++) {
            onProgress?.({ phase: 'inline', message: `Generating inline image ${i + 1}...`, current: currentImage, total: totalImages });
            const position = i === 0 ? 'after-intro' : 'after-h2';
            const result = await generateSingleImage(
                `${title} - illustration ${i + 1}`,
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
    // Get API key from client-side key manager
    let apiKey: string | undefined;
    try {
        const { getCapabilityKey } = await import('@/lib/ai/utils/getCapabilityKey');
        apiKey = await getCapabilityKey();
    } catch {
        // KeyManager not available
    }

    // Strategy: AI first (if preferred) or search first (free)
    const preferAI = aiConfig.imageProvider === 'gemini' || aiConfig.imageProvider === 'openrouter';
    const sources = preferAI ? ['ai', 'search'] : ['search', 'ai'];

    for (const source of sources) {
        try {
            const capability = source === 'ai' ? 'images' : 'search-images';
            const prompt = source === 'ai'
                ? buildImagePrompt(topic)
                : topic;  // search-images just needs the topic/keyword

            const response = await fetch(`/api/capabilities/${capability}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    preferredHandler: aiConfig.imageProvider
                        ? `${aiConfig.imageProvider}`
                        : undefined,
                    topic,
                    itemType: type,
                    context: apiKey ? { apiKey } : undefined,
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
// Parallel Image Generation (Enhancement)
// ============================================================================

/**
 * Generate all images in parallel with smart selection
 * Enhancement: Runs all sources at once, picks best result
 */
export async function generateImagesParallel(
    title: string,
    aiConfig: Campaign['aiConfig'],
    timeout: number = 15000
): Promise<GeneratedImages> {
    const placements = aiConfig.imagePlacements || ['cover'];
    const tasks: Array<Promise<{ type: string; result: ImageResult | null }>> = [];

    // Start all image generations in parallel
    if (placements.includes('cover')) {
        tasks.push(
            generateSingleImage(title, 'cover', aiConfig)
                .then(result => ({ type: 'cover', result }))
        );
    }

    if (placements.includes('inline')) {
        for (let i = 0; i < 2; i++) {
            tasks.push(
                generateSingleImage(`${title} - illustration ${i + 1}`, 'inline', aiConfig)
                    .then(result => ({ type: `inline-${i}`, result }))
            );
        }
    }

    // Race against timeout
    const results = await Promise.race([
        Promise.all(tasks),
        new Promise<typeof tasks extends Promise<infer T>[] ? T[] : never>((_, reject) =>
            setTimeout(() => reject(new Error('Image generation timeout')), timeout)
        ),
    ]).catch(() => []);

    // Assemble results
    const images: GeneratedImages = {};
    const inlineImages: InlineImageResult[] = [];

    for (const { type, result } of results) {
        if (!result) continue;

        if (type === 'cover') {
            images.cover = result;
        } else if (type.startsWith('inline-')) {
            const index = parseInt(type.split('-')[1], 10);
            const position = index === 0 ? 'after-intro' : 'after-h2';
            inlineImages.push({ ...result, position });
        }
    }

    if (inlineImages.length > 0) {
        images.inline = inlineImages;
    }

    return images;
}
