'use client';

/**
 * Ifrit Plugin Section
 * FSD: features/wordpress/ui/IfritPluginSection.tsx
 * 
 * Shows Ifrit Connector plugin status and controls inside WPSiteCard.
 * - Download plugin ZIP
 * - Input/display API token
 * - Check plugin health
 * - Configure webhook
 */

import { useState, useCallback } from 'react';
import {
    Download,
    Key,
    CheckCircle,
    XCircle,
    RefreshCw,
    Copy,
    Eye,
    EyeOff,
    Plug,
    Loader2,
} from 'lucide-react';
import type { WPSite } from '../model/wpSiteTypes';
import { useWPSitesLegacy } from '../model/wpSiteStore';
import { checkPluginHealth, setPluginWebhookUrl } from '../api/ifritPluginApi';

interface IfritPluginSectionProps {
    site: WPSite;
}

export function IfritPluginSection({ site }: IfritPluginSectionProps) {
    const [tokenInput, setTokenInput] = useState(site.ifritToken || '');
    const [showToken, setShowToken] = useState(false);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pluginStatus, setPluginStatus] = useState<'unknown' | 'active' | 'inactive'>('unknown');
    const [pluginVersion, setPluginVersion] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { updateSite } = useWPSitesLegacy();

    // Check if plugin is active
    const handleCheckPlugin = useCallback(async () => {
        if (!tokenInput) {
            setError('Please enter the API token first');
            return;
        }

        // Validate site URL exists (form saves as 'url', API expects 'siteUrl')
        const siteUrl = site.url || site.siteUrl;
        if (!siteUrl) {
            setError('Site URL is not configured. Please edit the site and add your WordPress URL.');
            return;
        }

        setChecking(true);
        setError(null);

        try {
            const result = await checkPluginHealth({
                ...site,
                siteUrl: siteUrl,  // Explicitly pass resolved URL
                ifritToken: tokenInput,
            });

            // Check if result exists and plugin is active
            if (result && result.active) {
                setPluginStatus('active');
                setPluginVersion(result.version || 'unknown');

                // Save token to site
                updateSite(site.id, {
                    ifritToken: tokenInput,
                    ifritPluginActive: true,
                    ifritPluginVersion: result.version,
                });

                // Configure webhook URL
                try {
                    const webhookUrl = `${window.location.origin}/api/webhooks/wordpress`;
                    await setPluginWebhookUrl({ ...site, siteUrl, ifritToken: tokenInput }, webhookUrl);
                    updateSite(site.id, { ifritWebhookConfigured: true });
                } catch {
                    console.warn('[IfritPlugin] Webhook configuration failed');
                }
            } else if (result && !result.active) {
                setPluginStatus('inactive');
                setError('Plugin installed but not active');
            } else {
                setPluginStatus('inactive');
                setError('Could not connect to WordPress site. Check the token and site URL.');
            }
        } catch (err) {
            setPluginStatus('inactive');
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setChecking(false);
        }
    }, [site, tokenInput, updateSite]);

    // Save token
    const handleSaveToken = async () => {
        if (!tokenInput) return;

        setSaving(true);
        updateSite(site.id, { ifritToken: tokenInput });

        // Verify immediately
        await handleCheckPlugin();
        setSaving(false);
    };

    // Copy token
    const handleCopyToken = () => {
        if (tokenInput) {
            navigator.clipboard.writeText(tokenInput);
        }
    };

    // Download plugin
    const handleDownload = () => {
        // The plugin ZIP should be served from public folder or API
        window.open('/api/plugin/ifrit-connector.zip', '_blank');
    };

    return (
        <div className="space-y-4">
            {/* Header with status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Plug className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-sm">Ifrit Connector Plugin</span>
                </div>
                <div className="flex items-center gap-2">
                    {pluginStatus === 'active' && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Active {pluginVersion && `v${pluginVersion}`}
                        </span>
                    )}
                    {pluginStatus === 'inactive' && site.ifritToken && (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Inactive
                        </span>
                    )}
                </div>
            </div>

            {/* Download section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                    <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-blue-800 font-medium">Step 1: Install Plugin</p>
                        <p className="text-xs text-blue-600 mt-1">
                            Download and install the Ifrit Connector plugin on your WordPress site.
                        </p>
                        <button
                            onClick={handleDownload}
                            className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                            <Download className="w-3 h-3" />
                            Download Plugin (.zip)
                        </button>
                    </div>
                </div>
            </div>

            {/* Token input section */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-neutral-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-neutral-800 font-medium">Step 2: Enter API Token</p>
                        <p className="text-xs text-neutral-600 mt-1">
                            Copy the token from WordPress → Settings → Ifrit Connector
                        </p>

                        {/* Token input field */}
                        <div className="mt-2 flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type={showToken ? 'text' : 'password'}
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    placeholder="Paste API token here..."
                                    className="w-full px-3 py-2 pr-16 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                        onClick={() => setShowToken(!showToken)}
                                        className="p-1 text-neutral-400 hover:text-neutral-600"
                                        title={showToken ? 'Hide token' : 'Show token'}
                                    >
                                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    {tokenInput && (
                                        <button
                                            onClick={handleCopyToken}
                                            className="p-1 text-neutral-400 hover:text-neutral-600"
                                            title="Copy token"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={handleSaveToken}
                                disabled={!tokenInput || saving}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                                Save & Verify
                            </button>
                            <button
                                onClick={handleCheckPlugin}
                                disabled={!tokenInput || checking}
                                className="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                {checking && <Loader2 className="w-3 h-3 animate-spin" />}
                                <RefreshCw className="w-3 h-3" />
                                Check Status
                            </button>
                        </div>

                        {/* Error message */}
                        {error && (
                            <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Success message */}
            {site.ifritPluginActive && site.ifritWebhookConfigured && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Plugin connected and webhook configured!</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                        Ifrit will receive real-time updates when posts are published.
                    </p>
                </div>
            )}
        </div>
    );
}
