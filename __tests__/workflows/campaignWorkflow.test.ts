/**
 * Workflow Tests - Campaign Creation Flow
 * Phase 6: Enterprise Consolidation
 * 
 * Tests the complete campaign creation workflow using actual store API
 */

import { useCampaignStore } from '@/features/campaigns/model/campaignStore';

// Reset store before each test
beforeEach(() => {
    useCampaignStore.setState({
        campaigns: [],
        runHistory: [],
        activeCampaignId: null,
    });
});

describe('Campaign Creation Workflow', () => {
    describe('Campaign CRUD', () => {
        it('should create a new campaign', () => {
            const { createCampaign } = useCampaignStore.getState();

            const campaign = createCampaign({
                name: 'Test Campaign',
                siteId: 'site-1',
                sourceType: 'rss',
                sourceConfig: {
                    url: 'https://example.com/feed',
                },
                contentType: 'post',
                filters: [],
                schedule: {
                    type: 'interval',
                    intervalMinutes: 60,
                    enabled: false,
                },
            });

            expect(campaign.id).toBeDefined();
            expect(campaign.name).toBe('Test Campaign');

            const { campaigns } = useCampaignStore.getState();
            expect(campaigns).toHaveLength(1);
        });

        it('should update campaign', () => {
            const { createCampaign, updateCampaign } = useCampaignStore.getState();

            const campaign = createCampaign({
                name: 'Original Name',
                siteId: 'site-1',
                sourceType: 'rss',
                sourceConfig: { url: 'https://example.com/feed' },
                contentType: 'post',
                filters: [],
                schedule: { type: 'interval', intervalMinutes: 60, enabled: false },
            });

            updateCampaign(campaign.id, { name: 'Updated Name' });

            const updated = useCampaignStore.getState().getCampaign(campaign.id);
            expect(updated?.name).toBe('Updated Name');
        });

        it('should delete campaign', () => {
            const { createCampaign, deleteCampaign } = useCampaignStore.getState();

            const campaign = createCampaign({
                name: 'Delete Me',
                siteId: 'site-1',
                sourceType: 'rss',
                sourceConfig: { url: 'https://example.com/feed' },
                contentType: 'post',
                filters: [],
                schedule: { type: 'interval', intervalMinutes: 60, enabled: false },
            });

            deleteCampaign(campaign.id);

            expect(useCampaignStore.getState().campaigns).toHaveLength(0);
        });
    });

    describe('Campaign Status', () => {
        it('should pause campaign', () => {
            const { createCampaign, pauseCampaign } = useCampaignStore.getState();

            const campaign = createCampaign({
                name: 'Pause Test',
                siteId: 'site-1',
                sourceType: 'rss',
                sourceConfig: { url: 'https://example.com/feed' },
                contentType: 'post',
                filters: [],
                schedule: { type: 'interval', intervalMinutes: 60, enabled: true },
            });

            pauseCampaign(campaign.id);

            const paused = useCampaignStore.getState().getCampaign(campaign.id);
            expect(paused?.status).toBe('paused');
        });

        it('should resume campaign', () => {
            const { createCampaign, pauseCampaign, resumeCampaign } = useCampaignStore.getState();

            const campaign = createCampaign({
                name: 'Resume Test',
                siteId: 'site-1',
                sourceType: 'rss',
                sourceConfig: { url: 'https://example.com/feed' },
                contentType: 'post',
                filters: [],
                schedule: { type: 'interval', intervalMinutes: 60, enabled: true },
            });

            pauseCampaign(campaign.id);
            resumeCampaign(campaign.id);

            const resumed = useCampaignStore.getState().getCampaign(campaign.id);
            expect(resumed?.status).toBe('active');
        });
    });

    describe('Active Campaign', () => {
        it('should set and get active campaign', () => {
            const { createCampaign, setActiveCampaign, getActiveCampaign } = useCampaignStore.getState();

            const campaign = createCampaign({
                name: 'Active Test',
                siteId: 'site-1',
                sourceType: 'rss',
                sourceConfig: { url: 'https://example.com/feed' },
                contentType: 'post',
                filters: [],
                schedule: { type: 'interval', intervalMinutes: 60, enabled: false },
            });

            setActiveCampaign(campaign.id);

            expect(useCampaignStore.getState().activeCampaignId).toBe(campaign.id);
        });
    });

    describe('Run History', () => {
        it('should add run to history', () => {
            const { createCampaign, addRun, getRunHistory } = useCampaignStore.getState();

            const campaign = createCampaign({
                name: 'Run Test',
                siteId: 'site-1',
                sourceType: 'rss',
                sourceConfig: { url: 'https://example.com/feed' },
                contentType: 'post',
                filters: [],
                schedule: { type: 'interval', intervalMinutes: 60, enabled: false },
            });

            addRun({
                id: 'run-1',
                campaignId: campaign.id,
                status: 'running',
                startedAt: Date.now(),
                stages: [],
            });

            const history = useCampaignStore.getState().getRunHistory(campaign.id);
            expect(history).toHaveLength(1);
        });
    });
});
