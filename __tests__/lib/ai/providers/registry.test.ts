/**
 * Tests for Provider Registry
 * 
 * Comprehensive tests for the provider registration and state management
 */

// Mock all provider imports to avoid actual SDK dependencies
jest.mock('@/lib/ai/providers/gemini', () => ({
    geminiProvider: {
        meta: { id: 'gemini', name: 'Google Gemini' },
        testKey: jest.fn()
    }
}));

jest.mock('@/lib/ai/providers/deepseek', () => ({
    deepseekProvider: {
        meta: { id: 'deepseek', name: 'DeepSeek' },
        testKey: jest.fn()
    }
}));

jest.mock('@/lib/ai/providers/openrouter', () => ({
    openrouterProvider: {
        meta: { id: 'openrouter', name: 'OpenRouter' },
        testKey: jest.fn()
    }
}));

jest.mock('@/lib/ai/providers/perplexity', () => ({
    perplexityProvider: {
        meta: { id: 'perplexity', name: 'Perplexity AI' },
        testKey: jest.fn()
    }
}));

jest.mock('@/lib/ai/providers/vercel', () => ({
    vercelGatewayProvider: {
        meta: { id: 'vercel', name: 'Vercel AI Gateway' },
        testKey: jest.fn()
    }
}));

import {
    ProviderRegistry,
    getProviderRegistry,
    PROVIDER_ADAPTERS,
    PROVIDER_STORAGE_KEYS
} from '@/lib/ai/providers/registry';

