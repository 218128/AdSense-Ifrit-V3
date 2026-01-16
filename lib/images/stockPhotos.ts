/**
 * Stock Photos Module
 * 
 * @legacy - LEGACY Websites Module
 * This module is for the Legacy Websites system (GitHub/Vercel).
 * For WP Sites, use the search-images capability via imageSearchHandlers.ts.
 * 
 * @deprecated Use /api/capabilities/search-images with getAllIntegrationKeys() instead.
 * 
 * Fetches images from Unsplash and Pexels APIs, downloads and converts to WebP.
 * Used for auto-fetching cover images during content generation.
 * 
 * ✅ Key names updated to use settingsStore.integrations.unsplashKey/pexelsKey
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ============================================
// TYPES
// ============================================

export interface StockPhoto {
    id: string;
    url: string;           // Full-size download URL
    thumbUrl: string;      // Thumbnail for preview
    width: number;
    height: number;
    alt: string;
    photographer: string;
    attribution: string;   // "Photo by X on Unsplash"
    source: 'unsplash' | 'pexels';
}

export interface FetchedImage {
    localPath: string;     // Local file path after download
    url: string;           // Relative URL for use in content
    alt: string;
    width: number;
    height: number;
    attribution: string;
    source: 'unsplash' | 'pexels';
    originalUrl: string;
}

// ============================================
// API HELPERS
// ============================================

/**
 * Get API keys from settingsStore (client) or environment (server)
 * Uses correct key names from unified settings system
 */
export function getStockApiKeys(): { unsplash?: string; pexels?: string } {
    // Server-side: check environment
    if (typeof window === 'undefined') {
        return {
            unsplash: process.env.UNSPLASH_ACCESS_KEY,
            pexels: process.env.PEXELS_API_KEY
        };
    }

    // Client-side: check settingsStore via localStorage
    // The settingsStore persists to 'ifrit_settings' which contains integrations object
    try {
        const settingsJson = localStorage.getItem('ifrit_settings');
        if (settingsJson) {
            const settings = JSON.parse(settingsJson);
            return {
                unsplash: settings?.integrations?.unsplashKey || undefined,
                pexels: settings?.integrations?.pexelsKey || undefined
            };
        }
    } catch {
        // Parse error, fall through
    }

    return { unsplash: undefined, pexels: undefined };
}

/**
 * Search Unsplash for photos
 */
export async function searchUnsplash(query: string, count: number = 3): Promise<StockPhoto[]> {
    const keys = getStockApiKeys();
    if (!keys.unsplash) return [];

    try {
        const params = new URLSearchParams({
            query,
            per_page: count.toString(),
            orientation: 'landscape'
        });

        const response = await fetch(
            `https://api.unsplash.com/search/photos?${params}`,
            {
                headers: {
                    'Authorization': `Client-ID ${keys.unsplash}`
                }
            }
        );

        if (!response.ok) return [];

        const data = await response.json();

        return data.results.map((photo: {
            id: string;
            urls: { regular: string; thumb: string };
            width: number;
            height: number;
            alt_description?: string;
            description?: string;
            user: { name: string };
        }) => ({
            id: photo.id,
            url: photo.urls.regular,
            thumbUrl: photo.urls.thumb,
            width: photo.width,
            height: photo.height,
            alt: photo.alt_description || photo.description || query,
            photographer: photo.user.name,
            attribution: `Photo by ${photo.user.name} on Unsplash`,
            source: 'unsplash' as const
        }));
    } catch (error) {
        console.error('Unsplash search failed:', error);
        return [];
    }
}

/**
 * Search Pexels for photos
 */
