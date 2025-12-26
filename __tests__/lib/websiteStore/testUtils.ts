/**
 * Test Utilities for WebsiteStore Modules
 * 
 * Provides mock factories, type helpers, and test data generators
 */

import type {
    Website,
    Article,
    ThemeConfig,
    ThemeVersion,
    ArticleVersion,
    WebsiteVersion,
    DomainProfile,
    PendingChanges
} from '@/lib/websiteStore/types';

// ============================================
// MOCK FACTORIES
// ============================================

/**
 * Create a mock Website object
 */
export function createMockWebsite(overrides: Partial<Website> = {}): Website {
    const now = Date.now();
    return {
        id: `web_${now}`,
        domain: 'test-domain.com',
        name: 'Test Website',
        description: 'A test website',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        template: {
            name: 'starter',
            version: '1.0.0',
            installedAt: now,
            upgradeAvailable: false,
            features: ['blog', 'ads'],
            category: 'general'
        },
        deployment: {
            status: 'deployed',
            lastDeployAt: now,
            lastDeployCommit: 'abc123',
            pendingChanges: 0,
            gitRemote: 'https://github.com/test/repo'
        },
        seo: {
            description: 'Test SEO description',
            keywords: ['test'],
            canonical: 'https://test-domain.com'
        },
        settings: {
            adsEnabled: true,
            adUnits: [],
            analyticsId: '',
            adsTxtPath: '/ads.txt'
        },
        fingerprint: {
            providers: [],
            totalArticles: 0,
            lastGeneratedAt: undefined,
            providerHistory: []
        },
        stats: {
            articlesCount: 0,
            totalWords: 0,
            lastPublishedAt: undefined
        },
        versions: [],
        linkedDomainProfile: undefined,
        ...overrides
    } as Website;
}

/**
 * Create a mock Article object
 */
export function createMockArticle(overrides: Partial<Article> = {}): Article {
    const now = Date.now();
    return {
        id: `art_${now}_${Math.random().toString(36).substr(2, 9)}`,
        slug: 'test-article',
        title: 'Test Article Title',
        description: 'Test article description',
        content: '# Test Content\n\nThis is test content.',
        category: 'general',
        tags: ['test', 'mock'],
        coverImage: undefined,
        contentImages: [],
        contentType: 'blog',
        pageType: 'article',
        wordCount: 10,
        readingTime: 1,
        eeatSignals: [],
        aiOverviewBlocks: [],
        generatedBy: 'gemini',
        generatedAt: now,
        isExternal: false,
        source: 'ai-generated',
        status: 'draft',
        lastModifiedAt: now,
        ...overrides
    };
}

/**
 * Create a mock ThemeConfig object
 */
export function createMockTheme(overrides: Partial<ThemeConfig> = {}): ThemeConfig {
    return {
        globals: ':root { --primary: blue; }',
        components: {
            header: '.header { background: white; }',
            footer: '.footer { background: gray; }',
            article: '.article { max-width: 800px; }'
        },
        overrides: '',
        ...overrides
    };
}

/**
 * Create a mock DomainProfile object
 */
export function createMockDomainProfile(overrides: Partial<DomainProfile> = {}): DomainProfile {
    const now = Date.now();
    return {
        domain: 'test-domain.com',
        niche: 'technology',
        targetKeywords: ['tech', 'software'],
        competitorDomains: ['competitor.com'],
        monetizationStrategy: 'adsense',
        notes: 'Test notes',
        researchedAt: now,
        transferredToWebsite: false,
        ...overrides
    };
}

/**
 * Create a mock ArticleVersion object
 */
export function createMockArticleVersion(overrides: Partial<ArticleVersion> = {}): ArticleVersion {
    const now = Date.now();
    return {
        versionId: `v_${now}`,
        articleId: `art_${now}`,
        title: 'Test Article Version',
        content: '# Versioned Content',
        createdAt: now,
        note: 'Test version',
        ...overrides
    };
}

/**
 * Create a mock ThemeVersion object
 */
export function createMockThemeVersion(overrides: Partial<ThemeVersion> = {}): ThemeVersion {
    const now = Date.now();
    return {
        versionId: `tv_${now}`,
        theme: createMockTheme(),
        createdAt: now,
        note: 'Test theme version',
        ...overrides
    };
}

/**
 * Create a mock WebsiteVersion object
 */
