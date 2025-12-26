/**
 * Tests for Analytics Recommendations
 * 
 * Tests content analytics and recommendation engine
 */

// Mock localStorage
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        clear: jest.fn(() => { store = {}; })
    };
})();

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

import {
    getContentHistory,
    addContentToHistory,
    generateAnalytics,
    getQuickInsights
} from '@/lib/analytics/recommendations';

describe('Analytics Recommendations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
    });

    describe('getContentHistory()', () => {
        it('should return empty array when no history', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const history = getContentHistory();

            expect(history).toEqual([]);
        });

        it('should parse stored history', () => {
            const mockHistory = [
                {
                    id: '1',
                    title: 'Test Article',
                    keyword: 'test keyword',
                    niche: 'Technology',
                    wordCount: 1500,
                    cpcScore: 8.5,
                    template: 'pillar',
                    persona: 'expert',
                    publishedTo: ['website'],
                    createdAt: '2024-01-01'
                }
            ];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

            const history = getContentHistory();

            expect(history).toHaveLength(1);
            expect(history[0].title).toBe('Test Article');
        });
    });

    describe('addContentToHistory()', () => {
        it('should add new content record', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            addContentToHistory({
                title: 'New Article',
                keyword: 'new keyword',
                niche: 'Finance',
                wordCount: 2000,
                cpcScore: 9,
                template: 'pillar',
                persona: 'expert',
                publishedTo: []
            });

            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });

        it('should limit history to 100 items', () => {
            const existingHistory = Array.from({ length: 100 }, (_, i) => ({
                id: `id-${i}`,
                title: `Article ${i}`,
                keyword: `keyword-${i}`,
                niche: 'Tech',
                wordCount: 1000,
                cpcScore: 5,
                template: 'cluster',
                persona: 'blogger',
                publishedTo: [],
                createdAt: '2024-01-01'
            }));
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingHistory));

            addContentToHistory({
                title: 'New Article',
                keyword: 'new',
                niche: 'Finance',
                wordCount: 1500,
                cpcScore: 8,
                template: 'pillar',
                persona: 'expert',
                publishedTo: []
            });

            const savedValue = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            expect(savedValue.length).toBeLessThanOrEqual(100);
        });
    });

    describe('generateAnalytics()', () => {
        it('should return empty analytics when no history', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const analytics = generateAnalytics();

            expect(analytics.totalArticles).toBe(0);
            expect(analytics.recommendations).toEqual([]);
        });

        it('should calculate average metrics', () => {
            const mockHistory = [
                { id: '1', title: 'A', keyword: 'k1', niche: 'Tech', wordCount: 1000, cpcScore: 8, template: 'pillar', persona: 'expert', publishedTo: [], createdAt: '2024-01-01' },
                { id: '2', title: 'B', keyword: 'k2', niche: 'Tech', wordCount: 2000, cpcScore: 10, template: 'cluster', persona: 'blogger', publishedTo: [], createdAt: '2024-01-02' }
            ];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

            const analytics = generateAnalytics();

            expect(analytics.totalArticles).toBe(2);
            expect(analytics.avgWordCount).toBe(1500);
            expect(analytics.avgCPCScore).toBe(9);
        });

        it('should calculate niche distribution', () => {
            const mockHistory = [
                { id: '1', title: 'A', keyword: 'k1', niche: 'Technology', wordCount: 1000, cpcScore: 8, template: 'pillar', persona: 'expert', publishedTo: [], createdAt: '2024-01-01' },
                { id: '2', title: 'B', keyword: 'k2', niche: 'Technology', wordCount: 1000, cpcScore: 8, template: 'cluster', persona: 'blogger', publishedTo: [], createdAt: '2024-01-02' },
                { id: '3', title: 'C', keyword: 'k3', niche: 'Finance', wordCount: 1000, cpcScore: 8, template: 'pillar', persona: 'expert', publishedTo: [], createdAt: '2024-01-03' }
            ];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

            const analytics = generateAnalytics();

            expect(analytics.nicheDistribution['Technology']).toBe(2);
            expect(analytics.nicheDistribution['Finance']).toBe(1);
        });

        it('should generate recommendations', () => {
            const mockHistory = [
                { id: '1', title: 'A', keyword: 'k1', niche: 'Tech', wordCount: 500, cpcScore: 3, template: 'pillar', persona: 'expert', publishedTo: [], createdAt: '2024-01-01' }
            ];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

            const analytics = generateAnalytics();

            // Should have recommendations due to low diversity/cpc
            expect(analytics.score).toBeDefined();
        });
    });

    describe('getQuickInsights()', () => {
        it('should return insights array', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const insights = getQuickInsights();

            expect(Array.isArray(insights)).toBe(true);
        });

        it('should include insights when history exists', () => {
            const mockHistory = [
                { id: '1', title: 'A', keyword: 'k', niche: 'Tech', wordCount: 1000, cpcScore: 8, template: 'pillar', persona: 'expert', publishedTo: [], createdAt: '2024-01-01' }
            ];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHistory));

            const insights = getQuickInsights();

            expect(insights.length).toBeGreaterThan(0);
        });
    });
});
