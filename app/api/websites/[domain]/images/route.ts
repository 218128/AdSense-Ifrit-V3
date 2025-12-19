/**
 * Images API
 * 
 * Manage images for a website's articles.
 * 
 * Endpoints:
 * GET    /api/websites/[domain]/images - List all images
 * POST   /api/websites/[domain]/images - Upload new image
 * DELETE /api/websites/[domain]/images - Delete image
 * PATCH  /api/websites/[domain]/images - Update image metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import {
    getWebsite,
    getArticle,
    updateArticle,
    listArticles,
    CoverImage,
    ContentImage
} from '@/lib/websiteStore';

// ============================================
// TYPES
// ============================================

interface ImageInfo {
    id: string;
    url: string;
    filename: string;
    type: 'cover' | 'content';
    articleSlug: string;
    articleId?: string;
    articleTitle?: string;
    alt?: string;
    caption?: string;
    sizeBytes: number;
    createdAt: number;
}

// ============================================
// HELPERS
// ============================================

function getImagesDir(domain: string): string {
    return path.join(process.cwd(), 'websites', domain, 'content', 'images');
}

/**
 * Scan all images for a domain
 */
function scanAllImages(domain: string): ImageInfo[] {
    const imagesDir = getImagesDir(domain);
    const images: ImageInfo[] = [];

    if (!fs.existsSync(imagesDir)) {
        return images;
    }

    // Get all articles for matching
    const articles = listArticles(domain);
    const articlesBySlug = new Map(articles.map(a => [a.slug, a]));

    // Scan article image directories
    const articleDirs = fs.readdirSync(imagesDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

    for (const dir of articleDirs) {
        const articleSlug = dir.name;
        const articleImageDir = path.join(imagesDir, articleSlug);
        const article = articlesBySlug.get(articleSlug);

        // Check cover directory
        const coverDir = path.join(articleImageDir, 'cover');
        if (fs.existsSync(coverDir)) {
            const coverFiles = fs.readdirSync(coverDir)
                .filter(f => /\.(webp|png|jpg|jpeg|gif)$/i.test(f));

            for (const file of coverFiles) {
                const filePath = path.join(coverDir, file);
                const stats = fs.statSync(filePath);
                images.push({
                    id: `${articleSlug}_cover_${file}`,
                    url: `/images/${articleSlug}/cover/${file}`,
                    filename: file,
                    type: 'cover',
                    articleSlug,
                    articleId: article?.id,
                    articleTitle: article?.title,
                    alt: article?.coverImage?.alt,
                    sizeBytes: stats.size,
                    createdAt: stats.birthtimeMs
                });
            }
        }

        // Check images directory
        const contentImagesDir = path.join(articleImageDir, 'images');
        if (fs.existsSync(contentImagesDir)) {
            const contentFiles = fs.readdirSync(contentImagesDir)
                .filter(f => /\.(webp|png|jpg|jpeg|gif)$/i.test(f));

            for (const file of contentFiles) {
                const filePath = path.join(contentImagesDir, file);
                const stats = fs.statSync(filePath);

                // Find matching content image in article
                const contentImg = article?.contentImages?.find(
                    img => img.url.includes(file)
                );

                images.push({
                    id: `${articleSlug}_content_${file}`,
                    url: `/images/${articleSlug}/images/${file}`,
                    filename: file,
                    type: 'content',
                    articleSlug,
                    articleId: article?.id,
                    articleTitle: article?.title,
                    alt: contentImg?.alt,
                    caption: contentImg?.caption,
                    sizeBytes: stats.size,
                    createdAt: stats.birthtimeMs
                });
            }
        }
    }

    return images.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Find orphaned images (not linked to any article)
 */
function findOrphanedImages(domain: string): ImageInfo[] {
    const allImages = scanAllImages(domain);
    return allImages.filter(img => !img.articleId);
}

// ============================================
// GET - List all images
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(request.url);
        const articleSlug = searchParams.get('articleSlug');
        const type = searchParams.get('type'); // 'cover' | 'content' | 'orphaned'

        let images = scanAllImages(domain);

        // Filter by article
        if (articleSlug) {
            images = images.filter(img => img.articleSlug === articleSlug);
        }

        // Filter by type
        if (type === 'cover') {
            images = images.filter(img => img.type === 'cover');
        } else if (type === 'content') {
            images = images.filter(img => img.type === 'content');
        } else if (type === 'orphaned') {
            images = findOrphanedImages(domain);
        }

        // Calculate totals
        const totalSize = images.reduce((sum, img) => sum + img.sizeBytes, 0);

        return NextResponse.json({
            success: true,
            images,
            total: images.length,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        });
    } catch (error) {
        console.error('Error listing images:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list images' },
            { status: 500 }
        );
    }
}

