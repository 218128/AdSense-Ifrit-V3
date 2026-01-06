'use client';

/**
 * Legal Pages Manager Component
 * FSD: components/adsense/LegalPagesManager.tsx
 * 
 * Allows users to generate and publish legal pages to their WordPress site.
 * Now includes Complianz plugin installation via Hostinger MCP with SSE tracking.
 */

import { useState, useEffect } from 'react';
import { FileText, Check, Loader2, AlertCircle, ExternalLink, RefreshCw, Shield, Download } from 'lucide-react';
import type { WPSite } from '@/features/wordpress/model/types';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePluginSync } from '@/features/wordpress/hooks/usePluginSync';

interface LegalPagesManagerProps {
    site: WPSite;
    siteName: string;
    domain: string;
    niche?: string;
}

interface PageStatus {
    exists: boolean;
    id?: number;
    url?: string;
    generating?: boolean;
    error?: string;
}

const LEGAL_PAGES = [
    { type: 'privacy', title: 'Privacy Policy', slug: 'privacy-policy', icon: '🔒', required: true },
    { type: 'terms', title: 'Terms of Service', slug: 'terms-of-service', icon: '📜', required: true },
    { type: 'about', title: 'About Us', slug: 'about', icon: '👤', required: true },
    { type: 'contact', title: 'Contact', slug: 'contact', icon: '✉️', required: true },
    { type: 'disclaimer', title: 'Disclaimer', slug: 'disclaimer', icon: '⚠️', required: false },
];

