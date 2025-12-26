/**
 * External Content Integration
 * 
 * Functions for importing user-uploaded external content
 */

import type { Article, CoverImage, ContentImage } from './types';
import { generateArticleId, saveArticle } from './articleCrud';

// ============================================
// EXTERNAL CONTENT INTEGRATION
// ============================================

/**
 * Import external content (user uploaded)
 */
export function importExternalContent(
    domain: string,
    content: {
        title: string;
        slug?: string;
        content: string;
        category?: string;
        tags?: string[];
        coverImage?: CoverImage;
        contentImages?: ContentImage[];
    }
): Article {
    const slug = content.slug || generateSlug(content.title);
    const wordCount = content.content.split(/\s+/).length;

    const article: Article = {
        id: generateArticleId(),
        slug,
        title: content.title,
        description: content.content.substring(0, 160) + '...',
        content: content.content,
        category: content.category || 'general',
        tags: content.tags || [],
        coverImage: content.coverImage,
        contentImages: content.contentImages,
        contentType: 'external',
        pageType: 'article',
        wordCount,
        readingTime: Math.ceil(wordCount / 200),
        eeatSignals: [],
        aiOverviewBlocks: [],
        generatedBy: undefined,
        generatedAt: undefined,
        isExternal: true,
        source: 'external',
        status: 'draft',
        lastModifiedAt: Date.now()
    };

    saveArticle(domain, article);
    return article;
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
}
