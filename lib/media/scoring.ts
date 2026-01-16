/**
 * Image Scoring Module
 * FSD: lib/media/scoring.ts
 * 
 * Scores images from multiple sources based on:
 * - Resolution match to target dimensions
 * - Aspect ratio accuracy
 * - Source preference
 * - Metadata quality (alt text, etc.)
 */

// ============================================================================
// Types
// ============================================================================

export interface ImageCandidate {
    id: string;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    alt?: string;
    source: 'unsplash' | 'pexels' | 'brave-search' | 'ai';
    sourceUrl?: string;  // Original page URL
    photographer?: string;
    license?: string;
}

export interface ScoringCriteria {
    targetWidth: number;
    targetHeight: number;
    preferredSource?: ImageCandidate['source'];
    requireAlt?: boolean;
}

export interface ScoredImage extends ImageCandidate {
    score: number;
    scoreBreakdown: {
        resolution: number;
        aspectRatio: number;
        sourcePreference: number;
        metadata: number;
    };
}

// ============================================================================
// Scoring Constants
// ============================================================================

const SCORE_WEIGHTS = {
    resolution: 40,      // Max 40 points for resolution match
    aspectRatio: 30,     // Max 30 points for aspect ratio match
    sourcePreference: 20, // Max 20 points for preferred source
    metadata: 10,        // Max 10 points for metadata quality
} as const;

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Score a single image candidate against criteria
 */
export function scoreImage(image: ImageCandidate, criteria: ScoringCriteria): ScoredImage {
    const breakdown = {
        resolution: scoreResolution(image, criteria),
        aspectRatio: scoreAspectRatio(image, criteria),
        sourcePreference: scoreSourcePreference(image, criteria),
        metadata: scoreMetadata(image, criteria),
    };

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    return {
        ...image,
        score: totalScore,
        scoreBreakdown: breakdown,
    };
}

/**
 * Score multiple images and sort by score (descending)
 */
export function scoreAndRankImages(
    images: ImageCandidate[],
    criteria: ScoringCriteria
): ScoredImage[] {
    return images
        .map(img => scoreImage(img, criteria))
        .sort((a, b) => b.score - a.score);
}

/**
 * Pick top N images after scoring
 */
export function pickTopImages(
    images: ImageCandidate[],
    criteria: ScoringCriteria,
    count: number = 1,
    options?: { logScoring?: boolean }
): ScoredImage[] {
    const ranked = scoreAndRankImages(images, criteria);

    // Log scoring results for visibility
    if (options?.logScoring && ranked.length > 0) {
        const winner = ranked[0];
        const { resolution, aspectRatio, sourcePreference, metadata } = winner.scoreBreakdown;
        console.log(`[ImageScoring] Selected: ${winner.source} (${winner.width}x${winner.height})`);
        console.log(`[ImageScoring]   Score: ${winner.score}/100 = Res:${resolution} + AR:${aspectRatio} + Src:${sourcePreference} + Meta:${metadata}`);

        if (ranked.length > 1) {
            const runnerUp = ranked[1];
            console.log(`[ImageScoring]   Runner-up: ${runnerUp.source} (score: ${runnerUp.score})`);
        }

        console.log(`[ImageScoring]   Total candidates: ${ranked.length}`);
    }

    return ranked.slice(0, count);
}

// ============================================================================
// Individual Score Components
// ============================================================================

function scoreResolution(image: ImageCandidate, criteria: ScoringCriteria): number {
    // If no dimensions, give partial score
    if (!image.width || !image.height) {
        return SCORE_WEIGHTS.resolution * 0.3;
    }

    const targetPixels = criteria.targetWidth * criteria.targetHeight;
    const imagePixels = image.width * image.height;
    const ratio = imagePixels / targetPixels;

    // Ideal: image is 1-2x the target size
    if (ratio >= 1 && ratio <= 1.5) {
        return SCORE_WEIGHTS.resolution;  // Perfect - slightly larger is ideal
    } else if (ratio >= 0.8 && ratio < 1) {
        return SCORE_WEIGHTS.resolution * 0.8;  // Slightly smaller, still good
    } else if (ratio > 1.5 && ratio <= 3) {
        return SCORE_WEIGHTS.resolution * 0.7;  // Too large but usable
    } else if (ratio >= 0.5 && ratio < 0.8) {
        return SCORE_WEIGHTS.resolution * 0.5;  // Small but might work
    } else if (ratio > 3) {
        return SCORE_WEIGHTS.resolution * 0.4;  // Very large, wastes bandwidth
    } else {
        return SCORE_WEIGHTS.resolution * 0.2;  // Too small
    }
}

