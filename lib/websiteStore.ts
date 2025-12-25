/**
 * Unified Website Store
 * 
 * Single source of truth for all website data.
 * File-based storage in /websites/[domain]/ with:
 * - metadata.json: Full website config
 * - versions/: Template version history (last 5)
 * - content/: Local content staging before deploy
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES - Re-exported from types.ts for backwards compatibility
// ============================================

export type {
    TemplateId,
    WebsiteStatus,
    TemplateInfo,
    ProviderUsage,
    AIFingerprint,
    DeploymentInfo,
    WebsiteStats,
    WebsiteVersion,
    ContentCompatibilityWarning,
    Website,
    CoverImage,
    ContentImage,
    Article,
    ArticleVersion,
    StructuralPageType,
    ThemeConfig,
    ThemeVersion,
    PendingChanges,
    DomainProfile
} from './websiteStore/types';

import type {
    Website,
    WebsiteStatus,
    WebsiteVersion,
    ContentCompatibilityWarning,
    Article,
    ArticleVersion,
    ThemeConfig,
    ThemeVersion,
    StructuralPageType,
    DomainProfile,
    PendingChanges,
    CoverImage,
    ContentImage
} from './websiteStore/types';


// ============================================
// PATHS - Re-exported from paths.ts for backwards compatibility
// ============================================

export {
    WEBSITES_DIR,
    PROFILES_DIR,
    getWebsiteDir,
    getMetadataPath,
    getVersionsDir,
    getContentDir,
    getArticlesDir,
    getArticlePath,
    getImagesDir,
    getArticleImagesDir,
    getArticleCoverDir,
    getArticleContentImagesDir,
    ensureArticleImageDirs,
    getPagesDir,
    getPagePath,
    getThemeDir,
    getThemeVersionsDir,
    getPluginsDir,
    ensureWebsitesDirs,
    ensureWebsiteDir,
    ensureThemeDir,
    ensurePluginsDir
} from './websiteStore/paths';

import {
    WEBSITES_DIR,
    PROFILES_DIR,
    getWebsiteDir,
    getMetadataPath,
    getVersionsDir,
    getContentDir,
    getArticlesDir,
    getArticlePath,
    getImagesDir,
    getPagesDir,
    getPagePath,
    getThemeDir,
    getThemeVersionsDir,
    getPluginsDir,
    ensureWebsitesDirs,
    ensureWebsiteDir,
    ensureThemeDir,
    ensurePluginsDir
} from './websiteStore/paths';

// ============================================
// ARTICLE CRUD - Re-exported from articleCrud.ts
// ============================================

export {
    generateArticleId,
    saveArticle,
    getArticle,
    getArticleBySlug,
    listArticles,
    updateArticle,
    saveArticleVersion,
    listArticleVersions,
    getArticleVersion,
    restoreArticleVersion,
    deleteArticle,
    updateArticleStats
} from './websiteStore/articleCrud';

import {
    _initArticleCrudDeps,
    generateArticleId,
    saveArticle,
    listArticles,
    updateArticleStats
} from './websiteStore/articleCrud';

// ============================================
// THEME CRUD - Re-exported from themeCrud.ts
// ============================================

export {
    saveTheme,
    getTheme,
    saveThemeVersion,
    listThemeVersions,
    restoreThemeVersion
} from './websiteStore/themeCrud';

import {
    saveTheme,
    getTheme
} from './websiteStore/themeCrud';

// ============================================
// PLUGIN - Re-exported from pluginCrud.ts
// ============================================

export type { Plugin } from './websiteStore/pluginCrud';
export {
    getInstalledPlugins,
    installPlugin,
    uninstallPlugin,
    getMergedPackageJson
} from './websiteStore/pluginCrud';

import {
    getInstalledPlugins
} from './websiteStore/pluginCrud';

// ============================================
// VERSION CONTROL - Re-exported from versionControl.ts
// ============================================

export {
    addVersion,
    getVersionHistory,
    updateVersionCommit,
    checkContentCompatibility,
    rollbackToVersion
} from './websiteStore/versionControl';

import {
    _initVersionControlDeps
} from './websiteStore/versionControl';

// ============================================
// PROFILE CRUD - Re-exported from profileCrud.ts
// ============================================

export {
    saveDomainProfile,
    getDomainProfile,
    listDomainProfiles,
    deleteDomainProfile,
    markProfileTransferred
} from './websiteStore/profileCrud';

// ============================================
// MIGRATION - Re-exported from migration.ts
// ============================================

export { migrateFromLegacy } from './websiteStore/migration';
import { _initMigrationDeps } from './websiteStore/migration';

// ============================================
// PAGES - Re-exported from pageCrud.ts
// ============================================

export {
    listPages,
    getPage,
    savePage,
    updatePage,
    deletePage,
    createDefaultPages
} from './websiteStore/pageCrud';

import { listPages, _initPageCrudDeps } from './websiteStore/pageCrud';

// ============================================
// WEBSITE CRUD
// ============================================

/**
 * Save a website to storage
 */
