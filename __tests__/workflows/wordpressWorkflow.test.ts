/**
 * Workflow Tests - WordPress Site Management Flow
 * Phase 6: Enterprise Consolidation
 * 
 * Tests the WordPress site management workflow using actual store API
 */

import { useWordPressStore } from '@/features/wordpress/model/wordpressStore';

// Reset store before each test
beforeEach(() => {
    useWordPressStore.setState({
        sites: [],
        activeSiteId: null,
    });
});

describe('WordPress Site Management Workflow', () => {
    describe('Site CRUD', () => {
        it('should add a WordPress site', () => {
            const { addSite } = useWordPressStore.getState();

            const site = addSite({
                name: 'Test Blog',
                url: 'https://testblog.com',
                restUrl: 'https://testblog.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx-xxxx-xxxx',
            });

            expect(site.id).toBeDefined();
            expect(site.status).toBe('pending');

            const { sites } = useWordPressStore.getState();
            expect(sites).toHaveLength(1);
            expect(sites[0].name).toBe('Test Blog');
        });

        it('should update site', () => {
            const { addSite, updateSite } = useWordPressStore.getState();

            const site = addSite({
                name: 'Original',
                url: 'https://original.com',
                restUrl: 'https://original.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx',
            });

            updateSite(site.id, { name: 'Updated' });

            const updated = useWordPressStore.getState().getSite(site.id);
            expect(updated?.name).toBe('Updated');
        });

        it('should remove site', () => {
            const { addSite, removeSite } = useWordPressStore.getState();

            const site = addSite({
                name: 'Remove Me',
                url: 'https://remove.com',
                restUrl: 'https://remove.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx',
            });

            removeSite(site.id);

            expect(useWordPressStore.getState().sites).toHaveLength(0);
        });
    });

    describe('Site Status', () => {
        it('should update site status to connected', () => {
            const { addSite, updateSiteStatus } = useWordPressStore.getState();

            const site = addSite({
                name: 'Status Test',
                url: 'https://statustest.com',
                restUrl: 'https://statustest.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx',
            });

            updateSiteStatus(site.id, 'connected');

            const updated = useWordPressStore.getState().getSite(site.id);
            expect(updated?.status).toBe('connected');
        });

        it('should update site status with error', () => {
            const { addSite, updateSiteStatus } = useWordPressStore.getState();

            const site = addSite({
                name: 'Error Test',
                url: 'https://errortest.com',
                restUrl: 'https://errortest.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx',
            });

            updateSiteStatus(site.id, 'error', 'Connection failed');

            const updated = useWordPressStore.getState().getSite(site.id);
            expect(updated?.status).toBe('error');
            expect(updated?.lastError).toBe('Connection failed');
        });
    });

    describe('Active Site', () => {
        it('should set and get active site', () => {
            const { addSite, setActiveSite, getActiveSite } = useWordPressStore.getState();

            const site = addSite({
                name: 'Active Test',
                url: 'https://active.com',
                restUrl: 'https://active.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx',
            });

            setActiveSite(site.id);

            expect(useWordPressStore.getState().activeSiteId).toBe(site.id);
            expect(useWordPressStore.getState().getActiveSite()?.id).toBe(site.id);
        });

        it('should clear active site when removed', () => {
            const { addSite, setActiveSite, removeSite } = useWordPressStore.getState();

            const site = addSite({
                name: 'Clear Test',
                url: 'https://clear.com',
                restUrl: 'https://clear.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx',
            });

            setActiveSite(site.id);
            removeSite(site.id);

            expect(useWordPressStore.getState().activeSiteId).toBeNull();
        });
    });

    describe('Site Metadata', () => {
        it('should update site metadata', () => {
            const { addSite, updateSiteMetadata } = useWordPressStore.getState();

            const site = addSite({
                name: 'Metadata Test',
                url: 'https://metadata.com',
                restUrl: 'https://metadata.com/wp-json',
                username: 'admin',
                applicationPassword: 'xxxx',
            });

            updateSiteMetadata(site.id, {
                categories: [{ id: 1, name: 'Technology', slug: 'technology' }],
                tags: [{ id: 1, name: 'News', slug: 'news' }],
            });

            const updated = useWordPressStore.getState().getSite(site.id);
            expect(updated?.categories).toHaveLength(1);
            expect(updated?.categories?.[0].name).toBe('Technology');
        });
    });
});
