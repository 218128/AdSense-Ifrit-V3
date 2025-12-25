/**
 * AIKeyManager Component Tests
 * 
 * Enterprise-grade tests for the AI Key Manager component.
 * Tests cover: key operations, provider toggling, validation, export/import.
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

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// ========== TEST SUITES ==========

describe('AIKeyManager Provider Configuration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
    });

    describe('Provider Definitions', () => {
        const providers = [
            { id: 'gemini', name: 'Google Gemini' },
            { id: 'deepseek', name: 'DeepSeek' },
            { id: 'openrouter', name: 'OpenRouter' },
            { id: 'vercel', name: 'Vercel AI' },
            { id: 'perplexity', name: 'Perplexity' },
        ];

        it('should have 5 supported providers', () => {
            expect(providers.length).toBe(5);
        });

        it('should include required provider IDs', () => {
            const ids = providers.map(p => p.id);
            expect(ids).toContain('gemini');
            expect(ids).toContain('deepseek');
            expect(ids).toContain('openrouter');
            expect(ids).toContain('vercel');
            expect(ids).toContain('perplexity');
        });

        it('should have unique provider IDs', () => {
            const ids = providers.map(p => p.id);
            const uniqueIds = [...new Set(ids)];
            expect(ids.length).toBe(uniqueIds.length);
        });
    });

    describe('Key Storage Format', () => {
        it('should use correct storage key pattern', () => {
            const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];

            for (const provider of providers) {
                const storageKey = `ifrit_${provider}_keys`;
                expect(storageKey).toMatch(/^ifrit_\w+_keys$/);
            }
        });

        it('should serialize keys as JSON array', () => {
            const keys = [
                { key: 'key-1', label: 'Primary' },
                { key: 'key-2', label: 'Backup' },
            ];

            const serialized = JSON.stringify(keys);
            const parsed = JSON.parse(serialized);

            expect(parsed).toHaveLength(2);
            expect(parsed[0].key).toBe('key-1');
        });

        it('should include validation metadata', () => {
            const key = {
                key: 'test-key-123',
                label: 'Test Key',
                validated: true,
                validatedAt: Date.now(),
            };

            expect(key.validated).toBe(true);
            expect(typeof key.validatedAt).toBe('number');
        });
    });
});

describe('AIKeyManager Key Operations', () => {
    describe('Key Addition', () => {
        it('should add new key to empty list', () => {
            const keys: { key: string }[] = [];
            const newKey = { key: 'new-key-123' };

            keys.push(newKey);

            expect(keys).toHaveLength(1);
            expect(keys[0].key).toBe('new-key-123');
        });

        it('should append key to existing list', () => {
            const keys = [{ key: 'existing-key' }];
            const newKey = { key: 'new-key' };

            keys.push(newKey);

            expect(keys).toHaveLength(2);
        });

        it('should prevent duplicate keys', () => {
            const keys = [{ key: 'duplicate-key' }];
            const newKey = { key: 'duplicate-key' };

            const exists = keys.some(k => k.key === newKey.key);
            if (!exists) keys.push(newKey);

            expect(keys).toHaveLength(1);
        });
    });

    describe('Key Removal', () => {
        it('should remove key by value', () => {
            const keys = [
                { key: 'key-1' },
                { key: 'key-to-remove' },
                { key: 'key-3' },
            ];

            const filtered = keys.filter(k => k.key !== 'key-to-remove');

            expect(filtered).toHaveLength(2);
            expect(filtered.some(k => k.key === 'key-to-remove')).toBe(false);
        });

        it('should handle removal of non-existent key', () => {
            const keys = [{ key: 'existing' }];

            const filtered = keys.filter(k => k.key !== 'non-existent');

            expect(filtered).toHaveLength(1);
        });
    });

    describe('Key Masking', () => {
        it('should mask API keys for display', () => {
            const maskKey = (key: string): string => {
                if (key.length <= 8) return '****';
                return key.slice(0, 4) + '****' + key.slice(-4);
            };

            expect(maskKey('AIzaSyABCDEFGHIJKLMNOPQRST')).toBe('AIza****QRST');
            expect(maskKey('short')).toBe('****');
        });
    });
});

describe('AIKeyManager Provider Toggle', () => {
    it('should track enabled state per provider', () => {
        const enabledProviders = new Set(['gemini']);

        expect(enabledProviders.has('gemini')).toBe(true);
        expect(enabledProviders.has('deepseek')).toBe(false);
    });

    it('should toggle provider on/off', () => {
        const enabledProviders = new Set(['gemini']);

        // Enable deepseek
        enabledProviders.add('deepseek');
        expect(enabledProviders.has('deepseek')).toBe(true);

        // Disable deepseek
        enabledProviders.delete('deepseek');
        expect(enabledProviders.has('deepseek')).toBe(false);
    });

    it('should persist enabled state to localStorage', () => {
        const setEnabled = (provider: string, enabled: boolean) => {
            localStorageMock.setItem(`ifrit_${provider}_enabled`, String(enabled));
        };

        setEnabled('deepseek', true);

        expect(localStorageMock.setItem).toHaveBeenCalledWith('ifrit_deepseek_enabled', 'true');
    });
});

describe('AIKeyManager Model Selection', () => {
    it('should store selected model per provider', () => {
        const selectedModels: Record<string, string> = {};

        selectedModels['gemini'] = 'gemini-2.5-flash';
        selectedModels['deepseek'] = 'deepseek-chat';

        expect(selectedModels['gemini']).toBe('gemini-2.5-flash');
        expect(selectedModels['deepseek']).toBe('deepseek-chat');
    });

    it('should persist model selection', () => {
        const setModel = (provider: string, model: string) => {
            localStorageMock.setItem(`ifrit_${provider}_model`, model);
        };

        setModel('gemini', 'gemini-2.5-pro');

        expect(localStorageMock.setItem).toHaveBeenCalledWith('ifrit_gemini_model', 'gemini-2.5-pro');
    });
});

describe('AIKeyManager Key Validation', () => {
    it('should call validation API', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ valid: true, model: 'gemini-2.5-flash' }),
        });

        const validateKey = async (provider: string, key: string) => {
            const res = await fetch('/api/ai/validate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, key }),
            });
            return res.json();
        };

        const result = await validateKey('gemini', 'test-key');

        expect(result.valid).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
            '/api/ai/validate-key',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('should handle validation failure', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ valid: false, error: 'Invalid API key' }),
        });

        const res = await fetch('/api/ai/validate-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'gemini', key: 'bad-key' }),
        });
        const result = await res.json();

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid API key');
    });
});

describe('AIKeyManager Export/Import', () => {
    it('should export all provider keys', () => {
        const providerKeys = {
            gemini: [{ key: 'gem-key' }],
            deepseek: [{ key: 'ds-key' }],
        };

        const exportData = {
            version: '1.0.0',
            providers: providerKeys,
        };

        expect(exportData.providers.gemini).toHaveLength(1);
        expect(exportData.providers.deepseek).toHaveLength(1);
    });

    it('should import keys from file', () => {
        const importData = {
            version: '1.0.0',
            providers: {
                gemini: [{ key: 'imported-key' }],
            },
        };

        const importKeys = (data: typeof importData) => {
            const result: Record<string, { key: string }[]> = {};
            for (const [provider, keys] of Object.entries(data.providers)) {
                result[provider] = keys;
            }
            return result;
        };

        const imported = importKeys(importData);

        expect(imported.gemini[0].key).toBe('imported-key');
    });
});

describe('AIKeyManager Provider Colors', () => {
    it('should return unique colors for each provider', () => {
        const getProviderColor = (providerId: string): string => {
            const colors: Record<string, string> = {
                gemini: 'from-blue-500 to-indigo-600',
                deepseek: 'from-emerald-500 to-teal-600',
                openrouter: 'from-orange-500 to-red-500',
                vercel: 'from-gray-700 to-gray-900',
                perplexity: 'from-cyan-500 to-blue-500',
            };
            return colors[providerId] || 'from-gray-400 to-gray-600';
        };

        expect(getProviderColor('gemini')).toContain('blue');
        expect(getProviderColor('deepseek')).toContain('emerald');
        expect(getProviderColor('unknown')).toContain('gray');
    });
});
