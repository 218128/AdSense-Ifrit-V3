/**
 * Tests for themeCrud.ts - Theme CRUD Operations
 * 
 * Comprehensive tests for theme management functions
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
    createMockTheme,
    createMockThemeVersion
} from './_testUtils';

import {
    saveTheme,
    getTheme,
    deleteTheme,
    saveThemeVersion,
    listThemeVersions,
    restoreThemeVersion
} from '@/lib/websiteStore/themeCrud';

describe('themeCrud.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveTheme()', () => {
        it('should write theme to correct path', () => {
            const domain = 'test-site.com';
            const theme = createMockTheme();

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveTheme(domain, theme);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('theme.json'),
                expect.any(String)
            );
        });

        it('should serialize theme as JSON with formatting', () => {
            const domain = 'test-site.com';
            const theme = createMockTheme({ globals: '.custom-style {}' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveTheme(domain, theme);

            const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(writtenContent).toContain('.custom-style {}');
            expect(JSON.parse(writtenContent)).toHaveProperty('globals', '.custom-style {}');
        });

        it('should create themes directory if it does not exist', () => {
            const domain = 'test-site.com';
            const theme = createMockTheme();

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            saveTheme(domain, theme);

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ recursive: true })
            );
        });
    });

    describe('getTheme()', () => {
        it('should return theme when file exists', () => {
            const domain = 'test-site.com';
            const mockTheme = createMockTheme();

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockTheme));

            const result = getTheme(domain);

            expect(result).toEqual(mockTheme);
        });

        it('should return null when file does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getTheme(domain);

            expect(result).toBeNull();
        });

        it('should return null when JSON is invalid', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = getTheme(domain);

            expect(result).toBeNull();
        });
    });

    describe('deleteTheme()', () => {
        it('should delete theme file when it exists', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = deleteTheme(domain);

            expect(fs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining('theme.json')
            );
            expect(result).toBe(true);
        });

        it('should return false when theme does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = deleteTheme(domain);

            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('saveThemeVersion()', () => {
        it('should save version to theme-versions directory', () => {
            const domain = 'test-site.com';
            const version = createMockThemeVersion();

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveThemeVersion(domain, version);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('theme-versions'),
                expect.any(String)
            );
        });

        it('should include version ID in filename', () => {
            const domain = 'test-site.com';
            const version = createMockThemeVersion({ versionId: 'tv_custom123' });

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveThemeVersion(domain, version);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('tv_custom123'),
                expect.any(String)
            );
        });

        it('should create versions directory if it does not exist', () => {
            const domain = 'test-site.com';
            const version = createMockThemeVersion();

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            saveThemeVersion(domain, version);

            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('listThemeVersions()', () => {
        it('should return empty array when no versions exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = listThemeVersions(domain);

            expect(result).toEqual([]);
        });

        it('should return sorted versions newest first', () => {
            const domain = 'test-site.com';
            const version1 = createMockThemeVersion({
                versionId: 'tv1',
                createdAt: 1000
            });
            const version2 = createMockThemeVersion({
                versionId: 'tv2',
                createdAt: 2000
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['tv1.json', 'tv2.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(version1))
                .mockReturnValueOnce(JSON.stringify(version2));

            const result = listThemeVersions(domain);

            expect(result).toHaveLength(2);
            expect(result[0].createdAt).toBeGreaterThan(result[1].createdAt);
        });

        it('should filter out non-JSON files', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['.gitkeep', 'readme.txt']);

            const result = listThemeVersions(domain);

            expect(result).toEqual([]);
        });
    });

    describe('restoreThemeVersion()', () => {
        it('should restore theme from version', () => {
            const domain = 'test-site.com';
            const versionId = 'tv_12345';
            const mockTheme = createMockTheme({ globals: 'restored theme' });
            const mockVersion = createMockThemeVersion({
                versionId,
                theme: mockTheme
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockVersion));

            const result = restoreThemeVersion(domain, versionId);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('theme.json'),
                expect.stringContaining('restored theme')
            );
            expect(result).toBe(true);
        });

        it('should return false when version does not exist', () => {
            const domain = 'test-site.com';
            const versionId = 'tv_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = restoreThemeVersion(domain, versionId);

            expect(result).toBe(false);
        });

        it('should return false when version JSON is invalid', () => {
            const domain = 'test-site.com';
            const versionId = 'tv_invalid';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = restoreThemeVersion(domain, versionId);

            expect(result).toBe(false);
        });
    });
});
