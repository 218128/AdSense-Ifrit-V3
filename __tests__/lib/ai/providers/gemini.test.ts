/**
 * Tests for Gemini Provider
 * 
 * Comprehensive tests for Google Gemini AI provider
 */

// Mock @google/genai SDK
jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn()
}));

import { GoogleGenAI } from '@google/genai';
import { GeminiProvider, geminiProvider } from '@/lib/ai/providers/gemini';
import {
    createMockGenerateOptions,
    setupFetchMock,
    mockFetchSuccess,
    mockFetchError,
    mockFetchNetworkError
} from '../testUtils';

describe('GeminiProvider', () => {
    let provider: GeminiProvider;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new GeminiProvider();
        mockFetch = setupFetchMock();
    });

    describe('meta', () => {
        it('should have correct provider metadata', () => {
            expect(provider.meta.id).toBe('gemini');
            expect(provider.meta.name).toBe('Google Gemini');
            expect(provider.meta.signupUrl).toContain('aistudio.google.com');
        });
    });

    describe('testKey()', () => {
        it('should return valid result with models on success', async () => {
            const mockModels = {
                models: [
                    { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
                    { name: 'models/gemini-3-pro-preview', displayName: 'Gemini 3 Pro' }
                ]
            };

            mockFetchSuccess(mockFetch, mockModels);

            const result = await provider.testKey('test-api-key');

            expect(result.valid).toBe(true);
            expect(result.models.length).toBe(2);
            expect(result.responseTimeMs).toBeDefined();
        });

        it('should filter out embedding and aqa models', async () => {
            const mockModels = {
                models: [
                    { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
                    { name: 'models/embedding-001', displayName: 'Embedding' },
                    { name: 'models/aqa', displayName: 'AQA Model' }
                ]
            };

            mockFetchSuccess(mockFetch, mockModels);

            const result = await provider.testKey('test-api-key');

            expect(result.valid).toBe(true);
            expect(result.models.length).toBe(1);
            expect(result.models[0].id).toBe('gemini-2.5-flash');
        });

        it('should return invalid on API error', async () => {
            mockFetchError(mockFetch, { error: 'Invalid API key' }, 401);

            const result = await provider.testKey('invalid-key');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('401');
        });

        it('should return invalid on network error', async () => {
            mockFetchNetworkError(mockFetch, 'Connection refused');

            const result = await provider.testKey('test-key');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Connection refused');
        });
    });

    describe('chat()', () => {
        let mockGenAI: jest.Mock;

        beforeEach(() => {
            mockGenAI = GoogleGenAI as jest.Mock;
        });

        it('should generate content successfully', async () => {
            const mockResponse = {
                text: 'Generated article content',
                usageMetadata: {
                    promptTokenCount: 50,
                    candidatesTokenCount: 200
                }
            };

            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContent: jest.fn().mockResolvedValue(mockResponse)
                }
            }));

            const options = createMockGenerateOptions({ prompt: 'Write an article' });
            const result = await provider.chat('test-key', options);

            expect(result.success).toBe(true);
            expect(result.content).toBe('Generated article content');
            expect(result.usage?.inputTokens).toBe(50);
            expect(result.usage?.outputTokens).toBe(200);
        });

        it('should use default model when not specified', async () => {
            const mockGenerateContent = jest.fn().mockResolvedValue({ text: 'Content' });

            mockGenAI.mockImplementation(() => ({
                models: { generateContent: mockGenerateContent }
            }));

            const options = createMockGenerateOptions({ model: undefined });
            await provider.chat('test-key', options);

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gemini-2.5-flash'
                })
            );
        });

        it('should include system prompt when provided', async () => {
            const mockGenerateContent = jest.fn().mockResolvedValue({ text: 'Content' });

            mockGenAI.mockImplementation(() => ({
                models: { generateContent: mockGenerateContent }
            }));

            const options = createMockGenerateOptions({
                prompt: 'User prompt',
                systemPrompt: 'You are a helpful assistant'
            });
            await provider.chat('test-key', options);

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    contents: expect.stringContaining('You are a helpful assistant')
                })
            );
        });

        it('should return error result on empty response', async () => {
            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContent: jest.fn().mockResolvedValue({ text: '' })
                }
            }));

            const options = createMockGenerateOptions();
            const result = await provider.chat('test-key', options);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No content');
        });

        it('should handle API errors gracefully', async () => {
            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContent: jest.fn().mockRejectedValue(new Error('Rate limit exceeded'))
                }
            }));

            const options = createMockGenerateOptions();
            const result = await provider.chat('test-key', options);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Rate limit exceeded');
        });
    });

    describe('stream()', () => {
        let mockGenAI: jest.Mock;

        beforeEach(() => {
            mockGenAI = GoogleGenAI as jest.Mock;
        });

        it('should yield chunks from stream', async () => {
            const mockStream = (async function* () {
                yield { text: 'Hello ' };
                yield { text: 'World' };
            })();

            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContentStream: jest.fn().mockResolvedValue(mockStream)
                }
            }));

            const options = createMockGenerateOptions();
            const chunks: string[] = [];

            for await (const chunk of provider.stream('test-key', options)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual(['Hello ', 'World']);
        });

        it('should skip empty chunks', async () => {
            const mockStream = (async function* () {
                yield { text: 'Content' };
                yield { text: '' };
                yield { text: 'More' };
            })();

            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContentStream: jest.fn().mockResolvedValue(mockStream)
                }
            }));

            const options = createMockGenerateOptions();
            const chunks: string[] = [];

            for await (const chunk of provider.stream('test-key', options)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual(['Content', 'More']);
        });

        it('should throw on stream error', async () => {
            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContentStream: jest.fn().mockRejectedValue(new Error('Stream failed'))
                }
            }));

            const options = createMockGenerateOptions();

            await expect(async () => {
                for await (const _ of provider.stream('test-key', options)) {
                    // consume stream
                }
            }).rejects.toThrow('Stream failed');
        });
    });

    describe('chatWithTools()', () => {
        let mockGenAI: jest.Mock;

        beforeEach(() => {
            mockGenAI = GoogleGenAI as jest.Mock;
        });

        it('should fall back to chat() when no MCP clients provided', async () => {
            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContent: jest.fn().mockResolvedValue({ text: 'Result' })
                }
            }));

            const options = createMockGenerateOptions();
            const result = await provider.chatWithTools('test-key', { ...options, mcpClients: [] });

            expect(result.success).toBe(true);
            expect(result.content).toBe('Result');
        });

        it('should fall back to chat() when mcpClients undefined', async () => {
            mockGenAI.mockImplementation(() => ({
                models: {
                    generateContent: jest.fn().mockResolvedValue({ text: 'Result' })
                }
            }));

            const options = createMockGenerateOptions();
            const result = await provider.chatWithTools('test-key', options);

            expect(result.success).toBe(true);
        });
    });

    describe('singleton export', () => {
        it('should export a singleton instance', () => {
            expect(geminiProvider).toBeInstanceOf(GeminiProvider);
        });
    });
});
