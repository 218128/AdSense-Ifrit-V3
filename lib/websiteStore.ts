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
    incrementPendingChanges(domain);

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
    incrementPendingChanges(domain);

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
        incrementPendingChanges(domain);
        return true;
    }

    return false;
}

/**
 * Update website article stats
 */
function updateArticleStats(domain: string): void {
    const website = getWebsite(domain);
    if (!website) return;

    const articles = listArticles(domain);
    const publishedArticles = articles.filter(a => a.status === 'published');

    website.stats.articlesCount = articles.length;
    website.stats.totalWords = articles.reduce((sum, a) => sum + a.wordCount, 0);
    website.stats.lastPublishedAt = publishedArticles.length > 0
        ? Math.max(...publishedArticles.map(a => a.publishedAt || 0))
        : undefined;
    website.updatedAt = Date.now();

    saveWebsite(website);
}

// ============================================
// STRUCTURAL PAGES (About, Contact, Privacy, etc.)
// ============================================


/**
 * List all structural pages for a website
 */
export function listPages(domain: string): Article[] {
    const pagesDir = getPagesDir(domain);

    if (!fs.existsSync(pagesDir)) {
        return [];
    }

    const pages: Article[] = [];
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        try {
            const data = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
            pages.push(JSON.parse(data));
        } catch {
            // Skip invalid files
        }
    }

    return pages;
}

/**
 * Get a structural page by type
 */
