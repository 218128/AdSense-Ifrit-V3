/**
 * Google Trends Tests
 * @jest-environment jsdom
 */

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

import {
    fetchTrendsUnofficial,
    fetchTrendsSerpApi,
    fetchTrends
} from '@/features/campaigns/lib/trendsApi';
import { fetchTrendsSourceItems } from '@/features/campaigns/lib/trendsSource';
import type { TrendsSourceConfig } from '@/features/campaigns/model/types';

describe('Google Trends API', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('fetchTrendsUnofficial', () => {
        it('should parse daily trends response', async () => {
            const mockResponse = {
                default: {
                    trendingSearchesDays: [
                        {
                            trendingSearches: [
                                {
                                    title: { query: 'AI News' },
                                    formattedTraffic: '100K+',
                                    articles: [{ url: 'https://example.com/ai' }],
                                    relatedQueries: [{ query: 'machine learning' }],
                                },
                                {
                                    title: { query: 'Tech Update' },
                                    formattedTraffic: '50K+',
                                },
                            ],
                        },
                    ],
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => ")]}'" + JSON.stringify(mockResponse),
            });

            const result = await fetchTrendsUnofficial('US');

            expect(result.success).toBe(true);
            expect(result.source).toBe('unofficial');
            expect(result.topics).toHaveLength(2);
            expect(result.topics[0].title).toBe('AI News');
            expect(result.topics[0].searchVolume).toBe('100K+');
        });

        it('should handle API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
            });

            const result = await fetchTrendsUnofficial('US');

            expect(result.success).toBe(false);
            expect(result.error).toBe('HTTP 429');
        });
    });

    describe('fetchTrendsSerpApi', () => {
        it('should parse SerpAPI response', async () => {
            const mockResponse = {
                trending_searches: [
                    {
                        query: 'Breaking News',
                        traffic: '500K+',
                        related_queries: [{ query: 'related topic' }],
                    },
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await fetchTrendsSerpApi('test-api-key', 'US');

            expect(result.success).toBe(true);
            expect(result.source).toBe('serpapi');
            expect(result.topics).toHaveLength(1);
            expect(result.topics[0].title).toBe('Breaking News');
        });

        it('should require API key', async () => {
            const result = await fetchTrendsSerpApi('', 'US');

            expect(result.success).toBe(false);
            expect(result.error).toBe('SerpAPI key required');
        });
    });

    describe('fetchTrends (auto)', () => {
        it('should try unofficial first', async () => {
            const mockResponse = {
                default: {
                    trendingSearchesDays: [
                        {
                            trendingSearches: [
                                { title: { query: 'Test Topic' }, formattedTraffic: '10K+' },
                            ],
                        },
                    ],
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => ")]}'" + JSON.stringify(mockResponse),
            });

            const result = await fetchTrends({
                provider: 'auto',
                region: 'US',
            });

            expect(result.success).toBe(true);
            expect(result.source).toBe('unofficial');
        });
    });
});

describe('Trends Source', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('should convert trends to source items', async () => {
        const mockResponse = {
            default: {
                trendingSearchesDays: [
                    {
                        trendingSearches: [
                            {
                                title: { query: 'Trending Topic' },
                                formattedTraffic: '100K+',
                                relatedQueries: [{ query: 'related' }],
                            },
                        ],
                    },
                ],
            },
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => ")]}'" + JSON.stringify(mockResponse),
        });

        const config: TrendsSourceConfig = {
            type: 'trends',
            region: 'US',
        };

        const result = await fetchTrendsSourceItems(config, 10);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].topic).toBe('Trending Topic');
        expect(result.items[0].sourceType).toBe('trends');
    });

    it('should filter by minimum search volume', async () => {
        const mockResponse = {
            default: {
                trendingSearchesDays: [
                    {
                        trendingSearches: [
                            { title: { query: 'High Volume' }, formattedTraffic: '1M+' },
                            { title: { query: 'Low Volume' }, formattedTraffic: '1K+' },
                        ],
                    },
                ],
            },
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => ")]}'" + JSON.stringify(mockResponse),
        });

        const config: TrendsSourceConfig = {
            type: 'trends',
            region: 'US',
            minSearchVolume: 100000, // 100K minimum
        };

        const result = await fetchTrendsSourceItems(config, 10);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].topic).toBe('High Volume');
    });
});
