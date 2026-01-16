/**
 * Unified Media Types
 * 
 * Central type definitions for all media-related functionality.
 * Used by: MediaAssetService, imageGenerator, useWPSiteMedia, imageSearchHandlers
 */

// ============================================
// MEDIA SLOT TYPES
// ============================================

/**
 * Type of media slot in an article template
 */
export type MediaSlotType = 'cover' | 'inline' | 'og-image' | 'twitter-card';

/**
 * Source for media generation/search
 */
export type MediaSourceType =
    | 'ai'           // AI-generated (Gemini, OpenRouter, etc.)
    | 'unsplash'     // Unsplash stock photos
    | 'pexels'       // Pexels stock photos
    | 'brave-search' // Brave Search API
    | 'perplexity'   // Perplexity AI search
    | 'stock'        // Generic stock (Unsplash or Pexels)
    | 'auto';        // Automatic selection

// ============================================
// IMAGE TYPES
// ============================================

/**
 * Base image result from any source
 */
export interface ImageResult {
    url: string;
    alt: string;
}

/**
 * Extended image with position for inline images
 */
export interface InlineImageResult extends ImageResult {
    position: 'intro' | 'middle' | 'conclusion';
    index?: number;
}

/**
 * Stock photo from Unsplash/Pexels
 */
export interface StockPhoto {
    id: string;
    url: string;           // Full-size download URL
    thumbnailUrl: string;  // Thumbnail for preview
    width: number;
    height: number;
    alt: string;
    photographer: string;
    attribution: string;   // "Photo by X on Unsplash"
    source: 'unsplash' | 'pexels';
}

/**
 * Search result from image search handlers
 */
export interface ImageSearchResult {
    id: string;
    url: string;
    thumbnailUrl?: string;
    alt: string;
    attribution?: string;
    sourceUrl?: string;
    source: 'unsplash' | 'pexels' | 'brave-search' | 'perplexity';
}

// ============================================
// GENERATED ASSETS
// ============================================

/**
 * Generated media asset with blob data
 */
export interface GeneratedMediaAsset {
    url: string;
    alt: string;
    source: 'ai' | 'stock';
    wpMediaId?: number;
    wpMediaUrl?: string;
}

/**
 * Media asset with full metadata
 */
export interface MediaAsset {
    id: string;
    articleId: string;
    type: MediaSlotType;
    position: number;
    source: MediaSourceType;
    url: string;
    dataUrl?: string;
    originalUrl?: string;
    altText: string;
    dimensions?: {
        width: number;
        height: number;
    };
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    status: 'pending' | 'generating' | 'ready' | 'uploaded' | 'failed';
    error?: string;
    wpMediaId?: number;
}

// ============================================
// WORDPRESS MEDIA
// ============================================

/**
 * Input for WordPress media upload
 */
export interface WPMediaInput {
    file: Blob;
    filename: string;
    mimeType: string;
    alt_text?: string;
    caption?: string;
    title?: string;
}

/**
 * Result from WordPress media upload
 */
export interface WPMediaResult {
    id: number;
    source_url: string;
    alt_text?: string;
    title?: {
        rendered: string;
    };
}

// ============================================
// TEMPLATE SYSTEM
// ============================================

/**
 * Media slot configuration in a template
 */
export interface MediaSlot {
    type: MediaSlotType;
    position: number;
    dimensions: {
        width: number;
        height: number;
    };
    sourcePreference: MediaSourceType;
    required: boolean;
}

/**
 * Article template with media slots
 */
export interface ArticleTemplate {
    id: string;
    name: string;
    description: string;
    mediaSlots: MediaSlot[];
}

// ============================================
// PROGRESS TRACKING
// ============================================

/**
 * Progress callback for media generation
 */
export interface MediaProgressStatus {
    current: number;
    total: number;
    phase: 'generating' | 'downloading' | 'uploading' | 'complete';
    slotType?: MediaSlotType;
    source?: MediaSourceType;
    message?: string;
}

export type MediaProgressCallback = (status: MediaProgressStatus) => void;
