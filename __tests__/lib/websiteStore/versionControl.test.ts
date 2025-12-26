/**
 * Tests for versionControl.ts - Version Control Operations
 */

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    rmSync: jest.fn()
}));

import * as fs from 'fs';
import {
    createMockWebsite,
    createMockArticle,
    createMockWebsiteVersion,
    createMockVersionControlDeps
} from './_testUtils';

import {
    createNewVersion,
    listWebsiteVersions,
    getVersionDetails,
    checkContentCompatibility,
    rollbackToVersion,
    _initVersionControlDeps
} from '@/lib/websiteStore/versionControl';

describe('versionControl.ts', () => {
    let mockDeps: ReturnType<typeof createMockVersionControlDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockVersionControlDeps();
        _initVersionControlDeps(mockDeps);
    });

    describe('createNewVersion()', () => {
        it('should create a new version with timestamp', () => {
            const domain = 'test-site.com';
            const website = createMockWebsite();
            const articles = [createMockArticle(), createMockArticle()];

            mockDeps.getWebsite.mockReturnValue(website);
            mockDeps.listArticles.mockReturnValue(articles);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const beforeTime = Date.now();
            const result = createNewVersion(domain, 'Test version');

            expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
            expect(result.note).toBe('Test version');
        });

        it('should include all article IDs in version', () => {
            const domain = 'test-site.com';
            const website = createMockWebsite();
            const articles = [
                createMockArticle({ id: 'art_1' }),
                createMockArticle({ id: 'art_2' }),
                createMockArticle({ id: 'art_3' })
            ];

            mockDeps.getWebsite.mockReturnValue(website);
            mockDeps.listArticles.mockReturnValue(articles);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = createNewVersion(domain);

            expect(result.articleIds).toHaveLength(3);
            expect(result.articleIds).toContain('art_1');
            expect(result.articleIds).toContain('art_2');
            expect(result.articleIds).toContain('art_3');
        });

        it('should save version to versions directory', () => {
            const domain = 'test-site.com';

            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            createNewVersion(domain);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('versions'),
                expect.any(String)
            );
        });

        it('should create versions directory if it does not exist', () => {
            const domain = 'test-site.com';

            mockDeps.getWebsite.mockReturnValue(createMockWebsite());
            mockDeps.listArticles.mockReturnValue([]);
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            createNewVersion(domain);

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ recursive: true })
            );
        });

        it('should include website metadata snapshot', () => {
            const domain = 'test-site.com';
            const website = createMockWebsite({ name: 'My Website' });

            mockDeps.getWebsite.mockReturnValue(website);
            mockDeps.listArticles.mockReturnValue([]);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = createNewVersion(domain);

            expect(result.metadata.name).toBe('My Website');
        });

        it('should throw if website does not exist', () => {
            const domain = 'nonexistent.com';

            mockDeps.getWebsite.mockReturnValue(null);

            expect(() => createNewVersion(domain)).toThrow();
        });
    });

    describe('listWebsiteVersions()', () => {
        it('should return empty array when no versions exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = listWebsiteVersions(domain);

            expect(result).toEqual([]);
        });

        it('should return sorted versions newest first', () => {
            const domain = 'test-site.com';
            const version1 = createMockWebsiteVersion({
                versionId: 'v1',
                createdAt: 1000
            });
            const version2 = createMockWebsiteVersion({
                versionId: 'v2',
                createdAt: 2000
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['v1.json', 'v2.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(version1))
                .mockReturnValueOnce(JSON.stringify(version2));

            const result = listWebsiteVersions(domain);

            expect(result).toHaveLength(2);
            expect(result[0].createdAt).toBeGreaterThan(result[1].createdAt);
        });

        it('should filter out non-JSON files', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['readme.md', '.gitkeep']);

            const result = listWebsiteVersions(domain);

            expect(result).toEqual([]);
        });
    });

    describe('getVersionDetails()', () => {
        it('should return version when it exists', () => {
            const domain = 'test-site.com';
            const versionId = 'v_12345';
            const version = createMockWebsiteVersion({ versionId });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(version));

            const result = getVersionDetails(domain, versionId);

            expect(result).toEqual(version);
        });

        it('should return null when version does not exist', () => {
            const domain = 'test-site.com';
            const versionId = 'v_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getVersionDetails(domain, versionId);

            expect(result).toBeNull();
        });

        it('should return null when JSON is invalid', () => {
            const domain = 'test-site.com';
            const versionId = 'v_invalid';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = getVersionDetails(domain, versionId);

            expect(result).toBeNull();
        });
    });

    describe('checkContentCompatibility()', () => {
        it('should return no warnings when articles match', () => {
            const domain = 'test-site.com';
            const currentArticles = [
                createMockArticle({ id: 'art_1' }),
                createMockArticle({ id: 'art_2' })
            ];
            const version = createMockWebsiteVersion({
                articleIds: ['art_1', 'art_2']
            });

            mockDeps.listArticles.mockReturnValue(currentArticles);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(version));

            const result = checkContentCompatibility(domain, 'v_test');

            expect(result.warnings).toHaveLength(0);
        });

        it('should warn about articles that will be removed', () => {
            const domain = 'test-site.com';
            const currentArticles = [
                createMockArticle({ id: 'art_1', title: 'Article 1' }),
                createMockArticle({ id: 'art_2', title: 'Article 2' }),
                createMockArticle({ id: 'art_3', title: 'Article 3' })
            ];
            const version = createMockWebsiteVersion({
                articleIds: ['art_1']
            });

            mockDeps.listArticles.mockReturnValue(currentArticles);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(version));

            const result = checkContentCompatibility(domain, 'v_test');

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings.some(w => w.includes('art_2') || w.includes('Article 2'))).toBe(true);
        });

        it('should return null if version does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = checkContentCompatibility(domain, 'v_nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('rollbackToVersion()', () => {
        it('should restore website metadata from version', () => {
            const domain = 'test-site.com';
            const versionId = 'v_12345';
            const versionMetadata = createMockWebsite({
                name: 'Old Name',
                description: 'Old Description'
            });
            const version = createMockWebsiteVersion({
                versionId,
                metadata: versionMetadata
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(version));

            const result = rollbackToVersion(domain, versionId);

            expect(mockDeps.saveWebsite).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false when version does not exist', () => {
            const domain = 'test-site.com';
            const versionId = 'v_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = rollbackToVersion(domain, versionId);

            expect(result).toBe(false);
            expect(mockDeps.saveWebsite).not.toHaveBeenCalled();
        });

        it('should update the updatedAt timestamp', () => {
            const domain = 'test-site.com';
            const versionId = 'v_12345';
            const oldTimestamp = Date.now() - 100000;
            const versionMetadata = createMockWebsite({ updatedAt: oldTimestamp });
            const version = createMockWebsiteVersion({
                versionId,
                metadata: versionMetadata
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(version));

            rollbackToVersion(domain, versionId);

            const savedWebsite = mockDeps.saveWebsite.mock.calls[0][0];
            expect(savedWebsite.updatedAt).toBeGreaterThan(oldTimestamp);
        });
    });
});
