/**
 * Selective Deploy Operations
 * 
 * Functions for determining pending deployment changes
 */

import type { Website, Article, PendingChanges } from './types';
import { getTheme } from './themeCrud';
import { getInstalledPlugins } from './pluginCrud';

// Forward declarations for circular dependency resolution
let _getWebsite: (domain: string) => Website | null;
let _listArticles: (domain: string) => Article[];
let _listPages: (domain: string) => Article[];

/**
 * Initialize dependencies from main websiteStore
 */
export function _initSelectiveDeployDeps(deps: {
    getWebsite: typeof _getWebsite;
    listArticles: typeof _listArticles;
    listPages: typeof _listPages;
}) {
    _getWebsite = deps.getWebsite;
    _listArticles = deps.listArticles;
    _listPages = deps.listPages;
}

// ============================================
// SELECTIVE DEPLOY
// ============================================

/**
 * Get detailed pending changes for selective deploy
 * Returns which element types have local changes not yet deployed
 */
export function getPendingChanges(domain: string): PendingChanges {
    const website = _getWebsite(domain);
    const articles = _listArticles(domain);
    const pages = _listPages(domain);

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
