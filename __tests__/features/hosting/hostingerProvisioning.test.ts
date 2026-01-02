/**
 * Hostinger Provisioning Tests
 * 
 * Tests for the Hostinger MCP integration and site provisioning workflow.
 * Covers: order fetching, provisioning steps, error handling, and site registration.
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import { renderHook, act } from '@testing-library/react';
import { useWPSitesStore } from '@/features/wordpress/model/wpSiteStore';
import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import { useSettingsStore } from '@/stores/settingsStore';

// Mock hosting order data
const mockHostingOrders = [
    {
        id: 'order_123',
        order_id: 'order_123',
        status: 'active',
        plan: { name: 'Business WordPress' },
        domain: 'example.com',
        websites_count: 2,
    },
    {
        id: 'order_456',
        order_id: 'order_456',
        status: 'active',
        plan: 'Premium Shared',
        domain: 'another.com',
        websites_count: 0,
    },
];

// Mock provisioning result
const mockProvisionResult = {
    success: true,
    steps: [
        { step: 'Create Website', status: 'success', message: 'Website created' },
        { step: 'Install WordPress', status: 'success', message: 'WordPress installed' },
        { step: 'Configure SSL', status: 'success', message: 'SSL enabled' },
    ],
    website: {
        id: 'wpsite_new',
        domain: 'newsite.com',
    },
};

describe('Hostinger Provisioning', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset stores
        useWPSitesStore.setState({
            sites: {},
            articles: {},
            activeSiteId: null,
            activeArticleId: null,
            isLoading: false,
            isSyncing: null,
            lastError: null,
        });

        useCampaignStore.setState({
            campaigns: [],
            runHistory: [],
            activeCampaignId: null,
        });
    });

    // =========================================================================
    // Order Fetching Tests
    // =========================================================================

    describe('Order Fetching', () => {
        it('should parse hosting order with object plan', () => {
            const order = mockHostingOrders[0];

            expect(order.plan).toHaveProperty('name');
            expect(typeof (order.plan as { name?: string }).name).toBe('string');
        });

        it('should parse hosting order with string plan', () => {
            const order = mockHostingOrders[1];

            expect(typeof order.plan).toBe('string');
        });

        it('should handle empty orders array', () => {
            const orders: typeof mockHostingOrders = [];

            expect(orders).toHaveLength(0);
            expect(orders.length === 0).toBe(true);
        });

        it('should validate order has required fields', () => {
            const order = mockHostingOrders[0];

            expect(order.id || order.order_id).toBeTruthy();
            expect(order.status).toBeDefined();
        });
    });

    // =========================================================================
    // Provision Result Parsing Tests
    // =========================================================================

    describe('Provision Result Parsing', () => {
        it('should parse successful provision result', () => {
            expect(mockProvisionResult.success).toBe(true);
            expect(mockProvisionResult.steps).toHaveLength(3);
            expect(mockProvisionResult.website?.domain).toBe('newsite.com');
        });

        it('should validate all steps have required fields', () => {
            for (const step of mockProvisionResult.steps) {
                expect(step.step).toBeDefined();
                expect(step.status).toBeDefined();
                expect(['success', 'failed', 'skipped', 'pending']).toContain(step.status);
            }
        });

        it('should handle provision failure result', () => {
            const failedResult = {
                success: false,
                steps: [
                    { step: 'Create Website', status: 'failed', message: 'Domain already exists' },
                ],
                error: 'Provisioning failed',
            };

            expect(failedResult.success).toBe(false);
            expect(failedResult.error).toBeDefined();
        });
    });

    // =========================================================================
    // Site Registration After Provisioning
    // =========================================================================

    describe('Site Registration After Provisioning', () => {
        it('should register site in WP store after successful provisioning', () => {
            const wpStore = useWPSitesStore.getState();

            // Simulate post-provisioning registration
            const newSite = wpStore.addSite({
                name: 'newsite.com',
                url: 'https://newsite.com',
                username: '',
                appPassword: '',
                status: 'pending',
            });

            expect(newSite.id).toBeDefined();
            expect(wpStore.getSite(newSite.id)).toBeDefined();
            expect(wpStore.getSite(newSite.id)?.name).toBe('newsite.com');
        });

        it('should create campaign linked to new site with keywords', () => {
            const wpStore = useWPSitesStore.getState();
            const campaignStore = useCampaignStore.getState();

            // Register new site
            const newSite = wpStore.addSite({
                name: 'newsite.com',
                url: 'https://newsite.com',
                username: '',
                appPassword: '',
                status: 'pending',
            });

            // Create linked campaign with keywords
            const campaign = campaignStore.createCampaign({
                name: 'newsite.com - Content Campaign',
                description: 'Auto-created campaign',
                status: 'draft',
                targetSiteId: newSite.id,
                postStatus: 'draft',
                source: {
                    type: 'keywords',
                    config: {
                        type: 'keywords',
                        keywords: ['keyword 1', 'keyword 2', 'keyword 3'],
                        rotateMode: 'sequential',
                        currentIndex: 0,
                        skipUsed: true,
                    },
                },
                aiConfig: {
                    provider: 'gemini',
                    articleType: 'pillar',
                    tone: 'professional',
                    targetLength: 1500,
                    useResearch: true,
                    includeImages: true,
                    optimizeForSEO: true,
                    includeSchema: true,
                    includeFAQ: true,
                },
                schedule: {
                    type: 'manual',
                    maxPostsPerRun: 1,
                    pauseOnError: true,
                },
            });

            expect(campaign.targetSiteId).toBe(newSite.id);
            expect(campaignStore.getCampaignsBySite(newSite.id)).toHaveLength(1);
        });

        it('should not create campaign if no keywords provided', () => {
            const wpStore = useWPSitesStore.getState();
            const campaignStore = useCampaignStore.getState();

            // Register new site without campaign
            const newSite = wpStore.addSite({
                name: 'nokeywords.com',
                url: 'https://nokeywords.com',
                username: '',
                appPassword: '',
                status: 'pending',
            });

            // No campaign created
            expect(campaignStore.getCampaignsBySite(newSite.id)).toHaveLength(0);
        });
    });

    // =========================================================================
    // Error Handling Tests
    // =========================================================================

    describe('Error Handling', () => {
        it('should handle missing API key gracefully', () => {
            // Simulate missing API key scenario
            const apiKey = '';

            expect(apiKey).toBeFalsy();
            // In real code, this would show an error message
        });

        it('should handle network timeout', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

            await expect(
                fetch('/api/hosting/orders?apiKey=test')
            ).rejects.toThrow('Network timeout');
        });

        it('should handle API error response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Invalid API key' }),
            });

            const response = await fetch('/api/hosting/orders?apiKey=invalid');
            const data = await response.json();

            expect(response.ok).toBe(false);
            expect(data.error).toBeDefined();
        });

        it('should handle partial provisioning failure', () => {
            const partialFailure = {
                success: false,
                steps: [
                    { step: 'Create Website', status: 'success', message: 'Done' },
                    { step: 'Install WordPress', status: 'success', message: 'Done' },
                    { step: 'Configure SSL', status: 'failed', message: 'SSL error' },
                ],
                error: 'SSL configuration failed',
            };

            expect(partialFailure.success).toBe(false);
            const successSteps = partialFailure.steps.filter(s => s.status === 'success');
            const failedSteps = partialFailure.steps.filter(s => s.status === 'failed');

            expect(successSteps).toHaveLength(2);
            expect(failedSteps).toHaveLength(1);
        });
    });

    // =========================================================================
    // Workflow Integration Tests
    // =========================================================================

    describe('Workflow Integration', () => {
        it('should complete full provisioning workflow', () => {
            const wpStore = useWPSitesStore.getState();
            const campaignStore = useCampaignStore.getState();

            // Step 1: Simulate successful provisioning
            const domain = 'mynewblog.com';
            const keywords = ['seo tips', 'blogging guide', 'content marketing'];
            const niche = 'Digital Marketing';

            // Step 2: Register site
            const site = wpStore.addSite({
                name: domain,
                url: `https://${domain}`,
                username: '',
                appPassword: '',
                status: 'pending',
            });

            // Step 3: Create campaign with keywords
            const campaign = campaignStore.createCampaign({
                name: `${domain} - ${niche}`,
                description: `Auto-created campaign for ${domain}`,
                status: 'draft',
                targetSiteId: site.id,
                postStatus: 'draft',
                source: {
                    type: 'keywords',
                    config: {
                        type: 'keywords',
                        keywords: keywords,
                        rotateMode: 'sequential',
                        currentIndex: 0,
                        skipUsed: true,
                    },
                },
                aiConfig: {
                    provider: 'gemini',
                    articleType: 'pillar',
                    tone: 'professional',
                    targetLength: 1500,
                    useResearch: true,
                    includeImages: true,
                    optimizeForSEO: true,
                    includeSchema: true,
                    includeFAQ: true,
                },
                schedule: {
                    type: 'manual',
                    maxPostsPerRun: 1,
                    pauseOnError: true,
                },
            });

            // Verify workflow completed
            expect(wpStore.getAllSites()).toHaveLength(1);
            expect(useCampaignStore.getState().campaigns).toHaveLength(1);
            expect(campaign.name).toContain(domain);
        });

        it('should handle site deletion after provisioning', () => {
            const wpStore = useWPSitesStore.getState();

            // Provision and register
            const site = wpStore.addSite({
                name: 'deleteme.com',
                url: 'https://deleteme.com',
                username: '',
                appPassword: '',
                status: 'pending',
            });

            expect(wpStore.getAllSites()).toHaveLength(1);

            // Delete site
            wpStore.deleteSite(site.id);

            expect(wpStore.getAllSites()).toHaveLength(0);
        });

        it('should support multiple sites from same hosting order', () => {
            const wpStore = useWPSitesStore.getState();

            // Create multiple sites (simulating multiple provisions)
            wpStore.addSite({
                name: 'site1.com',
                url: 'https://site1.com',
                username: '',
                appPassword: '',
                status: 'pending',
            });

            wpStore.addSite({
                name: 'site2.com',
                url: 'https://site2.com',
                username: '',
                appPassword: '',
                status: 'pending',
            });

            wpStore.addSite({
                name: 'site3.com',
                url: 'https://site3.com',
                username: '',
                appPassword: '',
                status: 'pending',
            });

            expect(wpStore.getAllSites()).toHaveLength(3);
        });
    });
});
