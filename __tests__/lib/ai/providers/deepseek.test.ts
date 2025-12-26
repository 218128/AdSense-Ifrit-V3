/**
 * Tests for DeepSeek Provider
 * 
 * Comprehensive tests for DeepSeek AI provider (V3.2 and R1 models)
 */

// Setup fetch mock before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { DeepSeekProvider, deepseekProvider } from '@/lib/ai/providers/deepseek';

describe('DeepSeekProvider', () => {
    let provider: DeepSeekProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        provider = new DeepSeekProvider();
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
            expect(provider.meta.id).toBe('deepseek');
            expect(provider.meta.name).toBe('DeepSeek');
            expect(provider.meta.signupUrl).toContain('deepseek.com');
        });
    });

    describe('testKey()', () => {
        it('should return valid result with models on success', async () => {
            const mockModels = {
                data: [
                    { id: 'deepseek-chat', object: 'model' },
                    { id: 'deepseek-reasoner', object: 'model' },
                    { id: 'deepseek-coder', object: 'model' }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('test-api-key');

            expect(result.valid).toBe(true);
            expect(result.models.length).toBe(3);
            expect(result.responseTimeMs).toBeDefined();
        });

        it('should detect reasoning mode for R1 models', async () => {
            const mockModels = {
                data: [
                    { id: 'deepseek-reasoner', object: 'model' }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('test-key');

            expect(result.models[0].modes).toContain('reason');
        });

        it('should detect code mode for coder models', async () => {
            const mockModels = {
                data: [
                    { id: 'deepseek-coder', object: 'model' }
                ]
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

            const result = await provider.testKey('test-key');

            expect(result.models[0].modes).toContain('code');
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
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

            const result = await provider.testKey('test-key');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Connection refused');
        });
    });

    describe('chat()', () => {
        it('should generate content successfully', async () => {
            const mockResponse = {
                choices: [{ message: { content: 'Generated response' } }],
                usage: { prompt_tokens: 25, completion_tokens: 100 }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

            const result = await provider.chat('test-key', { prompt: 'Hello' });

            expect(result.success).toBe(true);
            expect(result.content).toBe('Generated response');
            expect(result.usage?.inputTokens).toBe(25);
            expect(result.usage?.outputTokens).toBe(100);
        });

        it('should use default model when not specified', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            const result = await provider.chat('test-key', { prompt: 'Test' });

            expect(result.model).toBe('deepseek-chat');
        });

        it('should include system prompt when provided', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            await provider.chat('test-key', {
                prompt: 'User message',
                systemPrompt: 'You are helpful'
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
                { error: 'Rate limit exceeded' },
                false,
                429
            ));

            const result = await provider.chat('test-key', { prompt: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('429');
        });
    });

    describe('reason()', () => {
        it('should generate reasoning content successfully', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: 'Final answer',
                        reasoning_content: 'Step 1... Step 2...'
                    }
                }],
                usage: { prompt_tokens: 30, completion_tokens: 150 }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

            const result = await provider.reason('test-key', { prompt: 'Solve this' });

            expect(result.success).toBe(true);
            expect(result.content).toBe('Final answer');
            expect(result.reasoning).toBe('Step 1... Step 2...');
        });

        it('should use deepseek-reasoner model by default', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                choices: [{ message: { content: 'Response' } }]
            }));

            const result = await provider.reason('test-key', { prompt: 'Test' });

            expect(result.model).toBe('deepseek-reasoner');
        });

        it('should handle errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await provider.reason('test-key', { prompt: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });
    });

    describe('singleton export', () => {
        it('should export a singleton instance', () => {
            expect(deepseekProvider).toBeInstanceOf(DeepSeekProvider);
        });
    });
});
