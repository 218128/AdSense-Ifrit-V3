/**
 * Tests for paths.ts - Path helper functions
 * 
 * Comprehensive tests for all path utilities and directory management
 */

import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn()
}));

import * as fs from 'fs';
import {
    WEBSITES_DIR,
    PROFILES_DIR,
    getWebsiteDir,
    getArticlesDir,
    getPagesDir,
    getThemeDir,
    getPluginsDir,
    getVersionsDir,
    getMetadataPath,
    getArticlePath,
    getPagePath,
    getContentDir,
    ensureWebsiteDir,
    ensureWebsitesDirs
} from '@/lib/websiteStore/paths';

describe('paths.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Constants', () => {
        it('should have WEBSITES_DIR defined', () => {
            expect(WEBSITES_DIR).toBeDefined();
            expect(typeof WEBSITES_DIR).toBe('string');
        });

        it('should have PROFILES_DIR defined', () => {
            expect(PROFILES_DIR).toBeDefined();
            expect(typeof PROFILES_DIR).toBe('string');
        });
    });

    describe('getWebsiteDir()', () => {
        it('should return correct path for domain', () => {
            const domain = 'test-site.com';
            const result = getWebsiteDir(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain));
        });

        it('should handle domains with special characters', () => {
            const domain = 'my-special-site.co.uk';
            const result = getWebsiteDir(domain);

            expect(result).toContain('my-special-site.co.uk');
        });
    });

    describe('getContentDir()', () => {
        it('should return content subdirectory', () => {
            const domain = 'test-site.com';
            const result = getContentDir(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content'));
        });
    });

    describe('getArticlesDir()', () => {
        it('should return articles subdirectory under content', () => {
            const domain = 'test-site.com';
            const result = getArticlesDir(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content', 'articles'));
        });
    });

    describe('getPagesDir()', () => {
        it('should return pages subdirectory under content', () => {
            const domain = 'test-site.com';
            const result = getPagesDir(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content', 'pages'));
        });
    });

    describe('getThemeDir()', () => {
        it('should return theme subdirectory', () => {
            const domain = 'test-site.com';
            const result = getThemeDir(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'theme'));
        });
    });

    describe('getPluginsDir()', () => {
        it('should return plugins subdirectory', () => {
            const domain = 'test-site.com';
            const result = getPluginsDir(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'plugins'));
        });
    });

    describe('getVersionsDir()', () => {
        it('should return versions subdirectory', () => {
            const domain = 'test-site.com';
            const result = getVersionsDir(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'versions'));
        });
    });

    describe('getMetadataPath()', () => {
        it('should return path to metadata.json', () => {
            const domain = 'test-site.com';
            const result = getMetadataPath(domain);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'metadata.json'));
        });
    });

    describe('getArticlePath()', () => {
        it('should return path to article JSON file', () => {
            const domain = 'test-site.com';
            const articleId = 'art_12345';
            const result = getArticlePath(domain, articleId);

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content', 'articles', `${articleId}.json`));
        });

        it('should handle article IDs with special characters', () => {
            const domain = 'test-site.com';
            const articleId = 'art_123_abc-def';
            const result = getArticlePath(domain, articleId);

            expect(result).toContain(articleId);
            expect(result).toMatch(/\.json$/);
        });
    });

    describe('getPagePath()', () => {
        it('should return path to about page', () => {
            const domain = 'test-site.com';
            const result = getPagePath(domain, 'about');

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content', 'pages', 'about.json'));
        });

        it('should return path to contact page', () => {
            const domain = 'test-site.com';
            const result = getPagePath(domain, 'contact');

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content', 'pages', 'contact.json'));
        });

        it('should return path to privacy page', () => {
            const domain = 'test-site.com';
            const result = getPagePath(domain, 'privacy');

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content', 'pages', 'privacy.json'));
        });

        it('should return path to terms page', () => {
            const domain = 'test-site.com';
            const result = getPagePath(domain, 'terms');

            expect(result).toBe(path.join(WEBSITES_DIR, domain, 'content', 'pages', 'terms.json'));
        });
    });

    describe('ensureWebsiteDir()', () => {
        it('should create directories when they do not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const domain = 'test-site.com';
            ensureWebsiteDir(domain);

            // Should create multiple directories
            expect(fs.mkdirSync).toHaveBeenCalled();
        });

        it('should not create directories when they already exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const domain = 'test-site.com';
            ensureWebsiteDir(domain);

            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });

    describe('ensureWebsitesDirs()', () => {
        it('should create websites directory when it does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            ensureWebsitesDirs();

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                WEBSITES_DIR,
                expect.objectContaining({ recursive: true })
            );
        });

        it('should not create directory when it already exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            ensureWebsitesDirs();

            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });
});
