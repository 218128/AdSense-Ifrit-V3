'use client';

/**
 * Hostinger Health Dashboard
 * 
 * Displays health status of all Hostinger-managed WordPress sites.
 * Shows site status, SSL info, and quick actions.
 */

import { useState, useEffect } from 'react';
import {
    Server,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Clock,
    Globe,
    Shield,
    HardDrive,
    ExternalLink,
    Loader2,
    UserPlus,
    LinkIcon
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWPSitesLegacy } from '@/features/wordpress/model/wpSiteStore';

interface SiteHealth {
    id: string;
    domain: string;
    status: 'active' | 'suspended' | 'pending' | 'unknown';
    type: string;
    datacenter?: string;
    createdAt?: string;
    ssl?: {
        status: 'active' | 'pending' | 'expired' | 'unknown';
        expiresAt?: string;
    };
    // New fields for dynamic status
    domainConnected?: boolean;
    wpInstalled?: boolean;
}

interface HealthData {
    success: boolean;
    sites?: SiteHealth[];
    summary?: {
        total: number;
        active: number;
        pending: number;
        sslIssues: number;
    };
    error?: string;
    lastChecked: string;
}

export function HostingerHealthDashboard() {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectingDomain, setConnectingDomain] = useState<string | null>(null);

    const { mcpServers } = useSettingsStore();
    const apiKey = mcpServers?.apiKeys?.hostinger || '';

    // WP Sites store for checking if site is already connected
    const { sites: wpSites, addSite } = useWPSitesLegacy();

    // Check if a domain is already in WP Sites
    const isAlreadyConnected = (domain: string) => {
        return wpSites.some(s => s.url.includes(domain) || s.name === domain);
    };

    // Get the type display - dynamic not static
    const getTypeDisplay = (site: SiteHealth) => {
        if (site.wpInstalled === false) return { text: 'Hosting Only', color: 'bg-gray-100 text-gray-600' };
        if (site.domainConnected === false) return { text: 'Domain Pending', color: 'bg-amber-100 text-amber-700' };
        return { text: site.type || 'Website', color: 'bg-blue-100 text-blue-700' };
    };

    // Handle connecting a site to WP Sites store
    const handleConnectSite = (domain: string) => {
        setConnectingDomain(domain);
        // Add to WP Sites store with empty credentials
        addSite({
            name: domain,
            url: `https://${domain}`,
            username: '',
            appPassword: '',
        });
        setConnectingDomain(null);
        alert(`${domain} added to WordPress Sites. Please add WP credentials to enable publishing features.`);
    };

    const fetchHealth = async () => {
        if (!apiKey) {
            setError('Hostinger API key not configured. Go to Settings → MCP Tools');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use POST to avoid exposing API key in URL/logs
            const response = await fetch('/api/hosting/health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
            });
            const data: HealthData = await response.json();

            if (data.success) {
                setHealthData(data);
            } else {
                setError(data.error || 'Failed to fetch health data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (apiKey) {
            fetchHealth();
        }
    }, [apiKey]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-amber-600 bg-amber-100';
            case 'suspended': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-4 h-4" />;
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'suspended': return <AlertCircle className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };

    // No API key configured
    if (!apiKey) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-medium text-amber-800">Hostinger Not Connected</h3>
                <p className="text-sm text-amber-600 mt-1">
                    Add your Hostinger API key in Settings → MCP Tools to monitor your sites.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Hostinger Sites</h3>
                </div>
                <button
                    onClick={fetchHealth}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-red-700 font-medium">Connection Error</p>
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && !healthData && (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <Loader2 className="w-8 h-8 text-purple-500 mx-auto animate-spin mb-2" />
                    <p className="text-sm text-gray-500">Checking Hostinger status...</p>
                </div>
            )}

            {/* Summary Cards */}
            {healthData?.summary && (
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-gray-900">{healthData.summary.total}</div>
                        <div className="text-xs text-gray-500">Total Sites</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-600">{healthData.summary.active}</div>
                        <div className="text-xs text-gray-500">Active</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-amber-600">{healthData.summary.pending}</div>
                        <div className="text-xs text-gray-500">Pending</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-600">{healthData.summary.sslIssues}</div>
                        <div className="text-xs text-gray-500">SSL Issues</div>
                    </div>
                </div>
            )}

            {/* Sites List */}
            {healthData?.sites && healthData.sites.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {healthData.sites.map((site, index) => {
                            const typeDisplay = getTypeDisplay(site);
                            const connected = isAlreadyConnected(site.domain);

                            return (
                                <div key={site.id || site.domain || `site-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                                    {/* Domain Warning */}
                                    {site.domainConnected === false && (
                                        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-700">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>Domain not connected. Point nameservers to Hostinger.</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(site.status)}`}>
                                                {getStatusIcon(site.status)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{site.domain}</div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    {/* Dynamic Type Badge */}
                                                    <span className={`px-1.5 py-0.5 rounded ${typeDisplay.color}`}>
                                                        {typeDisplay.text}
                                                    </span>
                                                    {site.datacenter && (
                                                        <>
                                                            <span className="text-gray-400">•</span>
                                                            <span className="text-gray-500">{site.datacenter}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* SSL Badge */}
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${site.ssl?.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                <Shield className="w-3 h-3" />
                                                SSL
                                            </div>

                                            {/* Connect to WP Sites Button */}
                                            {connected ? (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                                    <CheckCircle className="w-3 h-3" />
                                                    WP Connected
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnectSite(site.domain)}
                                                    disabled={connectingDomain === site.domain}
                                                    className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs transition-colors disabled:opacity-50"
                                                    title="Add to WordPress Sites for campaigns"
                                                >
                                                    <UserPlus className="w-3 h-3" />
                                                    Connect WP
                                                </button>
                                            )}

                                            {/* External Links */}
                                            <a
                                                href={`https://${site.domain}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Visit site"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {healthData?.sites?.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <Globe className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-700">No Hostinger Sites</h4>
                    <p className="text-sm text-gray-500 mt-1">
                        Create your first site from the Hunt tab.
                    </p>
                </div>
            )}

            {/* Last Checked */}
            {healthData?.lastChecked && (
                <div className="text-xs text-gray-400 text-right">
                    Last checked: {new Date(healthData.lastChecked).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}

export default HostingerHealthDashboard;