export function saveWebsite(website: Website): void {
    ensureWebsiteDir(website.domain);
    const metadataPath = getMetadataPath(website.domain);
    fs.writeFileSync(metadataPath, JSON.stringify(website, null, 2));
}

/**
 * Get a website by domain
 */
export function getWebsite(domain: string): Website | null {
    const metadataPath = getMetadataPath(domain);

    if (!fs.existsSync(metadataPath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(metadataPath, 'utf-8');
        return JSON.parse(data) as Website;
    } catch (error) {
        console.error(`Failed to load website ${domain}:`, error);
        return null;
    }
}

/**
 * List all websites
 */
export function listWebsites(): Website[] {
    ensureWebsitesDirs();

    if (!fs.existsSync(WEBSITES_DIR)) {
        return [];
    }

    const websites: Website[] = [];
    const entries = fs.readdirSync(WEBSITES_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const metadataPath = path.join(WEBSITES_DIR, entry.name, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
                try {
                    const data = fs.readFileSync(metadataPath, 'utf-8');
                    websites.push(JSON.parse(data));
                } catch {
                    // Skip invalid entries
                }
            }
        }
    }

    return websites.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Delete a website
 */
export function deleteWebsite(domain: string): boolean {
    const websiteDir = getWebsiteDir(domain);

    if (fs.existsSync(websiteDir)) {
        fs.rmSync(websiteDir, { recursive: true });
        return true;
    }

    return false;
}

/**
 * Update website status
 */
export function updateWebsiteStatus(domain: string, status: WebsiteStatus): void {
    const website = getWebsite(domain);
    if (website) {
        website.status = status;
        website.updatedAt = Date.now();
        saveWebsite(website);
    }
}

/**
 * Increment pending changes count
 */
export function incrementPendingChanges(domain: string): void {
    const website = getWebsite(domain);
    if (website) {
        website.deployment.pendingChanges++;
        website.updatedAt = Date.now();
        saveWebsite(website);
    }
}

/**
 * Clear pending changes (after deploy)
 */
export function clearPendingChanges(domain: string, commitSha: string): void {
    const website = getWebsite(domain);
    if (website) {
        website.deployment.pendingChanges = 0;
        website.deployment.lastDeployAt = Date.now();
        website.deployment.lastDeployCommit = commitSha;
        website.updatedAt = Date.now();
        saveWebsite(website);
    }
}

/**
 * Track AI provider usage for a website
 */
export function trackProviderUsage(
    domain: string,
    provider: string,
    model?: string
): void {
    const website = getWebsite(domain);
    if (!website) return;

    // Ensure providerHistory exists
    if (!website.fingerprint.providerHistory) {
        website.fingerprint.providerHistory = [];
    }

    const now = Date.now();

    // Find existing entry for this provider
    const existingIdx = website.fingerprint.providerHistory.findIndex(
        p => p.provider === provider
    );

    if (existingIdx >= 0) {
        // Update existing entry
        website.fingerprint.providerHistory[existingIdx].articlesGenerated++;
        website.fingerprint.providerHistory[existingIdx].lastUsedAt = now;
        if (model) {
            website.fingerprint.providerHistory[existingIdx].model = model;
        }
    } else {
        // Add new entry
        website.fingerprint.providerHistory.push({
            provider,
            model,
            articlesGenerated: 1,
            firstUsedAt: now,
            lastUsedAt: now
        });
    }

    // Update summary providers list
    if (!website.fingerprint.providers.includes(provider)) {
        website.fingerprint.providers.push(provider);
    }

    website.updatedAt = now;
    saveWebsite(website);
}

/**
 * Save article with AI generation tracking
 */
export function saveArticleWithTracking(
    domain: string,
    article: Article,
    aiInfo?: { provider: string; model?: string; promptVersion?: string }
): void {
    // Set AI generation info if provided
    if (aiInfo) {
        article.aiGeneration = {
            provider: aiInfo.provider,
            model: aiInfo.model,
            generatedAt: Date.now(),
            promptVersion: aiInfo.promptVersion
        };
        article.generatedBy = aiInfo.provider; // Legacy field
        article.generatedAt = Date.now();
        article.source = 'ai-generated';

        // Track provider usage at website level
        trackProviderUsage(domain, aiInfo.provider, aiInfo.model);
    }

    // Save article
    saveArticle(domain, article);
}

// Initialize article CRUD dependencies (resolves circular imports)
_initArticleCrudDeps({
    getWebsite,
    saveWebsite,
    incrementPendingChanges
});

// Initialize page CRUD dependencies
_initPageCrudDeps({
    incrementPendingChanges
});

// Initialize version control dependencies
_initVersionControlDeps({
    getWebsite,
    saveWebsite,
    listArticles
});

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
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
}