export function getPage(domain: string, pageType: StructuralPageType): Article | null {
    const pagePath = getPagePath(domain, pageType);

    if (!fs.existsSync(pagePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(pagePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * Save a structural page
 */
export function savePage(domain: string, page: Article): void {
    ensureWebsiteDir(domain);

    if (!page.structuralType) {
        throw new Error('Page must have a structuralType');
    }

    const pagePath = getPagePath(domain, page.structuralType);
    fs.writeFileSync(pagePath, JSON.stringify(page, null, 2));
    incrementPendingChanges(domain);
}

/**
 * Update a structural page
 */
export function updatePage(domain: string, pageType: StructuralPageType, updates: Partial<Article>): Article | null {
    const page = getPage(domain, pageType);
    if (!page) return null;

    const updated = {
        ...page,
        ...updates,
        lastModifiedAt: Date.now()
    };
    savePage(domain, updated);

    return updated;
}

/**
 * Delete a structural page
 */
export function deletePage(domain: string, pageType: StructuralPageType): boolean {
    const pagePath = getPagePath(domain, pageType);

    if (fs.existsSync(pagePath)) {
        fs.unlinkSync(pagePath);
        incrementPendingChanges(domain);
        return true;
    }

    return false;
}

/**
 * Create default structural pages for a website
 */
export function createDefaultPages(domain: string, siteName: string, author: { name: string; role: string; bio?: string }): void {
    const now = Date.now();

    const defaultPages: Partial<Article>[] = [
        {
            id: `page_about_${now}`,
            slug: 'about',
            title: `About ${siteName}`,
            description: `Learn more about ${siteName} and our team.`,
            pageType: 'structural',
            structuralType: 'about',
            content: `# About ${siteName}\n\n${siteName} is your trusted source for expert insights and guides.\n\n## Our Mission\n\nWe're dedicated to providing accurate, helpful information to our readers.\n\n## Meet Our Team\n\n### ${author.name}\n**${author.role}**\n\n${author.bio || 'Passionate about creating valuable content.'}`,
        },
        {
            id: `page_contact_${now}`,
            slug: 'contact',
            title: `Contact Us - ${siteName}`,
            description: `Get in touch with the ${siteName} team.`,
            pageType: 'structural',
            structuralType: 'contact',
            content: `# Contact Us\n\nWe'd love to hear from you!\n\n## Get In Touch\n\n**Email**: contact@${domain}\n\n## What We Can Help With\n\n- General questions\n- Feedback on our content\n- Partnership opportunities`,
        },
        {
            id: `page_privacy_${now}`,
            slug: 'privacy',
            title: `Privacy Policy - ${siteName}`,
            description: `Privacy Policy for ${siteName}.`,
            pageType: 'structural',
            structuralType: 'privacy',
            content: `# Privacy Policy\n\n*Last updated: ${new Date().toLocaleDateString()}*\n\nThis Privacy Policy describes how ${siteName} collects, uses, and protects your information.\n\n## Information We Collect\n\nWe collect information you provide directly and through cookies/analytics.\n\n## How We Use Your Information\n\n- To improve our content\n- To communicate with you\n- To comply with legal obligations`,
        },
        {
            id: `page_terms_${now}`,
            slug: 'terms',
            title: `Terms of Service - ${siteName}`,
            description: `Terms of Service for ${siteName}.`,
            pageType: 'structural',
            structuralType: 'terms',
            content: `# Terms of Service\n\n*Last updated: ${new Date().toLocaleDateString()}*\n\nBy using ${siteName}, you agree to these Terms of Service.\n\n## Use of Content\n\nAll content is provided for informational purposes only.\n\n## Intellectual Property\n\nAll content is owned by ${siteName} unless otherwise noted.`,
        },
    ];

    for (const pageData of defaultPages) {
        const page: Article = {
            ...pageData as Article,
            category: 'Pages',
            tags: [],
            contentType: 'structural',
            wordCount: (pageData.content || '').split(/\s+/).length,
            readingTime: Math.ceil((pageData.content || '').split(/\s+/).length / 200),
            eeatSignals: [],
            aiOverviewBlocks: [],
            isExternal: false,
            source: 'manual',
            status: 'published',
            lastModifiedAt: now,
            publishedAt: now,
        };
        savePage(domain, page);
    }
}

// ============================================
// THEME CRUD
// ============================================

const MAX_THEME_VERSIONS = 10;


/**
 * Parse CSS variables from globals.css content
 */
function parseCssVariables(css: string): ThemeConfig['variables'] {
    const defaults: ThemeConfig['variables'] = {
        primaryColor: '#2563eb',
        secondaryColor: '#10b981',
        bgColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'Inter, sans-serif'
    };

    const primaryMatch = css.match(/--color-primary:\s*([^;]+);/);
    const secondaryMatch = css.match(/--color-secondary:\s*([^;]+);/);
    const bgMatch = css.match(/--color-bg:\s*([^;]+);/);
    const textMatch = css.match(/--color-text:\s*([^;]+);/);
    const fontMatch = css.match(/--font-sans:\s*([^;]+);/);

    return {
        primaryColor: primaryMatch?.[1]?.trim() || defaults.primaryColor,
        secondaryColor: secondaryMatch?.[1]?.trim() || defaults.secondaryColor,
        bgColor: bgMatch?.[1]?.trim() || defaults.bgColor,
        textColor: textMatch?.[1]?.trim() || defaults.textColor,
        fontFamily: fontMatch?.[1]?.trim() || defaults.fontFamily
    };
}

/**
 * Save theme configuration
 */
export function saveTheme(domain: string, theme: Partial<ThemeConfig>): void {
    ensureThemeDir(domain);
    const themeDir = getThemeDir(domain);

    // Get existing theme or create new
    const existing = getTheme(domain);
    const now = Date.now();

    const config: ThemeConfig = {
        globals: theme.globals ?? existing?.globals ?? '',
        variables: theme.variables ?? existing?.variables ?? parseCssVariables(theme.globals || ''),
        custom: theme.custom ?? existing?.custom,
        lastModifiedAt: now
    };

    // Save globals.css file
    if (config.globals) {
        fs.writeFileSync(path.join(themeDir, 'globals.css'), config.globals, 'utf-8');
    }

    // Save variables.json
    fs.writeFileSync(
        path.join(themeDir, 'variables.json'),
        JSON.stringify(config.variables, null, 2),
        'utf-8'
    );

    // Save custom.css if provided
    if (config.custom) {
        fs.writeFileSync(path.join(themeDir, 'custom.css'), config.custom, 'utf-8');
    }

    // Save metadata
    fs.writeFileSync(
        path.join(themeDir, 'theme.json'),
        JSON.stringify({ lastModifiedAt: config.lastModifiedAt }, null, 2),
        'utf-8'
    );
}

/**
 * Get theme configuration
 */
export function getTheme(domain: string): ThemeConfig | null {
    const themeDir = getThemeDir(domain);

    if (!fs.existsSync(themeDir)) {
        return null;
    }

    const globalsPath = path.join(themeDir, 'globals.css');
    const variablesPath = path.join(themeDir, 'variables.json');
    const customPath = path.join(themeDir, 'custom.css');
    const metaPath = path.join(themeDir, 'theme.json');

    let globals = '';
    let variables: ThemeConfig['variables'] = {
        primaryColor: '#2563eb',
        secondaryColor: '#10b981',
        bgColor: '#ffffff',
        textColor: '#1f2937'
    };
    let custom: string | undefined;
    let lastModifiedAt = Date.now();

    if (fs.existsSync(globalsPath)) {
        globals = fs.readFileSync(globalsPath, 'utf-8');
        variables = parseCssVariables(globals);
    }

    if (fs.existsSync(variablesPath)) {
        try {
            variables = JSON.parse(fs.readFileSync(variablesPath, 'utf-8'));
        } catch { /* use parsed */ }
    }

    if (fs.existsSync(customPath)) {
        custom = fs.readFileSync(customPath, 'utf-8');
    }

    if (fs.existsSync(metaPath)) {
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            lastModifiedAt = meta.lastModifiedAt || lastModifiedAt;
        } catch { /* use default */ }
    }

    return { globals, variables, custom, lastModifiedAt };
}

/**
 * Save a version snapshot of the theme
 */
export function saveThemeVersion(
    domain: string,
    reason: ThemeVersion['reason'] = 'auto'
): ThemeVersion | null {
    const theme = getTheme(domain);
    if (!theme) return null;

    ensureThemeDir(domain);
    const versionsDir = getThemeVersionsDir(domain);

    const version: ThemeVersion = {
        id: `theme_v_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        globals: theme.globals,
        variables: theme.variables,
        savedAt: Date.now(),
        reason
    };

    // Save version file
    fs.writeFileSync(
        path.join(versionsDir, `${version.id}.json`),
        JSON.stringify(version, null, 2),
        'utf-8'
    );

    // Clean up old versions (keep MAX_THEME_VERSIONS)
    const versions = listThemeVersions(domain);
    if (versions.length > MAX_THEME_VERSIONS) {
        const toDelete = versions.slice(MAX_THEME_VERSIONS);
        for (const v of toDelete) {
            const vPath = path.join(versionsDir, `${v.id}.json`);
            if (fs.existsSync(vPath)) {
                fs.unlinkSync(vPath);
            }
        }
    }

    return version;
}

/**
 * List theme versions
 */
export function listThemeVersions(domain: string): ThemeVersion[] {
    const versionsDir = getThemeVersionsDir(domain);

    if (!fs.existsSync(versionsDir)) {
        return [];
    }

    const files = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json'));
    const versions: ThemeVersion[] = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(versionsDir, file), 'utf-8');
            versions.push(JSON.parse(content));
        } catch { /* skip invalid */ }
    }

    // Sort by savedAt descending (newest first)
    return versions.sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Restore theme to a previous version
 */
export function restoreThemeVersion(domain: string, versionId: string): boolean {
    const versions = listThemeVersions(domain);
    const version = versions.find(v => v.id === versionId);

    if (!version) {
        return false;
    }

    // Save current as backup before restore
    saveThemeVersion(domain, 'before-edit');

    // Restore
    saveTheme(domain, {
        globals: version.globals,
        variables: version.variables
    });

    return true;
}

// ============================================
// PLUGIN MANAGEMENT
// ============================================

export interface Plugin {
    name: string;           // npm package name
    version: string;        // semver version
    installedAt: number;
    description?: string;
}


/**
 * Get installed plugins for a website
 */
export function getInstalledPlugins(domain: string): Plugin[] {
    const pluginsPath = path.join(getPluginsDir(domain), 'installed.json');

    if (!fs.existsSync(pluginsPath)) {
        return [];
    }

    try {
        const content = fs.readFileSync(pluginsPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

/**
 * Install a plugin (add to local registry)
 */
export function installPlugin(
    domain: string,
    name: string,
    version: string,
    description?: string
): Plugin {
    ensurePluginsDir(domain);

    const plugins = getInstalledPlugins(domain);

    // Check if already installed
    const existing = plugins.find(p => p.name === name);
    if (existing) {
        // Update version
        existing.version = version;
        existing.installedAt = Date.now();
        if (description) existing.description = description;
    } else {
        // Add new
        plugins.push({
            name,
            version,
            installedAt: Date.now(),
            description
        });
    }

    // Save
    const pluginsPath = path.join(getPluginsDir(domain), 'installed.json');
    fs.writeFileSync(pluginsPath, JSON.stringify(plugins, null, 2), 'utf-8');

    return plugins.find(p => p.name === name)!;
}

/**
 * Uninstall a plugin (remove from local registry)
 */
export function uninstallPlugin(domain: string, name: string): boolean {
    const plugins = getInstalledPlugins(domain);
    const index = plugins.findIndex(p => p.name === name);

    if (index === -1) {
        return false;
    }

    plugins.splice(index, 1);

    const pluginsPath = path.join(getPluginsDir(domain), 'installed.json');
    fs.writeFileSync(pluginsPath, JSON.stringify(plugins, null, 2), 'utf-8');

    return true;
}

/**
 * Get package.json with installed plugins merged
 * Used when deploying to include local plugins
 */
export function getMergedPackageJson(
    domain: string,
    basePackageJson: Record<string, unknown>
): Record<string, unknown> {
    const plugins = getInstalledPlugins(domain);

    if (plugins.length === 0) {
        return basePackageJson;
    }

    // Clone base
    const merged = JSON.parse(JSON.stringify(basePackageJson));

    // Ensure dependencies object exists
    if (!merged.dependencies) {
        merged.dependencies = {};
    }

    // Add plugins (additive only - never remove)
    for (const plugin of plugins) {
        merged.dependencies[plugin.name] = plugin.version;
    }

    return merged;
}

// ============================================
// VERSION CONTROL
// ============================================

const MAX_VERSIONS = 5;

/**
 * Add a new version to history
 */
export function addVersion(
    domain: string,
    templateVersion: string,
    commitSha: string,
    changes: string[]
): WebsiteVersion {
    const website = getWebsite(domain);
    if (!website) throw new Error(`Website ${domain} not found`);

    // Generate next version number
    const currentVersionNum = website.versions.length > 0
        ? parseInt(website.versions[0].version.split('.')[2]) + 1
        : 1;
    const newVersion = `1.0.${currentVersionNum}`;

    const version: WebsiteVersion = {
        version: newVersion,
        templateVersion,
        deployedAt: Date.now(),
        commitSha,
        changes,
        canRollback: true
    };

    // Add to front, keep last MAX_VERSIONS
    website.versions.unshift(version);
    if (website.versions.length > MAX_VERSIONS) {
        website.versions[MAX_VERSIONS - 1].canRollback = false;
        website.versions = website.versions.slice(0, MAX_VERSIONS);
    }

    website.template.version = templateVersion;
    website.updatedAt = Date.now();
    saveWebsite(website);

    // Save version snapshot
    saveVersionSnapshot(domain, version);

    return version;
}

/**
 * Save version snapshot for rollback
 */
function saveVersionSnapshot(domain: string, version: WebsiteVersion): void {
    const versionsDir = getVersionsDir(domain);
    const snapshotPath = path.join(versionsDir, `${version.version}.json`);

    const website = getWebsite(domain);
    if (!website) return;

    const snapshot = {
        version,
        template: website.template,
        fingerprint: website.fingerprint,
        savedAt: Date.now()
    };

    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
}

/**
 * Get version history
 */
export function getVersionHistory(domain: string): WebsiteVersion[] {
    const website = getWebsite(domain);
    return website?.versions || [];
}

/**
 * Update commit SHA on a version record after deployment
 */
export function updateVersionCommit(
    domain: string,
    version: string,
    commitSha: string
): boolean {
    const website = getWebsite(domain);
    if (!website) return false;

    const versionRecord = website.versions.find(v => v.version === version);
    if (versionRecord) {
        versionRecord.commitSha = commitSha;
        versionRecord.deployedAt = Date.now();
        saveWebsite(website);
        return true;
    }
    return false;
}

/**
 * Check content compatibility before rollback
 */
export function checkContentCompatibility(
    domain: string,
    targetVersion: string
): ContentCompatibilityWarning[] {
    const warnings: ContentCompatibilityWarning[] = [];
    const versionsDir = getVersionsDir(domain);
    const snapshotPath = path.join(versionsDir, `${targetVersion}.json`);

    if (!fs.existsSync(snapshotPath)) {
        return warnings;
    }

    try {
        const snapshotData = fs.readFileSync(snapshotPath, 'utf-8');
        const snapshot = JSON.parse(snapshotData);
        const currentWebsite = getWebsite(domain);
        const articles = listArticles(domain);

        // Check template compatibility
        if (snapshot.template.id !== currentWebsite?.template.id) {
            warnings.push({
                type: 'schema_mismatch',
                description: `Template type changed from ${snapshot.template.id} to ${currentWebsite?.template.id}`,
                affectedItems: articles.map(a => a.slug),
                suggestedAction: 'Review article layouts and reorganize categories'
            });
        }

        // Check content strategy compatibility
        if (snapshot.fingerprint?.contentStrategy !== currentWebsite?.fingerprint.contentStrategy) {
            const articlesByType = articles.reduce((acc, a) => {
                acc[a.contentType] = (acc[a.contentType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            warnings.push({
                type: 'missing_category',
                description: 'Content strategy changed, some article types may not align',
                affectedItems: Object.keys(articlesByType),
                suggestedAction: 'Review article categorization after rollback'
            });
        }
    } catch {
        // Unable to check, return empty
    }

    return warnings;
}

/**
 * Rollback to a previous version (template only)
 */
export function rollbackToVersion(domain: string, targetVersion: string): {
    success: boolean;
    warnings: ContentCompatibilityWarning[];
    error?: string;
} {
    const website = getWebsite(domain);
    if (!website) {
        return { success: false, warnings: [], error: 'Website not found' };
    }

    const targetVersionInfo = website.versions.find(v => v.version === targetVersion);
    if (!targetVersionInfo || !targetVersionInfo.canRollback) {
        return { success: false, warnings: [], error: 'Version not found or cannot rollback' };
    }

    // Check compatibility
    const warnings = checkContentCompatibility(domain, targetVersion);

    // Load snapshot
    const versionsDir = getVersionsDir(domain);
    const snapshotPath = path.join(versionsDir, `${targetVersion}.json`);

    if (!fs.existsSync(snapshotPath)) {
        return { success: false, warnings, error: 'Version snapshot not found' };
    }

    try {
        const snapshotData = fs.readFileSync(snapshotPath, 'utf-8');
        const snapshot = JSON.parse(snapshotData);

        // Rollback template only (keep content)
        website.template = snapshot.template;
        website.fingerprint = snapshot.fingerprint;
        website.status = 'pending-deploy';
        website.updatedAt = Date.now();

        saveWebsite(website);

        return { success: true, warnings };
    } catch (error) {
        return {
            success: false,
            warnings,
            error: error instanceof Error ? error.message : 'Rollback failed'
        };
    }
}

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

// ============================================
// MIGRATION
// ============================================

/**
 * Migrate from old storage systems
 */
export function migrateFromLegacy(): { migrated: string[]; errors: string[] } {
    const migrated: string[] = [];
    const errors: string[] = [];

    // 1. Check for templates folder
    const templatesDir = path.join(process.cwd(), 'templates');
    if (fs.existsSync(templatesDir)) {
        const templateFolders = fs.readdirSync(templatesDir, { withFileTypes: true })
            .filter(d => d.isDirectory());

        for (const folder of templateFolders) {
            const configPath = path.join(templatesDir, folder.name, 'site-config.yaml');
            if (fs.existsSync(configPath)) {
                try {
                    const yamlContent = fs.readFileSync(configPath, 'utf-8');
                    const domain = extractDomainFromYaml(yamlContent);

                    if (domain && !getWebsite(domain)) {
                        const website = createWebsiteFromYaml(yamlContent, folder.name);
                        if (website) {
                            saveWebsite(website);
                            migrated.push(domain);
                        }
                    }
                } catch (e) {
                    errors.push(`Failed to migrate ${folder.name}: ${e}`);
                }
            }
        }
    }

    // 2. Check for job store completed jobs
    const jobsDir = path.join(process.cwd(), '.site-builder-jobs');
    if (fs.existsSync(jobsDir)) {
        const jobFiles = fs.readdirSync(jobsDir).filter(f => f.endsWith('.json'));

        for (const file of jobFiles) {
            try {
                const jobData = fs.readFileSync(path.join(jobsDir, file), 'utf-8');
                const job = JSON.parse(jobData);

                if (job.status === 'complete' && job.config?.domain) {
                    const domain = job.config.domain;
                    if (!getWebsite(domain)) {
                        const website = createWebsiteFromJob(job);
                        if (website) {
                            saveWebsite(website);
                            migrated.push(domain);
                        }
                    }
                }
            } catch (e) {
                errors.push(`Failed to migrate job ${file}: ${e}`);
            }
        }
    }

    return { migrated, errors };
}

function extractDomainFromYaml(yaml: string): string | null {
    const match = yaml.match(/domain:\s*["']?([^"'\n]+)["']?/);
    return match ? match[1].trim() : null;
}

function createWebsiteFromYaml(yaml: string, templateFolder: string): Website | null {
    const domain = extractDomainFromYaml(yaml);
    if (!domain) return null;

    const nameMatch = yaml.match(/name:\s*["']?([^"'\n]+)["']?/);
    const nicheMatch = yaml.match(/category:\s*["']?([^"'\n]+)["']?/);
    const authorMatch = yaml.match(/author:\s*\n\s*name:\s*["']?([^"'\n]+)["']?/);

    return {
        id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        domain,
        name: nameMatch ? nameMatch[1] : domain.split('.')[0],
        niche: nicheMatch ? nicheMatch[1] : 'general',
        template: {
            id: 'niche-authority',
            version: '1.0.0',
            installedAt: Date.now()
        },
        fingerprint: {
            providers: [],
            providerHistory: [],
            contentStrategy: 'unknown',
            eeatEnabled: false,
            aiOverviewOptimized: false,
            generatedAt: Date.now(),
            articleTemplatesUsed: []
        },
        deployment: {
            githubRepo: '',
            githubOwner: '',
            vercelProject: '',
            liveUrl: `https://${domain}`,
            pendingChanges: 0
        },
        stats: {
            articlesCount: 0,
            totalWords: 0,
            estimatedMonthlyRevenue: 0
        },
        versions: [],
        author: {
            name: authorMatch ? authorMatch[1] : 'Unknown',
            role: 'Author'
        },
        status: 'live',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createWebsiteFromJob(job: Record<string, any>): Website | null {
    if (!job.config?.domain) return null;

    const config = job.config;

    return {
        id: job.id || `site_${Date.now()}`,
        domain: config.domain!,
        name: config.siteName || config.domain!.split('.')[0],
        niche: config.niche || 'general',
        template: {
            id: config.template || 'niche-authority',
            version: '1.0.0',
            installedAt: job.createdAt || Date.now()
        },
        fingerprint: {
            providers: Object.keys(job.providerUsage || {}),
            providerHistory: [],
            contentStrategy: 'unknown',
            eeatEnabled: config.contentStrategy?.enableEEATPages || false,
            aiOverviewOptimized: config.contentStrategy?.enableAIOverviewOptimization || false,
            generatedAt: job.createdAt || Date.now(),
            articleTemplatesUsed: []
        },
        deployment: {
            githubRepo: job.githubConfig?.repo || '',
            githubOwner: job.githubConfig?.owner || '',
            vercelProject: '',
            liveUrl: `https://${config.domain}`,
            pendingChanges: 0
        },
        stats: {
            articlesCount: job.progress?.completed || 0,
            totalWords: 0,
            estimatedMonthlyRevenue: 0
        },
        versions: [{
            version: '1.0.1',
            templateVersion: '1.0.0',
            deployedAt: job.completedAt || Date.now(),
            commitSha: '',
            changes: ['Initial site creation'],
            canRollback: false
        }],
        author: {
            name: config.author?.name || 'Unknown',
            role: config.author?.role || 'Author',
            experience: config.author?.experience
        },
        status: job.status === 'complete' ? 'live' : 'building',
        createdAt: job.createdAt || Date.now(),
        updatedAt: job.updatedAt || Date.now()
    };
}

// ============================================
// DOMAIN PROFILE STORAGE
// ============================================

function ensureProfilesDir(): void {
    if (!fs.existsSync(PROFILES_DIR)) {
        fs.mkdirSync(PROFILES_DIR, { recursive: true });
    }
}

function getProfilePath(domain: string): string {
    return path.join(PROFILES_DIR, `${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}.json`);
}

/**
 * Save domain research profile
 */
export function saveDomainProfile(profile: DomainProfile): void {
    ensureProfilesDir();
    const profilePath = getProfilePath(profile.domain);
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
}

/**
 * Get domain profile by domain name
 */
export function getDomainProfile(domain: string): DomainProfile | null {
    const profilePath = getProfilePath(domain);

    if (!fs.existsSync(profilePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(profilePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * List all saved domain profiles
 */
export function listDomainProfiles(): DomainProfile[] {
    ensureProfilesDir();

    const profiles: DomainProfile[] = [];
    const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
        try {
            const data = fs.readFileSync(path.join(PROFILES_DIR, file), 'utf-8');
            profiles.push(JSON.parse(data));
        } catch {
            // Skip invalid files
        }
    }

    return profiles.sort((a, b) => b.researchedAt - a.researchedAt);
}

/**
 * Delete a domain profile
 */
export function deleteDomainProfile(domain: string): boolean {
    const profilePath = getProfilePath(domain);

    if (fs.existsSync(profilePath)) {
        fs.unlinkSync(profilePath);
        return true;
    }
    return false;
}

/**
 * Mark profile as transferred to website
 */
export function markProfileTransferred(domain: string): void {
    const profile = getDomainProfile(domain);
    if (profile) {
        profile.transferredToWebsite = true;
        profile.websiteCreatedAt = Date.now();
        saveDomainProfile(profile);
    }
}

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