export function createMockWebsiteVersion(overrides: Partial<WebsiteVersion> = {}): WebsiteVersion {
    const now = Date.now();
    return {
        versionId: `wv_${now}`,
        createdAt: now,
        note: 'Test website version',
        metadata: createMockWebsite(),
        articleIds: [],
        ...overrides
    };
}

/**
 * Create a mock PendingChanges object
 */
export function createMockPendingChanges(overrides: Partial<PendingChanges> = {}): PendingChanges {
    return {
        hasChanges: false,
        theme: false,
        articles: [],
        pages: [],
        plugins: false,
        template: false,
        summary: {
            themeLabel: null,
            articlesLabel: null,
            pagesLabel: null,
            pluginsLabel: null,
            templateLabel: null
        },
        ...overrides
    };
}

// ============================================
// FS MOCK HELPERS
// ============================================

/**
 * Create a mock file system state
 */
export function createMockFileSystem(): Record<string, string> {
    return {};
}

/**
 * Setup fs mock to use virtual file system
 */
export function setupFsMock(virtualFs: Record<string, string>) {
    const fs = require('fs');

    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path in virtualFs || Object.keys(virtualFs).some(p => p.startsWith(path + '/'));
    });

    (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path in virtualFs) {
            return virtualFs[path];
        }
        throw new Error(`ENOENT: no such file or directory: ${path}`);
    });

    (fs.writeFileSync as jest.Mock).mockImplementation((path: string, content: string) => {
        virtualFs[path] = content;
    });

    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);

    (fs.readdirSync as jest.Mock).mockImplementation((dir: string, options?: { withFileTypes?: boolean }) => {
        const entries = Object.keys(virtualFs)
            .filter(p => p.startsWith(dir + '/'))
            .map(p => {
                const relativePath = p.slice(dir.length + 1);
                const firstPart = relativePath.split('/')[0];
                return firstPart;
            })
            .filter((v, i, a) => a.indexOf(v) === i); // unique

        if (options?.withFileTypes) {
            return entries.map(name => ({
                name,
                isDirectory: () => Object.keys(virtualFs).some(p => p.startsWith(`${dir}/${name}/`)),
                isFile: () => `${dir}/${name}` in virtualFs
            }));
        }
        return entries;
    });

    (fs.unlinkSync as jest.Mock).mockImplementation((path: string) => {
        delete virtualFs[path];
    });

    (fs.rmSync as jest.Mock).mockImplementation((path: string) => {
        Object.keys(virtualFs)
            .filter(p => p.startsWith(path))
            .forEach(p => delete virtualFs[p]);
    });

    return virtualFs;
}

// ============================================
// DEPENDENCY INJECTION HELPERS
// ============================================

/**
 * Create mock dependencies for articleCrud
 */
export function createMockArticleCrudDeps() {
    return {
        getWebsite: jest.fn().mockReturnValue(createMockWebsite()),
        saveWebsite: jest.fn(),
        incrementPendingChanges: jest.fn()
    };
}

/**
 * Create mock dependencies for pageCrud
 */
export function createMockPageCrudDeps() {
    return {
        incrementPendingChanges: jest.fn()
    };
}

/**
 * Create mock dependencies for versionControl
 */
export function createMockVersionControlDeps() {
    return {
        getWebsite: jest.fn().mockReturnValue(createMockWebsite()),
        saveWebsite: jest.fn(),
        listArticles: jest.fn().mockReturnValue([])
    };
}

/**
 * Create mock dependencies for migration
 */
export function createMockMigrationDeps() {
    return {
        getWebsite: jest.fn().mockReturnValue(null),
        saveWebsite: jest.fn()
    };
}

/**
 * Create mock dependencies for profileCrud
 */
export function createMockProfileCrudDeps() {
    return {
        PROFILES_DIR: '/tmp/test-profiles'
    };
}

/**
 * Create mock dependencies for externalContent
 */
export function createMockExternalContentDeps() {
    return {
        generateArticleId: jest.fn().mockReturnValue('art_12345'),
        saveArticle: jest.fn()
    };
}

/**
 * Create mock dependencies for selectiveDeploy
 */
export function createMockSelectiveDeployDeps() {
    return {
        getWebsite: jest.fn().mockReturnValue(createMockWebsite()),
        listArticles: jest.fn().mockReturnValue([]),
        listPages: jest.fn().mockReturnValue([]),
        getTheme: jest.fn().mockReturnValue(null),
        getInstalledPlugins: jest.fn().mockReturnValue([])
    };
}
