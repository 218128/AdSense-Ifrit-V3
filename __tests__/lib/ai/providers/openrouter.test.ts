/**
 * Tests for OpenRouter Provider
 * 
 * Comprehensive tests for OpenRouter AI provider (300+ model aggregator)
 */

// Setup fetch mock before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { OpenRouterProvider, openrouterProvider } from '@/lib/ai/providers/openrouter';

describe('OpenRouterProvider', () => {
    let provider: OpenRouterProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        provider = new OpenRouterProvider();
    });

    // Helper to create mock response
    const createMockResponse = (data: unknown, ok: boolean = true, status: number = 200) => ({
        ok,
        status,
        json: jest.fn().mockResolvedValue(data),
        text: jest.fn().mockResolvedValue(JSON.stringify(data)),
        body: null
    });

    describe('meta', () => {
        it('should have correct provider metadata', () => {
            expect(provider.meta.id).toBe('openrouter');
            expect(provider.meta.name).toBe('OpenRouter');
            expect(provider.meta.signupUrl).toContain('openrouter.ai');
        });
    });

    describe('testKey()', () => {
        it('should return valid result with models on success', async () => {
            const mockModels = {
                data: [
                    { id: 'openai/gpt-4', name: 'GPT-4', context_length: 128000 },
                    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', context_length: 200000 },
                    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', context_length: 128000 }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('test-api-key');

            expect(result.valid).toBe(true);
            expect(result.models.length).toBe(3);
            expect(result.responseTimeMs).toBeDefined();
        });

        it('should parse pricing information', async () => {
            const mockModels = {
                data: [
                    {
                        id: 'openai/gpt-4',
                        name: 'GPT-4',
                        pricing: { prompt: '0.00003', completion: '0.00006' }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('test-key');

            expect(result.models[0].pricing).toBeDefined();
            expect(result.models[0].pricing?.input).toBeGreaterThan(0);
        });

        it('should detect special modes from model ID', async () => {
            const mockModels = {
                data: [
                    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1' },
                    { id: 'qwen/qwen-coder-32b', name: 'Qwen Coder' },
                    { id: 'openai/gpt-4-vision', name: 'GPT-4 Vision' }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('test-key');

            // R1 model should have reason mode
            expect(result.models[0].modes).toContain('reason');
            // Coder model should have code mode
            expect(result.models[1].modes).toContain('code');
            // Vision model should have image mode
            expect(result.models[2].modes).toContain('image');
        });

        it('should return error on invalid API key', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: 'Invalid API key' },
                false,
                401
            ));

            const result = await provider.testKey('invalid-key');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('401');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Connection timeout'));

            const result = await provider.testKey('test-key');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Connection timeout');
        });

        it('should include HTTP-Referer header', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

            await provider.testKey('test-key');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('openrouter.ai'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'HTTP-Referer': expect.any(String)
                    })
                })
            );
        });
    });

    describe('chat()', () => {
        it('should generate content successfully', async () => {
            const mockResponse = {
                choices: [{ message: { content: 'Generated response via OpenRouter' } }],
                usage: { prompt_tokens: 30, completion_tokens: 120 }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

            const result = await provider.chat('test-key', { prompt: 'Hello' });

            expect(result.success).toBe(true);
            expect(result.content).toBe('Generated response via OpenRouter');
            expect(result.usage?.inputTokens).toBe(30);
        });

        it('should use default free model when not specified', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            const result = await provider.chat('test-key', { prompt: 'Test' });

            expect(result.model).toBe('deepseek/deepseek-chat:free');
        });

        it('should use specified model', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            const result = await provider.chat('test-key', {
                prompt: 'Test',
                model: 'anthropic/claude-3-opus'
            });

            expect(result.model).toBe('anthropic/claude-3-opus');
        });

        it('should include system prompt when provided', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            await provider.chat('test-key', {
                prompt: 'User message',
                systemPrompt: 'You are a helpful assistant'
            });

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.messages).toHaveLength(2);
            expect(callBody.messages[0].role).toBe('system');
        });

        it('should return error on empty response', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: '' } }]
            }));

            const result = await provider.chat('test-key', { prompt: 'Test' });

            expect(result.success).toBe(false);
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: 'Rate limited' },
                false,
                429
            ));

            const result = await provider.chat('test-key', { prompt: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('429');
        });
    });

    describe('stream()', () => {
        it('should throw on stream error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                body: null
            });

            await expect(async () => {
                for await (const _ of provider.stream('test-key', { prompt: 'Test' })) {
                    // consume stream
                }
            }).rejects.toThrow('OpenRouter stream error');
        });
    });

    describe('singleton export', () => {
        it('should export a singleton instance', () => {
            expect(openrouterProvider).toBeInstanceOf(OpenRouterProvider);
        });
    });
});
