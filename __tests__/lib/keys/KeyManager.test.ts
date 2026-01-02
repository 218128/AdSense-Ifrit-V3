/**
 * Tests for KeyManager
 * 
 * Tests key rotation, validation, and health monitoring
 */

// Mock the stores/settingsStore
interface MockStoredKey { key: string; validated?: boolean; validatedAt?: number; label?: string }
const mockProviderKeys: Record<string, MockStoredKey[]> = {
    gemini: [
        { key: 'gemini-key-1', validated: true, validatedAt: Date.now(), label: 'Main' },
        { key: 'gemini-key-2', validated: false, label: 'Backup' }
    ],
    deepseek: [{ key: 'deepseek-key-1', validated: true }],
    openrouter: [],
    vercel: [],
    perplexity: []
};

const mockEnabledProviders = ['gemini', 'deepseek'];

jest.mock('@/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(
        jest.fn(() => ({
            providerKeys: mockProviderKeys,
            enabledProviders: mockEnabledProviders
        })),
        {
            getState: jest.fn(() => ({
                providerKeys: mockProviderKeys,
                enabledProviders: mockEnabledProviders,
                addProviderKey: jest.fn(),
                removeProviderKey: jest.fn()
            }))
        }
    )
}));

// Mock healthMonitor
jest.mock('@/lib/config/healthMonitor', () => ({
    checkProviderHealth: jest.fn().mockResolvedValue({
        status: 'healthy',
        lastCheck: Date.now(),
        message: 'Provider is healthy'
    })
}));

