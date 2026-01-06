'use client';

/**
 * Launch Campaign Button
 * FSD: features/hunt/ui/LaunchCampaignButton.tsx
 * 
 * Button to quickly create a campaign from Hunt domain data.
 * Uses launchWorkflow.ts to connect Hunt to Campaign.
 */

import { useState } from 'react';
import { Rocket, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { OwnedDomain } from '../model/huntStore';
import { quickLaunch, launchCampaignFromHunt, type LaunchResult } from '../lib/launchWorkflow';
import { useHuntStore } from '../model/huntStore';

interface LaunchCampaignButtonProps {
    /** Domain to create campaign for */
    domain: OwnedDomain;
    /** Target WP site ID */
    targetSiteId: string;
    /** Compact mode for table rows */
    compact?: boolean;
    /** Callback after successful launch */
    onSuccess?: (result: LaunchResult) => void;
}

export function LaunchCampaignButton({
    domain,
    targetSiteId,
    compact = false,
    onSuccess
}: LaunchCampaignButtonProps) {
    const [launching, setLaunching] = useState(false);
    const [result, setResult] = useState<LaunchResult | null>(null);

    const { selectedKeywords, selectedTrends } = useHuntStore();

    const handleLaunch = async () => {
        setLaunching(true);
        setResult(null);

        try {
            const launchResult = await launchCampaignFromHunt({
                domain,
                targetSiteId,
                keywords: selectedKeywords.slice(0, 10),
                trends: selectedTrends.slice(0, 5),
                initialArticles: 5,
                autoStart: false, // Let user review first
            });

            setResult(launchResult);

            if (launchResult.success) {
                onSuccess?.(launchResult);
            }
        } catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : 'Launch failed',
            });
        } finally {
            setLaunching(false);
        }
    };

    // Show success state
    if (result?.success) {
        return (
            <span className={`flex items-center gap-1 text-green-600 ${compact ? 'text-xs' : 'text-sm'}`}>
                <CheckCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                Campaign created
            </span>
        );
    }

    // Show error state
    if (result?.error) {
        return (
            <div className={`flex items-center gap-1 text-red-600 ${compact ? 'text-xs' : 'text-sm'}`}>
                <AlertCircle className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                <span className="truncate max-w-[150px]" title={result.error}>
                    {result.error}
                </span>
                <button
                    onClick={handleLaunch}
                    className="ml-1 text-red-700 underline hover:no-underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Normal button state
    if (compact) {
        return (
            <button
                onClick={handleLaunch}
                disabled={launching || !targetSiteId}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={!targetSiteId ? 'Site not provisioned yet' : 'Create campaign from Hunt data'}
            >
                {launching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <Rocket className="w-3 h-3" />
                )}
                Launch
            </button>
        );
    }

    return (
        <button
            onClick={handleLaunch}
            disabled={launching || !targetSiteId}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            title={!targetSiteId ? 'Create WordPress site first' : 'Create campaign from Hunt data'}
        >
            {launching ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Launching...
                </>
            ) : (
                <>
                    <Rocket className="w-4 h-4" />
                    Create Campaign
                </>
            )}
        </button>
    );
}

/**
 * Quick Launch Card - Standalone card for Hunt dashboard
 */
export function QuickLaunchCard() {
    const { ownedDomains, selectedKeywords, selectedTrends } = useHuntStore();

    // Get domains that are ready (have site created)
    const readyDomains = ownedDomains.filter(d => d.siteCreated);

    if (readyDomains.length === 0) {
        return (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-center">
                <Rocket className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">No domains ready for campaign</p>
                <p className="text-xs text-neutral-500 mt-1">
                    Purchase a domain and create a WordPress site first
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-3">
                <Rocket className="w-5 h-5 text-indigo-600" />
                Quick Launch Campaign
            </h3>

            <p className="text-sm text-neutral-600 mb-3">
                Create a campaign using your selected keywords ({selectedKeywords.length})
                and trends ({selectedTrends.length}).
            </p>

            <div className="space-y-2">
                {readyDomains.map(domain => (
                    <div
                        key={domain.domain}
                        className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg"
                    >
                        <span className="text-sm font-medium text-neutral-800">
                            {domain.domain}
                        </span>
                        {/* Note: In real usage, you'd pass the actual site ID */}
                        <LaunchCampaignButton
                            domain={domain}
                            targetSiteId={domain.domain.replace('.', '-')}
                            compact
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