// ============================================
// POST - Upload new image
// ============================================

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const articleSlug = formData.get('articleSlug') as string;
        const imageType = formData.get('type') as 'cover' | 'content';
        const alt = formData.get('alt') as string | null;

        if (!file || !articleSlug || !imageType) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: file, articleSlug, type' },
                { status: 400 }
            );
        }

        // Determine target directory
        const imagesDir = getImagesDir(domain);
        const targetDir = imageType === 'cover'
            ? path.join(imagesDir, articleSlug, 'cover')
            : path.join(imagesDir, articleSlug, 'images');

        // Ensure directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Generate filename
        let filename: string;
        if (imageType === 'cover') {
            const ext = path.extname(file.name) || '.webp';
            filename = `cover${ext}`;
        } else {
            // Count existing images and increment
            const existing = fs.readdirSync(targetDir)
                .filter(f => f.startsWith('img-'))
                .length;
            const ext = path.extname(file.name) || '.webp';
            filename = `img-${String(existing + 1).padStart(3, '0')}${ext}`;
        }

        // Save file
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(targetDir, filename);
        fs.writeFileSync(filePath, buffer);

        // Update article if exists
        const articles = listArticles(domain);
        const article = articles.find(a => a.slug === articleSlug);

        if (article) {
            const url = imageType === 'cover'
                ? `/images/${articleSlug}/cover/${filename}`
                : `/images/${articleSlug}/images/${filename}`;

            if (imageType === 'cover') {
                const coverImage: CoverImage = {
                    url,
                    alt: alt || article.title,
                    source: 'manual'
                };
                updateArticle(domain, article.id, { coverImage });
            } else {
                const contentImage: ContentImage = {
                    id: `img_${Date.now()}`,
                    url,
                    alt: alt || `Image for ${article.title}`,
                    source: 'manual'
                };
                const contentImages = [...(article.contentImages || []), contentImage];
                updateArticle(domain, article.id, { contentImages });
            }
        }

        return NextResponse.json({
            success: true,
            image: {
                filename,
                url: imageType === 'cover'
                    ? `/images/${articleSlug}/cover/${filename}`
                    : `/images/${articleSlug}/images/${filename}`,
                type: imageType,
                articleSlug
            }
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE - Remove image
// ============================================

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const { imageId, articleSlug, filename, type } = await request.json();

        if (!articleSlug || !filename || !type) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Determine file path
        const imagesDir = getImagesDir(domain);
        const filePath = type === 'cover'
            ? path.join(imagesDir, articleSlug, 'cover', filename)
            : path.join(imagesDir, articleSlug, 'images', filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { success: false, error: 'Image not found' },
                { status: 404 }
            );
        }

        // Delete file
        fs.unlinkSync(filePath);

        // Update article to remove reference
        const articles = listArticles(domain);
        const article = articles.find(a => a.slug === articleSlug);

        if (article) {
            if (type === 'cover') {
                updateArticle(domain, article.id, { coverImage: undefined });
            } else {
                const contentImages = (article.contentImages || [])
                    .filter(img => !img.url.includes(filename));
                updateArticle(domain, article.id, { contentImages });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Image deleted'
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete image' },
            { status: 500 }
        );
    }
}

// ============================================
// PATCH - Update image metadata
// ============================================

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const { articleSlug, filename, type, alt, caption } = await request.json();

        if (!articleSlug || !filename || !type) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Find article
        const articles = listArticles(domain);
        const article = articles.find(a => a.slug === articleSlug);

        if (!article) {
            return NextResponse.json(
                { success: false, error: 'Article not found' },
                { status: 404 }
            );
        }

        if (type === 'cover' && article.coverImage) {
            const coverImage: CoverImage = {
                ...article.coverImage,
                alt: alt || article.coverImage.alt
            };
            updateArticle(domain, article.id, { coverImage });
        } else if (type === 'content') {
            const contentImages = (article.contentImages || []).map(img => {
                if (img.url.includes(filename)) {
                    return {
                        ...img,
                        alt: alt !== undefined ? alt : img.alt,
                        caption: caption !== undefined ? caption : img.caption
                    };
                }
                return img;
            });
            updateArticle(domain, article.id, { contentImages });
        }

        return NextResponse.json({
            success: true,
            message: 'Image metadata updated'
        });
    } catch (error) {
        console.error('Error updating image:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update image' },
            { status: 500 }
        );
    }
}
