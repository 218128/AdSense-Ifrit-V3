/**
 * WP Sites Store Tests
 * @jest-environment jsdom
 * 
 * Tests for the new useWPSitesStore Zustand store.
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
    selectSitesArray,
} from '@/features/wordpress/model/wpSiteStore';
import type { WPSite } from '@/features/wordpress/model/wpSiteTypes';

const mockSiteInput = {
    name: 'Test Blog',
    url: 'https://testblog.com',
    username: 'admin',
    appPassword: 'xxxx xxxx xxxx',
    status: 'pending' as const,
};

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

    // =========================================================================
    // SITE CRUD
    // =========================================================================

    describe('addSite', () => {
        it('should add a site with generated id', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            expect(site!.id).toMatch(/^wpsite_/);
            expect(site!.name).toBe('Test Blog');
            expect(site!.url).toBe('https://testblog.com');
            expect(result.current.getAllSites()).toHaveLength(1);
        });

        it('should set createdAt and updatedAt timestamps', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            expect(site!.createdAt).toBeDefined();
            expect(site!.updatedAt).toBeDefined();
            expect(site!.createdAt).toBeLessThanOrEqual(Date.now());
        });

        it('should initialize empty articles array for new site', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            expect(result.current.getArticles(site!.id)).toEqual([]);
        });
    });

    describe('updateSite', () => {
        it('should update site properties', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            act(() => {
                result.current.updateSite(site!.id, { name: 'Updated Blog' });
            });

            expect(result.current.getSite(site!.id)?.name).toBe('Updated Blog');
        });

        it('should update updatedAt timestamp', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            const originalUpdatedAt = site!.updatedAt;

            // Small delay to ensure timestamp difference
            act(() => {
                result.current.updateSite(site!.id, { name: 'Updated' });
            });

            expect(result.current.getSite(site!.id)?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
        });
    });

    describe('deleteSite', () => {
        it('should remove site from store', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            expect(result.current.getAllSites()).toHaveLength(1);

            act(() => {
                result.current.deleteSite(site!.id);
            });

            expect(result.current.getAllSites()).toHaveLength(0);
            expect(result.current.getSite(site!.id)).toBeUndefined();
        });

        it('should also delete site articles', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
                result.current.addArticle(site!.id, {
                    siteId: site!.id,
                    title: 'Test Article',
                    content: 'Content',
                    localStatus: 'draft',
                });
            });

            expect(result.current.getArticles(site!.id)).toHaveLength(1);

            act(() => {
                result.current.deleteSite(site!.id);
            });

            expect(result.current.getArticles(site!.id)).toEqual([]);
        });

        it('should clear activeSiteId if deleted site was active', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
                result.current.setActiveSite(site!.id);
            });

            expect(result.current.activeSiteId).toBe(site!.id);

            act(() => {
                result.current.deleteSite(site!.id);
            });

            expect(result.current.activeSiteId).toBeNull();
        });
    });

    // =========================================================================
    // STATUS UPDATES
    // =========================================================================

    describe('updateConnectionStatus', () => {
        it('should update site status', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            act(() => {
                result.current.updateConnectionStatus(site!.id, 'connected');
            });

            expect(result.current.getSite(site!.id)?.status).toBe('connected');
        });

        it('should store error message on error status', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            act(() => {
                result.current.updateConnectionStatus(site!.id, 'error', 'Connection refused');
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.status).toBe('error');
            expect(updated?.lastError).toBe('Connection refused');
        });
    });

    describe('updateAdsenseStatus', () => {
        it('should update adsense status', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
            });

            act(() => {
                result.current.updateAdsenseStatus(site!.id, 'approved', 'pub-1234567890');
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.adsenseStatus).toBe('approved');
            expect(updated?.adsensePublisherId).toBe('pub-1234567890');
        });
    });

    // =========================================================================
    // SELECTORS
    // =========================================================================

    describe('selectActiveSite', () => {
        it('should return null when no active site', () => {
            const state = useWPSitesStore.getState();
            expect(selectActiveSite(state)).toBeNull();
        });

        it('should return active site when set', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
                result.current.setActiveSite(site!.id);
            });

            const state = useWPSitesStore.getState();
            expect(selectActiveSite(state)?.id).toBe(site!.id);
        });
    });

    describe('selectConnectedSites', () => {
        it('should filter sites by connected status', () => {
            const { result } = renderHook(() => useWPSitesStore());

            act(() => {
                const site1 = result.current.addSite({ ...mockSiteInput, name: 'Site 1' });
                const site2 = result.current.addSite({ ...mockSiteInput, name: 'Site 2' });
                result.current.updateConnectionStatus(site1.id, 'connected');
                result.current.updateConnectionStatus(site2.id, 'error');
            });

            const state = useWPSitesStore.getState();
            const connected = selectConnectedSites(state);
            expect(connected).toHaveLength(1);
            expect(connected[0].name).toBe('Site 1');
        });
    });

    describe('selectSitesArray', () => {
        it('should return sites as array', () => {
            const { result } = renderHook(() => useWPSitesStore());

            act(() => {
                result.current.addSite({ ...mockSiteInput, name: 'Site A' });
                result.current.addSite({ ...mockSiteInput, name: 'Site B' });
            });

            const state = useWPSitesStore.getState();
            expect(selectSitesArray(state)).toHaveLength(2);
        });
    });

    // =========================================================================
    // LEGACY HOOK
    // =========================================================================

    describe('useWPSitesLegacy', () => {
        it('should return sites as array', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            act(() => {
                result.current.addSite({
                    name: 'Legacy Site',
                    url: 'https://legacy.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            expect(Array.isArray(result.current.sites)).toBe(true);
            expect(result.current.sites).toHaveLength(1);
        });

        it('should accept minimal input for addSite', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Minimal Site',
                    url: 'https://minimal.com',
                    username: 'user',
                    appPassword: 'pass',
                });
            });

            expect(site!.id).toBeDefined();
            expect(site!.status).toBe('pending');
        });

        it('should provide removeSite alias for deleteSite', () => {
            const { result } = renderHook(() => useWPSitesLegacy());

            let site: WPSite;
            act(() => {
                site = result.current.addSite({
                    name: 'Remove Me',
                    url: 'https://remove.com',
                    username: 'user',
                    appPassword: 'pass',
                });
            });

            expect(result.current.sites).toHaveLength(1);

            act(() => {
                result.current.removeSite(site!.id);
            });

            expect(result.current.sites).toHaveLength(0);
        });
    });

    // =========================================================================
    // ARTICLES
    // =========================================================================

    describe('Article CRUD', () => {
        it('should add article to site', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            act(() => {
                site = result.current.addSite(mockSiteInput);
                result.current.addArticle(site!.id, {
                    siteId: site!.id,
                    title: 'New Article',
                    content: 'Article content',
                    localStatus: 'draft',
                });
            });

            expect(result.current.getArticles(site!.id)).toHaveLength(1);
            expect(result.current.getArticles(site!.id)[0].title).toBe('New Article');
        });

        it('should update article', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            let articleId: string;
            act(() => {
                site = result.current.addSite(mockSiteInput);
                const article = result.current.addArticle(site!.id, {
                    siteId: site!.id,
                    title: 'Original',
                    content: 'Content',
                    localStatus: 'draft',
                });
                articleId = article.id;
            });

            act(() => {
                result.current.updateArticle(site!.id, articleId!, { title: 'Updated Title' });
            });

            expect(result.current.getArticle(site!.id, articleId!)?.title).toBe('Updated Title');
        });

        it('should delete article', () => {
            const { result } = renderHook(() => useWPSitesStore());

            let site: WPSite;
            let articleId: string;
            act(() => {
                site = result.current.addSite(mockSiteInput);
                const article = result.current.addArticle(site!.id, {
                    siteId: site!.id,
                    title: 'Delete Me',
                    content: 'Content',
                    localStatus: 'draft',
                });
                articleId = article.id;
            });

            expect(result.current.getArticles(site!.id)).toHaveLength(1);

            act(() => {
                result.current.deleteArticle(site!.id, articleId!);
            });

            expect(result.current.getArticles(site!.id)).toHaveLength(0);
        });
    });
});
