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
    unlinkSync: jest.fn()
}));

import * as fs from 'fs';
import {
    createMockTheme,
    createMockThemeVersion
} from './testUtils';

import {
    saveTheme,
    getTheme,
    saveThemeVersion,
    listThemeVersions,
    restoreThemeVersion
} from '@/lib/websiteStore/themeCrud';

describe('themeCrud.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (fs.readdirSync as jest.Mock).mockReturnValue([]);
        // Default readFileSync to return empty string for CSS files
        (fs.readFileSync as jest.Mock).mockReturnValue('');
    });

    describe('saveTheme()', () => {
        it('should write theme files to theme directory', () => {
            const domain = 'test-site.com';
            const theme = createMockTheme();

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveTheme(domain, theme);

            // Should write multiple files: globals.css, variables.json, theme.json
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should write globals.css when globals provided', () => {
            const domain = 'test-site.com';
            const theme = { globals: '.custom-style {}' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            saveTheme(domain, theme);

            const calls = (fs.writeFileSync as jest.Mock).mock.calls;
            const globalsCall = calls.find(c => c[0].includes('globals.css'));
            expect(globalsCall).toBeDefined();
            expect(globalsCall[1]).toContain('.custom-style {}');
        });

        it('should create theme directory if it does not exist', () => {
            const domain = 'test-site.com';
            const theme = createMockTheme();

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            saveTheme(domain, theme);

            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('getTheme()', () => {
        it('should return null when theme directory does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getTheme(domain);

            expect(result).toBeNull();
        });

        it('should return theme when directory exists', () => {
            const domain = 'test-site.com';

            // Theme dir exists, but individual files may not
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('theme');
            });

            const result = getTheme(domain);

            expect(result).not.toBeNull();
            expect(result).toHaveProperty('globals');
            expect(result).toHaveProperty('variables');
        });

        it('should read globals.css if it exists', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('theme') || path.includes('globals.css');
            });
            (fs.readFileSync as jest.Mock).mockReturnValue(':root { --color-primary: blue; }');

            const result = getTheme(domain);

            expect(result?.globals).toContain('--color-primary');
        });
    });

    describe('saveThemeVersion()', () => {
        it('should save version when theme exists', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(':root { }');
            (fs.readdirSync as jest.Mock).mockReturnValue([]);

            const result = saveThemeVersion(domain, 'manual');

            expect(result).not.toBeNull();
            expect(result?.reason).toBe('manual');
        });

        it('should return null when theme does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = saveThemeVersion(domain);

            expect(result).toBeNull();
        });

        it('should generate unique version ID', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(':root { }');
            (fs.readdirSync as jest.Mock).mockReturnValue([]);

            const result = saveThemeVersion(domain);

            expect(result?.id).toMatch(/^theme_v_/);
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
            const version1 = {
                id: 'theme_v_1',
                globals: 'v1',
                variables: {},
                savedAt: 1000,
                reason: 'auto'
            };
            const version2 = {
                id: 'theme_v_2',
                globals: 'v2',
                variables: {},
                savedAt: 2000,
                reason: 'manual'
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['theme_v_1.json', 'theme_v_2.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(version1))
                .mockReturnValueOnce(JSON.stringify(version2));

            const result = listThemeVersions(domain);

            expect(result).toHaveLength(2);
            expect(result[0].savedAt).toBeGreaterThan(result[1].savedAt);
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
            const versionId = 'theme_v_123';
            const version = {
                id: versionId,
                globals: ':root { --color-primary: restored; }',
                variables: { primaryColor: 'restored' },
                savedAt: Date.now(),
                reason: 'manual'
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue([`${versionId}.json`]);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(version));

            const result = restoreThemeVersion(domain, versionId);

            expect(result).toBe(true);
            // Should write globals.css with restored content
            const globalsCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                c => c[0].includes('globals.css')
            );
            expect(globalsCall).toBeDefined();
        });

        it('should return false when version does not exist', () => {
            const domain = 'test-site.com';
            const versionId = 'theme_v_nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue([]);

            const result = restoreThemeVersion(domain, versionId);

            expect(result).toBe(false);
        });
    });
});
