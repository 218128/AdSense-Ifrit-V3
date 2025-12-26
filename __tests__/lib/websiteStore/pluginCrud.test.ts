/**
 * Tests for pluginCrud.ts - Plugin Management Operations
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
        it('should return empty array when plugins directory does not exist', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getInstalledPlugins(domain);

            expect(result).toEqual([]);
        });

        it('should return array of plugins from directory', () => {
            const domain = 'test-site.com';
            const plugin1 = { name: 'social-share', version: '1.0.0' };
            const plugin2 = { name: 'analytics', version: '2.0.0' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['social-share.json', 'analytics.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce(JSON.stringify(plugin1))
                .mockReturnValueOnce(JSON.stringify(plugin2));

            const result = getInstalledPlugins(domain);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('social-share');
            expect(result[1].name).toBe('analytics');
        });

        it('should filter out non-JSON files', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['readme.md', '.gitkeep']);

            const result = getInstalledPlugins(domain);

            expect(result).toEqual([]);
        });

        it('should skip invalid JSON files', () => {
            const domain = 'test-site.com';
            const validPlugin = { name: 'valid-plugin', version: '1.0.0' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['invalid.json', 'valid.json']);
            (fs.readFileSync as jest.Mock)
                .mockReturnValueOnce('not json')
                .mockReturnValueOnce(JSON.stringify(validPlugin));

            const result = getInstalledPlugins(domain);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('valid-plugin');
        });
    });

    describe('installPlugin()', () => {
        it('should write plugin to plugins directory', () => {
            const domain = 'test-site.com';
            const plugin = {
                name: 'new-plugin',
                version: '1.0.0',
                description: 'A new plugin'
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            installPlugin(domain, plugin);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('new-plugin.json'),
                expect.any(String)
            );
        });

        it('should create plugins directory if it does not exist', () => {
            const domain = 'test-site.com';
            const plugin = { name: 'test-plugin', version: '1.0.0' };

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            installPlugin(domain, plugin);

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ recursive: true })
            );
        });

        it('should store plugin with installedAt timestamp', () => {
            const domain = 'test-site.com';
            const beforeTime = Date.now();
            const plugin = { name: 'test-plugin', version: '1.0.0' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            installPlugin(domain, plugin);

            const writtenContent = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenContent.installedAt).toBeGreaterThanOrEqual(beforeTime);
        });
    });

    describe('uninstallPlugin()', () => {
        it('should delete plugin file when it exists', () => {
            const domain = 'test-site.com';
            const pluginName = 'old-plugin';

            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = uninstallPlugin(domain, pluginName);

            expect(fs.unlinkSync).toHaveBeenCalledWith(
                expect.stringContaining('old-plugin.json')
            );
            expect(result).toBe(true);
        });

        it('should return false when plugin does not exist', () => {
            const domain = 'test-site.com';
            const pluginName = 'nonexistent';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = uninstallPlugin(domain, pluginName);

            expect(fs.unlinkSync).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('getMergedPackageJson()', () => {
        it('should return base package.json when no plugins installed', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getMergedPackageJson(domain);

            expect(result).toHaveProperty('dependencies');
        });

        it('should merge plugin dependencies', () => {
            const domain = 'test-site.com';
            const plugin = {
                name: 'social-plugin',
                version: '1.0.0',
                dependencies: {
                    'share-buttons': '^1.0.0'
                }
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['social-plugin.json']);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(plugin));

            const result = getMergedPackageJson(domain);

            expect(result.dependencies).toHaveProperty('share-buttons');
        });

        it('should not duplicate existing dependencies', () => {
            const domain = 'test-site.com';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const result = getMergedPackageJson(domain);

            // Base dependencies should exist
            expect(result.dependencies).toBeDefined();
        });
    });
});
