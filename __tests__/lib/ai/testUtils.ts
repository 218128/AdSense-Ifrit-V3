/**
 * Test Utilities for AI Providers
 * 
 * Mock factories and helpers for testing AI provider modules
 */

import type {
    ModelInfo,
    KeyTestResult,
    GenerateOptions,
    GenerateResult,
    ProviderMeta
} from '@/lib/ai/providers/base';

// ============================================
// MOCK FACTORIES
// ============================================

/**
 * Create a mock ModelInfo object
 */
export function createMockModelInfo(overrides: Partial<ModelInfo> = {}): ModelInfo {
    return {
        id: 'test-model',
        name: 'Test Model',
        description: 'A test model for unit tests',
        contextLength: 8192,
        modes: ['chat'],
        ...overrides
    };
}

/**
 * Create a mock KeyTestResult
 */
export function createMockKeyTestResult(overrides: Partial<KeyTestResult> = {}): KeyTestResult {
    return {
        valid: true,
        models: [createMockModelInfo()],
        responseTimeMs: 150,
        ...overrides
    };
}

/**
 * Create mock GenerateOptions
 */
export function createMockGenerateOptions(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
    return {
        prompt: 'Test prompt',
        model: 'test-model',
        maxTokens: 1000,
        temperature: 0.7,
        ...overrides
    };
}

/**
 * Create a mock GenerateResult for success
 */
export function createMockGenerateResult(overrides: Partial<GenerateResult> = {}): GenerateResult {
    return {
        success: true,
        content: 'Generated test content',
        model: 'test-model',
        usage: {
            inputTokens: 10,
            outputTokens: 50
        },
        ...overrides
    };
}

/**
 * Create a mock GenerateResult for error
 */
export function createMockErrorResult(error: string = 'Test error', model: string = 'test-model'): GenerateResult {
    return {
        success: false,
        content: undefined,
        model,
        error
    };
}

/**
 * Create a mock ProviderMeta
 */
export function createMockProviderMeta(overrides: Partial<ProviderMeta> = {}): ProviderMeta {
    return {
        id: 'test-provider',
        name: 'Test Provider',
        description: 'A test provider for unit tests',
        signupUrl: 'https://test.com/signup',
        docsUrl: 'https://test.com/docs',
        ...overrides
    } as ProviderMeta;
}

// ============================================
// FETCH MOCK HELPERS
// ============================================

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: unknown, ok: boolean = true, status: number = 200): Response {
    return {
        ok,
        status,
        json: jest.fn().mockResolvedValue(data),
        text: jest.fn().mockResolvedValue(JSON.stringify(data)),
        headers: new Headers(),
        redirected: false,
        statusText: ok ? 'OK' : 'Error',
        type: 'basic',
        url: '',
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
        bytes: jest.fn()
    } as unknown as Response;
}

/**
 * Setup global fetch mock
 */
export function setupFetchMock(): jest.Mock {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    return mockFetch;
}

/**
 * Mock a successful API response
 */
export function mockFetchSuccess(mockFetch: jest.Mock, data: unknown): void {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse(data, true, 200));
}

/**
 * Mock a failed API response
 */
export function mockFetchError(mockFetch: jest.Mock, error: unknown, status: number = 400): void {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse(error, false, status));
}

/**
 * Mock a network error
 */
export function mockFetchNetworkError(mockFetch: jest.Mock, message: string = 'Network error'): void {
    mockFetch.mockRejectedValueOnce(new Error(message));
}

// ============================================
// GOOGLE GENAI SDK MOCKS
// ============================================

/**
 * Create mock GoogleGenAI instance
 */
export function createMockGoogleGenAI() {
    return {
        models: {
            generateContent: jest.fn().mockResolvedValue({
                text: 'Generated content',
                usageMetadata: {
                    promptTokenCount: 10,
                    candidatesTokenCount: 50
                }
            }),
            generateContentStream: jest.fn().mockImplementation(async function* () {
                yield { text: 'Chunk 1' };
                yield { text: 'Chunk 2' };
            })
        }
    };
}

// ============================================
// CAPABILITY EXECUTOR MOCKS
// ============================================

import type { CapabilityHandler, CapabilitiesConfig, ExecuteOptions } from '@/lib/ai/services/types';

/**
 * Create a mock CapabilityHandler
 */
export function createMockHandler(overrides: Partial<CapabilityHandler> = {}): CapabilityHandler {
    return {
        id: 'test-handler',
        name: 'Test Handler',
        source: 'ai-provider',
        capabilities: ['generate', 'research'],
        priority: 1,
        enabled: true,
        execute: jest.fn().mockResolvedValue({
            success: true,
            data: 'Test result'
        }),
        ...overrides
    };
}

/**
 * Create mock CapabilitiesConfig
 */
export function createMockCapabilitiesConfig(overrides: Partial<CapabilitiesConfig> = {}): CapabilitiesConfig {
    return {
        handlers: {
            generate: 'test-handler',
            research: 'test-handler'
        },
        fallbackChains: {
            generate: ['test-handler', 'fallback-handler'],
            research: ['test-handler']
        },
        maxRetries: 2,
        timeout: 30000,
        ...overrides
    };
}

/**
 * Create mock ExecuteOptions
 */
export function createMockExecuteOptions(overrides: Partial<ExecuteOptions> = {}): ExecuteOptions {
    return {
        capability: 'generate',
        prompt: 'Test prompt',
        context: {},
        ...overrides
    };
}
