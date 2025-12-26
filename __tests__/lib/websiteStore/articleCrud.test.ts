/**
 * Tests for articleCrud.ts - Article CRUD Operations
 * 
 * Comprehensive tests for article management functions
 */

import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    unlinkSync: jest.fn()
}));

import * as fs from 'fs';
import {
    createMockArticle,
    createMockArticleCrudDeps,
    createMockWebsite
} from './testUtils';

import {
    saveArticle,
    getArticle,
    getArticleBySlug,
    listArticles,
    deleteArticle,
    updateArticle,
    generateArticleId,
    saveArticleVersion,
    listArticleVersions,
    _initArticleCrudDeps
} from '@/lib/websiteStore/articleCrud';

describe('articleCrud.ts', () => {
    let mockDeps: ReturnType<typeof createMockArticleCrudDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockArticleCrudDeps();
        _initArticleCrudDeps(mockDeps);
        // Default mock return values
        (fs.readdirSync as jest.Mock).mockReturnValue([]);
    });

    describe('generateArticleId()', () => {
        it('should generate unique article IDs', () => {
            const id1 = generateArticleId();
            const id2 = generateArticleId();

            expect(id1).not.toBe(id2);
        });

        it('should start with "art_" prefix', () => {
            const id = generateArticleId();

            expect(id).toMatch(/^art_/);
        });

        it('should include timestamp and random string', () => {
            const id = generateArticleId();

            // ID format: art_<timestamp>_<random>
            const parts = id.split('_');
            expect(parts.length).toBe(3);
            expect(parts[0]).toBe('art');
        });
    });

    describe('saveArticle()', () => {
        it('should write article to correct path', () => {
            const domain = 'test-site.com';
            const article = createMockArticle({ id: 'art_test123' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveArticle(domain, article);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('art_test123.json'),
                expect.any(String)
            );
        });

        it('should serialize article as JSON with formatting', () => {
            const domain = 'test-site.com';
            const article = createMockArticle({ title: 'Test Title' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveArticle(domain, article);

            const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(writtenContent).toContain('Test Title');
            expect(JSON.parse(writtenContent)).toHaveProperty('title', 'Test Title');
        });

        it('should create articles directory if it does not exist', () => {
            const domain = 'test-site.com';
            const article = createMockArticle();

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            saveArticle(domain, article);

            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('getArticle()', () => {
        it('should return article when file exists', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const mockArticle = createMockArticle({ id: articleId });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = getArticle(domain, articleId);

            expect(result).toEqual(mockArticle);
        });

        it('should return null when file does not exist', () => {
            const domain = 'test-site.com';
            const articleId = 'art_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getArticle(domain, articleId);

            expect(result).toBeNull();
        });

        it('should return null when JSON is invalid', () => {
            const domain = 'test-site.com';
            const articleId = 'art_invalid';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = getArticle(domain, articleId);

            expect(result).toBeNull();
        });
    });

    describe('getArticleBySlug()', () => {
        it('should return article matching slug', () => {
            const domain = 'test-site.com';
            const mockArticle = createMockArticle({ slug: 'my-article' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['art_1.json']);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = getArticleBySlug(domain, 'my-article');

            expect(result).not.toBeNull();
            expect(result?.slug).toBe('my-article');
        });

        it('should return null when no article matches slug', () => {
            const domain = 'test-site.com';
            const mockArticle = createMockArticle({ slug: 'other-article' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['art_1.json']);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = getArticleBySlug(domain, 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('listArticles()', () => {
        it('should return empty array when directory does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = listArticles(domain);

            expect(result).toEqual([]);
        });

        it('should return array of articles from directory', () => {
            const domain = 'test-site.com';
            const mockArticle1 = createMockArticle({ id: 'art_1', lastModifiedAt: 2000 });
            const mockArticle2 = createMockArticle({ id: 'art_2', lastModifiedAt: 1000 });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['art_1.json', 'art_2.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(mockArticle1))
                .mockReturnValueOnce(JSON.stringify(mockArticle2));

            const result = listArticles(domain);

            expect(result).toHaveLength(2);
            // Should be sorted by lastModifiedAt descending
            expect(result[0].id).toBe('art_1');
        });

        it('should filter out non-JSON files', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['readme.txt', '.gitkeep']);

            const result = listArticles(domain);

            expect(result).toEqual([]);
            expect(fs.readFileSync).not.toHaveBeenCalled();
        });

        it('should skip invalid JSON files', () => {
            const domain = 'test-site.com';
            const mockArticle = createMockArticle({ id: 'art_valid' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['invalid.json', 'valid.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce('invalid json')
                .mockReturnValueOnce(JSON.stringify(mockArticle));

            const result = listArticles(domain);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('art_valid');
        });
    });

    describe('updateArticle()', () => {
        it('should update article with new values', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const mockArticle = createMockArticle({ id: articleId, title: 'Original' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = updateArticle(domain, articleId, { title: 'Updated' });

            expect(result).not.toBeNull();
            expect(result?.title).toBe('Updated');
        });

        it('should update lastModifiedAt timestamp', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const oldTimestamp = Date.now() - 10000;
            const mockArticle = createMockArticle({
                id: articleId,
                lastModifiedAt: oldTimestamp
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = updateArticle(domain, articleId, { title: 'New' });

            expect(result?.lastModifiedAt).toBeGreaterThan(oldTimestamp);
        });

        it('should return null when article does not exist', () => {
            const domain = 'test-site.com';
            const articleId = 'art_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = updateArticle(domain, articleId, { title: 'New' });

            expect(result).toBeNull();
        });

        it('should call incrementPendingChanges on update', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const mockArticle = createMockArticle({ id: articleId });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            updateArticle(domain, articleId, { title: 'Updated' });

            expect(mockDeps.incrementPendingChanges).toHaveBeenCalledWith(domain);
        });
    });

    describe('deleteArticle()', () => {
        it('should delete article file when it exists', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = deleteArticle(domain, articleId);

            expect(fs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining('art_12345.json')
            );
            expect(result).toBe(true);
        });

        it('should return false when article does not exist', () => {
            const domain = 'test-site.com';
            const articleId = 'art_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = deleteArticle(domain, articleId);

            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should call incrementPendingChanges on successful delete', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            deleteArticle(domain, articleId);

            expect(mockDeps.incrementPendingChanges).toHaveBeenCalledWith(domain);
        });
    });

    describe('saveArticleVersion()', () => {
        it('should save version for existing article', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const mockArticle = createMockArticle({ id: articleId });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = saveArticleVersion(domain, articleId, 'manual');

            expect(result).not.toBeNull();
            expect(result?.reason).toBe('manual');
        });

        it('should return null for non-existent article', () => {
            const domain = 'test-site.com';
            const articleId = 'art_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = saveArticleVersion(domain, articleId);

            expect(result).toBeNull();
        });
    });

    describe('listArticleVersions()', () => {
        it('should return empty array when article has no versions', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const mockArticle = createMockArticle({ id: articleId, versions: undefined });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = listArticleVersions(domain, articleId);

            expect(result).toEqual([]);
        });

        it('should return versions from article', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const versions = [
                { id: 'ver_1', content: 'v1', title: 'V1', savedAt: 1000, reason: 'auto' as const, wordCount: 10 },
                { id: 'ver_2', content: 'v2', title: 'V2', savedAt: 2000, reason: 'manual' as const, wordCount: 20 }
            ];
            const mockArticle = createMockArticle({ id: articleId, versions });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            const result = listArticleVersions(domain, articleId);

            expect(result).toHaveLength(2);
        });

        it('should return empty array when article does not exist', () => {
            const domain = 'test-site.com';
            const articleId = 'art_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = listArticleVersions(domain, articleId);

            expect(result).toEqual([]);
        });
    });
});
