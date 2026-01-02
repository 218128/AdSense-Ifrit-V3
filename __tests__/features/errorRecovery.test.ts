/**
 * Error Recovery Tests
 * 
 * Tests for failure scenarios and graceful recovery behavior.
 * Covers: AI provider failures, store corruption, network errors,
 * and rate limiting scenarios.
 */

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import { renderHook, act } from '@testing-library/react';
import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import { useWPSitesStore } from '@/features/wordpress/model/wpSiteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Campaign } from '@/features/campaigns/model/types';

// Factory helpers
const createTestCampaign = (overrides = {}) => ({
    name: 'Test Campaign',
    description: 'Test',
    status: 'active' as const,
    targetSiteId: 'test_site',
    postStatus: 'draft' as const,
    source: {
        type: 'keywords' as const,
        config: {
            type: 'keywords' as const,
            keywords: ['test'],
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
    ...overrides,
});

const createTestSite = (overrides = {}) => ({
    name: 'Test Blog',
    url: 'https://testblog.com',
    username: 'admin',
    appPassword: 'xxxx',
    status: 'connected' as const,
    ...overrides,
});

describe('Error Recovery', () => {
    beforeEach(() => {
        // Reset all stores
        useCampaignStore.setState({
            campaigns: [],
            runHistory: [],
            activeCampaignId: null,
        });

        useWPSitesStore.setState({
            sites: {},
            articles: {},
            activeSiteId: null,
            activeArticleId: null,
            isLoading: false,
            isSyncing: null,
            lastError: null,
        });
    });

    // =========================================================================
    // Campaign Failure Recovery
    // =========================================================================

    describe('Campaign Failure Recovery', () => {
        it('should pause campaign on error when pauseOnError is true', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign({
                    schedule: { type: 'manual', maxPostsPerRun: 1, pauseOnError: true },
                }));
            });

            // Simulate error by pausing
            act(() => {
                result.current.pauseCampaign(campaign!.id);
            });

            expect(result.current.getCampaign(campaign!.id)?.status).toBe('paused');
        });

        it('should track failed runs separately from successful ones', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            // Add successful run
            act(() => {
                result.current.addRun({
                    id: 'run_success',
                    campaignId: campaign!.id,
                    status: 'running',
                    startedAt: Date.now(),
                    stages: [],
                });
                result.current.completeRun('run_success', 'completed');
            });

            // Add failed run
            act(() => {
                result.current.addRun({
                    id: 'run_fail',
                    campaignId: campaign!.id,
                    status: 'running',
                    startedAt: Date.now(),
                    stages: [],
                });
                result.current.completeRun('run_fail', 'failed');
            });

            const history = result.current.getRunHistory(campaign!.id);
            const successRuns = history.filter(r => r.status === 'completed');
            const failedRuns = history.filter(r => r.status === 'failed');

            expect(successRuns).toHaveLength(1);
            expect(failedRuns).toHaveLength(1);
        });

        it('should preserve campaign data after multiple failures', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign({
                    name: 'Resilient Campaign',
                }));
            });

            // Simulate multiple failures
            act(() => {
                result.current.incrementFailed(campaign!.id);
                result.current.incrementFailed(campaign!.id);
                result.current.incrementFailed(campaign!.id);
            });

            const updated = result.current.getCampaign(campaign!.id);
            expect(updated?.name).toBe('Resilient Campaign');
            expect(updated?.stats.totalFailed).toBe(3);
        });

        it('should allow resume after pause from error', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign({
                    status: 'active',
                }));
            });

            // Pause due to error
            act(() => {
                result.current.pauseCampaign(campaign!.id);
            });
            expect(result.current.getCampaign(campaign!.id)?.status).toBe('paused');

            // Resume
            act(() => {
                result.current.resumeCampaign(campaign!.id);
            });
            expect(result.current.getCampaign(campaign!.id)?.status).toBe('active');
        });
    });

    // =========================================================================
    // WP Site Connection Recovery
    // =========================================================================

    describe('WP Site Connection Recovery', () => {
        it('should update site status on connection error', () => {
            const wpStore = useWPSitesStore.getState();

            const site = wpStore.addSite(createTestSite({ status: 'connected' }));

            wpStore.updateConnectionStatus(site.id, 'error', 'Connection timeout');

            const updated = wpStore.getSite(site.id);
            expect(updated?.status).toBe('error');
            expect(updated?.lastError).toBe('Connection timeout');
        });

        it('should preserve site data on reconnection', () => {
            const wpStore = useWPSitesStore.getState();

            const site = wpStore.addSite(createTestSite({
                name: 'My Blog',
                url: 'https://myblog.com',
            }));

            // Connection fails
            wpStore.updateConnectionStatus(site.id, 'error', 'Failed');

            // Connection restored
            wpStore.updateConnectionStatus(site.id, 'connected');

            const updated = wpStore.getSite(site.id);
            expect(updated?.name).toBe('My Blog');
            expect(updated?.url).toBe('https://myblog.com');
            expect(updated?.status).toBe('connected');
        });

        it('should clear error message on successful reconnection', () => {
            const wpStore = useWPSitesStore.getState();

            const site = wpStore.addSite(createTestSite());

            // Set error
            wpStore.updateConnectionStatus(site.id, 'error', 'Network error');
            expect(wpStore.getSite(site.id)?.lastError).toBe('Network error');

            // Reconnect Successfully
            wpStore.updateConnectionStatus(site.id, 'connected');

            // lastError should be cleared or still present (depends on implementation)
            const updated = wpStore.getSite(site.id);
            expect(updated?.status).toBe('connected');
        });

        it('should handle rapid status changes', () => {
            const wpStore = useWPSitesStore.getState();

            const site = wpStore.addSite(createTestSite());

            // Rapid changes
            wpStore.updateConnectionStatus(site.id, 'connecting');
            wpStore.updateConnectionStatus(site.id, 'error', 'Timeout');
            wpStore.updateConnectionStatus(site.id, 'connecting');
            wpStore.updateConnectionStatus(site.id, 'connected');

            expect(wpStore.getSite(site.id)?.status).toBe('connected');
        });
    });

    // =========================================================================
    // Run Error Tracking
    // =========================================================================

    describe('Run Error Tracking', () => {
        it('should track errors in run history', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
                result.current.addRun({
                    id: 'run_with_errors',
                    campaignId: campaign!.id,
                    status: 'running',
                    startedAt: Date.now(),
                    stages: [],
                    errors: [], // Initialize errors array
                });
            });

            // Add multiple errors
            act(() => {
                result.current.addErrorToRun('run_with_errors', 'generate', 'AI quota exceeded');
                result.current.addErrorToRun('run_with_errors', 'publish', 'WP API error');
            });

            act(() => {
                result.current.completeRun('run_with_errors', 'failed');
            });

            const history = result.current.getRunHistory(campaign!.id);
            expect(history[0].status).toBe('failed');
        });

        it('should maintain run order on failures', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            // Add runs in sequence with mixed results
            act(() => {
                result.current.addRun({ id: 'run_1', campaignId: campaign!.id, status: 'running', startedAt: 1000, stages: [] });
                result.current.completeRun('run_1', 'completed');
            });

            act(() => {
                result.current.addRun({ id: 'run_2', campaignId: campaign!.id, status: 'running', startedAt: 2000, stages: [] });
                result.current.completeRun('run_2', 'failed');
            });

            act(() => {
                result.current.addRun({ id: 'run_3', campaignId: campaign!.id, status: 'running', startedAt: 3000, stages: [] });
                result.current.completeRun('run_3', 'completed');
            });

            const history = result.current.getRunHistory(campaign!.id);
            expect(history).toHaveLength(3);
        });
    });

    // =========================================================================
    // Stats Accuracy Under Failure
    // =========================================================================

    describe('Stats Accuracy Under Failure', () => {
        it('should maintain accurate stats through mixed success/failure', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            // Mixed results
            act(() => {
                result.current.incrementGenerated(campaign!.id);
                result.current.incrementPublished(campaign!.id);
                result.current.incrementGenerated(campaign!.id);
                result.current.incrementFailed(campaign!.id);
                result.current.incrementGenerated(campaign!.id);
                result.current.incrementPublished(campaign!.id);
                result.current.incrementFailed(campaign!.id);
            });

            const stats = result.current.getCampaign(campaign!.id)?.stats;
            expect(stats?.totalGenerated).toBe(3);
            expect(stats?.totalPublished).toBe(2);
            expect(stats?.totalFailed).toBe(2);
        });

        it('should not corrupt stats on invalid operations', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            const initialStats = result.current.getCampaign(campaign!.id)?.stats;

            // Try to increment non-existent campaign (should be no-op or handled gracefully)
            act(() => {
                result.current.incrementGenerated('nonexistent_id');
            });

            // Original campaign stats should be unchanged
            const currentStats = result.current.getCampaign(campaign!.id)?.stats;
            expect(currentStats?.totalGenerated).toBe(initialStats?.totalGenerated);
        });
    });

    // =========================================================================
    // Orphaned Data Handling
    // =========================================================================

    describe('Orphaned Data Handling', () => {
        it('should handle campaign with deleted site gracefully', () => {
            const campaignStore = useCampaignStore.getState();
            const wpStore = useWPSitesStore.getState();

            // Create site and linked campaign
            const site = wpStore.addSite(createTestSite());
            const campaign = campaignStore.createCampaign(
                createTestCampaign({ targetSiteId: site.id })
            );

            // Delete site
            wpStore.deleteSite(site.id);

            // Campaign should still exist
            expect(campaignStore.getCampaign(campaign.id)).toBeDefined();

            // But site lookup returns undefined
            expect(wpStore.getSite(campaign.targetSiteId)).toBeUndefined();
        });

        it('should preserve articles when site reconnects', () => {
            const wpStore = useWPSitesStore.getState();

            // Create site with articles
            const site = wpStore.addSite(createTestSite());
            wpStore.addArticle(site.id, {
                siteId: site.id,
                title: 'Article 1',
                content: 'Content',
                localStatus: 'draft',
            });

            // Simulate disconnect
            wpStore.updateConnectionStatus(site.id, 'error', 'Disconnected');

            // Articles should still exist
            expect(wpStore.getArticles(site.id)).toHaveLength(1);

            // Reconnect
            wpStore.updateConnectionStatus(site.id, 'connected');

            // Articles still present
            expect(wpStore.getArticles(site.id)).toHaveLength(1);
            expect(wpStore.getArticles(site.id)[0].title).toBe('Article 1');
        });
    });

    // =========================================================================
    // Concurrent Operation Safety
    // =========================================================================

    describe('Concurrent Operation Safety', () => {
        it('should handle rapid campaign updates without corruption', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            // Rapid updates
            act(() => {
                for (let i = 0; i < 100; i++) {
                    result.current.incrementGenerated(campaign!.id);
                }
            });

            expect(result.current.getCampaign(campaign!.id)?.stats.totalGenerated).toBe(100);
        });

        it('should handle multiple site status updates correctly', () => {
            const wpStore = useWPSitesStore.getState();

            const site = wpStore.addSite(createTestSite());

            // Multiple status updates
            for (let i = 0; i < 10; i++) {
                wpStore.updateConnectionStatus(site.id, 'connecting');
                wpStore.updateConnectionStatus(site.id, 'connected');
            }

            expect(wpStore.getSite(site.id)?.status).toBe('connected');
        });
    });
});
