'use client';

/**
 * Portfolio AdSense Widget
 * FSD: features/wordpress/ui/PortfolioAdSenseWidget.tsx
 * 
 * Shows aggregate AdSense readiness across all sites.
 * Highlights which sites need attention.
 */

import { useMemo } from 'react';
import { DollarSign, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { useWPSitesLegacy } from '../model/wpSiteStore';
import { getReadinessStatus, getApprovalProgress } from '../lib/adsenseChecker';

interface SiteReadiness {
    id: string;
    name: string;
    url: string;
    status: 'ready' | 'almost' | 'not-ready';
    percentage: number;
    criticalMissing?: string;
}

export function PortfolioAdSenseWidget() {
    const { sites } = useWPSitesLegacy();

    const siteReadiness = useMemo<SiteReadiness[]>(() => {
        return sites
            .filter(site => site.status === 'connected')
            .map(site => {
                const status = getReadinessStatus(site);
                const progress = getApprovalProgress(site);

                return {
                    id: site.id,
                    name: site.name,
                    url: site.url,
                    status: status.status,
                    percentage: progress.percentage,
                };
            });
    }, [sites]);

    const readyCount = siteReadiness.filter(s => s.status === 'ready').length;
    const almostCount = siteReadiness.filter(s => s.status === 'almost').length;
    const notReadyCount = siteReadiness.filter(s => s.status === 'not-ready').length;
    const totalCount = siteReadiness.length;

    if (totalCount === 0) {
        return null; // Don't show widget if no sites
    }

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-neutral-900">AdSense Readiness</h3>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 bg-green-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600 text-xs mb-1">
                        <CheckCircle className="w-3 h-3" />
                        Ready
                    </div>
                    <div className="font-bold text-green-700">{readyCount}</div>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-600 text-xs mb-1">
                        <TrendingUp className="w-3 h-3" />
                        Almost
                    </div>
                    <div className="font-bold text-amber-700">{almostCount}</div>
                </div>
                <div className="p-2 bg-red-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-red-600 text-xs mb-1">
                        <AlertCircle className="w-3 h-3" />
                        Work Needed
                    </div>
                    <div className="font-bold text-red-700">{notReadyCount}</div>
                </div>
            </div>

            {/* Site List (show top 5 needing work) */}
            <div className="space-y-2">
                <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide">
                    Sites Needing Attention
                </div>
                {siteReadiness
                    .filter(s => s.status !== 'ready')
                    .sort((a, b) => b.percentage - a.percentage) // Almost ready first
                    .slice(0, 5)
                    .map(site => (
                        <div
                            key={site.id}
                            className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-neutral-900 truncate">
                                    {site.name}
                                </div>
                                <div className="text-xs text-neutral-500 truncate">
                                    {site.url.replace(/^https?:\/\//, '')}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-16 bg-neutral-200 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full ${site.status === 'almost' ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${site.percentage}%` }}
                                    />
                                </div>
                                <span className="text-xs text-neutral-600 w-8 text-right">
                                    {site.percentage}%
                                </span>
                            </div>
                        </div>
                    ))}
                {siteReadiness.filter(s => s.status !== 'ready').length === 0 && (
                    <div className="text-center py-4 text-green-600">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm font-medium">All sites ready for AdSense!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
