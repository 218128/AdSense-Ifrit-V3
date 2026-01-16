/**
 * WordPress Feature - Type Definitions
 * FSD: features/wordpress/model/types.ts
 * 
 * LEGACY: This file re-exports from wpSiteTypes.ts for backward compatibility.
 * New code should import directly from wpSiteTypes.ts
 */

// Re-export core types from the new file for backward compatibility
export type {
    WPSite,
    WPSiteType,
    WPTheme,
    WPPlugin,
    WPCategory,
    WPTag,
    WPAuthor,
} from './wpSiteTypes';

// ============================================================================
// Post Creation (Unique to this file - used by API)
// ============================================================================

export interface WPPostInput {
    title: string;
    content: string;                    // HTML content
    excerpt?: string;
    status: 'publish' | 'draft' | 'pending' | 'private';
    categories?: number[];              // Category IDs
    tags?: number[];                    // Tag IDs
    author?: number;                    // Author ID
    featured_media?: number;            // Media ID for featured image
    slug?: string;
    meta?: Record<string, unknown>;
}

export interface WPPostResult {
    id: number;
    link: string;
    slug: string;
    status: string;
    title?: { rendered: string };         // WP returns title as object
    content?: { rendered: string };       // WP post content
    excerpt?: { rendered: string };       // WP post excerpt
    featured_media?: number;              // Featured image media ID
}

// ============================================================================
// Media Upload
// ============================================================================

export interface WPMediaInput {
    file: Buffer | Blob;
    filename: string;
    mimeType: string;
    title?: string;
    alt_text?: string;
    caption?: string;
}

export interface WPMediaResult {
    id: number;
    source_url: string;
    alt_text: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface WPApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface WPConnectionTestResult {
    connected: boolean;
    siteName?: string;
    siteUrl?: string;
    wpVersion?: string;
    error?: string;
}

