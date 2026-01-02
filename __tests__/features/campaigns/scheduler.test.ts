/**
 * Scheduler Tests
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import type { Campaign, ScheduleConfig } from '@/features/campaigns/model/types';

describe('Scheduler', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useCampaignStore());
        // Clear campaigns
        act(() => {
            result.current.campaigns.forEach(c => result.current.deleteCampaign(c.id));
        });
    });

    describe('getDueCampaigns', () => {
        it('should return empty for manual campaigns', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign({
                    name: 'Manual Campaign',
                    description: '',
                    status: 'active',
                    targetSiteId: 'site_1',
                    postStatus: 'draft',
                    source: { type: 'keywords', config: { type: 'keywords', keywords: ['test'] } },
                    aiConfig: {
                        provider: 'gemini',
                        articleType: 'cluster',
                        tone: 'professional',
                        targetLength: 1500,
                        useResearch: true,
                        includeImages: true,
                        imageProvider: 'gemini',
                        optimizeForSEO: true,
                        includeSchema: true,
                        includeFAQ: true,
                    },
                    schedule: { type: 'manual', maxPostsPerRun: 1, pauseOnError: true },
                });
            });

            const due = result.current.getDueCampaigns();
            expect(due).toHaveLength(0);
        });

        it('should return campaigns with nextRunAt in the past', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                const campaign = result.current.createCampaign({
                    name: 'Interval Campaign',
                    description: '',
                    status: 'active',
                    targetSiteId: 'site_1',
                    postStatus: 'draft',
                    source: { type: 'keywords', config: { type: 'keywords', keywords: ['test'] } },
                    aiConfig: {
                        provider: 'gemini',
                        articleType: 'cluster',
                        tone: 'professional',
                        targetLength: 1500,
                        useResearch: true,
                        includeImages: true,
                        imageProvider: 'gemini',
                        optimizeForSEO: true,
                        includeSchema: true,
                        includeFAQ: true,
                    },
                    schedule: {
                        type: 'interval',
                        intervalHours: 24,
                        maxPostsPerRun: 1,
                        pauseOnError: true,
                        nextRunAt: Date.now() - 1000, // 1 second ago
                    },
                });
            });

            const due = result.current.getDueCampaigns();
            expect(due).toHaveLength(1);
        });

        it('should not return paused campaigns', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign({
                    name: 'Paused Campaign',
                    description: '',
                    status: 'paused',
                    targetSiteId: 'site_1',
                    postStatus: 'draft',
                    source: { type: 'keywords', config: { type: 'keywords', keywords: ['test'] } },
                    aiConfig: {
                        provider: 'gemini',
                        articleType: 'cluster',
                        tone: 'professional',
                        targetLength: 1500,
                        useResearch: true,
                        includeImages: true,
                        imageProvider: 'gemini',
                        optimizeForSEO: true,
                        includeSchema: true,
                        includeFAQ: true,
                    },
                    schedule: {
                        type: 'interval',
                        intervalHours: 24,
                        maxPostsPerRun: 1,
                        pauseOnError: true,
                        nextRunAt: Date.now() - 1000,
                    },
                });
            });

            const due = result.current.getDueCampaigns();
            expect(due).toHaveLength(0);
        });
    });

    describe('updateNextRun', () => {
        it('should set nextRunAt based on intervalHours', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign({
                    name: 'Test Campaign',
                    description: '',
                    status: 'active',
                    targetSiteId: 'site_1',
                    postStatus: 'draft',
                    source: { type: 'keywords', config: { type: 'keywords', keywords: ['test'] } },
                    aiConfig: {
                        provider: 'gemini',
                        articleType: 'cluster',
                        tone: 'professional',
                        targetLength: 1500,
                        useResearch: true,
                        includeImages: true,
                        imageProvider: 'gemini',
                        optimizeForSEO: true,
                        includeSchema: true,
                        includeFAQ: true,
                    },
                    schedule: { type: 'interval', intervalHours: 6, maxPostsPerRun: 1, pauseOnError: true },
                });
            });

            const beforeUpdate = Date.now();
            act(() => {
                result.current.updateNextRun(campaign!.id);
            });

            const updated = result.current.getCampaign(campaign!.id);
            const expectedNextRun = beforeUpdate + (6 * 60 * 60 * 1000);

            // Allow 1 second tolerance
            expect(updated?.schedule.nextRunAt).toBeGreaterThanOrEqual(expectedNextRun - 1000);
            expect(updated?.schedule.nextRunAt).toBeLessThanOrEqual(expectedNextRun + 1000);
            expect(updated?.schedule.lastRunAt).toBeGreaterThanOrEqual(beforeUpdate);
        });

        it('should not update manual campaigns', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign({
                    name: 'Manual',
                    description: '',
                    status: 'active',
                    targetSiteId: 'site_1',
                    postStatus: 'draft',
                    source: { type: 'keywords', config: { type: 'keywords', keywords: ['test'] } },
                    aiConfig: {
                        provider: 'gemini',
                        articleType: 'cluster',
                        tone: 'professional',
                        targetLength: 1500,
                        useResearch: true,
                        includeImages: true,
                        imageProvider: 'gemini',
                        optimizeForSEO: true,
                        includeSchema: true,
                        includeFAQ: true,
                    },
                    schedule: { type: 'manual', maxPostsPerRun: 1, pauseOnError: true },
                });
            });

            act(() => {
                result.current.updateNextRun(campaign!.id);
            });

            const updated = result.current.getCampaign(campaign!.id);
            expect(updated?.schedule.nextRunAt).toBeUndefined();
        });
    });

    describe('run history helpers', () => {
        it('should add and complete a run', () => {
            const { result } = renderHook(() => useCampaignStore());

            const run = {
                id: 'run_test_1',
                campaignId: 'camp_1',
                startedAt: Date.now(),
                status: 'running' as const,
                postsGenerated: 0,
                postsPublished: 0,
                errors: [],
                items: [],
            };

            act(() => {
                result.current.addRunToHistory(run);
            });

            expect(result.current.runHistory).toHaveLength(1);

            act(() => {
                result.current.completeRun('run_test_1', 'completed');
            });

            const updated = result.current.runHistory.find(r => r.id === 'run_test_1');
            expect(updated?.status).toBe('completed');
            expect(updated?.completedAt).toBeDefined();
        });

        it('should add errors to a run', () => {
            const { result } = renderHook(() => useCampaignStore());

            const run = {
                id: 'run_test_2',
                campaignId: 'camp_1',
                startedAt: Date.now(),
                status: 'running' as const,
                postsGenerated: 0,
                postsPublished: 0,
                errors: [],
                items: [],
            };

            act(() => {
                result.current.addRunToHistory(run);
                result.current.addErrorToRun('run_test_2', 'pipeline', 'Test error');
            });

            const updated = result.current.runHistory.find(r => r.id === 'run_test_2');
            expect(updated?.errors).toHaveLength(1);
            expect(updated?.errors[0].message).toBe('Test error');
        });
    });
});
