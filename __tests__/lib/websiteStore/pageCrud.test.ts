/**
 * Tests for pageCrud.ts - Structural Pages CRUD Operations
 * 
 * Comprehensive tests for about, contact, privacy, terms page management
 */

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
import * as path from 'path';
import {
    createMockArticle,
    createMockPageCrudDeps
} from './testUtils';

import {
    listPages,
    getPage,
    savePage,
    updatePage,
    deletePage,
    createDefaultPages,
    _initPageCrudDeps
} from '@/lib/websiteStore/pageCrud';

describe('pageCrud.ts', () => {
    let mockDeps: ReturnType<typeof createMockPageCrudDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockPageCrudDeps();
        _initPageCrudDeps(mockDeps);
    });

    describe('listPages()', () => {
        it('should return empty array when pages directory does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = listPages(domain);

            expect(result).toEqual([]);
        });

        it('should return array of pages from directory', () => {
            const domain = 'test-site.com';
            const aboutPage = createMockArticle({
                id: 'page_about',
                structuralType: 'about'
            });
            const contactPage = createMockArticle({
                id: 'page_contact',
                structuralType: 'contact'
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['about.json', 'contact.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(aboutPage))
                .mockReturnValueOnce(JSON.stringify(contactPage));

            const result = listPages(domain);

            expect(result).toHaveLength(2);
        });

        it('should filter out non-JSON files', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['readme.txt', '.gitkeep']);

            const result = listPages(domain);

            expect(result).toEqual([]);
        });

        it('should skip invalid JSON files', () => {
            const domain = 'test-site.com';
            const validPage = createMockArticle({ structuralType: 'about' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['invalid.json', 'about.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce('invalid json')
                .mockReturnValueOnce(JSON.stringify(validPage));

            const result = listPages(domain);

            expect(result).toHaveLength(1);
        });
    });

    describe('getPage()', () => {
        it('should return page when file exists', () => {
            const domain = 'test-site.com';
            const mockPage = createMockArticle({
                id: 'page_about',
                structuralType: 'about'
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPage));

            const result = getPage(domain, 'about');

            expect(result).toEqual(mockPage);
        });

        it('should return null when file does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getPage(domain, 'about');

            expect(result).toBeNull();
        });

        it('should return null when JSON is invalid', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = getPage(domain, 'contact');

            expect(result).toBeNull();
        });

        it('should read correct file for each page type', () => {
            const domain = 'test-site.com';
            const pageTypes: ('about' | 'contact' | 'privacy' | 'terms')[] =
                ['about', 'contact', 'privacy', 'terms'];

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            for (const pageType of pageTypes) {
                getPage(domain, pageType);
            }

            expect(fs.existsSync).toHaveBeenCalledTimes(4);
        });
    });

    describe('savePage()', () => {
        it('should write page to correct path', () => {
            const domain = 'test-site.com';
            const page = createMockArticle({
                id: 'page_about',
                structuralType: 'about'
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            savePage(domain, page);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('about.json'),
                expect.any(String)
            );
        });

        it('should call incrementPendingChanges', () => {
            const domain = 'test-site.com';
            const page = createMockArticle({ structuralType: 'about' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            savePage(domain, page);

            expect(mockDeps.incrementPendingChanges).toHaveBeenCalledWith(domain);
        });

        it('should throw error when page has no structuralType', () => {
            const domain = 'test-site.com';
            const page = createMockArticle({ structuralType: undefined });

            expect(() => savePage(domain, page)).toThrow('Page must have a structuralType');
        });

        it('should create pages directory if it does not exist', () => {
            const domain = 'test-site.com';
            const page = createMockArticle({ structuralType: 'privacy' });

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            savePage(domain, page);

            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('updatePage()', () => {
        it('should update page with new values', () => {
            const domain = 'test-site.com';
            const originalPage = createMockArticle({
                id: 'page_about',
                structuralType: 'about',
                title: 'Original Title'
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(originalPage));

            const result = updatePage(domain, 'about', { title: 'Updated Title' });

            expect(result).not.toBeNull();
            expect(result?.title).toBe('Updated Title');
        });

        it('should update lastModifiedAt timestamp', () => {
            const domain = 'test-site.com';
            const oldTimestamp = Date.now() - 10000;
            const originalPage = createMockArticle({
                structuralType: 'about',
                lastModifiedAt: oldTimestamp
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(originalPage));

            const result = updatePage(domain, 'about', { title: 'New' });

            expect(result?.lastModifiedAt).toBeGreaterThan(oldTimestamp);
        });

        it('should return null when page does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = updatePage(domain, 'about', { title: 'New' });

            expect(result).toBeNull();
        });
    });

    describe('deletePage()', () => {
        it('should delete page file when it exists', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = deletePage(domain, 'about');

            expect(fs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining('about.json')
            );
            expect(result).toBe(true);
        });

        it('should return false when page does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = deletePage(domain, 'contact');

            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should call incrementPendingChanges on successful delete', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            deletePage(domain, 'privacy');

            expect(mockDeps.incrementPendingChanges).toHaveBeenCalledWith(domain);
        });
    });

    describe('createDefaultPages()', () => {
        it('should create all four structural pages', () => {
            const domain = 'test-site.com';
            const siteName = 'Test Site';
            const author = { name: 'John Doe', role: 'Editor' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            createDefaultPages(domain, siteName, author);

            // Should write 4 pages: about, contact, privacy, terms
            expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
        });

        it('should include site name in page content', () => {
            const domain = 'test-site.com';
            const siteName = 'Awesome Blog';
            const author = { name: 'Jane Doe', role: 'Owner' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            createDefaultPages(domain, siteName, author);

            const calls = (fs.writeFileSync as jest.Mock).mock.calls;
            const allContent = calls.map(c => c[1]).join('');
            expect(allContent).toContain('Awesome Blog');
        });

        it('should include author info in about page', () => {
            const domain = 'test-site.com';
            const siteName = 'My Site';
            const author = { name: 'John Smith', role: 'Founder', bio: 'Expert writer' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            createDefaultPages(domain, siteName, author);

            const aboutPageCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => call[0].includes('about.json')
            );

            expect(aboutPageCall).toBeDefined();
            expect(aboutPageCall[1]).toContain('John Smith');
            expect(aboutPageCall[1]).toContain('Founder');
        });

        it('should set pages as published status', () => {
            const domain = 'test-site.com';
            const siteName = 'Test';
            const author = { name: 'Test', role: 'Test' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            createDefaultPages(domain, siteName, author);

            const calls = (fs.writeFileSync as jest.Mock).mock.calls;
            for (const call of calls) {
                const pageData = JSON.parse(call[1]);
                expect(pageData.status).toBe('published');
            }
        });
    });
});
