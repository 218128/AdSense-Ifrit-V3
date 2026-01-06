'use client';

/**
 * Site Health Widget
 * FSD: features/wordpress/ui/SiteHealthWidget.tsx
 * 
 * Shows plugin health status with actionable items.
 * Users see: "All good, keep posting" or specific problems to fix.
 */

import { useState, useEffect } from 'react';
import {
    CheckCircle,
    AlertTriangle,
    XCircle,
    RefreshCw,
    Download,
    ExternalLink,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import type { WPSite } from '../model/wpSiteTypes';
import { usePluginSync } from '../hooks/usePluginSync';
import {
    checkSiteHealth,
    getCategoryIcon,
    getSeverityStyle,
    type SiteHealthReport,
    type PluginHealthCheck,
} from '../lib/pluginMonitor';

interface SiteHealthWidgetProps {
    site: WPSite;
    compact?: boolean;
}

export function SiteHealthWidget({ site, compact = false }: SiteHealthWidgetProps) {
    const [report, setReport] = useState<SiteHealthReport | null>(null);
    const [expanded, setExpanded] = useState(!compact);

    const {
        plugins,
        detectedFeatures,
        syncing,
        syncPlugins,
        installPlugin,
        installingPlugin,
    } = usePluginSync(site);

    // Generate report when plugins change
    useEffect(() => {
        if (site.status === 'connected') {
            const newReport = checkSiteHealth(site, plugins, detectedFeatures);
            setReport(newReport);
        }
    }, [site, plugins, detectedFeatures]);

    // Initial sync on mount
    useEffect(() => {
        if (site.status === 'connected' && plugins.length === 0) {
            syncPlugins();
        }
    }, [site.status]); // eslint-disable-line

    const handleInstall = async (check: PluginHealthCheck) => {
        if (check.action?.type === 'install' && check.action.pluginSlug) {
            await installPlugin(check.action.pluginSlug, check.categoryLabel);
        }
    };

    if (!report) {
        return (
            <div className="p-4 bg-neutral-50 rounded-lg animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-neutral-200 rounded w-3/4" />
            </div>
        );
    }

    const statusStyle = getSeverityStyle(report.overallStatus);

    // Compact mode - just show summary
    if (compact && !expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className={`w-full p-3 rounded-lg border ${statusStyle.bg} border-neutral-200 flex items-center justify-between hover:shadow-sm transition-shadow`}
            >
                <div className="flex items-center gap-2">
                    <span>{statusStyle.icon}</span>
                    <span className={`text-sm font-medium ${statusStyle.text}`}>
                        {report.overallStatus === 'ok' ? 'Plugins Healthy' : report.summary}
                    </span>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className={`px-4 py-3 ${statusStyle.bg} border-b border-neutral-200`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{statusStyle.icon}</span>
                        <div>
                            <h3 className={`font-semibold ${statusStyle.text}`}>
                                {report.overallStatus === 'ok' ? 'Ready to Publish' : 'Action Required'}
                            </h3>
                            <p className="text-xs text-neutral-600">{report.summary}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => syncPlugins()}
                            disabled={syncing}
                            className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-white/50 rounded transition-colors"
                            title="Refresh plugin status"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        </button>
                        {compact && (
                            <button
                                onClick={() => setExpanded(false)}
                                className="p-1.5 text-neutral-500 hover:text-neutral-700"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Checks List */}
            <div className="divide-y divide-neutral-100">
                {report.checks.map((check) => {
                    const style = getSeverityStyle(check.severity);
                    const isInstalling = installingPlugin === check.action?.pluginSlug;

                    return (
                        <div
                            key={check.category}
                            className="px-4 py-3 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{getCategoryIcon(check.category)}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-neutral-900">
                                            {check.categoryLabel}
                                        </span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                                            {check.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-500">{check.message}</p>
                                </div>
                            </div>

                            {check.action && check.severity !== 'ok' && (
                                <button
                                    onClick={() => handleInstall(check)}
                                    disabled={isInstalling}
                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                                >
                                    {isInstalling ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : check.action.type === 'install' ? (
                                        <Download className="w-3 h-3" />
                                    ) : (
                                        <ExternalLink className="w-3 h-3" />
                                    )}
                                    {check.action.label}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            {report.overallStatus === 'ok' && (
                <div className="px-4 py-3 bg-green-50 border-t border-green-100">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        All systems go! Keep publishing content.
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Compact inline badge for site cards
 */
export function SiteHealthBadge({ site }: { site: WPSite }) {
    const { plugins, detectedFeatures } = usePluginSync(site);
    const report = checkSiteHealth(site, plugins, detectedFeatures);
    const style = getSeverityStyle(report.overallStatus);

    return (
        <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
            title={report.summary}
        >
            {style.icon} {report.overallStatus === 'ok' ? 'Healthy' : `${report.checks.filter(c => c.severity !== 'ok').length} issues`}
        </span>
    );
}