// Initialize migration dependencies
_initMigrationDeps({
    getWebsite,
    saveWebsite
});

// ============================================
// SELECTIVE DEPLOY
// ============================================

/**
 * Get detailed pending changes for selective deploy
 * Returns which element types have local changes not yet deployed
 */
export function getPendingChanges(domain: string): PendingChanges {
    const website = getWebsite(domain);
    const articles = listArticles(domain);
    const pages = listPages(domain);

    // Find unpublished articles
    const unpublishedArticles = articles
        .filter(a => a.status !== 'published')
        .map(a => a.id);

    // Find locally modified pages (use lastModified vs lastPublished if tracked)
    // For now, check if page has local copy
    const changedPages = pages
        .filter(p => !p.publishedAt || (p.lastModifiedAt && p.lastModifiedAt > (p.publishedAt || 0)))
        .map(p => p.id);

    // Check for local theme
    const localTheme = getTheme(domain);
    const hasThemeChanges = localTheme !== null && localTheme.globals !== '';

    // Check for local plugins
    const plugins = getInstalledPlugins(domain);
    const hasPluginChanges = plugins.length > 0;

    // Check template (if website has upgrade available)
    const hasTemplateChanges = website?.template.upgradeAvailable ? true : false;

    // Determine if any changes exist
    const hasChanges = hasThemeChanges ||
        unpublishedArticles.length > 0 ||
        changedPages.length > 0 ||
        hasPluginChanges;

    return {
        hasChanges,
        theme: hasThemeChanges,
        articles: unpublishedArticles,
        pages: changedPages,
        plugins: hasPluginChanges,
        template: hasTemplateChanges,
        summary: {
            themeLabel: hasThemeChanges ? 'Theme changes' : null,
            articlesLabel: unpublishedArticles.length > 0
                ? `${unpublishedArticles.length} article${unpublishedArticles.length > 1 ? 's' : ''}`
                : null,
            pagesLabel: changedPages.length > 0
                ? `${changedPages.length} page${changedPages.length > 1 ? 's' : ''}`
                : null,
            pluginsLabel: hasPluginChanges ? `${plugins.length} plugin${plugins.length > 1 ? 's' : ''}` : null,
            templateLabel: hasTemplateChanges ? 'Template update' : null,
        }
    };
}
