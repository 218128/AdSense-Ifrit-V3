/**
 * WordPress Store Tests
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
    persist: <T>(fn: () => T) => fn,
}));

import { useWordPressStore } from '@/features/wordpress/model/wordpressStore';

describe('WordPress Store', () => {
    beforeEach(() => {
        // Reset store state
        const { result } = renderHook(() => useWordPressStore());
        act(() => {
            result.current.sites.forEach(s => result.current.removeSite(s.id));
        });
    });

    describe('addSite', () => {
        it('should add a new site with generated id', () => {
            const { result } = renderHook(() => useWordPressStore());

            let newSite: ReturnType<typeof result.current.addSite>;
            act(() => {
                newSite = result.current.addSite({
                    name: 'Test Blog',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx-xxxx',
                });
            });

            expect(newSite!.id).toMatch(/^wp_/);
            expect(newSite!.name).toBe('Test Blog');
            expect(newSite!.status).toBe('pending');
            expect(result.current.sites).toHaveLength(1);
        });

        it('should set timestamps on new site', () => {
            const { result } = renderHook(() => useWordPressStore());
            const before = Date.now();

            let newSite: ReturnType<typeof result.current.addSite>;
            act(() => {
                newSite = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            expect(newSite!.createdAt).toBeGreaterThanOrEqual(before);
            expect(newSite!.updatedAt).toBe(newSite!.createdAt);
        });
    });

    describe('updateSite', () => {
        it('should update site fields', () => {
            const { result } = renderHook(() => useWordPressStore());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Old Name',
                    url: 'https://old.com',
                    username: 'admin',
                    appPassword: 'xxxx',
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
            const { result } = renderHook(() => useWordPressStore());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            const originalUpdatedAt = site!.updatedAt;

            // Wait a tiny bit to ensure timestamp changes
            act(() => {
                result.current.updateSite(site!.id, { name: 'Updated' });
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
        });
    });

    describe('removeSite', () => {
        it('should remove site by id', () => {
            const { result } = renderHook(() => useWordPressStore());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.removeSite(site!.id);
            });

            expect(result.current.sites).toHaveLength(0);
            expect(result.current.getSite(site!.id)).toBeUndefined();
        });

        it('should clear activeSiteId if removed site was active', () => {
            const { result } = renderHook(() => useWordPressStore());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
                result.current.setActiveSite(site.id);
            });

            expect(result.current.activeSiteId).toBe(site!.id);

            act(() => {
                result.current.removeSite(site!.id);
            });

            expect(result.current.activeSiteId).toBeNull();
        });
    });

    describe('updateSiteStatus', () => {
        it('should update site status', () => {
            const { result } = renderHook(() => useWordPressStore());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.updateSiteStatus(site!.id, 'connected');
            });

            expect(result.current.getSite(site!.id)?.status).toBe('connected');
        });

        it('should set error message on error status', () => {
            const { result } = renderHook(() => useWordPressStore());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.updateSiteStatus(site!.id, 'error', 'Auth failed');
            });

            const updated = result.current.getSite(site!.id);
            expect(updated?.status).toBe('error');
            expect(updated?.lastError).toBe('Auth failed');
        });
    });

    describe('updateSiteMetadata', () => {
        it('should update categories, tags, authors', () => {
            const { result } = renderHook(() => useWordPressStore());

            let site: ReturnType<typeof result.current.addSite>;
            act(() => {
                site = result.current.addSite({
                    name: 'Test',
                    url: 'https://test.com',
                    username: 'admin',
                    appPassword: 'xxxx',
                });
            });

            act(() => {
                result.current.updateSiteMetadata(site!.id, {
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
});
