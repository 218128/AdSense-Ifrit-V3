/**
 * Multi-Site & Advanced Tests
 * @jest-environment jsdom
 */

import {
    createStaggeredSchedule,
    getNextScheduledSite,
    validateMultiSiteConfig,
    type MultiSiteConfig,
} from '@/features/campaigns/lib/multiSitePublishing';

import {
    suggestTopicsFromPerformance,
    type PostPerformance,
} from '@/features/campaigns/lib/analytics';

import {
    createABTest,
    recordImpression,
    recordClick,
    calculateCTR,
    determineWinner,
    generateTitleVariations,
} from '@/features/campaigns/lib/abTesting';

describe('Multi-Site Publishing', () => {
    describe('createStaggeredSchedule', () => {
        it('should create schedule with correct timestamps', () => {
            const siteIds = ['site1', 'site2', 'site3'];
            const startTime = Date.now();
            const staggerMinutes = 30;

            const schedule = createStaggeredSchedule(siteIds, startTime, staggerMinutes);

            expect(schedule).toHaveLength(3);
            expect(schedule[0].scheduledAt).toBe(startTime);
            expect(schedule[1].scheduledAt).toBe(startTime + 30 * 60 * 1000);
            expect(schedule[2].scheduledAt).toBe(startTime + 60 * 60 * 1000);
        });
    });

    describe('getNextScheduledSite', () => {
        it('should return next due site', () => {
            const schedule = [
                { siteId: 'site1', scheduledAt: Date.now() - 1000, executed: true },
                { siteId: 'site2', scheduledAt: Date.now() - 500, executed: false },
                { siteId: 'site3', scheduledAt: Date.now() + 10000, executed: false },
            ];

            const next = getNextScheduledSite(schedule);

            expect(next?.siteId).toBe('site2');
        });

        it('should return null if no sites due', () => {
            const schedule = [
                { siteId: 'site1', scheduledAt: Date.now() + 10000, executed: false },
            ];

            const next = getNextScheduledSite(schedule);

            expect(next).toBeNull();
        });
    });

    describe('validateMultiSiteConfig', () => {
        it('should validate valid config', () => {
            const config: MultiSiteConfig = {
                sites: [{ siteId: 'site1' }, { siteId: 'site2' }],
                staggerMinutes: 30,
                spinForEachSite: true,
            };

            const errors = validateMultiSiteConfig(config);

            expect(errors).toHaveLength(0);
        });

        it('should error on empty sites', () => {
            const config: MultiSiteConfig = {
                sites: [],
                staggerMinutes: 30,
                spinForEachSite: false,
            };

            const errors = validateMultiSiteConfig(config);

            expect(errors).toContain('At least one target site is required');
        });
    });
});

describe('Analytics', () => {
    describe('suggestTopicsFromPerformance', () => {
        it('should suggest topics from high-performing posts', () => {
            const performances: PostPerformance[] = [
                {
                    postId: 1,
                    siteId: 'site1',
                    title: 'Best Smartphone Reviews 2024',
                    url: '/smartphone-reviews',
                    publishedAt: Date.now(),
                    metrics: { pageViews: 1000, uniqueVisitors: 800 },
                    lastUpdated: Date.now(),
                },
                {
                    postId: 2,
                    siteId: 'site1',
                    title: 'Budget Laptop Guide',
                    url: '/laptop-guide',
                    publishedAt: Date.now(),
                    metrics: { pageViews: 500, uniqueVisitors: 400 },
                    lastUpdated: Date.now(),
                },
            ];

            const suggestions = suggestTopicsFromPerformance(performances, 3);

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions[0].score).toBeGreaterThan(0);
        });
    });
});

describe('A/B Testing', () => {
    describe('createABTest', () => {
        it('should create test with initialized stats', () => {
            const test = createABTest(
                'Title Test',
                1,
                'site1',
                [
                    { id: 'v1', type: 'title', content: 'Original Title' },
                    { id: 'v2', type: 'title', content: 'New Title' },
                ]
            );

            expect(test.variants).toHaveLength(2);
            expect(test.variants[0].impressions).toBe(0);
            expect(test.status).toBe('running');
        });
    });

    describe('recordImpression/recordClick', () => {
        it('should update variant stats', () => {
            let test = createABTest('Test', 1, 'site1', [
                { id: 'v1', type: 'title', content: 'Title 1' },
            ]);

            test = recordImpression(test, 'v1');
            test = recordImpression(test, 'v1');
            test = recordClick(test, 'v1');

            expect(test.variants[0].impressions).toBe(2);
            expect(test.variants[0].clicks).toBe(1);
        });
    });

    describe('calculateCTR', () => {
        it('should calculate CTR correctly', () => {
            const variant = {
                id: 'v1',
                type: 'title' as const,
                content: 'Test',
                impressions: 100,
                clicks: 10,
                conversions: 2,
            };

            const ctr = calculateCTR(variant);

            expect(ctr).toBe(10);
        });

        it('should return 0 for no impressions', () => {
            const variant = {
                id: 'v1',
                type: 'title' as const,
                content: 'Test',
                impressions: 0,
                clicks: 0,
                conversions: 0,
            };

            const ctr = calculateCTR(variant);

            expect(ctr).toBe(0);
        });
    });

    describe('determineWinner', () => {
        it('should return null if not enough data', () => {
            const test = createABTest('Test', 1, 'site1', [
                { id: 'v1', type: 'title', content: 'Title 1' },
                { id: 'v2', type: 'title', content: 'Title 2' },
            ]);

            const result = determineWinner(test);

            expect(result).toBeNull();
        });
    });

    describe('generateTitleVariations', () => {
        it('should generate multiple variations', () => {
            const variations = generateTitleVariations('Best Cameras');

            expect(variations.length).toBeGreaterThan(1);
            expect(variations).toContain('Best Cameras');
        });

        it('should add number prefix', () => {
            const variations = generateTitleVariations('Ways to Save Money');

            expect(variations.some(v => v.startsWith('7 ') || v.startsWith('10 '))).toBe(true);
        });
    });
});
