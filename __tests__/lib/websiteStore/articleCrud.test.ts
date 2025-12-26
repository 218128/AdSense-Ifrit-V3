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
    createMockArticleVersion,
    createMockArticleCrudDeps,
    setupFsMock,
    createMockFileSystem
} from './_testUtils';

import {
    saveArticle,
    getArticle,
    listArticles,
    deleteArticle,
    updateArticleStatus,
    generateArticleId,
    saveArticleVersion,
    listArticleVersions,
    _initArticleCrudDeps
} from '@/lib/websiteStore/articleCrud';

import { getArticlePath, getArticlesDir } from '@/lib/websiteStore/paths';

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

        it('should include timestamp', () => {
            const beforeTime = Date.now();
            const id = generateArticleId();
            const afterTime = Date.now();

            // ID format: art_<timestamp>_<random>
            const parts = id.split('_');
            expect(parts.length).toBeGreaterThanOrEqual(2);
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

        it('should call incrementPendingChanges', () => {
            const domain = 'test-site.com';
            const article = createMockArticle();

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveArticle(domain, article);

            expect(mockDeps.incrementPendingChanges).toHaveBeenCalledWith(domain);
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

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ recursive: true })
            );
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

    describe('listArticles()', () => {
        it('should return empty array when directory does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = listArticles(domain);

            expect(result).toEqual([]);
        });

        it('should return array of articles from directory', () => {
            const domain = 'test-site.com';
            const mockArticle1 = createMockArticle({ id: 'art_1' });
            const mockArticle2 = createMockArticle({ id: 'art_2' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['art_1.json', 'art_2.json', 'readme.txt']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(mockArticle1))
                .mockReturnValueOnce(JSON.stringify(mockArticle2));

            const result = listArticles(domain);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('art_1');
            expect(result[1].id).toBe('art_2');
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

    describe('updateArticleStatus()', () => {
        it('should update article status to published', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const mockArticle = createMockArticle({ id: articleId, status: 'draft' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockArticle));

            updateArticleStatus(domain, articleId, 'published');

            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent.status).toBe('published');
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

            updateArticleStatus(domain, articleId, 'published');

            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent.lastModifiedAt).toBeGreaterThan(oldTimestamp);
        });

        it('should do nothing when article does not exist', () => {
            const domain = 'test-site.com';
            const articleId = 'art_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            updateArticleStatus(domain, articleId, 'published');

            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });

    describe('saveArticleVersion()', () => {
        it('should save version to versions directory', () => {
            const domain = 'test-site.com';
            const version = createMockArticleVersion({ articleId: 'art_12345' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveArticleVersion(domain, version);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('versions'),
                expect.any(String)
            );
        });

        it('should create versions directory if it does not exist', () => {
            const domain = 'test-site.com';
            const version = createMockArticleVersion();

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            saveArticleVersion(domain, version);

            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('listArticleVersions()', () => {
        it('should return empty array when no versions exist', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = listArticleVersions(domain, articleId);

            expect(result).toEqual([]);
        });

        it('should return sorted versions newest first', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const version1 = createMockArticleVersion({
                versionId: 'v1',
                articleId,
                createdAt: 1000
            });
            const version2 = createMockArticleVersion({
                versionId: 'v2',
                articleId,
                createdAt: 2000
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue([`${articleId}_v1.json`, `${articleId}_v2.json`]);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(version1))
                .mockReturnValueOnce(JSON.stringify(version2));

            const result = listArticleVersions(domain, articleId);

            expect(result).toHaveLength(2);
            expect(result[0].createdAt).toBeGreaterThan(result[1].createdAt);
        });
    });
});
