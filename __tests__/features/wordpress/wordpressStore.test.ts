/**
 * WP Sites Store Tests
 * Tests for useWPSitesStore (the canonical WordPress store)
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import {
    useWPSitesStore,
    useWPSitesLegacy,
    selectActiveSite,
    selectConnectedSites,
} from '@/features/wordpress/model/wpSiteStore';
import type { WPSite } from '@/features/wordpress/model/wpSiteTypes';

describe('WP Sites Store', () => {
    beforeEach(() => {
        // Reset store state
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

    describe('addSite', () => {
        it('should add a new site with generated id', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let newSite: WPSite;
            act(() => {
                newSite = result.current.addSite({
                    name: 'Test Blog',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx-xxxx',
                    status: 'pending',
                });
            });

            expect(newSite!.id).toMatch(/^wpsite_/);
            expect(newSite!.name).toBe('Test Blog');
            expect(newSite!.status).toBe('pending');
            expect(result.current.getAllSites()).toHaveLength(1);
        });

        it('should set timestamps on new site', () => {
            const { result } = renderHook(() => useWPSitesStore());
            const before = Date.now();

            let newSite: WPSite;
            act(() => {
                newSite = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
            });

            expect(newSite!.createdAt).toBeGreaterThanOrEqual(before);
            expect(newSite!.updatedAt).toBe(newSite!.createdAt);
        });
    });

    describe('updateSite', () => {
        it('should update site fields', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Old Name',
                    url: 'https://old.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
            });

            act(() => {
                result.current.updateSite(site!.id, { name: 'New Name' });
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.name).toBe('New Name');
            expect(updated?.url).toBe('https://old.com'); // Unchanged
        });

        it('should update updatedAt timestamp', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
            });

            const originalUpdatedAt = site!.updatedAt;

            act(() => {
                result.current.updateSite(site!.id, { name: 'Updated' });
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
        });
    });

    describe('deleteSite', () => {
        it('should remove site by id', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
            });

            act(() => {
                result.current.deleteSite(site!.id);
            });

            expect(result.current.getAllSites()).toHaveLength(0);
            expect(result.current.getSite(site!.id)).toBeUndefined();
        });

        it('should clear activeSiteId if deleted site was active', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
                result.current.setActiveSite(site.id);
            });

            expect(result.current.activeSiteId).toBe(site!.id);

            act(() => {
                result.current.deleteSite(site!.id);
            });

            expect(result.current.activeSiteId).toBeNull();
        });
    });

    describe('updateConnectionStatus', () => {
        it('should update site status', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
            });

            act(() => {
                result.current.updateConnectionStatus(site!.id, 'connected');
            });

            expect(result.current.getSite(site!.id)?.status).toBe('connected');
        });

        it('should set error message on error status', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
            });

            act(() => {
                result.current.updateConnectionStatus(site!.id, 'error', 'Auth failed');
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.status).toBe('error');
            expect(updated?.lastError).toBe('Auth failed');
        });
    });

    describe('syncSiteData', () => {
        it('should update categories, tags, authors', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                    status: 'pending',
                });
            });

            act(() => {
                result.current.syncSiteData(site!.id, {
                    categories: [{ id: 1, name: 'Tech', slug: 'tech' }],
                    authors: [{ id: 1, name: 'Admin', slug: 'admin' }],
                });
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.categories).toHaveLength(1);
            expect(updated?.categories?.[0].name).toBe('Tech');
            expect(updated?.syncedAt).toBeDefined();
        });
    });

    describe('Legacy Hook Compatibility', () => {
        it('useWPSitesLegacy should provide old API', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            // Should have sites as array
            expect(Array.isArray(result.current.sites)).toBe(true);

            // Should have simplified addSite
            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Legacy Test',
                    url: 'https://legacy.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            expect(site!.id).toBeDefined();
            expect(result.current.sites).toHaveLength(1);
        });
    });

    describe('Selectors', () => {
        it('selectActiveSite should return active site', () => {
            const store = useWPSitesStore.getState();

            const site = store.addSite({
                name: 'Active',
                url: 'https://active.com',
                username: 'admin',
                appPassword: 'xxxx',
                status: 'connected',
            });

            store.setActiveSite(site.id);

            const state = useWPSitesStore.getState();
            const activeSite = selectActiveSite(state);

            expect(activeSite?.id).toBe(site.id);
        });

        it('selectConnectedSites should filter by status', () => {
            const store = useWPSitesStore.getState();

            store.addSite({
                name: 'Connected',
                url: 'https://connected.com',
                username: 'admin',
                appPassword: 'xxxx',
                status: 'connected',
            });

            store.addSite({
                name: 'Pending',
                url: 'https://pending.com',
                username: 'admin',
                appPassword: 'xxxx',
                status: 'pending',
            });

            const state = useWPSitesStore.getState();
            const connected = selectConnectedSites(state);

            expect(connected).toHaveLength(1);
            expect(connected[0].name).toBe('Connected');
        });
    });
});
