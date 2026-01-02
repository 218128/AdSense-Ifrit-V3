'use client';

/**
 * WordPress Site Card Component
 * FSD: features/wordpress/ui/WPSiteCard.tsx
 * 
 * Displays a single WordPress site connection with status and actions.
 */

import { useState } from 'react';
import {
    Globe,
    RefreshCw,
    Settings,
    Trash2,
    CheckCircle,
    AlertCircle,
    Clock,
    ExternalLink,
    FileText,
    Users,
    Tag,
    ChevronDown,
    ChevronUp,
    Scale,
    Gauge,
} from 'lucide-react';
import type { WPSite } from '../model/wpSiteTypes';
import { useWPSitesLegacy } from '../model/wpSiteStore';
import { testConnection, syncSiteMetadata } from '../api/wordpressApi';
import { LegalPagesManager } from '@/components/adsense/LegalPagesManager';
import { PageSpeedCard } from '@/components/quality/PageSpeedCard';
import { SiteProfileSection } from './SiteProfileSection';

interface WPSiteCardProps {
    site: WPSite;
    onEdit?: (site: WPSite) => void;
}

export function WPSiteCard({ site, onEdit }: WPSiteCardProps) {
    const [syncing, setSyncing] = useState(false);
    const [showLegalPages, setShowLegalPages] = useState(false);
    const [showPageSpeed, setShowPageSpeed] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const { updateSiteStatus, updateSiteMetadata, removeSite } = useWPSitesLegacy();

    const handleSync = async () => {
        setSyncing(true);
        try {
            // Test connection first
            const connResult = await testConnection(site);
            if (!connResult.connected) {
                updateSiteStatus(site.id, 'error', connResult.error);
                return;
            }

            // Sync metadata
            const metadata = await syncSiteMetadata(site);
            updateSiteMetadata(site.id, metadata);
            updateSiteStatus(site.id, 'connected');
        } catch (error) {
            updateSiteStatus(site.id, 'error', error instanceof Error ? error.message : 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleDelete = () => {
        if (confirm(`Remove "${site.name}" from Ifrit? This won't delete the WordPress site.`)) {
            removeSite(site.id);
        }
    };

    const statusConfig = {
        connected: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Connected' },
        error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Error' },
        pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Pending' },
        provisioning: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Provisioning' },
    } as const;

    const status = statusConfig[site.status];
    const StatusIcon = status.icon;

    // Extract domain from URL
    const domain = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Header */}
            <div className={`px-4 py-3 ${status.bg} border-b border-neutral-200`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Globe className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900">{site.name}</h3>
                            <a
                                href={site.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-neutral-500 hover:text-blue-600 flex items-center gap-1"
                            >
                                {site.url.replace(/^https?:\/\//, '')}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center border-b border-neutral-100">
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs mb-1">
                        <FileText className="w-3 h-3" />
                        Categories
                    </div>
                    <div className="font-bold text-neutral-900">
                        {site.categories?.length ?? '-'}
                    </div>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs mb-1">
                        <Tag className="w-3 h-3" />
                        Tags
                    </div>
                    <div className="font-bold text-neutral-900">
                        {site.tags?.length ?? '-'}
                    </div>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs mb-1">
                        <Users className="w-3 h-3" />
                        Authors
                    </div>
                    <div className="font-bold text-neutral-900">
                        {site.authors?.length ?? '-'}
                    </div>
                </div>
            </div>

            {/* Site Profile Toggle */}
            <div className="border-b border-neutral-100">
                <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-indigo-500" />
                        <span>Site Profile {site.niche ? `(${site.niche})` : ''}</span>
                    </div>
                    {showProfile ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>

                {/* Expandable Site Profile Section */}
                {showProfile && (
                    <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100">
                        <SiteProfileSection site={site} />
                    </div>
                )}
            </div>

            {/* Legal Pages Toggle */}
            {site.status === 'connected' && (
                <div className="border-b border-neutral-100">
                    <button
                        onClick={() => setShowLegalPages(!showLegalPages)}
                        className="w-full px-4 py-2 flex items-center justify-between text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-violet-500" />
                            <span>Legal Pages (AdSense)</span>
                        </div>
                        {showLegalPages ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>

                    {/* Expandable Legal Pages Manager */}
                    {showLegalPages && (
                        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100">
                            <LegalPagesManager
                                site={site}
                                siteName={site.name}
                                domain={domain}
                                niche={site.niche || 'general'}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* PageSpeed Toggle */}
            {site.status === 'connected' && (
                <div className="border-b border-neutral-100">
                    <button
                        onClick={() => setShowPageSpeed(!showPageSpeed)}
                        className="w-full px-4 py-2 flex items-center justify-between text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-blue-500" />
                            <span>PageSpeed / Core Web Vitals</span>
                        </div>
                        {showPageSpeed ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>

                    {/* Expandable PageSpeed Card */}
                    {showPageSpeed && (
                        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100">
                            <PageSpeedCard url={site.url} />
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="text-xs text-neutral-400">
                    {site.syncedAt ? `Synced ${new Date(site.syncedAt).toLocaleDateString()}` : 'Not synced'}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Sync categories, tags, authors"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => onEdit?.(site)}
                        className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Edit connection"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove site"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

