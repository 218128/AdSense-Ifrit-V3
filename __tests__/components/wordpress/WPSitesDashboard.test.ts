/**
 * UI Component Tests
 * 
 * Tests for UI component logic and store integration.
 * Uses simplified testing approach to avoid complex React DOM dependencies.
 */

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

        import {renderHook, act} from '@testing-library/react';
        import {useWPSitesStore, useWPSitesLegacy} from '@/features/wordpress/model/wpSiteStore';
        import {useCampaignStore} from '@/features/campaigns/model/campaignStore';
        import type {WPSite} from '@/features/wordpress/model/wpSiteTypes';

describe('UI Component Logic', () => {
            beforeEach(() => {
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
    // Sites Dashboard Logic
    // =========================================================================

    describe('Sites Dashboard Logic', () => {
            it('should provide empty sites array initially', () => {
                const { result } = renderHook(() => useWPSitesLegacy());

                expect(result.current.sites).toEqual([]);
                expect(result.current.sites.length).toBe(0);
            });

        it('should update sites array when site added', () => {
            const {result} = renderHook(() => useWPSitesLegacy());
            
            act(() => {
            result.current.addSite({
                name: 'Test Site',
                url: 'https://test.com',
                username: 'admin',
                appPassword: 'pass',
            });
            });

        expect(result.current.sites.length).toBe(1);
        expect(result.current.sites[0].name).toBe('Test Site');
        });

        it('should filter sites by status for display', () => {
            const {result} = renderHook(() => useWPSitesStore());
            
            act(() => {
            result.current.addSite({
                name: 'Connected Site',
                url: 'https://connected.com',
                username: 'admin',
                appPassword: 'pass',
                status: 'connected',
            });
        result.current.addSite({
            name: 'Error Site',
        url: 'https://error.com',
        username: 'admin',
        appPassword: 'pass',
        status: 'error',
                });
        result.current.addSite({
            name: 'Pending Site',
        url: 'https://pending.com',
        username: 'admin',
        appPassword: 'pass',
        status: 'pending',
                });
            });

        const allSites = result.current.getAllSites();
            const connectedSites = allSites.filter(s => s.status === 'connected');
            const errorSites = allSites.filter(s => s.status === 'error');
            const pendingSites = allSites.filter(s => s.status === 'pending');

        expect(connectedSites).toHaveLength(1);
        expect(errorSites).toHaveLength(1);
        expect(pendingSites).toHaveLength(1);
        });

        it('should track active site for editing', () => {
            const {result} = renderHook(() => useWPSitesStore());

        let site: WPSite;
            act(() => {
            site = result.current.addSite({
                name: 'Active Site',
                url: 'https://active.com',
                username: 'admin',
                appPassword: 'pass',
                status: 'connected',
            });
            });

        expect(result.current.activeSiteId).toBeNull();
            
            act(() => {
            result.current.setActiveSite(site!.id);
            });

        expect(result.current.activeSiteId).toBe(site!.id);
        });
    });

    // =========================================================================
    // Campaign Editor Logic
    // =========================================================================

    describe('Campaign Editor Logic', () => {
            it('should provide empty campaigns initially', () => {
                const { result } = renderHook(() => useCampaignStore());

                expect(result.current.campaigns).toEqual([]);
            });

        it('should track active campaign for editing', () => {
            const {result} = renderHook(() => useCampaignStore());
            
            act(() => {
                const campaign = result.current.createCampaign({
            name: 'Test Campaign',
        description: 'Test',
        status: 'draft',
        targetSiteId: 'test_site',
        postStatus: 'draft',
        source: {
            type: 'keywords',
        config: {
            type: 'keywords',
        keywords: ['keyword1'],
        rotateMode: 'sequential',
        currentIndex: 0,
        skipUsed: true,
                        },
                    },
        aiConfig: {
            provider: 'gemini',
        articleType: 'cluster',
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
        pauseOnError: false,
                    },
                });
        result.current.setActiveCampaign(campaign.id);
            });

        expect(result.current.activeCampaignId).toBeDefined();
        });

        it('should get campaigns for site dropdown', () => {
            const {result: wpResult } = renderHook(() => useWPSitesStore());
        const {result: campResult } = renderHook(() => useCampaignStore());

        let siteId: string;
            act(() => {
                const site = wpResult.current.addSite({
            name: 'Target Site',
        url: 'https://target.com',
        username: 'admin',
        appPassword: 'pass',
        status: 'connected',
                });
        siteId = site.id;
            });

            act(() => {
            campResult.current.createCampaign({
                name: 'Campaign for Site',
                description: 'Test',
                status: 'active',
                targetSiteId: siteId!,
                postStatus: 'draft',
                source: {
                    type: 'keywords',
                    config: {
                        type: 'keywords',
                        keywords: ['keyword1'],
                        rotateMode: 'sequential',
                        currentIndex: 0,
                        skipUsed: true,
                    },
                },
                aiConfig: {
                    provider: 'gemini',
                    articleType: 'cluster',
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
                    pauseOnError: false,
                },
            });
            });

        const siteCampaigns = campResult.current.getCampaignsBySite(siteId!);
        expect(siteCampaigns).toHaveLength(1);
        });
    });

    // =========================================================================
    // Site Status Display Logic
    // =========================================================================

    describe('Status Display Logic', () => {
            it('should provide status for UI badge display', () => {
                const { result } = renderHook(() => useWPSitesStore());

                act(() => {
                    result.current.addSite({
                        name: 'Status Test',
                        url: 'https://status.com',
                        username: 'admin',
                        appPassword: 'pass',
                        status: 'connected',
                    });
                });

                const site = result.current.getAllSites()[0];

                // Status values that UI can use for badge styling
                expect(['connected', 'error', 'pending', 'connecting', 'provisioning']).toContain(site.status);
            });

        it('should provide error message for display', () => {
            const {result} = renderHook(() => useWPSitesStore());

        let site: WPSite;
            act(() => {
            site = result.current.addSite({
                name: 'Error Site',
                url: 'https://error.com',
                username: 'admin',
                appPassword: 'pass',
                status: 'pending',
            });
            });

            act(() => {
            result.current.updateConnectionStatus(site!.id, 'error', 'Connection refused');
            });

        const updated = result.current.getSite(site!.id);
        expect(updated?.status).toBe('error');
        expect(updated?.lastError).toBe('Connection refused');
        });
    });

    // =========================================================================
    // Empty State Logic  
    // =========================================================================

    describe('Empty State Logic', () => {
            it('should detect empty sites for empty state display', () => {
                const { result } = renderHook(() => useWPSitesLegacy());

                const showEmptyState = result.current.sites.length === 0;
                expect(showEmptyState).toBe(true);
            });

        it('should hide empty state when sites exist', () => {
            const {result} = renderHook(() => useWPSitesLegacy());
            
            act(() => {
            result.current.addSite({
                name: 'Site',
                url: 'https://site.com',
                username: 'admin',
                appPassword: 'pass',
            });
            });

        const showEmptyState = result.current.sites.length === 0;
        expect(showEmptyState).toBe(false);
        });

        it('should detect empty campaigns for empty state', () => {
            const {result} = renderHook(() => useCampaignStore());

        const showEmptyState = result.current.campaigns.length === 0;
        expect(showEmptyState).toBe(true);
        });
    });

    // =========================================================================
    // Pagination/Filtering Logic
    // =========================================================================

    describe('Filtering Logic', () => {
            it('should filter campaigns by status', () => {
                const { result } = renderHook(() => useCampaignStore());

                act(() => {
                    for (let i = 0; i < 10; i++) {
                        result.current.createCampaign({
                            name: `Campaign ${i}`,
                            description: 'Test',
                            status: i % 2 === 0 ? 'active' : 'paused',
                            targetSiteId: 'test_site',
                            postStatus: 'draft',
                            source: {
                                type: 'keywords',
                                config: {
                                    type: 'keywords',
                                    keywords: ['keyword'],
                                    rotateMode: 'sequential',
                                    currentIndex: 0,
                                    skipUsed: true,
                                },
                            },
                            aiConfig: {
                                provider: 'gemini',
                                articleType: 'cluster',
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
                                pauseOnError: false,
                            },
                        });
                    }
                });

                const allCampaigns = result.current.campaigns;
                const activeCampaigns = allCampaigns.filter(c => c.status === 'active');
                const pausedCampaigns = allCampaigns.filter(c => c.status === 'paused');

                expect(activeCampaigns).toHaveLength(5);
                expect(pausedCampaigns).toHaveLength(5);
            });

        it('should search sites by name', () => {
            const {result} = renderHook(() => useWPSitesStore());
            
            act(() => {
            result.current.addSite({
                name: 'My Blog',
                url: 'https://myblog.com',
                username: 'admin',
                appPassword: 'pass',
                status: 'connected',
            });
        result.current.addSite({
            name: 'Business Site',
        url: 'https://business.com',
        username: 'admin',
        appPassword: 'pass',
        status: 'connected',
                });
            });

        const allSites = result.current.getAllSites();
        const searchQuery = 'blog';
            const filteredSites = allSites.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        expect(filteredSites).toHaveLength(1);
        expect(filteredSites[0].name).toBe('My Blog');
        });
    });
});
