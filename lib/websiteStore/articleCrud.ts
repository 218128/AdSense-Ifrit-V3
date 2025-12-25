/**
 * Article CRUD Operations
 * 
 * All article-related storage operations extracted from websiteStore.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Article, ArticleVersion } from './types';
import {
    getArticlesDir,
    getArticlePath,
    ensureWebsiteDir
} from './paths';

// Forward declarations for circular dependency resolution
// These are imported dynamically at runtime from websiteStore
let _getWebsite: (domain: string) => import('./types').Website | null;
let _saveWebsite: (website: import('./types').Website) => void;
let _incrementPendingChanges: (domain: string) => void;

/**
 * Initialize dependencies from main websiteStore
 * Called internally to resolve circular dependencies
 */
export function _initArticleCrudDeps(deps: {
    getWebsite: typeof _getWebsite;
    saveWebsite: typeof _saveWebsite;
    incrementPendingChanges: typeof _incrementPendingChanges;
}) {
    _getWebsite = deps.getWebsite;
    _saveWebsite = deps.saveWebsite;
    _incrementPendingChanges = deps.incrementPendingChanges;
}

// ============================================
// ARTICLE CRUD
// ============================================

/**
 * Generate article ID
 */
export function generateArticleId(): string {
    return `art_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Save an article
 */
export function saveArticle(domain: string, article: Article): void {
    ensureWebsiteDir(domain);
    const articlePath = getArticlePath(domain, article.id);
    fs.writeFileSync(articlePath, JSON.stringify(article, null, 2));

    // Update website stats
    updateArticleStats(domain);
}

/**
 * Get an article by ID
 */
export function getArticle(domain: string, articleId: string): Article | null {
    const articlePath = getArticlePath(domain, articleId);

    if (!fs.existsSync(articlePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(articlePath, 'utf-8');
        return JSON.parse(data) as Article;
    } catch {
        return null;
    }
}

/**
 * Get article by slug
 */
export function getArticleBySlug(domain: string, slug: string): Article | null {
    const articles = listArticles(domain);
    return articles.find(a => a.slug === slug) || null;
}

/**
 * List all articles for a website
 */
export function listArticles(domain: string): Article[] {
    const articlesDir = getArticlesDir(domain);

    if (!fs.existsSync(articlesDir)) {
        return [];
    }

    const articles: Article[] = [];
    const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        try {
            const data = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
            articles.push(JSON.parse(data));
        } catch {
            // Skip invalid files
        }
    }

    return articles.sort((a, b) => b.lastModifiedAt - a.lastModifiedAt);
}

/**
 * Update an article
 */
export function updateArticle(domain: string, articleId: string, updates: Partial<Article>): Article | null {
    const article = getArticle(domain, articleId);
    if (!article) return null;

    const updated = {
        ...article,
        ...updates,
        lastModifiedAt: Date.now()
    };
    saveArticle(domain, updated);
    _incrementPendingChanges(domain);

    return updated;
}

/**
 * Save a version snapshot of an article
 */
export function saveArticleVersion(
    domain: string,
    articleId: string,
    reason: ArticleVersion['reason'] = 'auto'
): ArticleVersion | null {
    const article = getArticle(domain, articleId);
    if (!article) return null;

    const version: ArticleVersion = {
        id: `ver_${Date.now()}`,
        content: article.content,
        title: article.title,
        savedAt: Date.now(),
        reason,
        wordCount: article.wordCount
    };

    // Keep only last 10 versions
    const versions = [version, ...(article.versions || [])].slice(0, 10);

    const updated = {
        ...article,
        versions,
        lastModifiedAt: Date.now()
    };
    saveArticle(domain, updated);

    return version;
}

/**
 * List versions of an article
 */
export function listArticleVersions(domain: string, articleId: string): ArticleVersion[] {
    const article = getArticle(domain, articleId);
    return article?.versions || [];
}

/**
 * Get a specific version
 */
export function getArticleVersion(domain: string, articleId: string, versionId: string): ArticleVersion | null {
    const versions = listArticleVersions(domain, articleId);
    return versions.find(v => v.id === versionId) || null;
}

/**
 * Restore article to a previous version
 */
export function restoreArticleVersion(domain: string, articleId: string, versionId: string): Article | null {
    const article = getArticle(domain, articleId);
    if (!article) return null;

    const version = getArticleVersion(domain, articleId, versionId);
    if (!version) return null;

    // Save current state as a version before restoring
    saveArticleVersion(domain, articleId, 'auto');

    // Restore content from version
    const updated = {
        ...article,
        content: version.content,
        title: version.title,
        wordCount: version.wordCount,
        lastModifiedAt: Date.now()
    };
    saveArticle(domain, updated);
    _incrementPendingChanges(domain);

    return updated;
}

/**
 * Delete an article
 */
export function deleteArticle(domain: string, articleId: string): boolean {
    const articlePath = getArticlePath(domain, articleId);

    if (fs.existsSync(articlePath)) {
        fs.unlinkSync(articlePath);
        updateArticleStats(domain);
        _incrementPendingChanges(domain);
        return true;
    }

    return false;
}

/**
 * Update website article stats
 */
export function updateArticleStats(domain: string): void {
    const website = _getWebsite(domain);
    if (!website) return;

    const articles = listArticles(domain);
    const publishedArticles = articles.filter(a => a.status === 'published');

    website.stats.articlesCount = articles.length;
    website.stats.totalWords = articles.reduce((sum, a) => sum + a.wordCount, 0);
    website.stats.lastPublishedAt = publishedArticles.length > 0
        ? Math.max(...publishedArticles.map(a => a.publishedAt || 0))
        : undefined;
    website.updatedAt = Date.now();

    _saveWebsite(website);
}
