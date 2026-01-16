/**
 * Image Optimization Utilities
 * FSD: features/campaigns/lib/imageOptimization.ts
 * 
 * @deprecated This file is deprecated. Import from '@/lib/media' instead.
 * All exports are re-exported for backward compatibility.
 * 
 * Example migration:
 * - Old: import { generateAltText } from '@/features/campaigns/lib/imageOptimization';
 * - New: import { generateAltText } from '@/lib/media';
 */

// Re-export all from consolidated location
export {
    generateAltText,
    generateAltTextAI,
    determineImagePlacements,
    injectImages,
    type ImagePlacement,
    type GeneratedImage,
    type ImageInjectionResult,
} from '@/lib/media/optimization';
