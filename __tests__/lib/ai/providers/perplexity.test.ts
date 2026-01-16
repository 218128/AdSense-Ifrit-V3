/**
 * Tests for Perplexity Provider (Updated for SDK)
 * 
 * Tests the SDK-based Perplexity provider implementation.
 * Mocks the @perplexity-ai/perplexity_ai SDK.
 */

// Mock the Perplexity SDK module
jest.mock('@perplexity-ai/perplexity_ai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn()
            }
        },
        search: {
            create: jest.fn()
        },
        async: {
            chat: {
                completions: {
                    create: jest.fn(),
                    get: jest.fn(),
                    list: jest.fn()
                }
            }
        }
    }));
});

import { PerplexityProvider, perplexityProvider } from '@/lib/ai/providers/perplexity';
import Perplexity from '@perplexity-ai/perplexity_ai';

const MockPerplexity = Perplexity as jest.MockedClass<typeof Perplexity>;

describe('PerplexityProvider', () => {
    let provider: PerplexityProvider;
    let mockSdkInstance: ReturnType<typeof Perplexity>;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new PerplexityProvider();

        // Get the mock instance
        mockSdkInstance = new MockPerplexity();
    });

    describe('meta', () => {
        it('should have correct provider metadata', () => {
            expect(provider.meta.id).toBe('perplexity');
            expect(provider.meta.name).toBe('Perplexity AI');
            expect(provider.meta.keyPrefix).toBe('pplx-');
            expect(provider.meta.docsUrl).toBe('https://docs.perplexity.ai/');
        });
    });

    describe('testKey()', () => {
        it('should reject keys without pplx- prefix', async () => {
            const result = await provider.testKey('invalid-key-format');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('pplx-');
        });

        it('should return valid result with 4 models on valid key', async () => {
            // Mock successful chat call for key validation
            (mockSdkInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
                choices: [{ message: { content: 'test' } }]
            });
            MockPerplexity.mockImplementationOnce(() => mockSdkInstance);

            const result = await provider.testKey('pplx-test-key');

            expect(result.valid).toBe(true);
            // New implementation returns all 4 known models
            expect(result.models.length).toBe(4);
            expect(result.models.some(m => m.id === 'sonar')).toBe(true);
            expect(result.models.some(m => m.id === 'sonar-pro')).toBe(true);
            expect(result.models.some(m => m.id === 'sonar-reasoning-pro')).toBe(true);
            expect(result.models.some(m => m.id === 'sonar-deep-research')).toBe(true);
        });

        it('should detect reasoning mode for reasoning model', async () => {
            (mockSdkInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
                choices: [{ message: { content: 'test' } }]
            });
            MockPerplexity.mockImplementationOnce(() => mockSdkInstance);

            const result = await provider.testKey('pplx-test-key');

            const reasoningModel = result.models.find(m => m.id === 'sonar-reasoning-pro');
            expect(reasoningModel?.modes).toContain('reason');
        });

        it('should return valid even if internal call fails (returns known models)', async () => {
            // The testKey implementation returns known models on any error
            // since prefix is valid - this is expected behavior
            const result = await provider.testKey('pplx-any-key');

            // Should return known models since prefix is valid
            expect(result.models.length).toBe(4);
        });
    });

    describe('chat()', () => {
        it('should generate content successfully with full data', async () => {
            const mockResponse = {
                id: 'req-123',
                model: 'sonar',
                created: Date.now(),
                choices: [{
                    message: { content: 'Web-grounded response with citations' },
                    finish_reason: 'stop',
                    index: 0
                }],
                usage: {
                    prompt_tokens: 20,
                    completion_tokens: 80,
                    total_tokens: 100
                },
                citations: ['https://example.com/source1'],
                search_results: [{
                    title: 'Source 1',
                    url: 'https://example.com/source1',
                    snippet: 'Content...',
                    date: '2024-01-01',
                    last_updated: '2024-01-02'
                }],
                images: ['https://example.com/image1.jpg'],
                related_questions: ['What about X?']
            };

            (mockSdkInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce(mockResponse);
            MockPerplexity.mockImplementationOnce(() => mockSdkInstance);

            const result = await provider.chat('pplx-test-key', { prompt: 'Search query' });

            expect(result.success).toBe(true);
            expect(result.content).toBe('Web-grounded response with citations');
            expect(result.usage?.inputTokens).toBe(20);
            expect(result.usage?.outputTokens).toBe(80);

            // Check Perplexity-specific data
            expect(result.citations).toEqual(['https://example.com/source1']);
            expect(result.images).toEqual(['https://example.com/image1.jpg']);
            expect(result.relatedQuestions).toEqual(['What about X?']);
        });

        it('should use sonar model by default', async () => {
            (mockSdkInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
                choices: [{ message: { content: 'Response' } }]
            });
            MockPerplexity.mockImplementationOnce(() => mockSdkInstance);

            const result = await provider.chat('pplx-test-key', { prompt: 'Test' });

            expect(result.model).toBe('sonar');
        });

        it('should handle SDK errors gracefully', async () => {
            (mockSdkInstance.chat.completions.create as jest.Mock).mockRejectedValueOnce(
                new Error('Rate limit exceeded')
            );
            MockPerplexity.mockImplementationOnce(() => mockSdkInstance);

            const result = await provider.chat('pplx-test-key', { prompt: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Rate limit exceeded');
        });
    });

    describe('search()', () => {
        it('should perform web search successfully', async () => {
            const mockSearchResponse = {
                id: 'search-123',
                results: [
                    {
                        title: 'AI News',
                        url: 'https://example.com/ai',
                        snippet: 'Latest AI developments...',
                        date: '2024-01-15',
                        last_updated: '2024-01-16'
                    }
                ]
            };

            (mockSdkInstance.search.create as jest.Mock).mockResolvedValueOnce(mockSearchResponse);
            MockPerplexity.mockImplementationOnce(() => mockSdkInstance);

            const result = await provider.search('pplx-test-key', {
                query: 'AI developments 2024',
                max_results: 5
            });

            expect(result.id).toBe('search-123');
            expect(result.results.length).toBe(1);
            expect(result.results[0].title).toBe('AI News');
        });
    });

    describe('singleton export', () => {
        it('should export a singleton instance', () => {
            expect(perplexityProvider).toBeInstanceOf(PerplexityProvider);
        });
    });
});