export async function searchPexels(query: string, count: number = 3): Promise<StockPhoto[]> {
    const keys = getStockApiKeys();
    if (!keys.pexels) return [];

    try {
        const params = new URLSearchParams({
            query,
            per_page: count.toString(),
            orientation: 'landscape'
        });

        const response = await fetch(
            `https://api.pexels.com/v1/search?${params}`,
            {
                headers: {
                    'Authorization': keys.pexels
                }
            }
        );

        if (!response.ok) return [];

        const data = await response.json();

        return data.photos.map((photo: {
            id: number;
            src: { large: string; medium: string };
            width: number;
            height: number;
            alt?: string;
            photographer: string;
        }) => ({
            id: String(photo.id),
            url: photo.src.large,
            thumbUrl: photo.src.medium,
            width: photo.width,
            height: photo.height,
            alt: photo.alt || query,
            photographer: photo.photographer,
            attribution: `Photo by ${photo.photographer} on Pexels`,
            source: 'pexels' as const
        }));
    } catch (error) {
        console.error('Pexels search failed:', error);
        return [];
    }
}

/**
 * Search both Unsplash and Pexels, return best results
 */
export async function searchPhotos(query: string, count: number = 3): Promise<StockPhoto[]> {
    // Try Unsplash first (higher quality)
    let photos = await searchUnsplash(query, count);

    // If Unsplash fails, try Pexels
    if (photos.length === 0) {
        photos = await searchPexels(query, count);
    }

    return photos;
}

// ============================================
// DOWNLOAD & CONVERT
// ============================================

/**
 * Download file from URL to local path
 */
function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);

        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    file.close();
                    fs.unlinkSync(destPath);
                    downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                    return;
                }
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            fs.unlinkSync(destPath);
            reject(err);
        });
    });
}

/**
 * Simple image resize/compress using sharp-like approach
 * Note: For full WebP support, you'd need the 'sharp' package
 * For now, we download as-is with proper extension
 */
export async function downloadAndSaveImage(
    photo: StockPhoto,
    destDir: string,
    filename: string = 'cover'
): Promise<FetchedImage | null> {
    try {
        // Ensure directory exists
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // For now, save as original format (jpg/png)
        // WebP conversion would require sharp package
        const ext = 'jpg';  // Most stock photos are JPEG
        const localPath = path.join(destDir, `${filename}.${ext}`);

        await downloadFile(photo.url, localPath);

        // Verify file was downloaded
        if (!fs.existsSync(localPath)) {
            return null;
        }

        const stats = fs.statSync(localPath);
        console.log(`Downloaded image: ${localPath} (${Math.round(stats.size / 1024)}KB)`);

        return {
            localPath,
            url: `/images/${path.basename(path.dirname(destDir))}/${path.basename(destDir)}/${filename}.${ext}`,
            alt: photo.alt,
            width: photo.width,
            height: photo.height,
            attribution: photo.attribution,
            source: photo.source,
            originalUrl: photo.url
        };
    } catch (error) {
        console.error('Failed to download image:', error);
        return null;
    }
}

// ============================================
// HIGH-LEVEL FUNCTIONS
// ============================================

/**
 * Fetch and save a cover image for an article
 */
export async function fetchCoverImage(
    topic: string,
    articleSlug: string,
    imagesBaseDir: string
): Promise<FetchedImage | null> {
    // Search for relevant photos
    const photos = await searchPhotos(topic, 1);

    if (photos.length === 0) {
        console.log(`No stock photos found for: ${topic}`);
        return null;
    }

    const photo = photos[0];
    const coverDir = path.join(imagesBaseDir, articleSlug, 'cover');

    return downloadAndSaveImage(photo, coverDir, 'cover');
}

/**
 * Fetch multiple content images for an article
 */
export async function fetchContentImages(
    keywords: string[],
    articleSlug: string,
    imagesBaseDir: string,
    count: number = 3
): Promise<FetchedImage[]> {
    const images: FetchedImage[] = [];
    const imagesDir = path.join(imagesBaseDir, articleSlug, 'images');

    for (let i = 0; i < Math.min(keywords.length, count); i++) {
        const keyword = keywords[i];
        const photos = await searchPhotos(keyword, 1);

        if (photos.length > 0) {
            const image = await downloadAndSaveImage(
                photos[0],
                imagesDir,
                `img-${String(i + 1).padStart(3, '0')}`
            );
            if (image) {
                images.push(image);
            }
        }

        // Rate limit: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return images;
}

/**
 * Check if stock photo APIs are configured
 */
export function hasStockPhotoApi(): boolean {
    const keys = getStockApiKeys();
    return !!(keys.unsplash || keys.pexels);
}
