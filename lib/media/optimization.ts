/**
 * Image Optimization Utilities
 * FSD: lib/media/optimization.ts
 * 
 * Consolidated from features/campaigns/lib/imageOptimization.ts
 * 
 * Functions:
 * - Alt text generation (sync and AI-powered)
 * - Image placement strategy
 * - Content image injection
 */

// ============================================================================
// Types
// ============================================================================

export interface ImagePlacement {
    position: 'after-intro' | 'after-h2' | 'before-conclusion' | 'inline';
    prompt: string;
    altText: string;
    index?: number; // For after-h2, which H2
}

export interface GeneratedImage {
    url: string;
    altText: string;
    caption?: string;
    placement: ImagePlacement['position'];
}

export interface ImageInjectionResult {
    content: string;
    imagesAdded: number;
    placements: ImagePlacement[];
}

// ============================================================================
// Alt Text Generation
// ============================================================================

/**
 * Generate SEO-friendly alt text from context
 */
export function generateAltText(topic: string, context: string): string {
    // Extract key terms
    const words = context
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3);

    // Build descriptive alt text
    const uniqueWords = [...new Set(words)].slice(0, 5);
    const description = uniqueWords.length > 0
        ? uniqueWords.join(' ')
        : topic;

    return `${topic} - ${description}`.slice(0, 125);
}

/**
 * Generate alt text using AI
 * Uses unified AIClient pattern
 */
export async function generateAltTextAI(
    topic: string,
    imageContext: string,
    _provider: string = 'gemini' // Kept for backward compat
): Promise<string> {
    try {
        const { ai } = await import('@/lib/ai/client');

        const result = await ai.generate(
            `Generate a concise, SEO-friendly alt text (max 125 chars) for an image about "${topic}". Context: ${imageContext}. Return only the alt text, no quotes.`,
            { maxTokens: 50 }
        );

        if (!result.success || !result.text) {
            return generateAltText(topic, imageContext);
        }

        return result.text.slice(0, 125);
    } catch {
        return generateAltText(topic, imageContext);
    }
}

// ============================================================================
// Image Placement Strategy
// ============================================================================

/**
 * Determine optimal image placements in content
 */
export function determineImagePlacements(
    content: string,
    topic: string,
    maxImages: number = 3
): ImagePlacement[] {
    const placements: ImagePlacement[] = [];
    const h2Matches = [...content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)];

    // After intro paragraph
    if (maxImages >= 1) {
        const introEnd = content.indexOf('</p>');
        if (introEnd > 100) {
            placements.push({
                position: 'after-intro',
                prompt: `Visual representation of ${topic}`,
                altText: generateAltText(topic, 'introduction overview'),
            });
        }
    }

    // After H2 headings (skip first, get 2nd and 3rd)
    const h2sToImage = h2Matches.slice(1, Math.min(h2Matches.length, maxImages));
    h2sToImage.forEach((match, idx) => {
        const sectionTitle = match[1];
        placements.push({
            position: 'after-h2',
            prompt: `Illustration for ${sectionTitle}`,
            altText: generateAltText(topic, sectionTitle),
            index: idx + 1,
        });
    });

    return placements.slice(0, maxImages);
}

/**
 * Inject images into content at determined positions
 * Distributes images EVENLY across H2 sections when placement is 'after-h2'
 */
export function injectImages(
    content: string,
    images: GeneratedImage[]
): ImageInjectionResult {
    let modifiedContent = content;
    let imagesAdded = 0;
    const placements: ImagePlacement[] = [];

    // Count total H2s for even distribution
    const h2Matches = [...content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)];
    const totalH2s = h2Matches.length;

    // Track which H2 index we're placing images at
    // Filter to 'after-h2' images to calculate even distribution
    const h2Images = images.filter(img => img.placement === 'after-h2');
    const step = totalH2s > 0 && h2Images.length > 0
        ? Math.floor(totalH2s / h2Images.length)
        : 1;

    let h2ImageIndex = 0;

    for (const image of images) {
        const imgHtml = `<figure class="wp-block-image">
<img src="${image.url}" alt="${image.altText}" loading="lazy" />
${image.caption ? `<figcaption>${image.caption}</figcaption>` : ''}
</figure>`;

        switch (image.placement) {
            case 'after-intro': {
                const introEnd = modifiedContent.indexOf('</p>');
                if (introEnd !== -1) {
                    modifiedContent =
                        modifiedContent.slice(0, introEnd + 4) +
                        '\n\n' + imgHtml + '\n\n' +
                        modifiedContent.slice(introEnd + 4);
                    imagesAdded++;
                }
                break;
            }
            case 'after-h2': {
                // EVEN DISTRIBUTION: Place at calculated H2 index
                const targetH2Index = Math.min(1 + (h2ImageIndex * step), totalH2s - 1);
                const h2Regex = /<\/h2>/gi;
                let match;
                let count = 0;

                // Reset regex for each image
                h2Regex.lastIndex = 0;

                while ((match = h2Regex.exec(modifiedContent)) !== null) {
                    if (count === targetH2Index) {
                        const insertPos = match.index + match[0].length;
                        modifiedContent =
                            modifiedContent.slice(0, insertPos) +
                            '\n\n' + imgHtml + '\n\n' +
                            modifiedContent.slice(insertPos);
                        imagesAdded++;
                        h2ImageIndex++;
                        break;
                    }
                    count++;
                }
                break;
            }
            case 'before-conclusion': {
                const lastH2 = modifiedContent.lastIndexOf('<h2');
                if (lastH2 !== -1) {
                    modifiedContent =
                        modifiedContent.slice(0, lastH2) +
                        '\n\n' + imgHtml + '\n\n' +
                        modifiedContent.slice(lastH2);
                    imagesAdded++;
                }
                break;
            }
        }

        placements.push({
            position: image.placement,
            prompt: '',
            altText: image.altText,
        });
    }

    return { content: modifiedContent, imagesAdded, placements };
}
