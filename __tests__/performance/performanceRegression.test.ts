/**
 * Performance Regression Tests
 * 
 * Tests to catch performance regressions in critical operations.
 * Measures: execution time, memory usage patterns, and scalability.
 */

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import { renderHook, act } from '@testing-library/react';
import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import { useWPSitesStore } from '@/features/wordpress/model/wpSiteStore';
import { useSettingsStore } from '@/stores/settingsStore';

// Performance threshold constants (in ms)
const THRESHOLDS = {
    SINGLE_OP: 10,       // Single operation should be < 10ms
    BULK_OP: 100,        // Bulk operation should be < 100ms
    LARGE_SCALE: 1000,   // Large scale operation should be < 1s
};

// Helper to measure execution time
function measureTime(fn: () => void): number {
    const start = performance.now();
    fn();
    return performance.now() - start;
}

// Factory helpers
const createTestCampaign = (index: number) => ({
    name: `Campaign ${index}`,
    description: `Test campaign ${index}`,
    status: 'active' as const,
    targetSiteId: 'test_site',
    postStatus: 'draft' as const,
    source: {
        type: 'keywords' as const,
        config: {
            type: 'keywords' as const,
            keywords: Array.from({ length: 10 }, (_, i) => `keyword_${index}_${i}`),
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
        pauseOnError: false,
    },
});

const createTestSite = (index: number) => ({
    name: `Site ${index}`,
    url: `https://site${index}.com`,
    username: 'admin',
    appPassword: 'xxxx',
    status: 'connected' as const,
});

describe('Performance Regression', () => {
    beforeEach(() => {
        // Reset stores
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
    // Single Operation Performance
    // =========================================================================

    describe('Single Operation Performance', () => {
        it('should create campaign quickly', () => {
            const store = useCampaignStore.getState();

            const time = measureTime(() => {
                store.createCampaign(createTestCampaign(1));
            });

            expect(time).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });

        it('should create site quickly', () => {
            const store = useWPSitesStore.getState();

            const time = measureTime(() => {
                store.addSite(createTestSite(1));
            });

            expect(time).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });

        it('should read campaign quickly', () => {
            const store = useCampaignStore.getState();
            const campaign = store.createCampaign(createTestCampaign(1));

            const time = measureTime(() => {
                store.getCampaign(campaign.id);
            });

            expect(time).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });

        it('should update campaign quickly', () => {
            const store = useCampaignStore.getState();
            const campaign = store.createCampaign(createTestCampaign(1));

            const time = measureTime(() => {
                store.updateCampaign(campaign.id, { name: 'Updated Name' });
            });

            expect(time).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });

        it('should delete campaign quickly', () => {
            const store = useCampaignStore.getState();
            const campaign = store.createCampaign(createTestCampaign(1));

            const time = measureTime(() => {
                store.deleteCampaign(campaign.id);
            });

            expect(time).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });
    });

    // =========================================================================
    // Bulk Operation Performance
    // =========================================================================

    describe('Bulk Operation Performance', () => {
        it('should create 50 campaigns under threshold', () => {
            const store = useCampaignStore.getState();

            const time = measureTime(() => {
                for (let i = 0; i < 50; i++) {
                    store.createCampaign(createTestCampaign(i));
                }
            });

            expect(time).toBeLessThan(THRESHOLDS.BULK_OP);
            expect(useCampaignStore.getState().campaigns).toHaveLength(50);
        });

        it('should create 50 sites under threshold', () => {
            const store = useWPSitesStore.getState();

            const time = measureTime(() => {
                for (let i = 0; i < 50; i++) {
                    store.addSite(createTestSite(i));
                }
            });

            expect(time).toBeLessThan(THRESHOLDS.BULK_OP);
            expect(useWPSitesStore.getState().getAllSites()).toHaveLength(50);
        });

        it('should update 50 campaigns under threshold', () => {
            const store = useCampaignStore.getState();

            // Create 50 campaigns
            const campaigns = [];
            for (let i = 0; i < 50; i++) {
                campaigns.push(store.createCampaign(createTestCampaign(i)));
            }

            const time = measureTime(() => {
                for (const campaign of campaigns) {
                    store.updateCampaign(campaign.id, { name: `Updated ${campaign.name}` });
                }
            });

            expect(time).toBeLessThan(THRESHOLDS.BULK_OP);
        });

        it('should increment stats 100 times under threshold', () => {
            const store = useCampaignStore.getState();
            const campaign = store.createCampaign(createTestCampaign(1));

            const time = measureTime(() => {
                for (let i = 0; i < 100; i++) {
                    store.incrementGenerated(campaign.id);
                }
            });

            expect(time).toBeLessThan(THRESHOLDS.BULK_OP);
            expect(useCampaignStore.getState().getCampaign(campaign.id)?.stats.totalGenerated).toBe(100);
        });
    });

    // =========================================================================
    // Lookup Performance
    // =========================================================================

    describe('Lookup Performance', () => {
        it('should find campaign by site quickly with 100 campaigns', () => {
            const store = useCampaignStore.getState();
            const wpStore = useWPSitesStore.getState();

            // Create 10 sites
            const sites = [];
            for (let i = 0; i < 10; i++) {
                sites.push(wpStore.addSite(createTestSite(i)));
            }

            // Create 100 campaigns distributed across sites
            for (let i = 0; i < 100; i++) {
                const siteIndex = i % 10;
                store.createCampaign({
                    ...createTestCampaign(i),
                    targetSiteId: sites[siteIndex].id,
                });
            }

            const time = measureTime(() => {
                store.getCampaignsBySite(sites[5].id);
            });

            expect(time).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });

        it('should get due campaigns quickly with 100 campaigns', () => {
            const store = useCampaignStore.getState();

            // Create 100 campaigns with mixed schedules
            for (let i = 0; i < 100; i++) {
                store.createCampaign({
                    ...createTestCampaign(i),
                    status: i % 2 === 0 ? 'active' : 'paused',
                    schedule: {
                        type: 'interval' as const,
                        intervalHours: 1,
                        maxPostsPerRun: 1,
                        pauseOnError: false,
                        nextRunAt: i % 3 === 0 ? Date.now() - 1000 : Date.now() + 100000,
                    },
                });
            }

            const time = measureTime(() => {
                store.getDueCampaigns();
            });

            expect(time).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });
    });

    // =========================================================================
    // Memory Pattern Tests
    // =========================================================================

    describe('Memory Patterns', () => {
        it('should not leak memory on repeated add/delete cycles', () => {
            const store = useWPSitesStore.getState();

            // Perform 100 add/delete cycles
            for (let i = 0; i < 100; i++) {
                const site = store.addSite(createTestSite(i));
                store.deleteSite(site.id);
            }

            // Store should be empty
            expect(store.getAllSites()).toHaveLength(0);
        });

        it('should handle run history growth gracefully', () => {
            const store = useCampaignStore.getState();
            const campaign = store.createCampaign(createTestCampaign(1));

            // Add 100 runs
            const time = measureTime(() => {
                for (let i = 0; i < 100; i++) {
                    store.addRun({
                        id: `run_${i}`,
                        campaignId: campaign.id,
                        status: 'running',
                        startedAt: Date.now(),
                        stages: [],
                    });
                    store.completeRun(`run_${i}`, i % 2 === 0 ? 'completed' : 'failed');
                }
            });

            expect(time).toBeLessThan(THRESHOLDS.BULK_OP);
            expect(useCampaignStore.getState().runHistory.length).toBeGreaterThanOrEqual(100);
        });
    });

    // =========================================================================
    // Scalability Tests
    // =========================================================================

    describe('Scalability', () => {
        it('should handle 500 campaigns without significant slowdown', () => {
            const store = useCampaignStore.getState();

            const time = measureTime(() => {
                for (let i = 0; i < 500; i++) {
                    store.createCampaign(createTestCampaign(i));
                }
            });

            expect(time).toBeLessThan(THRESHOLDS.LARGE_SCALE);
            expect(useCampaignStore.getState().campaigns).toHaveLength(500);

            // Access should still be fast
            const accessTime = measureTime(() => {
                useCampaignStore.getState().campaigns[250];
            });
            expect(accessTime).toBeLessThan(THRESHOLDS.SINGLE_OP);
        });

        it('should handle 200 sites without significant slowdown', () => {
            const store = useWPSitesStore.getState();

            const time = measureTime(() => {
                for (let i = 0; i < 200; i++) {
                    store.addSite(createTestSite(i));
                }
            });

            expect(time).toBeLessThan(THRESHOLDS.LARGE_SCALE);
            expect(store.getAllSites()).toHaveLength(200);
        });
    });
});
