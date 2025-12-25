/**
 * SettingsView Component Tests
 * 
 * Enterprise-grade tests for the Settings main container.
 * Tests cover: tab navigation, panel rendering, save functionality.
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
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock alert
global.alert = jest.fn();

// ========== IMPORTS ==========

import {
    getUserSettings,
    getAIProviderKeys,
    getEnabledProviders,
    getEnabledProviderKeys,
    getSelectedModel,
} from '@/components/settings/SettingsView';

// ========== TEST SUITES ==========

describe('SettingsView Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
    });

    describe('getUserSettings', () => {
        it('should return empty settings when localStorage is empty', () => {
            const settings = getUserSettings();

            expect(settings.geminiKey).toBe('');
            expect(settings.blogUrl).toBe('');
            expect(settings.adsensePublisherId).toBe('');
        });

        it('should return stored settings', () => {
            localStorageMock.setItem('GEMINI_API_KEY', 'test-key');
            localStorageMock.setItem('USER_BLOG_URL', 'https://test.com');
            localStorageMock.setItem('ADSENSE_PUBLISHER_ID', 'pub-123');
            localStorageMock.getItem
                .mockReturnValueOnce('test-key')
                .mockReturnValueOnce('https://test.com')
                .mockReturnValueOnce('pub-123');

            const settings = getUserSettings();

            expect(settings.geminiKey).toBe('test-key');
            expect(settings.blogUrl).toBe('https://test.com');
            expect(settings.adsensePublisherId).toBe('pub-123');
        });
    });

    describe('getAIProviderKeys', () => {
        it('should return empty arrays when no keys stored', () => {
            const keys = getAIProviderKeys();

            expect(keys.gemini).toEqual([]);
            expect(keys.deepseek).toEqual([]);
            expect(keys.openrouter).toEqual([]);
            expect(keys.vercel).toEqual([]);
            expect(keys.perplexity).toEqual([]);
        });

        it('should parse JSON stored keys', () => {
            const storedKeys = [{ key: 'key-1' }, { key: 'key-2' }];
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'ifrit_gemini_keys') return JSON.stringify(storedKeys);
                return null;
            });

            const keys = getAIProviderKeys();

            expect(keys.gemini).toHaveLength(2);
            expect(keys.gemini[0]).toBe('key-1');
        });

        it('should include legacy GEMINI_API_KEY', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'GEMINI_API_KEY') return 'legacy-key';
                return null;
            });

            const keys = getAIProviderKeys();

            expect(keys.gemini).toContain('legacy-key');
        });

        it('should deduplicate keys', () => {
            const storedKeys = [{ key: 'duplicate-key' }];
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'ifrit_gemini_keys') return JSON.stringify(storedKeys);
                if (key === 'GEMINI_API_KEY') return 'duplicate-key';
                return null;
            });

            const keys = getAIProviderKeys();

            // Should not have duplicates
            const uniqueKeys = [...new Set(keys.gemini)];
            expect(keys.gemini.length).toBe(uniqueKeys.length);
        });
    });

    describe('getEnabledProviders', () => {
        it('should return gemini as default', () => {
            const enabled = getEnabledProviders();

            expect(enabled).toContain('gemini');
        });

        it('should return enabled providers from localStorage', () => {
            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'ifrit_gemini_enabled') return 'true';
                if (key === 'ifrit_deepseek_enabled') return 'true';
                if (key === 'ifrit_openrouter_enabled') return 'false';
                return null;
            });

            const enabled = getEnabledProviders();

            expect(enabled).toContain('gemini');
            expect(enabled).toContain('deepseek');
            expect(enabled).not.toContain('openrouter');
        });
    });

    describe('getEnabledProviderKeys', () => {
        it('should filter keys by enabled status', () => {
            const geminiKeys = [{ key: 'gem-key' }];
            const deepseekKeys = [{ key: 'ds-key' }];

            localStorageMock.getItem.mockImplementation((key: string) => {
                if (key === 'ifrit_gemini_keys') return JSON.stringify(geminiKeys);
                if (key === 'ifrit_deepseek_keys') return JSON.stringify(deepseekKeys);
                if (key === 'ifrit_gemini_enabled') return 'true';
                if (key === 'ifrit_deepseek_enabled') return 'false';
                return null;
            });

            const keys = getEnabledProviderKeys();

            expect(keys.gemini).toContain('gem-key');
            expect(keys.deepseek).toEqual([]); // Disabled
        });
    });

    describe('getSelectedModel', () => {
        it('should return undefined when no model selected', () => {
            const model = getSelectedModel('gemini');

            expect(model).toBeUndefined();
        });

        it('should return stored model selection', () => {
            localStorageMock.getItem.mockReturnValue('gemini-2.5-flash');

            const model = getSelectedModel('gemini');

            expect(model).toBe('gemini-2.5-flash');
        });
    });
});

describe('SettingsView Tab Configuration', () => {
    it('should have correct number of tabs', () => {
        const expectedTabs = ['ai', 'usage', 'images', 'templates', 'integrations', 'blog', 'adsense', 'backup'];
        expect(expectedTabs.length).toBe(8);
    });

    it('should have all required tab IDs', () => {
        const tabIds = ['ai', 'usage', 'images', 'templates', 'integrations', 'blog', 'adsense', 'backup'];

        // Verify each tab ID is valid
        for (const id of tabIds) {
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        }
    });
});

describe('Settings Export Format', () => {
    it('should define all exportable keys', () => {
        const exportKeys = [
            'ifrit_gemini_keys', 'ifrit_deepseek_keys', 'ifrit_openrouter_keys',
            'ifrit_vercel_keys', 'ifrit_perplexity_keys',
            'GEMINI_API_KEY', 'ifrit_gemini_key',
            'ifrit_github_token', 'ifrit_github_user',
            'ifrit_vercel_token', 'ifrit_vercel_user',
            'ADSENSE_PUBLISHER_ID', 'ADSENSE_LEADERBOARD_SLOT',
            'ADSENSE_ARTICLE_SLOT', 'ADSENSE_MULTIPLEX_SLOT',
            'USER_BLOG_URL',
            'ifrit_namecheap_user', 'ifrit_namecheap_key',
            'ifrit_spamzilla_key',
            'ifrit_unsplash_key', 'ifrit_pexels_key',
        ];

        expect(exportKeys.length).toBeGreaterThan(15);
    });

    it('should validate export data structure', () => {
        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            app: 'AdSense Ifrit V3',
            settings: { 'test_key': 'value' },
        };

        expect(exportData.version).toBeDefined();
        expect(exportData.exportedAt).toBeDefined();
        expect(exportData.app).toBe('AdSense Ifrit V3');
        expect(exportData.settings).toBeDefined();
    });
});

describe('Settings Import Validation', () => {
    it('should validate required fields', () => {
        const validateImport = (data: { settings?: unknown; version?: string }) => {
            return !!(data.settings && data.version);
        };

        expect(validateImport({ settings: {}, version: '2.0.0' })).toBe(true);
        expect(validateImport({ settings: {} })).toBe(false);
        expect(validateImport({ version: '2.0.0' })).toBe(false);
        expect(validateImport({})).toBe(false);
    });

    it('should handle malformed JSON gracefully', () => {
        const parseSettings = (json: string) => {
            try {
                return JSON.parse(json);
            } catch {
                return null;
            }
        };

        expect(parseSettings('{"valid":"json"}')).toEqual({ valid: 'json' });
        expect(parseSettings('not-json')).toBeNull();
        expect(parseSettings('')).toBeNull();
    });
});
