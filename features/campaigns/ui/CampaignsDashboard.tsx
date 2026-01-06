'use client';

/**
 * Campaigns Dashboard
 * FSD: features/campaigns/ui/CampaignsDashboard.tsx
 */

import { useState } from 'react';
import { Zap, Plus, Play, Pause, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useCampaignStore } from '../model/campaignStore';
import { useWPSitesLegacy } from '@/features/wordpress/model/wpSiteStore';
import { CampaignCard } from './CampaignCard';
import { CampaignEditor } from './CampaignEditor';
import type { Campaign } from '../model/types';
import { runPipeline, createRun } from '../lib/processor';

export function CampaignsDashboard() {
    const { campaigns, addRun, updateRun, incrementGenerated, incrementPublished, incrementFailed, updateStats, updateSchedule } = useCampaignStore();
    const { sites } = useWPSitesLegacy();
    const [showEditor, setShowEditor] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

    const activeCount = campaigns.filter(c => c.status === 'active').length;
    const pausedCount = campaigns.filter(c => c.status === 'paused').length;
    const totalPublished = campaigns.reduce((sum, c) => sum + c.stats.totalPublished, 0);
    const connectedSites = sites.filter(s => s.status === 'connected').length;

    const handleRunCampaign = async (campaign: Campaign) => {
        // Get SSE status store for real-time UI updates
        const { useGlobalActionStatusStore } = await import('@/stores/globalActionStatusStore');
        const { startAction, updateAction, addStep, updateStep, completeAction, failAction } = useGlobalActionStatusStore.getState();

        const site = sites.find(s => s.id === campaign.targetSiteId);
        if (!site) {
            alert('Target WordPress site not found or not connected.');
            return;
        }

        // Start SSE action for UI visibility
        const actionId = startAction(
            `Campaign: ${campaign.name}`,
            'campaign',
            true // retryable
        );

        // Create run record
        const run = createRun(campaign.id);
        addRun(run);

        try {
            // Get source items based on campaign source type
            const sourceItems = getSourceItems(campaign);
            const maxPosts = campaign.schedule.maxPostsPerRun;
            const itemsToProcess = sourceItems.slice(0, maxPosts);

            updateAction(actionId, `Generating ${itemsToProcess.length} articles...`);

            for (let i = 0; i < itemsToProcess.length; i++) {
                const sourceItem = itemsToProcess[i];
                const articleNum = i + 1;
                const stepId = addStep(actionId, `Article ${articleNum}/${itemsToProcess.length}: Starting...`);

                try {
                    // Run pipeline with status updates
                    const result = await runPipeline(campaign, sourceItem, site, {
                        onStatusChange: (status) => {
                            const statusMessages: Record<string, string> = {
                                researching: `Article ${articleNum}/${itemsToProcess.length}: Researching "${sourceItem.topic.substring(0, 30)}..."`,
                                generating: `Article ${articleNum}/${itemsToProcess.length}: Generating content`,
                                imaging: `Article ${articleNum}/${itemsToProcess.length}: Creating image`,
                                linking: `Article ${articleNum}/${itemsToProcess.length}: Analyzing links`,
                                publishing: `Article ${articleNum}/${itemsToProcess.length}: Publishing to WordPress`,
                            };
                            updateStep(actionId, stepId, statusMessages[status] || `Article ${articleNum}: ${status}`);
                        }
                    });

                    // Success - update step
                    updateStep(actionId, stepId, `Article ${articleNum}/${itemsToProcess.length}: Published ✓`, 'success');

                    incrementGenerated(campaign.id);
                    if (result.wpResult) {
                        incrementPublished(campaign.id);
                        updateStats(campaign.id, {
                            lastPostTitle: result.content?.title,
                            lastPostUrl: result.wpResult.postUrl,
                        });
                    }

                    run.postsGenerated++;
                    run.postsPublished++;
                } catch (error) {
                    // Failure - update step
                    updateStep(actionId, stepId, `Article ${articleNum}/${itemsToProcess.length}: Failed - ${error instanceof Error ? error.message : 'Error'}`, 'error');

                    incrementFailed(campaign.id);
                    run.errors.push({
                        stage: 'generate',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: Date.now(),
                    });
                }
            }

            // Update run completion
            updateRun(run.id, {
                status: run.errors.length === 0 ? 'completed' : 'partial',
                completedAt: Date.now(),
                postsGenerated: run.postsGenerated,
                postsPublished: run.postsPublished,
            });

            // Complete SSE action
            const successCount = run.postsPublished;
            const failCount = run.errors.length;
            completeAction(actionId, `Complete: ${successCount} published${failCount > 0 ? `, ${failCount} failed` : ''}`);

            // Update next run time
            if (campaign.schedule.type === 'interval' && campaign.schedule.intervalHours) {
                updateSchedule(campaign.id, {
                    lastRunAt: Date.now(),
                    nextRunAt: Date.now() + (campaign.schedule.intervalHours * 60 * 60 * 1000),
                });
            }

        } catch (error) {
            updateRun(run.id, {
                status: 'failed',
                completedAt: Date.now(),
            });
            failAction(actionId, error instanceof Error ? error.message : 'Campaign failed');
        }
    };

    const handleEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setShowEditor(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Zap className="w-8 h-8" />
                        <div>
                            <h2 className="text-2xl font-bold">Campaigns</h2>
                            <p className="text-indigo-100">
                                Automate AI content generation to your WordPress sites
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingCampaign(null);
                            setShowEditor(true);
                        }}
                        disabled={connectedSites === 0}
                        className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={connectedSites === 0 ? 'Connect a WordPress site first' : 'Create campaign'}
                    >
                        <Plus className="w-5 h-5" />
                        New Campaign
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{campaigns.length}</div>
                        <div className="text-sm text-neutral-500">Total Campaigns</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Play className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{activeCount}</div>
                        <div className="text-sm text-neutral-500">Active</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Pause className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{pausedCount}</div>
                        <div className="text-sm text-neutral-500">Paused</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{totalPublished}</div>
                        <div className="text-sm text-neutral-500">Posts Published</div>
                    </div>
                </div>
            </div>

            {/* No WP Sites Warning */}
            {connectedSites === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div className="text-amber-800">
                        <strong>No WordPress sites connected.</strong> Go to the{' '}
                        <span className="font-medium">WP Sites</span> tab to add a WordPress site before creating campaigns.
                    </div>
                </div>
            )}

            {/* Campaigns Grid */}
            {campaigns.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                        No campaigns yet
                    </h3>
                    <p className="text-neutral-500 mb-6">
                        Create your first campaign to start generating AI content automatically.
                    </p>
                    <button
                        onClick={() => setShowEditor(true)}
                        disabled={connectedSites === 0}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-5 h-5" />
                        Create Campaign
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaigns.map((campaign) => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            onEdit={handleEdit}
                            onRun={handleRunCampaign}
                        />
                    ))}
                </div>
            )}

            {/* Campaign Editor Modal */}
            {showEditor && (
                <CampaignEditor
                    campaign={editingCampaign}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingCampaign(null);
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// Helpers
// ============================================================================

function getSourceItems(campaign: Campaign) {
    const { source } = campaign;

    switch (source.type) {
        case 'keywords': {
            const config = source.config as import('../model/types').KeywordSourceConfig;
            return config.keywords.map((kw, i) => ({
                id: `kw_${i}`,
                topic: kw,
                sourceType: 'keywords' as const,
            }));
        }
        case 'manual': {
            const config = source.config as import('../model/types').ManualSourceConfig;
            return config.topics
                .filter(t => t.status === 'pending')
                .map(t => ({
                    id: t.id,
                    topic: t.topic,
                    sourceType: 'manual' as const,
                }));
        }
        default:
            return [];
    }
}
