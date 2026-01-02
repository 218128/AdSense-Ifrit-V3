/**
 * Tests for migration.ts - Legacy Migration Operations
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
    createMockMigrationDeps
} from './testUtils';

import {
    migrateFromLegacy,
    _initMigrationDeps
} from '@/lib/websiteStore/migration';

describe('migration.ts', () => {
    let mockDeps: ReturnType<typeof createMockMigrationDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockMigrationDeps();
        _initMigrationDeps(mockDeps);
        (fs.readdirSync as jest.Mock).mockReturnValue([]);
    });

    describe('migrateFromLegacy()', () => {
        it('should return empty arrays when no legacy data exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = migrateFromLegacy();

            expect(result.migrated).toEqual([]);
            expect(result.errors).toEqual([]);
        });

        it('should migrate websites from templates folder', () => {
            // Templates dir exists
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('templates') || path.includes('site-config.yaml');
            });

            // Return template folders
            (fs.readdirSync as jest.Mock).mockReturnValue([
                { name: 'my-blog', isDirectory: () => true }
            ]);

            // YAML content
            const yamlContent = `
domain: my-blog.com
name: My Blog
category: technology
author:
  name: John Doe
`;
            (fs.readFileSync as jest.Mock).mockReturnValue(yamlContent);
            mockDeps.getWebsite.mockReturnValue(null); // Not already migrated

            const result = migrateFromLegacy();

            expect(result.migrated).toContain('my-blog.com');
            expect(mockDeps.saveWebsite).toHaveBeenCalled();
        });

        it('should skip already migrated websites', () => {
            // Only templates folder exists
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('templates');
            });
            (fs.readdirSync as jest.Mock).mockReturnValue([
                { name: 'existing-blog', isDirectory: () => true }
            ]);

            const yamlContent = 'domain: existing.com\nname: Existing';
            (fs.readFileSync as jest.Mock).mockReturnValue(yamlContent);

            // Already exists
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock partial object
            mockDeps.getWebsite.mockReturnValue({ domain: 'existing.com' } as any);

            const result = migrateFromLegacy();

            expect(result.migrated).not.toContain('existing.com');
        });

        it('should migrate from job store completed jobs', () => {
            // Jobs dir exists, templates doesn't
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('.site-builder-jobs') || path.includes('.json');
            });

            (fs.readdirSync as jest.Mock).mockReturnValue(['job-123.json']);

            const jobData = {
                id: 'job-123',
                status: 'complete',
                config: {
                    domain: 'job-site.com',
                    siteName: 'Job Site',
                    niche: 'finance'
                },
                createdAt: Date.now(),
                completedAt: Date.now()
            };
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(jobData));
            mockDeps.getWebsite.mockReturnValue(null);

            const result = migrateFromLegacy();

            expect(result.migrated).toContain('job-site.com');
        });

        it('should record errors for failed migrations', () => {
            // Only templates folder exists, not jobs folder
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('templates');
            });
            (fs.readdirSync as jest.Mock).mockReturnValue([
                { name: 'broken-site', isDirectory: () => true }
            ]);

            // Throw on read
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('File read error');
            });

            const result = migrateFromLegacy();

            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should not migrate incomplete jobs', () => {
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('.site-builder-jobs');
            });

            (fs.readdirSync as jest.Mock).mockReturnValue(['pending-job.json']);

            const jobData = {
                id: 'pending-123',
                status: 'pending', // Not complete
                config: { domain: 'pending.com' }
            };
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(jobData));

            const result = migrateFromLegacy();

            expect(result.migrated).not.toContain('pending.com');
        });
    });
});