describe('ProviderRegistry', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
        jest.clearAllMocks();
        registry = new ProviderRegistry();
    });

    describe('constructor', () => {
        it('should initialize states for all providers', () => {
            const states = registry.getAllStates();

            expect(states.length).toBe(5); // gemini, deepseek, openrouter, perplexity, vercel
            expect(states.every(s => s.enabled === false)).toBe(true);
            expect(states.every(s => s.keyValidated === false)).toBe(true);
        });
    });

    describe('getAdapter()', () => {
        it('should return provider adapter', () => {
            const adapter = registry.getAdapter('gemini');

            expect(adapter).toBeDefined();
            expect(adapter.meta.id).toBe('gemini');
        });
    });

    describe('getState()', () => {
        it('should return state for provider', () => {
            const state = registry.getState('gemini');

            expect(state).toBeDefined();
            expect(state?.providerId).toBe('gemini');
            expect(state?.enabled).toBe(false);
        });

        it('should return undefined for unknown provider', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input intentionally
            const state = registry.getState('unknown' as any);

            expect(state).toBeUndefined();
        });
    });

    describe('setApiKey()', () => {
        it('should set API key for provider', () => {
            registry.setApiKey('gemini', 'test-key');

            const state = registry.getState('gemini');
            expect(state?.apiKey).toBe('test-key');
        });

        it('should reset validation state when key changes', () => {
            registry.setApiKey('gemini', 'old-key');
            const state = registry.getState('gemini');

            // Simulate previous validation
            if (state) {
                state.keyValidated = true;
                state.availableModels = [{ id: 'model-1', name: 'Model 1', modes: ['chat'] }];
            }

            registry.setApiKey('gemini', 'new-key');

            expect(state?.keyValidated).toBe(false);
            expect(state?.availableModels).toHaveLength(0);
        });
    });

    describe('testKey()', () => {
        it('should validate and store models on success', async () => {
            const mockModels = [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', modes: ['chat'] }
            ];

            // Get mocked adapter and set up the mock
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValueOnce({
                valid: true,
                models: mockModels,
                responseTimeMs: 100
            });

            const result = await registry.testKey('gemini', 'valid-key');

            expect(result.valid).toBe(true);
            expect(result.models).toHaveLength(1);

            const state = registry.getState('gemini');
            expect(state?.keyValidated).toBe(true);
            expect(state?.availableModels).toHaveLength(1);
        });

        it('should auto-select first model when validated', async () => {
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValueOnce({
                valid: true,
                models: [
                    { id: 'model-1', name: 'Model 1', modes: ['chat'] },
                    { id: 'model-2', name: 'Model 2', modes: ['chat'] }
                ],
                responseTimeMs: 100
            });

            await registry.testKey('gemini', 'valid-key');

            const state = registry.getState('gemini');
            expect(state?.selectedModel).toBe('model-1');
        });

        it('should mark invalid on failure', async () => {
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValueOnce({
                valid: false,
                models: [],
                error: 'Invalid key'
            });

            const result = await registry.testKey('gemini', 'bad-key');

            expect(result.valid).toBe(false);

            const state = registry.getState('gemini');
            expect(state?.keyValidated).toBe(false);
        });
    });

    describe('selectModel()', () => {
        it('should select model if available', async () => {
            // First validate to get models
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValueOnce({
                valid: true,
                models: [
                    { id: 'model-1', name: 'Model 1', modes: ['chat'] },
                    { id: 'model-2', name: 'Model 2', modes: ['chat'] }
                ]
            });
            await registry.testKey('gemini', 'key');

            registry.selectModel('gemini', 'model-2');

            const state = registry.getState('gemini');
            expect(state?.selectedModel).toBe('model-2');
        });

        it('should not select unavailable model', async () => {
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValueOnce({
                valid: true,
                models: [{ id: 'model-1', name: 'Model 1', modes: ['chat'] }]
            });
            await registry.testKey('gemini', 'key');

            registry.selectModel('gemini', 'nonexistent-model');

            const state = registry.getState('gemini');
            expect(state?.selectedModel).toBe('model-1'); // Should stay on auto-selected model
        });
    });

    describe('setEnabled()', () => {
        it('should enable provider when requirements met', async () => {
            // Setup: validate key and select model
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValueOnce({
                valid: true,
                models: [{ id: 'model-1', name: 'Model 1', modes: ['chat'] }]
            });
            await registry.testKey('gemini', 'key');

            const result = registry.setEnabled('gemini', true);

            expect(result).toBe(true);
            expect(registry.getState('gemini')?.enabled).toBe(true);
        });

        it('should fail to enable without validated key', () => {
            const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

            const result = registry.setEnabled('gemini', true);

            expect(result).toBe(false);
            expect(registry.getState('gemini')?.enabled).toBe(false);

            consoleWarn.mockRestore();
        });

        it('should disable provider', async () => {
            // Setup: enable provider
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValueOnce({
                valid: true,
                models: [{ id: 'model-1', name: 'Model 1', modes: ['chat'] }]
            });
            await registry.testKey('gemini', 'key');
            registry.setEnabled('gemini', true);

            const result = registry.setEnabled('gemini', false);

            expect(result).toBe(true);
            expect(registry.getState('gemini')?.enabled).toBe(false);
        });
    });

    describe('getEnabledProviders()', () => {
        it('should return enabled providers in order', async () => {
            // Enable two providers
            const geminiAdapter = registry.getAdapter('gemini');
            (geminiAdapter.testKey as jest.Mock).mockResolvedValue({
                valid: true,
                models: [{ id: 'gemini-model', name: 'Gemini', modes: ['chat'] }]
            });

            const deepseekAdapter = registry.getAdapter('deepseek');
            (deepseekAdapter.testKey as jest.Mock).mockResolvedValue({
                valid: true,
                models: [{ id: 'deepseek-model', name: 'DeepSeek', modes: ['chat'] }]
            });

            await registry.testKey('gemini', 'key1');
            await registry.testKey('deepseek', 'key2');
            registry.setEnabled('gemini', true);
            registry.setEnabled('deepseek', true);

            const enabled = registry.getEnabledProviders();

            expect(enabled.length).toBe(2);
            expect(enabled[0].providerId).toBe('gemini'); // First in default order
            expect(enabled[1].providerId).toBe('deepseek');
        });

        it('should respect custom provider order', async () => {
            // Enable two providers
            const geminiAdapter = registry.getAdapter('gemini');
            (geminiAdapter.testKey as jest.Mock).mockResolvedValue({
                valid: true,
                models: [{ id: 'gemini-model', name: 'Gemini', modes: ['chat'] }]
            });

            const deepseekAdapter = registry.getAdapter('deepseek');
            (deepseekAdapter.testKey as jest.Mock).mockResolvedValue({
                valid: true,
                models: [{ id: 'deepseek-model', name: 'DeepSeek', modes: ['chat'] }]
            });

            await registry.testKey('gemini', 'key1');
            await registry.testKey('deepseek', 'key2');
            registry.setEnabled('gemini', true);
            registry.setEnabled('deepseek', true);

            // Change order
            registry.setProviderOrder(['deepseek', 'gemini', 'openrouter', 'vercel', 'perplexity']);

            const enabled = registry.getEnabledProviders();

            expect(enabled[0].providerId).toBe('deepseek'); // Now first
            expect(enabled[1].providerId).toBe('gemini');
        });
    });

    describe('export() / import()', () => {
        it('should export registry state', async () => {
            // Setup some state
            const adapter = registry.getAdapter('gemini');
            (adapter.testKey as jest.Mock).mockResolvedValue({
                valid: true,
                models: [{ id: 'model-1', name: 'Model 1', modes: ['chat'] }]
            });
            await registry.testKey('gemini', 'secret-key');
            registry.setEnabled('gemini', true);

            const exported = registry.export();

            expect(exported.gemini).toBeDefined();
            expect(exported.gemini.apiKey).toBe('secret-key');
            expect(exported.gemini.enabled).toBe(true);
        });

        it('should import registry state', () => {
            registry.import({
                gemini: {
                    apiKey: 'imported-key',
                    selectedModel: 'imported-model'
                }
            });

            const state = registry.getState('gemini');
            expect(state?.apiKey).toBe('imported-key');
            expect(state?.selectedModel).toBe('imported-model');
        });
    });

    describe('getProviderRegistry() singleton', () => {
        it('should return same instance', () => {
            const instance1 = getProviderRegistry();
            const instance2 = getProviderRegistry();

            expect(instance1).toBe(instance2);
        });
    });

    describe('PROVIDER_STORAGE_KEYS', () => {
        it('should export storage key constants', () => {
            expect(PROVIDER_STORAGE_KEYS.registry).toBeDefined();
            expect(PROVIDER_STORAGE_KEYS.providerOrder).toBeDefined();
        });
    });
});
