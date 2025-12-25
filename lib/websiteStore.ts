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
