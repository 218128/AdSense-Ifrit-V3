/**
 * Campaigns Feature - Zustand Store
 * FSD: features/campaigns/model/campaignStore.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    Campaign,
    CampaignRun,
    CampaignStats,
    ScheduleConfig
} from './types';

// ============================================================================
// Store Interface
// ============================================================================

interface CampaignStore {
    // State
    campaigns: Campaign[];
    runHistory: CampaignRun[];
    activeCampaignId: string | null;

    // Campaign CRUD
    createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => Campaign;
    updateCampaign: (id: string, updates: Partial<Campaign>) => void;
    deleteCampaign: (id: string) => void;

    // Getters
    getCampaign: (id: string) => Campaign | undefined;
    getActiveCampaign: () => Campaign | undefined;
    setActiveCampaign: (id: string | null) => void;
    getCampaignsBySite: (siteId: string) => Campaign[];

    // Status management
    pauseCampaign: (id: string) => void;
    resumeCampaign: (id: string) => void;

    // Stats updates
    updateStats: (id: string, stats: Partial<CampaignStats>) => void;
    incrementGenerated: (id: string) => void;
    incrementPublished: (id: string) => void;
    incrementFailed: (id: string) => void;

    // Schedule management
    updateSchedule: (id: string, schedule: Partial<ScheduleConfig>) => void;
    getDueCampaigns: () => Campaign[];
    updateNextRun: (id: string) => void;

    // Run history
    addRun: (run: CampaignRun) => void;
    addRunToHistory: (run: CampaignRun) => void; // Alias for addRun
    updateRun: (runId: string, updates: Partial<CampaignRun>) => void;
    completeRun: (runId: string, status: 'completed' | 'failed' | 'partial') => void;
    addErrorToRun: (runId: string, stage: 'research' | 'generate' | 'image' | 'publish', message: string) => void;
    getRunHistory: (campaignId: string, limit?: number) => CampaignRun[];
    clearOldRuns: (olderThanDays: number) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useCampaignStore = create<CampaignStore>()(
    persist(
        (set, get) => ({
            campaigns: [],
            runHistory: [],
            activeCampaignId: null,

            // ----------------------------------------------------------------
            // Campaign CRUD
            // ----------------------------------------------------------------

            createCampaign: (campaignData) => {
                const newCampaign: Campaign = {
                    id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    ...campaignData,
                    stats: {
                        totalGenerated: 0,
                        totalPublished: 0,
                        totalFailed: 0,
                    },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set((state) => ({
                    campaigns: [...state.campaigns, newCampaign]
                }));

                return newCampaign;
            },

            updateCampaign: (id, updates) => {
                set((state) => ({
                    campaigns: state.campaigns.map((c) =>
                        c.id === id
                            ? { ...c, ...updates, updatedAt: Date.now() }
                            : c
                    )
                }));
            },

            deleteCampaign: (id) => {
                set((state) => ({
                    campaigns: state.campaigns.filter((c) => c.id !== id),
                    activeCampaignId: state.activeCampaignId === id ? null : state.activeCampaignId
                }));
            },

            // ----------------------------------------------------------------
            // Getters
            // ----------------------------------------------------------------

            getCampaign: (id) => {
                return get().campaigns.find((c) => c.id === id);
            },

            getActiveCampaign: () => {
                const { campaigns, activeCampaignId } = get();
                return activeCampaignId ? campaigns.find((c) => c.id === activeCampaignId) : undefined;
            },

            setActiveCampaign: (id) => {
                set({ activeCampaignId: id });
            },

            getCampaignsBySite: (siteId) => {
                return get().campaigns.filter((c) => c.targetSiteId === siteId);
            },

            // ----------------------------------------------------------------
            // Status Management
            // ----------------------------------------------------------------

            pauseCampaign: (id) => {
                set((state) => ({
                    campaigns: state.campaigns.map((c) =>
                        c.id === id
                            ? { ...c, status: 'paused' as const, updatedAt: Date.now() }
                            : c
                    )
                }));
            },

            resumeCampaign: (id) => {
                set((state) => ({
                    campaigns: state.campaigns.map((c) =>
                        c.id === id
                            ? { ...c, status: 'active' as const, updatedAt: Date.now() }
                            : c
                    )
                }));
            },

            // ----------------------------------------------------------------
            // Stats Updates
            // ----------------------------------------------------------------

            updateStats: (id, stats) => {
                set((state) => ({
                    campaigns: state.campaigns.map((c) =>
                        c.id === id
                            ? {
                                ...c,
                                stats: { ...c.stats, ...stats },
                                updatedAt: Date.now()
                            }
                            : c
                    )
                }));
            },

            incrementGenerated: (id) => {
                const campaign = get().getCampaign(id);
                if (campaign) {
                    get().updateStats(id, {
                        totalGenerated: campaign.stats.totalGenerated + 1
                    });
                }
            },

            incrementPublished: (id) => {
                const campaign = get().getCampaign(id);
                if (campaign) {
                    get().updateStats(id, {
                        totalPublished: campaign.stats.totalPublished + 1
                    });
                }
            },

            incrementFailed: (id) => {
                const campaign = get().getCampaign(id);
                if (campaign) {
                    get().updateStats(id, {
                        totalFailed: campaign.stats.totalFailed + 1
                    });
                }
            },

            // ----------------------------------------------------------------
            // Schedule Management
            // ----------------------------------------------------------------

            updateSchedule: (id, schedule) => {
                set((state) => ({
                    campaigns: state.campaigns.map((c) =>
                        c.id === id
                            ? {
                                ...c,
                                schedule: { ...c.schedule, ...schedule },
                                updatedAt: Date.now()
                            }
                            : c
                    )
                }));
            },

            getDueCampaigns: () => {
                const now = Date.now();
                return get().campaigns.filter((c) => {
                    if (c.status !== 'active') return false;
                    if (c.schedule.type === 'manual') return false;
                    if (!c.schedule.nextRunAt) return true; // Never run
                    return c.schedule.nextRunAt <= now;
                });
            },

            updateNextRun: (id) => {
                const campaign = get().getCampaign(id);
                if (!campaign || campaign.schedule.type === 'manual') return;

                const intervalMs = (campaign.schedule.intervalHours || 24) * 60 * 60 * 1000;
                const nextRunAt = Date.now() + intervalMs;

                set((state) => ({
                    campaigns: state.campaigns.map((c) =>
                        c.id === id
                            ? {
                                ...c,
                                schedule: { ...c.schedule, nextRunAt, lastRunAt: Date.now() },
                                updatedAt: Date.now()
                            }
                            : c
                    )
                }));
            },

            // ----------------------------------------------------------------
            // Run History
            // ----------------------------------------------------------------

            addRun: (run) => {
                set((state) => ({
                    runHistory: [run, ...state.runHistory]
                }));
            },

            addRunToHistory: (run) => {
                get().addRun(run);
            },

            updateRun: (runId, updates) => {
                set((state) => ({
                    runHistory: state.runHistory.map((r) =>
                        r.id === runId ? { ...r, ...updates } : r
                    )
                }));
            },

            completeRun: (runId, status) => {
                get().updateRun(runId, {
                    status,
                    completedAt: Date.now(),
                });
            },

            addErrorToRun: (runId, stage, message) => {
                const run = get().runHistory.find((r) => r.id === runId);
                if (!run) return;

                const newError = { stage, message, timestamp: Date.now() };
                get().updateRun(runId, {
                    errors: [...run.errors, newError],
                });
            },

            getRunHistory: (campaignId, limit = 20) => {
                return get()
                    .runHistory
                    .filter((r) => r.campaignId === campaignId)
                    .slice(0, limit);
            },

            clearOldRuns: (olderThanDays) => {
                const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
                set((state) => ({
                    runHistory: state.runHistory.filter((r) => r.startedAt > cutoff)
                }));
            },
        }),
        {
            name: 'ifrit-campaigns-store',
        }
    )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCampaigns = () => useCampaignStore((s) => s.campaigns);
export const useActiveCampaign = () => useCampaignStore((s) => s.getActiveCampaign());
export const useActiveCampaigns = () =>
    useCampaignStore((s) => s.campaigns.filter((c) => c.status === 'active'));
export const useDueCampaigns = () => useCampaignStore((s) => s.getDueCampaigns());