// Mock schemas
jest.mock('@/lib/config/schemas', () => ({
    isValidApiKeyFormat: jest.fn((key: string) => key.length >= 10)
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { KeyManager, keyManager, type ProviderId } from '@/lib/keys/KeyManager';

describe('KeyManager', () => {
    let km: KeyManager;

    beforeEach(() => {
        jest.clearAllMocks();
        km = new KeyManager();
        mockFetch.mockReset();
    });

    describe('constructor', () => {
        it('should create with default config', () => {
            const manager = new KeyManager();
            expect(manager).toBeDefined();
        });

        it('should accept custom config', () => {
            const manager = new KeyManager({ autoRotate: false, validateOnAdd: false });
            expect(manager).toBeDefined();
        });
    });

    describe('getKey()', () => {
        it('should return first key for enabled provider', () => {
            const key = km.getKey('gemini');

            expect(key).not.toBeNull();
            expect(key?.key).toBe('gemini-key-1');
            expect(key?.provider).toBe('gemini');
        });

        it('should return null for disabled provider', () => {
            const key = km.getKey('openrouter');

            expect(key).toBeNull();
        });

        it('should return null for provider with no keys', () => {
            const key = km.getKey('perplexity');

            expect(key).toBeNull();
        });

        it('should include validation status', () => {
            const key = km.getKey('gemini');

            expect(key?.validated).toBe(true);
            expect(key?.validatedAt).toBeDefined();
        });
    });

    describe('getAllKeys()', () => {
        it('should return all keys for provider', () => {
            const keys = km.getAllKeys('gemini');

            expect(keys).toHaveLength(2);
            expect(keys[0].key).toBe('gemini-key-1');
            expect(keys[1].key).toBe('gemini-key-2');
        });

        it('should return empty array for provider with no keys', () => {
            const keys = km.getAllKeys('openrouter');

            expect(keys).toEqual([]);
        });
    });

    describe('getProviderKeysForApi()', () => {
        it('should return keys formatted for API usage', () => {
            const keysMap = km.getProviderKeysForApi();

            expect(keysMap.gemini).toEqual(['gemini-key-1', 'gemini-key-2']);
            expect(keysMap.deepseek).toEqual(['deepseek-key-1']);
            expect(keysMap.openrouter).toEqual([]);
        });

        it('should only include enabled providers', () => {
            const keysMap = km.getProviderKeysForApi();

            // openrouter is not enabled, should be empty
            expect(keysMap.openrouter).toEqual([]);
        });
    });

    describe('rotateKey()', () => {
        it('should rotate to next key', () => {
            // First call gets key at index 0
            const first = km.getKey('gemini');
            expect(first?.key).toBe('gemini-key-1');

            // Rotate to next
            const rotated = km.rotateKey('gemini');
            expect(rotated?.key).toBe('gemini-key-2');
        });

        it('should wrap around to first key', () => {
            km.resetRotation('gemini'); // Reset first
            km.rotateKey('gemini'); // -> index 1
            km.rotateKey('gemini'); // -> index 0 (wrap)

            const key = km.getKey('gemini');
            expect(key?.key).toBe('gemini-key-1');
        });

        it('should return null for provider with no keys', () => {
            const rotated = km.rotateKey('openrouter');

            expect(rotated).toBeNull();
        });
    });

    describe('getRotationStatus()', () => {
        it('should return current rotation state', () => {
            const status = km.getRotationStatus('gemini');

            expect(status.provider).toBe('gemini');
            expect(status.total).toBe(2);
            expect(status.currentIndex).toBeGreaterThanOrEqual(0);
        });

        it('should handle provider with no keys', () => {
            const status = km.getRotationStatus('openrouter');

            expect(status.total).toBe(0);
        });
    });

    describe('resetRotation()', () => {
        it('should reset rotation to first key', () => {
            km.rotateKey('gemini'); // Move to index 1
            km.resetRotation('gemini');

            const status = km.getRotationStatus('gemini');
            expect(status.currentIndex).toBe(0);
        });
    });

    describe('validateKey()', () => {
        it('should reject invalid key format', async () => {
            const result = await km.validateKey('gemini', 'short');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('format');
        });

        it('should call API for valid format', async () => {
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({ valid: true, models: [{ id: 'gemini-pro' }] })
            });

            const result = await km.validateKey('gemini', 'valid-long-key');

            expect(mockFetch).toHaveBeenCalled();
            expect(result.valid).toBe(true);
            expect(result.models).toContain('gemini-pro');
        });

        it('should handle validation failure', async () => {
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({ valid: false, error: 'Invalid API key' })
            });

            const result = await km.validateKey('gemini', 'invalid-key-1234');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid API key');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network timeout'));

            const result = await km.validateKey('gemini', 'some-valid-key');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Network timeout');
        });

        it('should include response time', async () => {
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({ valid: true, models: [] })
            });

            const result = await km.validateKey('deepseek', 'valid-key-12345');

            expect(result.responseTime).toBeDefined();
            expect(result.responseTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('addKey()', () => {
        it('should add key when validation passes', async () => {
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({ valid: true, models: [] })
            });

            const result = await km.addKey('gemini', 'new-valid-key-123', 'Test Key');

            expect(result.success).toBe(true);
        });

        it('should reject key when validation fails', async () => {
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({ valid: false, error: 'Invalid' })
            });

            const result = await km.addKey('gemini', 'invalid-key-test');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should skip validation when requested', async () => {
            const result = await km.addKey('gemini', 'unvalidated-key', undefined, true);

            expect(result.success).toBe(true);
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('checkHealth()', () => {
        it('should return health status for configured provider', async () => {
            const health = await km.checkHealth('gemini');

            expect(health.status).toBe('healthy');
        });

        it('should return unconfigured for provider without key', async () => {
            const health = await km.checkHealth('openrouter');

            expect(health.status).toBe('unconfigured');
        });
    });

    describe('hasAnyKeys()', () => {
        it('should return true when keys exist', () => {
            expect(km.hasAnyKeys()).toBe(true);
        });
    });

    describe('getSummary()', () => {
        it('should return summary for all providers', () => {
            const summary = km.getSummary();

            expect(summary.gemini).toEqual({
                enabled: true,
                keyCount: 2,
                validated: 1
            });

            expect(summary.openrouter).toEqual({
                enabled: false,
                keyCount: 0,
                validated: 0
            });
        });
    });

    describe('singleton instance', () => {
        it('should export a default keyManager instance', () => {
            expect(keyManager).toBeDefined();
            expect(keyManager).toBeInstanceOf(KeyManager);
        });
    });
});