function scoreAspectRatio(image: ImageCandidate, criteria: ScoringCriteria): number {
    if (!image.width || !image.height) {
        return SCORE_WEIGHTS.aspectRatio * 0.3;
    }

    const targetAR = criteria.targetWidth / criteria.targetHeight;
    const imageAR = image.width / image.height;
    const diff = Math.abs(targetAR - imageAR);

    // Score based on how close the aspect ratio is
    if (diff < 0.05) {
        return SCORE_WEIGHTS.aspectRatio;  // Nearly exact match
    } else if (diff < 0.15) {
        return SCORE_WEIGHTS.aspectRatio * 0.8;  // Very close
    } else if (diff < 0.3) {
        return SCORE_WEIGHTS.aspectRatio * 0.5;  // Moderate difference
    } else if (diff < 0.5) {
        return SCORE_WEIGHTS.aspectRatio * 0.3;  // Significant difference
    } else {
        return SCORE_WEIGHTS.aspectRatio * 0.1;  // Very different
    }
}

function scoreSourcePreference(image: ImageCandidate, criteria: ScoringCriteria): number {
    if (!criteria.preferredSource) {
        // No preference, all sources equal
        return SCORE_WEIGHTS.sourcePreference * 0.5;
    }

    if (image.source === criteria.preferredSource) {
        return SCORE_WEIGHTS.sourcePreference;
    }

    // Partial score for "good" sources
    if (image.source === 'unsplash' || image.source === 'pexels') {
        return SCORE_WEIGHTS.sourcePreference * 0.6;  // Known quality sources
    }

    return SCORE_WEIGHTS.sourcePreference * 0.3;
}

function scoreMetadata(image: ImageCandidate, criteria: ScoringCriteria): number {
    let score = 0;
    const max = SCORE_WEIGHTS.metadata;

    // Alt text quality
    if (image.alt) {
        if (image.alt.length >= 20 && image.alt.length <= 125) {
            score += max * 0.4;  // Good length
        } else if (image.alt.length > 0) {
            score += max * 0.2;  // Has something
        }
    } else if (!criteria.requireAlt) {
        score += max * 0.1;  // No penalty if not required
    }

    // Photographer/attribution
    if (image.photographer) {
        score += max * 0.3;
    }

    // License info
    if (image.license) {
        score += max * 0.2;
    }

    // Has thumbnail for preview
    if (image.thumbnailUrl) {
        score += max * 0.1;
    }

    return Math.min(score, max);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Merge images from multiple sources, removing duplicates by URL
 */
export function mergeImageResults(
    ...sources: ImageCandidate[][]
): ImageCandidate[] {
    const seen = new Set<string>();
    const merged: ImageCandidate[] = [];

    for (const sourceImages of sources) {
        for (const img of sourceImages) {
            if (!seen.has(img.url)) {
                seen.add(img.url);
                merged.push(img);
            }
        }
    }

    return merged;
}

/**
 * Default scoring criteria for common slot types
 */
export function getDefaultCriteria(slotType: 'cover' | 'inline' | 'og-image' | 'twitter-card'): ScoringCriteria {
    switch (slotType) {
        case 'cover':
            return { targetWidth: 1200, targetHeight: 628, requireAlt: true };
        case 'inline':
            return { targetWidth: 800, targetHeight: 450, requireAlt: true };
        case 'og-image':
            return { targetWidth: 1200, targetHeight: 630, requireAlt: false };
        case 'twitter-card':
            return { targetWidth: 1200, targetHeight: 600, requireAlt: false };
        default:
            return { targetWidth: 800, targetHeight: 600, requireAlt: true };
    }
}
