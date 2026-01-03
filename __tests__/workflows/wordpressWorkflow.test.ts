/**
 * Workflow Tests - WordPress Site Management Flow
 * Updated to use new wpSiteStore
 */

import { useWPSitesStore, useWPSitesLegacy } from '@/features/wordpress/model/wpSiteStore';
import { renderHook, act } from '@testing-library/react';

// Reset store before each test
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
});

describe('WordPress Site Management Workflow', () => {
    describe('Site CRUD via Legacy API', () => {
        it('should add a WordPress site using legacy hook', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Test Blog',
                    url: 'https://testblog.com',
                    username: 'admin',
                    appPassword: 'xxxx-xxxx-xxxx',
                });
            });

            expect(site!.id).toBeDefined();
            expect(site!.status).toBe('pending');
            expect(result.current.sites).toHaveLength(1);
            expect(result.current.sites[0].name).toBe('Test Blog');
        });

        it('should update site', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Original',
                    url: 'https://original.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.updateSite(site!.id, { name: 'Updated' });
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.name).toBe('Updated');
        });

        it('should remove site', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Remove Me',
                    url: 'https://remove.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.removeSite(site!.id);
            });

            expect(result.current.sites).toHaveLength(0);
        });
    });

    describe('Site CRUD via New Store', () => {
        it('should add site using new store directly', () => {
            const store = useWPSitesStore.getState();

            const site = store.addSite({
                name: 'New Store Test',
                url: 'https://newstore.com',
                username: 'admin',
                appPassword: 'xxxx',
                status: 'pending',
            });

            expect(site.id).toMatch(/^wpsite_/);
            expect(site.name).toBe('New Store Test');

            const sites = useWPSitesStore.getState().getAllSites();
            expect(sites).toHaveLength(1);
        });
    });

    describe('Site Status', () => {
        it('should update site status to connected', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Status Test',
                    url: 'https://statustest.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.updateSiteStatus(site!.id, 'connected');
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.status).toBe('connected');
        });

        it('should update site status with error', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Error Test',
                    url: 'https://errortest.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.updateSiteStatus(site!.id, 'error', 'Connection failed');
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.status).toBe('error');
            expect(updated?.lastError).toBe('Connection failed');
        });
    });

    describe('Active Site', () => {
        it('should set and get active site', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Active Test',
                    url: 'https://active.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.setActiveSite(site!.id);
            });

            expect(result.current.activeSiteId).toBe(site!.id);
            expect(result.current.getActiveSite()?.id).toBe(site!.id);
        });

        it('should clear active site when removed', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Clear Test',
                    url: 'https://clear.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
                result.current.setActiveSite(site.id);
            });

            act(() => {
                result.current.removeSite(site!.id);
            });

            expect(result.current.activeSiteId).toBeNull();
        });
    });

    describe('Site Metadata', () => {
        it('should update site metadata', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Metadata Test',
                    url: 'https://metadata.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.updateSiteMetadata(site!.id, {
                    categories: [{ id: 1, name: 'Technology', slug: 'technology' }],
                    tags: [{ id: 1, name: 'News', slug: 'news' }],
                });
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.categories).toHaveLength(1);
            expect(updated?.categories?.[0].name).toBe('Technology');
        });
    });
});
