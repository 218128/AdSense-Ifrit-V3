/**
 * Image SEO Validation Module
 * FSD: lib/media/seoValidation.ts
 * 
 * Validates images for SEO best practices:
 * - Alt text quality
 * - File size limits
 * - Dimension requirements
 */

// ============================================================================
// Types
// ============================================================================

export type SEOIssueType =
    | 'alt-missing'
    | 'alt-too-short'
    | 'alt-too-long'
    | 'alt-keyword-stuffed'
    | 'dimensions-missing'
    | 'dimensions-too-small'
    | 'file-too-large';

export interface SEOIssue {
    type: SEOIssueType;
    message: string;
    severity: 'error' | 'warning';
}

export interface ImageSEOInput {
    alt?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    slotType: 'cover' | 'inline' | 'og-image' | 'twitter-card';
}

export interface ImageSEOResult {
    valid: boolean;
    issues: SEOIssue[];
    score: number;  // 0-100
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ALT_LENGTH = 10;
const MAX_ALT_LENGTH = 125;
const MAX_FILE_SIZE_MB = 2;

const MIN_DIMENSIONS: Record<ImageSEOInput['slotType'], { width: number; height: number }> = {
    cover: { width: 800, height: 400 },
    inline: { width: 400, height: 200 },
    'og-image': { width: 1200, height: 630 },
    'twitter-card': { width: 800, height: 400 },
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate an image for SEO best practices
 */
export function validateImageSEO(input: ImageSEOInput): ImageSEOResult {
    const issues: SEOIssue[] = [];
    let points = 100;

    // Alt text validation
    if (!input.alt || input.alt.trim().length === 0) {
        issues.push({
            type: 'alt-missing',
            message: 'Alt text is missing - required for accessibility and SEO',
            severity: 'error',
        });
        points -= 30;
    } else if (input.alt.length < MIN_ALT_LENGTH) {
        issues.push({
            type: 'alt-too-short',
            message: `Alt text too short (${input.alt.length} chars). Minimum: ${MIN_ALT_LENGTH}`,
            severity: 'warning',
        });
        points -= 10;
    } else if (input.alt.length > MAX_ALT_LENGTH) {
        issues.push({
            type: 'alt-too-long',
            message: `Alt text too long (${input.alt.length} chars). Maximum: ${MAX_ALT_LENGTH}`,
            severity: 'warning',
        });
        points -= 5;
    }

    // Check for keyword stuffing
    if (input.alt && isKeywordStuffed(input.alt)) {
        issues.push({
            type: 'alt-keyword-stuffed',
            message: 'Alt text appears keyword-stuffed - use natural description',
            severity: 'warning',
        });
        points -= 10;
    }

    // Dimension validation
    const minDims = MIN_DIMENSIONS[input.slotType];
    if (!input.width || !input.height) {
        issues.push({
            type: 'dimensions-missing',
            message: 'Image dimensions unknown - may cause layout shifts',
            severity: 'warning',
        });
        points -= 10;
    } else if (input.width < minDims.width || input.height < minDims.height) {
        issues.push({
            type: 'dimensions-too-small',
            message: `Image too small (${input.width}×${input.height}). Minimum for ${input.slotType}: ${minDims.width}×${minDims.height}`,
            severity: 'warning',
        });
        points -= 15;
    }

    // File size validation
    if (input.sizeBytes && input.sizeBytes > MAX_FILE_SIZE_MB * 1024 * 1024) {
        const sizeMB = (input.sizeBytes / (1024 * 1024)).toFixed(1);
        issues.push({
            type: 'file-too-large',
            message: `File too large (${sizeMB}MB). Maximum: ${MAX_FILE_SIZE_MB}MB`,
            severity: 'warning',
        });
        points -= 15;
    }

    return {
        valid: !issues.some(i => i.severity === 'error'),
        issues,
        score: Math.max(0, points),
    };
}

/**
 * Batch validate multiple images
 */
export function validateImagesSEO(inputs: ImageSEOInput[]): {
    allValid: boolean;
    averageScore: number;
    results: ImageSEOResult[];
} {
    const results = inputs.map(validateImageSEO);
    const allValid = results.every(r => r.valid);
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return { allValid, averageScore, results };
}

// ============================================================================
// Helpers
// ============================================================================

function isKeywordStuffed(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount: Record<string, number> = {};

    for (const word of words) {
        if (word.length > 3) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    }

    // If any word appears more than 3 times, consider it stuffed
    return Object.values(wordCount).some(count => count > 3);
}

/**
 * Generate SEO-friendly alt text suggestion
 */
export function suggestAltText(topic: string, context: string): string {
    const cleaned = `${topic} - ${context}`
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned.slice(0, MAX_ALT_LENGTH);
}

/**
 * Improve existing alt text
 */
export function improveAltText(current: string, topic: string): string {
    if (!current || current.length < MIN_ALT_LENGTH) {
        return suggestAltText(topic, 'visual representation');
    }

    if (current.length > MAX_ALT_LENGTH) {
        return current.slice(0, MAX_ALT_LENGTH - 3) + '...';
    }

    return current;
}
