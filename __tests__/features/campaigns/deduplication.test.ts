/**
 * Deduplication Logic Tests
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import {
    useDeduplicationStore,
    similarityScore,
    shouldSkipTopic,
    recordGeneratedPost
} from '@/features/campaigns/lib/deduplication';

describe('Deduplication', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useDeduplicationStore());
        act(() => {
            result.current.clearRecords();
        });
    });

    describe('similarityScore', () => {
        it('should return 1 for identical strings', () => {
            expect(similarityScore('best budget phones', 'best budget phones')).toBe(1);
        });

        it('should return 1 for same words different case', () => {
            expect(similarityScore('Best Budget Phones', 'best budget phones')).toBe(1);
        });

        it('should return high score for similar topics', () => {
            const score = similarityScore(
                'best budget smartphones 2024',
                'best budget phones 2024'
            );
            // Jaccard index: intersection/union - words differ so score is moderate
            expect(score).toBeGreaterThan(0.5);
        });

        it('should return low score for different topics', () => {
            const score = similarityScore(
                'best budget phones',
                'how to cook pasta'
            );
            expect(score).toBeLessThan(0.2);
        });

        it('should handle similar phrases with overlapping words', () => {
            const score = similarityScore(
                'the best of the budget phones',
                'best budget phones'
            );
            // Stopwords removed: both normalize to similar sets
            expect(score).toBeGreaterThan(0.7);
        });
    });

    describe('isDuplicate', () => {
        it('should detect exact duplicate topics', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                result.current.addRecord({
                    campaignId: 'camp_1',
                    siteId: 'site_1',
                    topic: 'best budget phones',
                    title: 'Best Budget Phones 2024',
                    slug: 'best-budget-phones',
                });
            });

            expect(result.current.isDuplicate('best budget phones')).toBe(true);
        });

        it('should detect nearly identical topics as duplicates', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                result.current.addRecord({
                    campaignId: 'camp_1',
                    siteId: 'site_1',
                    topic: 'best budget phones',
                    title: 'Best Budget Phones',
                    slug: 'best-budget-phones',
                });
            });

            // Same normalized topic (case insensitive) - should be duplicate
            expect(result.current.isDuplicate('Best Budget Phones')).toBe(true);
        });

        it('should not detect unrelated topics as duplicates', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                result.current.addRecord({
                    campaignId: 'camp_1',
                    siteId: 'site_1',
                    topic: 'best budget phones',
                    title: 'Best Budget Phones',
                    slug: 'best-budget-phones',
                });
            });

            expect(result.current.isDuplicate('how to make coffee')).toBe(false);
        });

        it('should scope duplicate check to campaign when specified', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                result.current.addRecord({
                    campaignId: 'camp_1',
                    siteId: 'site_1',
                    topic: 'best budget phones',
                    title: 'Best Budget Phones',
                    slug: 'best-budget-phones',
                });
            });

            // Same topic, different campaign - should not be duplicate
            expect(result.current.isDuplicate('best budget phones', 'camp_2')).toBe(false);
            // Same campaign - should be duplicate
            expect(result.current.isDuplicate('best budget phones', 'camp_1')).toBe(true);
        });
    });

    describe('shouldSkipTopic', () => {
        it('should skip duplicate topics', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                result.current.addRecord({
                    campaignId: 'camp_1',
                    siteId: 'site_1',
                    topic: 'test topic',
                    title: 'Test Title',
                    slug: 'test-title',
                });
            });

            const check = shouldSkipTopic('test topic', 'camp_1', 'site_1');
            expect(check.skip).toBe(true);
            expect(check.reason).toContain('Similar');
        });

        it('should not skip new topics', () => {
            const check = shouldSkipTopic('brand new topic', 'camp_1', 'site_1');
            expect(check.skip).toBe(false);
        });
    });

    describe('recordGeneratedPost', () => {
        it('should add post record', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                recordGeneratedPost(
                    'camp_1',
                    'site_1',
                    'test topic',
                    'Test Title',
                    'test-slug',
                    123,
                    'https://example.com/test-slug'
                );
            });

            expect(result.current.records).toHaveLength(1);
            expect(result.current.records[0].wpPostId).toBe(123);
        });
    });

    describe('getRecordsByCampaign', () => {
        it('should return records for specific campaign', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                result.current.addRecord({
                    campaignId: 'camp_1',
                    siteId: 'site_1',
                    topic: 'topic 1',
                    title: 'Title 1',
                    slug: 'title-1',
                });
                result.current.addRecord({
                    campaignId: 'camp_2',
                    siteId: 'site_1',
                    topic: 'topic 2',
                    title: 'Title 2',
                    slug: 'title-2',
                });
            });

            const records = result.current.getRecordsByCampaign('camp_1');
            expect(records).toHaveLength(1);
            expect(records[0].topic).toBe('topic 1');
        });
    });

    describe('clearRecords', () => {
        it('should clear all records when no days specified', () => {
            const { result } = renderHook(() => useDeduplicationStore());

            act(() => {
                result.current.addRecord({
                    campaignId: 'camp_1',
                    siteId: 'site_1',
                    topic: 'topic',
                    title: 'Title',
                    slug: 'slug',
                });
            });

            act(() => {
                result.current.clearRecords();
            });

            expect(result.current.records).toHaveLength(0);
        });
    });
});
