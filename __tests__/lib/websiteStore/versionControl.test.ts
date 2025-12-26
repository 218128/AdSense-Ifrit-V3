/**
 * Tests for versionControl.ts - Version Control Operations
 */

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn()
}));

import * as fs from 'fs';
import {
    createMockWebsite,
    createMockArticle,
    createMockVersionControlDeps
} from './_testUtils';

import {
    addVersion,
    getVersionHistory,
    updateVersionCommit,
    checkContentCompatibility,
    rollbackToVersion,
    _initVersionControlDeps
} from '@/lib/websiteStore/versionControl';

describe('versionControl.ts', () => {
    let mockDeps: ReturnType<typeof createMockVersionControlDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockVersionControlDeps();
        // Ensure website has versions array
        mockDeps.getWebsite.mockReturnValue(createMockWebsite({
            versions: []
        }));
        _initVersionControlDeps(mockDeps);
        (fs.readdirSync as jest.Mock).mockReturnValue([]);
    });

    describe('addVersion()', () => {
        it('should create a new version with timestamp', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const beforeTime = Date.now();
            const result = addVersion(domain, '1.0.0', 'abc123', ['Initial release']);

            expect(result.deployedAt).toBeGreaterThanOrEqual(beforeTime);
            expect(result.changes).toContain('Initial release');
        });

        it('should generate version number', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = addVersion(domain, '1.0.0', 'abc123', ['test']);

            expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('should include commit SHA', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = addVersion(domain, '1.0.0', 'commit123', ['test']);

            expect(result.commitSha).toBe('commit123');
        });

        it('should save version to website', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            addVersion(domain, '1.0.0', 'abc123', ['test']);

            expect(mockDeps.saveWebsite).toHaveBeenCalled();
        });

        it('should throw if website does not exist', () => {
            const domain = 'nonexistent.com';

            mockDeps.getWebsite.mockReturnValue(null);

            expect(() => addVersion(domain, '1.0.0', 'abc', [])).toThrow();
        });
    });

    describe('getVersionHistory()', () => {
        it('should return empty array when no versions exist', () => {
            const domain = 'test-site.com';
            const website = createMockWebsite({ versions: [] });

            mockDeps.getWebsite.mockReturnValue(website);

            const result = getVersionHistory(domain);

            expect(result).toEqual([]);
        });

        it('should return versions from website', () => {
            const domain = 'test-site.com';
            const versions = [
                { version: '1.0.1', templateVersion: '1.0.0', deployedAt: 1000, commitSha: 'a', changes: [], canRollback: true },
                { version: '1.0.2', templateVersion: '1.0.0', deployedAt: 2000, commitSha: 'b', changes: [], canRollback: true }
            ];
            const website = createMockWebsite({ versions });

            mockDeps.getWebsite.mockReturnValue(website);

            const result = getVersionHistory(domain);

            expect(result).toHaveLength(2);
        });

        it('should return empty array when website is null', () => {
            const domain = 'nonexistent.com';

            mockDeps.getWebsite.mockReturnValue(null);

            const result = getVersionHistory(domain);

            expect(result).toEqual([]);
        });
    });

    describe('updateVersionCommit()', () => {
        it('should update commit SHA for existing version', () => {
            const domain = 'test-site.com';
            const versions = [
                { version: '1.0.1', templateVersion: '1.0.0', deployedAt: 1000, commitSha: 'old', changes: [], canRollback: true }
            ];
            const website = createMockWebsite({ versions });

            mockDeps.getWebsite.mockReturnValue(website);

            const result = updateVersionCommit(domain, '1.0.1', 'new-commit');

            expect(result).toBe(true);
            expect(mockDeps.saveWebsite).toHaveBeenCalled();
        });

        it('should return false when version not found', () => {
            const domain = 'test-site.com';
            const website = createMockWebsite({ versions: [] });

            mockDeps.getWebsite.mockReturnValue(website);

            const result = updateVersionCommit(domain, '1.0.99', 'new-commit');

            expect(result).toBe(false);
        });

        it('should return false when website is null', () => {
            const domain = 'nonexistent.com';

            mockDeps.getWebsite.mockReturnValue(null);

            const result = updateVersionCommit(domain, '1.0.1', 'new');

            expect(result).toBe(false);
        });
    });

    describe('checkContentCompatibility()', () => {
        it('should return empty array when snapshot does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = checkContentCompatibility(domain, '1.0.0');

            expect(result).toEqual([]);
        });

        it('should return warnings when template differs', () => {
            const domain = 'test-site.com';
            const website = createMockWebsite({
                template: {
                    id: 'new-template',
                    name: 'New',
                    version: '2.0.0',
                    installedAt: Date.now(),
                    upgradeAvailable: false,
                    features: [],
                    category: 'general'
                }
            });
            const snapshot = {
                template: {
                    id: 'old-template',
                    name: 'Old',
                    version: '1.0.0'
                },
                fingerprint: {}
            };

            mockDeps.getWebsite.mockReturnValue(website);
            mockDeps.listArticles.mockReturnValue([createMockArticle()]);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(snapshot));

            const result = checkContentCompatibility(domain, '1.0.0');

            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('rollbackToVersion()', () => {
        it('should return error when website does not exist', () => {
            const domain = 'nonexistent.com';

            mockDeps.getWebsite.mockReturnValue(null);

            const result = rollbackToVersion(domain, '1.0.0');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should return error when version not found', () => {
            const domain = 'test-site.com';
            const website = createMockWebsite({ versions: [] });

            mockDeps.getWebsite.mockReturnValue(website);

            const result = rollbackToVersion(domain, '1.0.99');

            expect(result.success).toBe(false);
        });

        it('should return error when version cannot rollback', () => {
            const domain = 'test-site.com';
            const versions = [
                { version: '1.0.1', templateVersion: '1.0.0', deployedAt: 1000, commitSha: 'a', changes: [], canRollback: false }
            ];
            const website = createMockWebsite({ versions });

            mockDeps.getWebsite.mockReturnValue(website);

            const result = rollbackToVersion(domain, '1.0.1');

            expect(result.success).toBe(false);
        });

        it('should succeed when version can rollback and snapshot exists', () => {
            const domain = 'test-site.com';
            const versions = [
                { version: '1.0.1', templateVersion: '1.0.0', deployedAt: 1000, commitSha: 'a', changes: [], canRollback: true }
            ];
            const website = createMockWebsite({ versions });
            const snapshot = {
                template: website.template,
                fingerprint: website.fingerprint,
                version: versions[0]
            };

            mockDeps.getWebsite.mockReturnValue(website);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(snapshot));

            const result = rollbackToVersion(domain, '1.0.1');

            expect(result.success).toBe(true);
            expect(mockDeps.saveWebsite).toHaveBeenCalled();
        });
    });
});
