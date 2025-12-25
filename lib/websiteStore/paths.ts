/**
 * Website Store Paths
 * 
 * Path helpers for all website data storage.
 * Used by CRUD modules to locate files.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// BASE DIRECTORIES
// ============================================

export const WEBSITES_DIR = path.join(process.cwd(), 'websites');
export const PROFILES_DIR = path.join(WEBSITES_DIR, 'profiles');

// ============================================
// WEBSITE PATHS
// ============================================

export function getWebsiteDir(domain: string): string {
    return path.join(WEBSITES_DIR, domain.replace(/[^a-zA-Z0-9.-]/g, '_'));
}

export function getMetadataPath(domain: string): string {
    return path.join(getWebsiteDir(domain), 'metadata.json');
}

export function getVersionsDir(domain: string): string {
    return path.join(getWebsiteDir(domain), 'versions');
}

export function getContentDir(domain: string): string {
    return path.join(getWebsiteDir(domain), 'content');
}

// ============================================
// ARTICLE PATHS
// ============================================

export function getArticlesDir(domain: string): string {
    return path.join(getContentDir(domain), 'articles');
}

export function getArticlePath(domain: string, articleId: string): string {
    return path.join(getArticlesDir(domain), `${articleId}.json`);
}

// ============================================
// IMAGES PATHS
// ============================================

export function getImagesDir(domain: string): string {
    return path.join(getContentDir(domain), 'images');
}

/**
 * Get article-specific images directory for folder-per-article structure
 * Structure: content/images/[article-slug]/cover/ and content/images/[article-slug]/images/
 */
export function getArticleImagesDir(domain: string, articleSlug: string): string {
    return path.join(getImagesDir(domain), articleSlug);
}

export function getArticleCoverDir(domain: string, articleSlug: string): string {
    return path.join(getArticleImagesDir(domain, articleSlug), 'cover');
}

export function getArticleContentImagesDir(domain: string, articleSlug: string): string {
    return path.join(getArticleImagesDir(domain, articleSlug), 'images');
}

/**
 * Ensure article image directories exist
 */
export function ensureArticleImageDirs(domain: string, articleSlug: string): void {
    const dirs = [
        getArticleImagesDir(domain, articleSlug),
        getArticleCoverDir(domain, articleSlug),
        getArticleContentImagesDir(domain, articleSlug)
    ];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

// ============================================
// PAGES PATHS
// ============================================

export function getPagesDir(domain: string): string {
    return path.join(getContentDir(domain), 'pages');
}

import type { StructuralPageType } from './types';

export function getPagePath(domain: string, pageType: StructuralPageType): string {
    return path.join(getPagesDir(domain), `${pageType}.json`);
}

// ============================================
// THEME PATHS
// ============================================

export function getThemeDir(domain: string): string {
    return path.join(getWebsiteDir(domain), 'theme');
}

export function getThemeVersionsDir(domain: string): string {
    return path.join(getVersionsDir(domain), 'theme');
}

// ============================================
// PLUGINS PATHS
// ============================================

export function getPluginsDir(domain: string): string {
    return path.join(getWebsiteDir(domain), 'plugins');
}

// ============================================
// INITIALIZATION
// ============================================

export function ensureWebsitesDirs(): void {
    if (!fs.existsSync(WEBSITES_DIR)) {
        fs.mkdirSync(WEBSITES_DIR, { recursive: true });
    }
}

export function ensureWebsiteDir(domain: string): void {
    const dirs = [
        getWebsiteDir(domain),
        getVersionsDir(domain),
        getContentDir(domain),
        getArticlesDir(domain),
        getImagesDir(domain),
        getPagesDir(domain)
    ];

    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

export function ensureThemeDir(domain: string): void {
    const dirs = [
        getThemeDir(domain),
        getThemeVersionsDir(domain)
    ];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

export function ensurePluginsDir(domain: string): void {
    const pluginsDir = getPluginsDir(domain);
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
    }
}
