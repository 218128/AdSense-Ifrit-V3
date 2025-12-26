/**
 * Tests for Perplexity Provider
 * 
 * Comprehensive tests for Perplexity AI provider (Sonar models)
 */

// Setup fetch mock before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { PerplexityProvider, perplexityProvider } from '@/lib/ai/providers/perplexity';

describe('PerplexityProvider', () => {
    let provider: PerplexityProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        provider = new PerplexityProvider();
    });

    // Helper to create mock response
    const createMockResponse = (data: unknown, ok: boolean = true, status: number = 200) => ({
        ok,
        status,
        json: jest.fn().mockResolvedValue(data),
        text: jest.fn().mockResolvedValue(JSON.stringify(data))
    });

    describe('meta', () => {
        it('should have correct provider metadata', () => {
            expect(provider.meta.id).toBe('perplexity');
            expect(provider.meta.name).toBe('Perplexity AI');
            expect(provider.meta.keyPrefix).toBe('pplx-');
        });
    });

    describe('testKey()', () => {
        it('should reject keys without pplx- prefix', async () => {
            const result = await provider.testKey('invalid-key-format');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('pplx-');
        });

        it('should return valid result with models on success', async () => {
            const mockModels = {
                data: [
                    { id: 'sonar', object: 'model' },
                    { id: 'sonar-pro', object: 'model' }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('pplx-test-key');

            expect(result.valid).toBe(true);
            expect(result.models.length).toBe(2);
        });

        it('should detect reasoning mode for reasoning models', async () => {
            const mockModels = {
                data: [
                    { id: 'sonar-reasoning-pro', object: 'model' }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('pplx-test-key');

            expect(result.models[0].modes).toContain('reason');
        });

        it('should return known models on 404 (endpoint not found)', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

            const result = await provider.testKey('pplx-test-key');

            expect(result.valid).toBe(true);
            expect(result.models.length).toBeGreaterThan(0);
            expect(result.models.some(m => m.id === 'sonar')).toBe(true);
        });

        it('should return error on invalid API key', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: 'Unauthorized' },
                false,
                401
            ));

            const result = await provider.testKey('pplx-invalid-key');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('401');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await provider.testKey('pplx-test-key');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Network error');
        });
    });

    describe('chat()', () => {
        it('should generate content successfully', async () => {
            const mockResponse = {
                choices: [{ message: { content: 'Web-grounded response with citations' } }],
                usage: { prompt_tokens: 20, completion_tokens: 80 }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

            const result = await provider.chat('pplx-test-key', { prompt: 'Search query' });

            expect(result.success).toBe(true);
            expect(result.content).toBe('Web-grounded response with citations');
            expect(result.usage?.inputTokens).toBe(20);
        });

        it('should use sonar model by default', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            const result = await provider.chat('pplx-test-key', { prompt: 'Test' });

            expect(result.model).toBe('sonar');
        });

        it('should include system prompt when provided', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            await provider.chat('pplx-test-key', {
                prompt: 'User query',
                systemPrompt: 'You are a research assistant'
            });

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.messages[0].role).toBe('system');
        });

        it('should return error on empty response', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: '' } }]
            }));

            const result = await provider.chat('pplx-test-key', { prompt: 'Test' });

            expect(result.success).toBe(false);
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: 'Rate limit' },
                false,
                429
            ));

            const result = await provider.chat('pplx-test-key', { prompt: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('429');
        });
    });

    describe('singleton export', () => {
        it('should export a singleton instance', () => {
            expect(perplexityProvider).toBeInstanceOf(PerplexityProvider);
        });
    });
});
