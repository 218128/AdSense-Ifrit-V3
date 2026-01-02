/**
 * Tests for selectiveDeploy.ts - Selective Deploy Operations
 */

import {
    createMockWebsite,
    createMockArticle,
    createMockTheme,
    createMockSelectiveDeployDeps
} from './testUtils';

import {
    getPendingChanges,
    _initSelectiveDeployDeps
} from '@/lib/websiteStore/selectiveDeploy';

describe('selectiveDeploy.ts', () => {
    let mockDeps: ReturnType<typeof createMockSelectiveDeployDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockSelectiveDeployDeps();
        _initSelectiveDeployDeps(mockDeps);
    });

    describe('getPendingChanges()', () => {
        it('should return no changes when everything is up to date', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([
                createMockArticle({ status: 'published' })
            ]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.hasChanges).toBe(false);
            expect(result.articles).toHaveLength(0);
            expect(result.pages).toHaveLength(0);
            expect(result.theme).toBe(false);
            expect(result.plugins).toBe(false);
        });

        it('should detect unpublished articles', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([
                createMockArticle({ id: 'art_1', status: 'draft' }),
                createMockArticle({ id: 'art_2', status: 'published' }),
                createMockArticle({ id: 'art_3', status: 'draft' })
            ]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.hasChanges).toBe(true);
            expect(result.articles).toHaveLength(2);
            expect(result.articles).toContain('art_1');
            expect(result.articles).toContain('art_3');
            expect(result.summary.articlesLabel).toContain('2 articles');
        });

        it('should detect single unpublished article with correct grammar', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([
                createMockArticle({ id: 'art_1', status: 'draft' })
            ]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.summary.articlesLabel).toBe('1 article');
        });

        it('should detect modified pages', () => {
            const oldTime = Date.now() - 10000;

            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([
                createMockArticle({
                    id: 'page_about',
                    publishedAt: oldTime,
                    lastModifiedAt: Date.now()
                }),
                createMockArticle({
                    id: 'page_contact',
                    publishedAt: Date.now(),
                    lastModifiedAt: oldTime
                })
            ]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.hasChanges).toBe(true);
            expect(result.pages).toHaveLength(1);
            expect(result.pages).toContain('page_about');
        });

        it('should detect unpublished pages (no publishedAt)', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([
                createMockArticle({ id: 'page_new', publishedAt: undefined })
            ]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.hasChanges).toBe(true);
            expect(result.pages).toContain('page_new');
        });

        it('should detect theme changes', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(createMockTheme({ globals: '.custom {}' }));
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.hasChanges).toBe(true);
            expect(result.theme).toBe(true);
            expect(result.summary.themeLabel).toBe('Theme changes');
        });

        it('should not detect theme changes when globals is empty', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(createMockTheme({ globals: '' }));
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.theme).toBe(false);
        });

        it('should detect plugin changes', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([
                { name: 'social-share' },
                { name: 'analytics' }
            ]);

            const result = getPendingChanges('test-site.com');

            expect(result.hasChanges).toBe(true);
            expect(result.plugins).toBe(true);
            expect(result.summary.pluginsLabel).toBe('2 plugins');
        });

        it('should detect single plugin with correct grammar', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([{ name: 'single' }]);

            const result = getPendingChanges('test-site.com');

            expect(result.summary.pluginsLabel).toBe('1 plugin');
        });

        it('should detect template upgrade available', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite({
                template: {
                    name: 'starter',
                    version: '1.0.0',
                    installedAt: Date.now(),
                    upgradeAvailable: 'true', // String to match type
                    features: [],
                    category: 'general'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock partial object
                } as any
            }));
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.template).toBe(true);
            expect(result.summary.templateLabel).toBe('Template update');
        });

        it('should detect multiple change types at once', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([
                createMockArticle({ status: 'draft' })
            ]);
            mockDeps.listPages.mockReturnValue([
                createMockArticle({ publishedAt: undefined })
            ]);
            mockDeps.getTheme.mockReturnValue(createMockTheme());
            mockDeps.getInstalledPlugins.mockReturnValue([{ name: 'test' }]);

            const result = getPendingChanges('test-site.com');

            expect(result.hasChanges).toBe(true);
            expect(result.articles).toHaveLength(1);
            expect(result.pages).toHaveLength(1);
            expect(result.theme).toBe(true);
            expect(result.plugins).toBe(true);
        });

        it('should return null labels for unchanged categories', () => {
            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            mockDeps.listPages.mockReturnValue([]);
            mockDeps.getTheme.mockReturnValue(null);
            mockDeps.getInstalledPlugins.mockReturnValue([]);

            const result = getPendingChanges('test-site.com');

            expect(result.summary.themeLabel).toBeNull();
            expect(result.summary.articlesLabel).toBeNull();
            expect(result.summary.pagesLabel).toBeNull();
            expect(result.summary.pluginsLabel).toBeNull();
            expect(result.summary.templateLabel).toBeNull();
        });
    });
});
