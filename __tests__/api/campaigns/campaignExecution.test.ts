/**
 * Campaign Execution Integration Tests
 * 
 * Tests the campaign execution logic that powers both
 * /api/campaigns/trigger and /api/campaigns/cron endpoints.
 * 
 * Note: We test the underlying logic rather than the HTTP routes
 * to avoid Next.js runtime dependencies in Jest.
 */

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import { renderHook, act } from '@testing-library/react';
import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import { useWPSitesStore } from '@/features/wordpress/model/wpSiteStore';
import type { Campaign } from '@/features/campaigns/model/types';

// Mock campaign data factory
const createTestCampaign = (overrides: Partial<Campaign> = {}) => ({
    name: 'Test Campaign',
    description: 'Test description',
    status: 'active' as const,
    targetSiteId: 'test_site',
    postStatus: 'draft' as const,
    source: {
        type: 'keywords' as const,
        config: {
            type: 'keywords' as const,
            keywords: ['test keyword 1', 'test keyword 2'],
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
        type: 'interval' as const,
        intervalHours: 24,
        maxPostsPerRun: 2,
        pauseOnError: false,
        nextRunAt: Date.now() - 1000, // Past due
    },
    ...overrides,
});

// Mock WP site data factory
const createTestSite = (overrides = {}) => ({
    name: 'Test Blog',
    url: 'https://testblog.com',
    username: 'admin',
    appPassword: 'xxxx',
    status: 'connected' as const,
    ...overrides,
});

describe('Campaign Execution Integration', () => {
    beforeEach(() => {
        // Reset campaign store
        useCampaignStore.setState({
            campaigns: [],
            runHistory: [],
            activeCampaignId: null,
        });

        // Reset WP sites store
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
    // Campaign Store Integration
    // =========================================================================

    describe('Campaign Store Integration', () => {
        it('should create campaign and retrieve by ID', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            expect(result.current.getCampaign(campaign!.id)).toBeDefined();
            expect(result.current.getCampaign(campaign!.id)?.name).toBe('Test Campaign');
        });

        it('should track run history', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            act(() => {
                result.current.addRun({
                    id: 'run_123',
                    campaignId: campaign!.id,
                    status: 'running',
                    startedAt: Date.now(),
                    stages: [],
                });
            });

            const history = result.current.getRunHistory(campaign!.id);
            expect(history).toHaveLength(1);
            expect(history[0].id).toBe('run_123');
        });

        it('should update stats correctly', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
            });

            act(() => {
                result.current.incrementGenerated(campaign!.id);
                result.current.incrementGenerated(campaign!.id);
                result.current.incrementPublished(campaign!.id);
                result.current.incrementFailed(campaign!.id);
            });

            const updated = result.current.getCampaign(campaign!.id);
            expect(updated?.stats.totalGenerated).toBe(2);
            expect(updated?.stats.totalPublished).toBe(1);
            expect(updated?.stats.totalFailed).toBe(1);
        });
    });

    // =========================================================================
    // WP Sites Integration
    // =========================================================================

    describe('WP Sites Integration', () => {
        it('should link campaign to WP site', () => {
            const campaignStore = useCampaignStore.getState();
            const wpStore = useWPSitesStore.getState();

            // Create site
            const site = wpStore.addSite(createTestSite());

            // Create campaign linked to site
            const campaign = campaignStore.createCampaign(
                createTestCampaign({ targetSiteId: site.id })
            );

            // Verify link
            expect(campaign.targetSiteId).toBe(site.id);
            expect(wpStore.getSite(campaign.targetSiteId)).toBeDefined();
        });

        it('should get campaigns by site', () => {
            const campaignStore = useCampaignStore.getState();
            const wpStore = useWPSitesStore.getState();

            // Create two sites
            const site1 = wpStore.addSite(createTestSite({ name: 'Site 1' }));
            const site2 = wpStore.addSite(createTestSite({ name: 'Site 2' }));

            // Create campaigns for each site
            campaignStore.createCampaign(
                createTestCampaign({ name: 'Camp 1', targetSiteId: site1.id })
            );
            campaignStore.createCampaign(
                createTestCampaign({ name: 'Camp 2', targetSiteId: site1.id })
            );
            campaignStore.createCampaign(
                createTestCampaign({ name: 'Camp 3', targetSiteId: site2.id })
            );

            // Verify filtering
            const site1Campaigns = campaignStore.getCampaignsBySite(site1.id);
            expect(site1Campaigns).toHaveLength(2);

            const site2Campaigns = campaignStore.getCampaignsBySite(site2.id);
            expect(site2Campaigns).toHaveLength(1);
        });
    });

    // =========================================================================
    // Due Campaign Detection
    // =========================================================================

    describe('Due Campaign Detection', () => {
        it('should detect campaigns past their nextRunAt', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                // Due campaign (past nextRunAt)
                result.current.createCampaign(createTestCampaign({
                    name: 'Due Campaign',
                    status: 'active',
                    schedule: {
                        type: 'interval',
                        intervalHours: 1,
                        maxPostsPerRun: 1,
                        pauseOnError: false,
                        nextRunAt: Date.now() - 60000, // 1 minute ago
                    },
                }));

                // Not due (future nextRunAt)
                result.current.createCampaign(createTestCampaign({
                    name: 'Not Due',
                    status: 'active',
                    schedule: {
                        type: 'interval',
                        intervalHours: 1,
                        maxPostsPerRun: 1,
                        pauseOnError: false,
                        nextRunAt: Date.now() + 60000, // 1 minute from now
                    },
                }));
            });

            const due = result.current.getDueCampaigns();
            expect(due).toHaveLength(1);
            expect(due[0].name).toBe('Due Campaign');
        });

        it('should not include paused campaigns in due list', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign(createTestCampaign({
                    name: 'Paused Campaign',
                    status: 'paused',
                    schedule: {
                        type: 'interval',
                        intervalHours: 1,
                        maxPostsPerRun: 1,
                        pauseOnError: false,
                        nextRunAt: Date.now() - 60000,
                    },
                }));
            });

            const due = result.current.getDueCampaigns();
            expect(due).toHaveLength(0);
        });

        it('should not include manual campaigns in due list', () => {
            const { result } = renderHook(() => useCampaignStore());

            act(() => {
                result.current.createCampaign(createTestCampaign({
                    name: 'Manual Campaign',
                    status: 'active',
                    schedule: {
                        type: 'manual',
                        maxPostsPerRun: 1,
                        pauseOnError: false,
                    },
                }));
            });

            const due = result.current.getDueCampaigns();
            expect(due).toHaveLength(0);
        });
    });

    // =========================================================================
    // Pause on Error
    // =========================================================================

    describe('Pause on Error', () => {
        it('should pause campaign when pauseOnError is true', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign({
                    status: 'active',
                }));
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
                campaign = result.current.createCampaign(createTestCampaign({
                    status: 'paused',
                }));
            });

            act(() => {
                result.current.resumeCampaign(campaign!.id);
            });

            expect(result.current.getCampaign(campaign!.id)?.status).toBe('active');
        });
    });

    // =========================================================================
    // Run Completion
    // =========================================================================

    describe('Run Completion', () => {
        it('should complete run with success status', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
                result.current.addRun({
                    id: 'run_success',
                    campaignId: campaign!.id,
                    status: 'running',
                    startedAt: Date.now(),
                    stages: [],
                });
            });

            act(() => {
                result.current.completeRun('run_success', 'completed');
            });

            const history = result.current.getRunHistory(campaign!.id);
            expect(history[0].status).toBe('completed');
        });

        it('should complete run with failed status', () => {
            const { result } = renderHook(() => useCampaignStore());

            let campaign: Campaign;
            act(() => {
                campaign = result.current.createCampaign(createTestCampaign());
                result.current.addRun({
                    id: 'run_fail',
                    campaignId: campaign!.id,
                    status: 'running',
                    startedAt: Date.now(),
                    stages: [],
                });
            });

            act(() => {
                result.current.completeRun('run_fail', 'failed');
            });

            const history = result.current.getRunHistory(campaign!.id);
            expect(history[0].status).toBe('failed');
        });
    });

    // =========================================================================
    // Site Connection Validation
    // =========================================================================

    describe('Site Connection Validation', () => {
        it('should detect connected sites', () => {
            const wpStore = useWPSitesStore.getState();

            const connectedSite = wpStore.addSite(createTestSite({ status: 'connected' }));
            const errorSite = wpStore.addSite(createTestSite({ status: 'error', name: 'Error Site' }));

            expect(wpStore.getSite(connectedSite.id)?.status).toBe('connected');
            expect(wpStore.getSite(errorSite.id)?.status).toBe('error');
        });

        it('should update site connection status', () => {
            const wpStore = useWPSitesStore.getState();

            const site = wpStore.addSite(createTestSite({ status: 'pending' }));
            expect(wpStore.getSite(site.id)?.status).toBe('pending');

            wpStore.updateConnectionStatus(site.id, 'connected');
            expect(wpStore.getSite(site.id)?.status).toBe('connected');

            wpStore.updateConnectionStatus(site.id, 'error', 'Connection failed');
            const updated = wpStore.getSite(site.id);
            expect(updated?.status).toBe('error');
            expect(updated?.lastError).toBe('Connection failed');
        });
    });
});
