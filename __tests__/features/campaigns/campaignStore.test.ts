/**
 * Campaign Store Tests
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import type { Campaign } from '@/features/campaigns/model/types';

const mockCampaignData = {
    name: 'Test Campaign',
    description: 'Test description',
    status: 'draft' as const,
    targetSiteId: 'wp_123',
    postStatus: 'draft' as const,
    source: {
        type: 'keywords' as const,
        config: {
            type: 'keywords' as const,
            keywords: ['test keyword'],
            rotateMode: 'sequential' as const,
            currentIndex: 0,
            skipUsed: true,
        },
    },
    aiConfig: {
        provider: 'gemini' as const,
        articleType: 'cluster' as const,
        tone: 'professional' as const,
        targetLength: 1500,
        useResearch: true,
        includeImages: true,
        optimizeForSEO: true,
        includeSchema: true,
        includeFAQ: true,
    },
    schedule: {
        type: 'manual' as const,
        maxPostsPerRun: 1,
        pauseOnError: true,
    },
};

describe('Campaign Store', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useCampaignStore());
        act(() => {
            result.current.campaigns.forEach(c => result.current.deleteCampaign(c.id));
            result.current.runHistory.forEach(() => { }); // Clear would go here
        });
    });

    describe('createCampaign', () => {
        it('should create campaign with generated id', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(mockCampaignData);
            });

            expect(campaign!.id).toMatch(/^camp_/);
            expect(campaign!.name).toBe('Test Campaign');
            expect(result.current.campaigns).toHaveLength(1);
        });

        it('should initialize stats to zeros', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(mockCampaignData);
            });

            expect(campaign!.stats.totalGenerated).toBe(0);
            expect(campaign!.stats.totalPublished).toBe(0);
            expect(campaign!.stats.totalFailed).toBe(0);
        });
    });

    describe('pauseCampaign / resumeCampaign', () => {
        it('should pause active campaign', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign({
                    ...mockCampaignData,
                    status: 'active',
                });
            });

            act(() => {
                result.current.pauseCampaign(campaign!.id);
            });

            expect(result.current.getCampaign(campaign!.id)?.status).toBe('paused');
        });

        it('should resume paused campaign', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign({
                    ...mockCampaignData,
                    status: 'paused',
                });
            });

            act(() => {
                result.current.resumeCampaign(campaign!.id);
            });

            expect(result.current.getCampaign(campaign!.id)?.status).toBe('active');
        });
    });

    describe('stats updates', () => {
        it('should increment generated count', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(mockCampaignData);
            });

            act(() => {
                result.current.incrementGenerated(campaign!.id);
                result.current.incrementGenerated(campaign!.id);
            });

            expect(result.current.getCampaign(campaign!.id)?.stats.totalGenerated).toBe(2);
        });

        it('should increment published count', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(mockCampaignData);
            });

            act(() => {
                result.current.incrementPublished(campaign!.id);
            });

            expect(result.current.getCampaign(campaign!.id)?.stats.totalPublished).toBe(1);
        });

        it('should increment failed count', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(mockCampaignData);
            });

            act(() => {
                result.current.incrementFailed(campaign!.id);
            });

            expect(result.current.getCampaign(campaign!.id)?.stats.totalFailed).toBe(1);
        });
    });

    describe('getCampaignsBySite', () => {
        it('should filter campaigns by site id', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign({ ...mockCampaignData, targetSiteId: 'site_a' });
                result.current.createCampaign({ ...mockCampaignData, targetSiteId: 'site_b' });
                result.current.createCampaign({ ...mockCampaignData, targetSiteId: 'site_a' });
            });

            const siteACampaigns = result.current.getCampaignsBySite('site_a');
            expect(siteACampaigns).toHaveLength(2);
        });
    });

    describe('getDueCampaigns', () => {
        it('should return active interval campaigns past nextRunAt', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign({
                    ...mockCampaignData,
                    status: 'active',
                    schedule: {
                        type: 'interval',
                        intervalHours: 1,
                        maxPostsPerRun: 1,
                        pauseOnError: true,
                        nextRunAt: Date.now() - 1000, // Past due
                    },
                });
            });

            expect(result.current.getDueCampaigns()).toHaveLength(1);
        });

        it('should not return manual campaigns', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign({
                    ...mockCampaignData,
                    status: 'active',
                    schedule: { type: 'manual', maxPostsPerRun: 1, pauseOnError: true },
                });
            });

            expect(result.current.getDueCampaigns()).toHaveLength(0);
        });

        it('should not return paused campaigns', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign({
                    ...mockCampaignData,
                    status: 'paused',
                    schedule: {
                        type: 'interval',
                        intervalHours: 1,
                        maxPostsPerRun: 1,
                        pauseOnError: true,
                        nextRunAt: Date.now() - 1000,
                    },
                });
            });

            expect(result.current.getDueCampaigns()).toHaveLength(0);
        });
    });
});
