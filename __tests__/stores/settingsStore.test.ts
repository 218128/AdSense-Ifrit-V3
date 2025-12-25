/**
 * Settings Store Tests
 * 
 * Enterprise-grade tests for the Settings Zustand store.
 * Tests cover: AI providers, integrations, export/import, and migration.
 */

import '@testing-library/jest-dom';

// ========== MOCK SETUP ==========

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: jest.fn((key: string) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: jest.fn((i: number) => Object.keys(store)[i] || null),
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch for server backup operations
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ========== STORE IMPORT ==========

// Must import after mocking
import {
    useSettingsStore,
    StoredKey,
    ProviderId,
    ExportedSettings,
    SETTINGS_STORAGE_KEYS,
} from '@/stores/settingsStore';

// ========== TEST SUITES ==========

describe('Settings Store', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        // Reset store state
        useSettingsStore.setState({
            providerKeys: {
                gemini: [],
                deepseek: [],
                openrouter: [],
                vercel: [],
                perplexity: [],
            },
            enabledProviders: ['gemini'],
            selectedModels: {} as Record<ProviderId, string>,
            integrations: {
                githubToken: '',
                githubUser: '',
                vercelToken: '',
                vercelUser: '',
                spamzillaKey: '',
                namecheapUser: '',
                namecheapKey: '',
                unsplashKey: '',
                pexelsKey: '',
            },
            adsenseConfig: {
                publisherId: '',
                leaderboardSlot: '',
                articleSlot: '',
                multiplexSlot: '',
            },
            blogUrl: '',
            mcpServers: { enabled: [], apiKeys: {} },
            initialized: false,
        });
    });

    // ========== AI PROVIDER TESTS ==========

    describe('AI Provider Keys', () => {
        it('should add a provider key', () => {
            const store = useSettingsStore.getState();
            const testKey: StoredKey = { key: 'test-gemini-key-123', label: 'Test Key' };

            store.addProviderKey('gemini', testKey);

            const state = useSettingsStore.getState();
            expect(state.providerKeys.gemini).toHaveLength(1);
            expect(state.providerKeys.gemini[0].key).toBe('test-gemini-key-123');
            expect(state.providerKeys.gemini[0].label).toBe('Test Key');
        });

        it('should not add duplicate keys', () => {
            const store = useSettingsStore.getState();
            const testKey: StoredKey = { key: 'duplicate-key' };

            store.addProviderKey('gemini', testKey);
            store.addProviderKey('gemini', testKey);

            const state = useSettingsStore.getState();
            expect(state.providerKeys.gemini).toHaveLength(1);
        });

        it('should remove a provider key', () => {
            const store = useSettingsStore.getState();
            store.addProviderKey('gemini', { key: 'key-to-remove' });
            store.addProviderKey('gemini', { key: 'key-to-keep' });

            store.removeProviderKey('gemini', 'key-to-remove');

            const state = useSettingsStore.getState();
            expect(state.providerKeys.gemini).toHaveLength(1);
            expect(state.providerKeys.gemini[0].key).toBe('key-to-keep');
        });

        it('should update provider key properties', () => {
            const store = useSettingsStore.getState();
            store.addProviderKey('deepseek', { key: 'test-key' });

            store.updateProviderKey('deepseek', 'test-key', {
                validated: true,
                validatedAt: Date.now(),
            });

            const state = useSettingsStore.getState();
            expect(state.providerKeys.deepseek[0].validated).toBe(true);
            expect(state.providerKeys.deepseek[0].validatedAt).toBeDefined();
        });

        it('should get provider keys using selector', () => {
            const store = useSettingsStore.getState();
            store.addProviderKey('openrouter', { key: 'or-key-1' });
            store.addProviderKey('openrouter', { key: 'or-key-2' });

            const keys = store.getProviderKeys('openrouter');
            expect(keys).toHaveLength(2);
        });
    });

    describe('Provider Enable/Disable', () => {
        it('should have gemini enabled by default', () => {
            const state = useSettingsStore.getState();
            expect(state.enabledProviders).toContain('gemini');
        });

        it('should toggle provider enabled state', () => {
            const store = useSettingsStore.getState();

            // Disable gemini
            store.toggleProvider('gemini');
            expect(useSettingsStore.getState().enabledProviders).not.toContain('gemini');

            // Re-enable gemini
            store.toggleProvider('gemini');
            expect(useSettingsStore.getState().enabledProviders).toContain('gemini');
        });

        it('should enable provider when model is selected', () => {
            const store = useSettingsStore.getState();
            expect(store.enabledProviders).not.toContain('deepseek');

            store.setSelectedModel('deepseek', 'deepseek-chat');

            const state = useSettingsStore.getState();
            expect(state.enabledProviders).toContain('deepseek');
            expect(state.selectedModels.deepseek).toBe('deepseek-chat');
        });
    });

    describe('Model Selection', () => {
        it('should set selected model for provider', () => {
            const store = useSettingsStore.getState();

            store.setSelectedModel('gemini', 'gemini-2.5-flash');

            const state = useSettingsStore.getState();
            expect(state.selectedModels.gemini).toBe('gemini-2.5-flash');
        });

        it('should allow changing model selection', () => {
            const store = useSettingsStore.getState();

            store.setSelectedModel('gemini', 'gemini-2.5-flash');
            store.setSelectedModel('gemini', 'gemini-2.5-pro');

            const state = useSettingsStore.getState();
            expect(state.selectedModels.gemini).toBe('gemini-2.5-pro');
        });
    });

    // ========== INTEGRATION TESTS ==========

    describe('Integrations', () => {
        it('should set integration values', () => {
            const store = useSettingsStore.getState();

            store.setIntegration('githubToken', 'ghp_test123');
            store.setIntegration('githubUser', 'testuser');

            const state = useSettingsStore.getState();
            expect(state.integrations.githubToken).toBe('ghp_test123');
            expect(state.integrations.githubUser).toBe('testuser');
        });

        it('should handle all integration keys', () => {
            const store = useSettingsStore.getState();
            const integrationKeys = [
                'githubToken', 'githubUser',
                'vercelToken', 'vercelUser',
                'spamzillaKey', 'namecheapUser', 'namecheapKey',
                'unsplashKey', 'pexelsKey'
            ] as const;

            for (const key of integrationKeys) {
                store.setIntegration(key, `test-${key}`);
            }

            const state = useSettingsStore.getState();
            for (const key of integrationKeys) {
                expect(state.integrations[key]).toBe(`test-${key}`);
            }
        });
    });

    // ========== ADSENSE TESTS ==========

    describe('AdSense Configuration', () => {
        it('should set AdSense config', () => {
            const store = useSettingsStore.getState();

            store.setAdsenseConfig({
                publisherId: 'pub-1234567890',
                leaderboardSlot: '1111111111',
            });

            const state = useSettingsStore.getState();
            expect(state.adsenseConfig.publisherId).toBe('pub-1234567890');
            expect(state.adsenseConfig.leaderboardSlot).toBe('1111111111');
        });

        it('should allow partial updates', () => {
            const store = useSettingsStore.getState();

            store.setAdsenseConfig({ publisherId: 'pub-123' });
            store.setAdsenseConfig({ articleSlot: '222' });

            const state = useSettingsStore.getState();
            expect(state.adsenseConfig.publisherId).toBe('pub-123');
            expect(state.adsenseConfig.articleSlot).toBe('222');
        });
    });

    // ========== BLOG TESTS ==========

    describe('Blog Configuration', () => {
        it('should set blog URL', () => {
            const store = useSettingsStore.getState();

            store.setBlogUrl('https://myblog.com');

            const state = useSettingsStore.getState();
            expect(state.blogUrl).toBe('https://myblog.com');
        });
    });

    // ========== MCP TESTS ==========

    describe('MCP Servers', () => {
        it('should toggle MCP server enabled', () => {
            const store = useSettingsStore.getState();

            store.toggleMCPServer('brave-search');
            expect(useSettingsStore.getState().mcpServers.enabled).toContain('brave-search');

            store.toggleMCPServer('brave-search');
            expect(useSettingsStore.getState().mcpServers.enabled).not.toContain('brave-search');
        });

        it('should set MCP API key', () => {
            const store = useSettingsStore.getState();

            store.setMCPApiKey('brave-search', 'brave-api-key-123');

            const state = useSettingsStore.getState();
            expect(state.mcpServers.apiKeys['brave-search']).toBe('brave-api-key-123');
        });
    });

    // ========== EXPORT/IMPORT TESTS ==========

    describe('Export Settings', () => {
        it('should export settings in correct format', () => {
            const store = useSettingsStore.getState();

            // Setup some data
            store.addProviderKey('gemini', { key: 'test-gem-key' });
            store.setIntegration('githubToken', 'ghp_export');
            store.setAdsenseConfig({ publisherId: 'pub-export' });

            const exported = store.exportSettings();

            expect(exported.version).toBe('3.0.0');
            expect(exported.app).toBe('AdSense Ifrit V3');
            expect(exported.exportedAt).toBeDefined();
            expect(exported.settings).toBeDefined();
            expect(exported.settings['ifrit_github_token']).toBe('ghp_export');
            expect(exported.settings['ADSENSE_PUBLISHER_ID']).toBe('pub-export');
        });

        it('should export enabled providers', () => {
            const store = useSettingsStore.getState();
            store.toggleProvider('deepseek'); // Enable deepseek

            const exported = store.exportSettings();

            expect(exported.settings['ifrit_deepseek_enabled']).toBe('true');
        });
    });

    describe('Import Settings', () => {
        it('should import valid settings', () => {
            const store = useSettingsStore.getState();

            const importData: ExportedSettings = {
                version: '3.0.0',
                exportedAt: new Date().toISOString(),
                app: 'AdSense Ifrit V3',
                settings: {
                    'ifrit_github_token': 'imported-token',
                    'ADSENSE_PUBLISHER_ID': 'pub-imported',
                    'USER_BLOG_URL': 'https://imported.com',
                },
            };

            const result = store.importSettings(importData);

            expect(result.success).toBe(true);
            expect(result.restored).toBeGreaterThan(0);

            const state = useSettingsStore.getState();
            expect(state.integrations.githubToken).toBe('imported-token');
            expect(state.adsenseConfig.publisherId).toBe('pub-imported');
            expect(state.blogUrl).toBe('https://imported.com');
        });

        it('should reject invalid import data', () => {
            const store = useSettingsStore.getState();

            const result = store.importSettings({} as ExportedSettings);

            expect(result.success).toBe(false);
            expect(result.restored).toBe(0);
        });

        it('should import provider keys', () => {
            const store = useSettingsStore.getState();

            const importData: ExportedSettings = {
                version: '3.0.0',
                exportedAt: new Date().toISOString(),
                app: 'AdSense Ifrit V3',
                settings: {
                    'ifrit_gemini_keys': JSON.stringify([{ key: 'imported-key' }]),
                    'ifrit_gemini_enabled': 'true',
                },
            };

            store.importSettings(importData);

            const state = useSettingsStore.getState();
            expect(state.providerKeys.gemini).toHaveLength(1);
            expect(state.providerKeys.gemini[0].key).toBe('imported-key');
        });
    });

    // ========== SERVER BACKUP TESTS ==========

    describe('Server Backup', () => {
        it('should backup to server', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true });

            const store = useSettingsStore.getState();
            store.setIntegration('githubToken', 'backup-token');

            const result = await store.backupToServer();

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/settings/backup',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        it('should handle backup failure gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const store = useSettingsStore.getState();
            const result = await store.backupToServer();

            expect(result).toBe(false);
        });

        it('should restore from server', async () => {
            mockFetch.mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    hasBackup: true,
                    backup: {
                        settings: {
                            'ifrit_github_token': 'restored-token',
                        },
                    },
                }),
            });

            const store = useSettingsStore.getState();
            const result = await store.restoreFromServer();

            expect(result).toBe(true);
            expect(useSettingsStore.getState().integrations.githubToken).toBe('restored-token');
        });

        it('should handle empty server backup', async () => {
            mockFetch.mockResolvedValueOnce({
                json: async () => ({
                    success: true,
                    hasBackup: false,
                }),
            });

            const store = useSettingsStore.getState();
            const result = await store.restoreFromServer();

            expect(result).toBe(false);
        });
    });

    // ========== MIGRATION TESTS ==========

    describe('Legacy Migration', () => {
        it('should migrate legacy localStorage keys', () => {
            // Setup legacy keys
            localStorageMock.setItem('GEMINI_API_KEY', 'legacy-gemini-key');
            localStorageMock.setItem('ifrit_github_token', 'legacy-github-token');
            localStorageMock.setItem('ADSENSE_PUBLISHER_ID', 'legacy-pub-id');
            localStorageMock.setItem('USER_BLOG_URL', 'https://legacy.com');
            localStorageMock.setItem('ifrit_gemini_enabled', 'true');

            const store = useSettingsStore.getState();
            store.migrateFromLegacy();

            const state = useSettingsStore.getState();
            expect(state.providerKeys.gemini.some(k => k.key === 'legacy-gemini-key')).toBe(true);
            expect(state.integrations.githubToken).toBe('legacy-github-token');
            expect(state.adsenseConfig.publisherId).toBe('legacy-pub-id');
            expect(state.blogUrl).toBe('https://legacy.com');
            expect(state.initialized).toBe(true);
        });

        it('should handle JSON provider keys during migration', () => {
            const legacyKeys = [{ key: 'json-key-1' }, { key: 'json-key-2' }];
            localStorageMock.setItem('ifrit_deepseek_keys', JSON.stringify(legacyKeys));

            const store = useSettingsStore.getState();
            store.migrateFromLegacy();

            const state = useSettingsStore.getState();
            expect(state.providerKeys.deepseek).toHaveLength(2);
        });
    });
});

describe('Settings Store Storage Keys', () => {
    it('should have correct storage key defined', () => {
        expect(SETTINGS_STORAGE_KEYS.SETTINGS_STORE).toBe('ifrit_settings_store');
    });

    it('should have legacy keys for migration', () => {
        expect(SETTINGS_STORAGE_KEYS.LEGACY_KEYS).toContain('GEMINI_API_KEY');
        expect(SETTINGS_STORAGE_KEYS.LEGACY_KEYS).toContain('ifrit_github_token');
        expect(SETTINGS_STORAGE_KEYS.LEGACY_KEYS).toContain('ADSENSE_PUBLISHER_ID');
    });
});
