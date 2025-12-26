/**
 * Tests for pluginCrud.ts - Plugin Management Operations
 */

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
}));

import * as fs from 'fs';

import {
    getInstalledPlugins,
    installPlugin,
    uninstallPlugin,
    getMergedPackageJson
} from '@/lib/websiteStore/pluginCrud';

describe('pluginCrud.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getInstalledPlugins()', () => {
        it('should return empty array when installed.json does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getInstalledPlugins(domain);

            expect(result).toEqual([]);
        });

        it('should return array of plugins from installed.json', () => {
            const domain = 'test-site.com';
            const plugins = [
                { name: 'social-share', version: '1.0.0', installedAt: Date.now() },
                { name: 'analytics', version: '2.0.0', installedAt: Date.now() }
            ];

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(plugins));

            const result = getInstalledPlugins(domain);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('social-share');
            expect(result[1].name).toBe('analytics');
        });

        it('should return empty array on JSON parse error', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const result = getInstalledPlugins(domain);

            expect(result).toEqual([]);
        });
    });

    describe('installPlugin()', () => {
        it('should add new plugin to installed.json', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = installPlugin(domain, 'new-plugin', '1.0.0', 'A new plugin');

            expect(result.name).toBe('new-plugin');
            expect(result.version).toBe('1.0.0');
            expect(result.description).toBe('A new plugin');
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('installed.json'),
                expect.any(String),
                'utf-8'
            );
        });

        it('should update existing plugin version', () => {
            const domain = 'test-site.com';
            const existingPlugins = [
                { name: 'existing-plugin', version: '1.0.0', installedAt: 1000 }
            ];

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(existingPlugins));

            const result = installPlugin(domain, 'existing-plugin', '2.0.0');

            expect(result.name).toBe('existing-plugin');
            expect(result.version).toBe('2.0.0');
        });

        it('should create plugins directory if it does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            installPlugin(domain, 'test-plugin', '1.0.0');

            expect(fs.mkdirSync).toHaveBeenCalled();
        });

        it('should set installedAt timestamp', () => {
            const domain = 'test-site.com';
            const beforeTime = Date.now();

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = installPlugin(domain, 'test-plugin', '1.0.0');

            expect(result.installedAt).toBeGreaterThanOrEqual(beforeTime);
        });
    });

    describe('uninstallPlugin()', () => {
        it('should remove plugin from installed.json', () => {
            const domain = 'test-site.com';
            const plugins = [
                { name: 'to-remove', version: '1.0.0', installedAt: Date.now() },
                { name: 'to-keep', version: '1.0.0', installedAt: Date.now() }
            ];

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(plugins));

            const result = uninstallPlugin(domain, 'to-remove');

            expect(result).toBe(true);
            // Should write updated list without removed plugin
            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent).toHaveLength(1);
            expect(writtenContent[0].name).toBe('to-keep');
        });

        it('should return false when plugin does not exist', () => {
            const domain = 'test-site.com';
            const plugins = [{ name: 'other-plugin', version: '1.0.0', installedAt: Date.now() }];

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(plugins));

            const result = uninstallPlugin(domain, 'nonexistent');

            expect(result).toBe(false);
        });
    });

    describe('getMergedPackageJson()', () => {
        it('should return base package.json when no plugins installed', () => {
            const domain = 'test-site.com';
            const basePackageJson = {
                name: 'test-project',
                dependencies: { react: '^18.0.0' }
            };

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getMergedPackageJson(domain, basePackageJson);

            expect(result).toEqual(basePackageJson);
        });

        it('should merge plugin dependencies into package.json', () => {
            const domain = 'test-site.com';
            const basePackageJson = {
                name: 'test-project',
                dependencies: { react: '^18.0.0' }
            };
            const plugins = [
                { name: 'share-buttons', version: '^1.0.0', installedAt: Date.now() }
            ];

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(plugins));

            const result = getMergedPackageJson(domain, basePackageJson);

            expect((result.dependencies as Record<string, string>)['share-buttons']).toBe('^1.0.0');
            expect((result.dependencies as Record<string, string>)['react']).toBe('^18.0.0');
        });

        it('should not modify original package.json', () => {
            const domain = 'test-site.com';
            const basePackageJson = {
                name: 'test-project',
                dependencies: { react: '^18.0.0' }
            };
            const plugins = [
                { name: 'new-dep', version: '^1.0.0', installedAt: Date.now() }
            ];

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(plugins));

            getMergedPackageJson(domain, basePackageJson);

            // Original should be unchanged
            expect((basePackageJson.dependencies as Record<string, string>)['new-dep']).toBeUndefined();
        });

        it('should create dependencies object if not present in base', () => {
            const domain = 'test-site.com';
            const basePackageJson = { name: 'test-project' };
            const plugins = [
                { name: 'test-plugin', version: '^1.0.0', installedAt: Date.now() }
            ];

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(plugins));

            const result = getMergedPackageJson(domain, basePackageJson);

            expect(result.dependencies).toBeDefined();
            expect((result.dependencies as Record<string, string>)['test-plugin']).toBe('^1.0.0');
        });
    });
});
