'use client';

/**
 * Campaign Card Component
 * FSD: features/campaigns/ui/CampaignCard.tsx
 */

import { useState } from 'react';
import {
    Play,
    Pause,
    Settings,
    Trash2,
    Clock,
    FileText,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Globe,
    Zap,
    Image,
} from 'lucide-react';
import type { Campaign } from '../model/types';
import { useCampaignStore } from '../model/campaignStore';
import { useWPSitesLegacy } from '@/features/wordpress/model/wpSiteStore';

interface CampaignCardProps {
    campaign: Campaign;
    onEdit?: (campaign: Campaign) => void;
    onRun?: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onEdit, onRun }: CampaignCardProps) {
    const [running, setRunning] = useState(false);
    const [retryingImages, setRetryingImages] = useState(false);
    const { pauseCampaign, resumeCampaign, deleteCampaign } = useCampaignStore();
    const { sites } = useWPSitesLegacy();

    const targetSite = sites.find(s => s.id === campaign.targetSiteId);

    const handleToggleStatus = () => {
        if (campaign.status === 'active') {
            pauseCampaign(campaign.id);
        } else {
            resumeCampaign(campaign.id);
        }
    };

    const handleRun = async () => {
        setRunning(true);
        try {
            await onRun?.(campaign);
        } finally {
            setRunning(false);
        }
    };

    const handleDelete = () => {
        if (confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) {
            deleteCampaign(campaign.id);
        }
    };

    const handleRetryImages = async () => {
        if (!targetSite || campaign.stats.totalGenerated === 0) return;

        setRetryingImages(true);

        // Get status store for visibility (like orchestrator)
        const { useGlobalActionStatusStore } = await import('@/stores/globalActionStatusStore');
        const statusStore = useGlobalActionStatusStore.getState();

        const actionId = statusStore.startAction(
            `Retry Images: ${campaign.name}`,
            'campaign',
            { source: 'user', retryable: true }
        );

        try {
            // Get campaign-specific posts from deduplication store
            const { useDeduplicationStore } = await import('@/features/campaigns/lib/deduplication');
            const { getPost } = await import('@/features/wordpress/api/wordpressApi');
            const { retryImagesForPost } = await import('@/features/campaigns');

            const findingStepId = statusStore.addStep(actionId, '⏳ Finding posts created by this campaign...', 'running');

            // Get records for THIS campaign only (SoC: only campaign's own posts)
            const campaignRecords = useDeduplicationStore.getState().getRecordsByCampaign(campaign.id);

            if (campaignRecords.length === 0) {
                statusStore.updateStep(actionId, findingStepId, '❌ No posts found', 'error');
                statusStore.failAction(actionId, 'No posts found for this campaign. Run the campaign first.');
                return;
            }

            // Get WP post IDs from campaign records
            const campaignPostIds = campaignRecords
                .filter(r => r.wpPostId)
                .map(r => r.wpPostId!);

            // Mark finding step as success
            statusStore.updateStep(actionId, findingStepId, `✅ Found ${campaignPostIds.length} posts from this campaign`, 'success');

            // Fetch each post and check if it needs images
            const postsNeedingImages: Array<{ id: number; title: string }> = [];

            for (const postId of campaignPostIds) {
                const postResult = await getPost(targetSite, postId);
                if (postResult.success && postResult.data) {
                    const post = postResult.data;
                    if (!post.featured_media || post.featured_media === 0) {
                        postsNeedingImages.push({
                            id: postId,
                            title: post.title?.rendered || 'Untitled',
                        });
                    }
                }
            }

            if (postsNeedingImages.length === 0) {
                statusStore.completeAction(actionId, '✅ All campaign posts already have featured images');
                return;
            }

            statusStore.addStep(actionId, `${postsNeedingImages.length} posts need images`, 'success');
            statusStore.setProgress(actionId, 0, postsNeedingImages.length);

            // Retry images for each post
            let updatedCount = 0;

            for (let i = 0; i < postsNeedingImages.length; i++) {
                const post = postsNeedingImages[i];
                const stepId = statusStore.addStep(actionId, `⏳ Processing: ${post.title.substring(0, 30)}...`, 'running');

                // Create onProgress handler to update GlobalActionStatus with generation details
                let lastSubStep: string | undefined;
                const onProgress = (status: { phase: string; message: string }) => {
                    // Update the step message with generation progress
                    if (status.message !== lastSubStep) {
                        lastSubStep = status.message;
                        statusStore.updateStep(actionId, stepId, `⏳ ${post.title.substring(0, 20)}... (${status.message})`, 'running');
                    }
                };

                const result = await retryImagesForPost(
                    targetSite,
                    post.id,
                    post.title,
                    campaign.aiConfig,
                    onProgress  // Pass progress handler to get generation visibility
                );

                if (result.success) {
                    updatedCount++;
                    statusStore.updateStep(actionId, stepId, `✅ ${post.title.substring(0, 30)}...`, 'success');
                } else {
                    statusStore.updateStep(actionId, stepId, `❌ ${post.title.substring(0, 30)}: ${result.error || 'Failed'}`, 'error');
                }

                statusStore.setProgress(actionId, i + 1, postsNeedingImages.length);
            }

            statusStore.completeAction(actionId, `✅ Images regenerated for ${updatedCount}/${postsNeedingImages.length} posts`);

        } catch (error) {
            statusStore.failAction(actionId, error instanceof Error ? error.message : 'Failed to retry images');
            console.error('[RetryImages]', error);
        } finally {
            setRetryingImages(false);
        }
    };

    const statusConfig = {
        active: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Active' },
        paused: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Pause, label: 'Paused' },
        draft: { color: 'text-neutral-500', bg: 'bg-neutral-50', icon: FileText, label: 'Draft' },
    };

    const status = statusConfig[campaign.status];
    const StatusIcon = status.icon;

    const sourceTypeLabels: Record<string, string> = {
        keywords: 'Keywords',
        rss: 'RSS Feed',
        trends: 'Google Trends',
        manual: 'Manual Topics',
        translation: 'Translation',
    };

    const scheduleLabel = campaign.schedule.type === 'manual'
        ? 'Manual'
        : campaign.schedule.type === 'interval'
            ? `Every ${campaign.schedule.intervalHours}h`
            : campaign.schedule.cronExpression || 'Scheduled';

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Header */}
            <div className={`px-4 py-3 ${status.bg} border-b border-neutral-200`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Zap className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900">{campaign.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <Globe className="w-3 h-3" />
                                {targetSite?.name || 'No target site'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center border-b border-neutral-100">
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">Generated</div>
                    <div className="font-bold text-neutral-900">{campaign.stats.totalGenerated}</div>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">Published</div>
                    <div className="font-bold text-green-600">{campaign.stats.totalPublished}</div>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">Failed</div>
                    <div className="font-bold text-red-600">{campaign.stats.totalFailed}</div>
                </div>
            </div>

            {/* Info */}
            <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-neutral-600">
                    <span>Source:</span>
                    <span className="font-medium text-neutral-900">
                        {sourceTypeLabels[campaign.source.type]}
                    </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                    <span>Schedule:</span>
                    <span className="font-medium text-neutral-900 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {scheduleLabel}
                    </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                    <span>Article Type:</span>
                    <span className="font-medium text-neutral-900 capitalize">
                        {campaign.aiConfig.articleType}
                    </span>
                </div>
                {campaign.schedule.lastRunAt && (
                    <div className="flex items-center justify-between text-neutral-600">
                        <span>Last Run:</span>
                        <span className="font-medium text-neutral-900">
                            {formatTimeAgo(campaign.schedule.lastRunAt)}
                        </span>
                    </div>
                )}
                {campaign.schedule.type !== 'manual' && campaign.schedule.nextRunAt && (
                    <div className="flex items-center justify-between text-neutral-600">
                        <span>Next Run:</span>
                        <span className="font-medium text-indigo-600">
                            {formatTimeUntil(campaign.schedule.nextRunAt)}
                        </span>
                    </div>
                )}
                {targetSite && campaign.stats.totalPublished >= 5 && (
                    <div className="flex items-center justify-between text-neutral-600 pt-2 border-t border-neutral-100 mt-2">
                        <span>Site AdSense:</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            Check Readiness →
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                <button
                    onClick={handleRun}
                    disabled={running || campaign.status === 'draft'}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    {running ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            Run Now
                        </>
                    )}
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleToggleStatus}
                        className={`p-2 rounded-lg transition-colors ${campaign.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-green-600 hover:bg-green-50'
                            }`}
                        title={campaign.status === 'active' ? 'Pause' : 'Resume'}
                    >
                        {campaign.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                    </button>
                    {campaign.stats.totalGenerated > 0 && (
                        <button
                            onClick={handleRetryImages}
                            disabled={retryingImages}
                            className="p-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Retry Images for Published Posts"
                        >
                            {retryingImages ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Image className="w-4 h-4" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => onEdit?.(campaign)}
                        className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimeUntil(timestamp: number): string {
    const seconds = Math.floor((timestamp - Date.now()) / 1000);

    if (seconds <= 0) return 'due now';
    if (seconds < 60) return `in ${seconds}s`;
    if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `in ${Math.floor(seconds / 3600)}h`;
    return `in ${Math.floor(seconds / 86400)}d`;
}