export function LegalPagesManager({ site, siteName, domain, niche = 'general' }: LegalPagesManagerProps) {
    const [pageStatuses, setPageStatuses] = useState<Record<string, PageStatus>>({});
    const [loading, setLoading] = useState(false);
    const [contactEmail, setContactEmail] = useState('');

    // Get API key from settings
    const providerKeys = useSettingsStore(state => state.providerKeys);
    const geminiKeys = providerKeys.gemini || [];
    const apiKey = geminiKeys[0]?.key || '';

    // Plugin sync hook for Complianz detection & install
    const {
        detectedFeatures,
        syncing,
        syncPlugins,
        installPlugin,
        installingPlugin
    } = usePluginSync(site);

    // Auto-sync on mount if site has Hostinger integration
    useEffect(() => {
        if (site.hostingerAccountId && !detectedFeatures) {
            syncPlugins();
        }
    }, [site.hostingerAccountId, detectedFeatures, syncPlugins]);

    // Check existing pages
    const checkExistingPages = async () => {
        setLoading(true);
        try {
            // Use POST to avoid exposing credentials in URL/logs
            const res = await fetch('/api/legal-pages/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteUrl: site.url,
                    username: site.username,
                    appPassword: site.appPassword,
                }),
            });
            const data = await res.json();

            if (data.success && data.pages) {
                const statuses: Record<string, PageStatus> = {};
                for (const [slug, info] of Object.entries(data.pages)) {
                    const pageInfo = info as { exists: boolean; id?: number; url?: string };
                    statuses[slug] = {
                        exists: pageInfo.exists,
                        id: pageInfo.id,
                        url: pageInfo.url,
                    };
                }
                setPageStatuses(statuses);
            }
        } catch (err) {
            console.error('Failed to check pages:', err);
        } finally {
            setLoading(false);
        }
    };

    // Generate and publish a single page
    const generatePage = async (pageType: string) => {
        if (!contactEmail) {
            alert('Please enter a contact email first');
            return;
        }

        setPageStatuses(prev => ({
            ...prev,
            [LEGAL_PAGES.find(p => p.type === pageType)?.slug || '']: { exists: false, generating: true },
        }));

        try {
            const res = await fetch('/api/legal-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageType,
                    siteInfo: {
                        siteName,
                        domain,
                        niche,
                        contactEmail,
                    },
                    wpSite: site,
                    apiKey,
                    provider: 'gemini',
                    publishStatus: 'publish',
                }),
            });

            const data = await res.json();
            const slug = LEGAL_PAGES.find(p => p.type === pageType)?.slug || '';

            if (data.success) {
                setPageStatuses(prev => ({
                    ...prev,
                    [slug]: { exists: true, id: data.wordpressId, url: data.url },
                }));
            } else {
                setPageStatuses(prev => ({
                    ...prev,
                    [slug]: { exists: false, error: data.error },
                }));
            }
        } catch (err) {
            console.error('Generate failed:', err);
        }
    };

    // Generate all missing pages
    const generateAllPages = async () => {
        if (!contactEmail) {
            alert('Please enter a contact email first');
            return;
        }

        for (const page of LEGAL_PAGES) {
            const status = pageStatuses[page.slug];
            if (!status?.exists) {
                await generatePage(page.type);
                // Small delay between generations
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    };

    // Handle Complianz install
    const handleInstallComplianz = async () => {
        await installPlugin('complianz-gdpr', 'Complianz GDPR');
    };

    const completedCount = Object.values(pageStatuses).filter(s => s.exists).length;
    const hasComplianz = detectedFeatures?.hasComplianz ?? false;
    const canInstallPlugin = !!site.hostingerAccountId;

    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900">Legal Pages</h3>
                        <p className="text-sm text-neutral-500">Required for AdSense approval</p>
                    </div>
                </div>
                <button
                    onClick={checkExistingPages}
                    disabled={loading}
                    className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
                    title="Check existing pages"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Progress */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600">Progress</span>
                    <span className="font-medium">{completedCount}/{LEGAL_PAGES.length}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-violet-600 rounded-full transition-all"
                        style={{ width: `${(completedCount / LEGAL_PAGES.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Contact Email Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Contact Email (for legal pages)
                </label>
                <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@yourdomain.com"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                />
            </div>

            {/* Pages List */}
            <div className="space-y-2 mb-4">
                {LEGAL_PAGES.map(page => {
                    const status = pageStatuses[page.slug] || { exists: false };

                    return (
                        <div
                            key={page.type}
                            className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{page.icon}</span>
                                <div>
                                    <span className="font-medium text-sm">{page.title}</span>
                                    {page.required && (
                                        <span className="ml-2 text-xs text-red-500">Required</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {status.generating ? (
                                    <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                                ) : status.exists ? (
                                    <>
                                        <Check className="w-4 h-4 text-green-600" />
                                        {status.url && (
                                            <a
                                                href={status.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-violet-600 hover:underline"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </>
                                ) : status.error ? (
                                    <div className="flex items-center gap-1 text-red-500">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs">Failed</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => generatePage(page.type)}
                                        disabled={!apiKey || status.generating}
                                        className="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                                    >
                                        Generate
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Generate All Button */}
            <button
                onClick={generateAllPages}
                disabled={!apiKey || !contactEmail || loading}
                className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium text-sm"
            >
                Generate All Missing Pages
            </button>

            {/* Complianz Plugin Section - Dynamic based on detection */}
            <div className={`mt-4 p-4 rounded-lg border ${hasComplianz
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                <div className="flex items-start gap-3">
                    <Shield className={`w-5 h-5 mt-0.5 ${hasComplianz ? 'text-green-600' : 'text-amber-600'}`} />
                    <div className="flex-1">
                        {hasComplianz ? (
                            <>
                                <p className="text-sm font-medium text-green-800">
                                    ✅ Complianz GDPR Active
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    Cookie consent & privacy compliance configured
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-amber-800">
                                    Cookie Consent Required
                                </p>
                                <p className="text-xs text-amber-600 mt-1">
                                    GDPR/CCPA compliance is required for AdSense
                                </p>
                                {canInstallPlugin ? (
                                    <button
                                        onClick={handleInstallComplianz}
                                        disabled={installingPlugin === 'complianz-gdpr' || syncing}
                                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                                    >
                                        {installingPlugin === 'complianz-gdpr' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Installing...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4" />
                                                Install Complianz GDPR
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <a
                                        href="https://wordpress.org/plugins/complianz-gdpr/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-sm text-amber-700 hover:underline"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Install from WordPress.org
                                    </a>
                                )}
                            </>
                        )}
                    </div>
                    {!hasComplianz && detectedFeatures === null && (
                        <button
                            onClick={syncPlugins}
                            disabled={syncing}
                            className="text-amber-600 hover:text-amber-700"
                            title="Sync plugins"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

