'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Lock, Globe, DollarSign, Key, Zap, Link2, Image, Layout, Share2 } from 'lucide-react';
import { AIKeyManager } from './AIKeyManager';
// Archived: CacheStatusPanel, AIUsagePanel (moved to _archive/)
import TemplatesPanel from './TemplatesPanel';
import RepublishPanel from './RepublishPanel';
import { HealthStatusIndicator } from './HealthStatusIndicator';
import { useSettingsStore } from '@/stores/settingsStore';
import { checkGitHubHealth, checkVercelHealth, type ServiceHealth } from '@/lib/config/healthMonitor';

/**
 * Safe localStorage getter that works with SSR
 */
function getStorageItem(key: string): string {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(key) || '';
    }
    return '';
}

export interface UserSettings {
    geminiKey: string;
    blogUrl: string;
    adsensePublisherId: string;
    adsenseLeaderboardSlot: string;
    adsenseArticleSlot: string;
    adsenseMultiplexSlot: string;
}

export function getUserSettings(): UserSettings {
    return {
        geminiKey: getStorageItem('GEMINI_API_KEY'),
        blogUrl: getStorageItem('USER_BLOG_URL'),
        adsensePublisherId: getStorageItem('ADSENSE_PUBLISHER_ID'),
        adsenseLeaderboardSlot: getStorageItem('ADSENSE_LEADERBOARD_SLOT'),
        adsenseArticleSlot: getStorageItem('ADSENSE_ARTICLE_SLOT'),
        adsenseMultiplexSlot: getStorageItem('ADSENSE_MULTIPLEX_SLOT'),
    };
}

/**
 * Get all AI provider keys from localStorage
 */
export function getAIProviderKeys(): { gemini: string[]; deepseek: string[]; openrouter: string[]; vercel: string[]; perplexity: string[] } {
    const result = {
        gemini: [] as string[],
        deepseek: [] as string[],
        openrouter: [] as string[],
        vercel: [] as string[],
        perplexity: [] as string[],
    };

    if (typeof window === 'undefined') return result;

    const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'] as const;

    for (const provider of providers) {
        const stored = localStorage.getItem(`ifrit_${provider}_keys`);
        if (stored) {
            try {
                const keys = JSON.parse(stored);
                result[provider] = keys.map((k: { key: string }) => k.key);
            } catch {
                result[provider] = [];
            }
        }

        // Also check legacy single key format
        const legacyKey = localStorage.getItem(`ifrit_${provider}_key`);
        if (legacyKey && !result[provider].includes(legacyKey)) {
            result[provider].push(legacyKey);
        }

        // For Gemini, also check the original GEMINI_API_KEY
        if (provider === 'gemini') {
            const originalKey = localStorage.getItem('GEMINI_API_KEY');
            if (originalKey && !result.gemini.includes(originalKey)) {
                result.gemini.push(originalKey);
            }
        }
    }

    return result;
}

/**
 * Get list of enabled AI providers
 */
export function getEnabledProviders(): string[] {
    if (typeof window === 'undefined') return ['gemini']; // Default for SSR

    const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
    const enabled: string[] = [];

    for (const provider of providers) {
        const stored = localStorage.getItem(`ifrit_${provider}_enabled`);
        // Default: Only Gemini is enabled
        const isEnabled = stored !== null ? stored === 'true' : provider === 'gemini';
        if (isEnabled) {
            enabled.push(provider);
        }
    }

    return enabled;
}

/**
 * Get AI provider keys filtered by enabled status
 */
export function getEnabledProviderKeys(): { gemini: string[]; deepseek: string[]; openrouter: string[]; vercel: string[]; perplexity: string[] } {
    const allKeys = getAIProviderKeys();
    const enabledProviders = getEnabledProviders();

    return {
        gemini: enabledProviders.includes('gemini') ? allKeys.gemini : [],
        deepseek: enabledProviders.includes('deepseek') ? allKeys.deepseek : [],
        openrouter: enabledProviders.includes('openrouter') ? allKeys.openrouter : [],
        vercel: enabledProviders.includes('vercel') ? allKeys.vercel : [],
        perplexity: enabledProviders.includes('perplexity') ? allKeys.perplexity : [],
    };
}

/**
 * V4: Get selected model for a provider (used by content generation)
 */
export function getSelectedModel(provider: string = 'gemini'): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem(`ifrit_${provider}_model`) || undefined;
}


type SettingsTab = 'ai' | 'usage' | 'images' | 'templates' | 'blog' | 'adsense' | 'integrations' | 'backup' | 'republish';

interface SettingsModalProps {
    inline?: boolean;
}

export default function SettingsModal({ inline = false }: SettingsModalProps) {
    const [isOpen, setIsOpen] = useState(inline); // Auto-open if inline
    const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

    // Use store for all settings
    const store = useSettingsStore();
    const { integrations, adsenseConfig, blogUrl, setIntegration, setAdsenseConfig, setBlogUrl, backupToServer, restoreFromServer, exportSettings, importSettings, initialize } = store;

    // UI-only state for testing indicators
    const [testingGithub, setTestingGithub] = useState(false);
    const [testingVercel, setTestingVercel] = useState(false);

    // Health status state
    const [githubHealth, setGithubHealth] = useState<ServiceHealth | undefined>();
    const [vercelHealth, setVercelHealth] = useState<ServiceHealth | undefined>();

    // Health check callbacks
    const handleCheckGitHubHealth = useCallback(async () => {
        const health = await checkGitHubHealth(integrations.githubToken);
        setGithubHealth(health);
        store.setHealthStatus('integration:github', health);
        return health;
    }, [integrations.githubToken, store]);

    const handleCheckVercelHealth = useCallback(async () => {
        const health = await checkVercelHealth(integrations.vercelToken);
        setVercelHealth(health);
        store.setHealthStatus('integration:vercel', health);
        return health;
    }, [integrations.vercelToken, store]);

    // Initialize store and restore from server on mount (if needed)
    useEffect(() => {
        initialize();
        // Try server restore if store is empty
        if (!integrations.githubToken && !adsenseConfig.publisherId) {
            restoreFromServer();
        }
    }, []);

    // Auto-check health status on mount when tokens exist
    useEffect(() => {
        // Auto-check GitHub health if token exists but no current health status
        if (integrations.githubToken && !githubHealth) {
            handleCheckGitHubHealth();
        }

        // Auto-check Vercel health if token exists but no current health status
        if (integrations.vercelToken && !vercelHealth) {
            handleCheckVercelHealth();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [integrations.githubToken, integrations.vercelToken]);

    const handleSave = async () => {
        await backupToServer();
        if (!inline) {
            setIsOpen(false);
        }
        alert('Settings saved!');
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'ai', label: 'AI Providers', icon: <Zap className="w-4 h-4" /> },
        // Archived: usage tab (replaced by external dashboard links in AI Providers)
        { id: 'images', label: 'Images', icon: <Image className="w-4 h-4" /> },
        { id: 'templates', label: 'Templates', icon: <Layout className="w-4 h-4" /> },
        { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> },
        { id: 'republish', label: 'Republish', icon: <Share2 className="w-4 h-4" /> },
        // Archived: blog tab (legacy single-blog setting, not needed for multi-website architecture)
        { id: 'adsense', label: 'AdSense', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'backup', label: 'Backup', icon: <Key className="w-4 h-4" /> },
    ];

    // Export all settings to downloadable file
    const handleExportSettings = () => {
        const exportData = exportSettings();
        if (Object.keys(exportData.settings).length === 0) {
            alert('No settings to export. Please configure some API keys first.');
            return;
        }
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ifrit-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import settings from file
    const handleImportSettings = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const result = importSettings(data);
                if (result.success) {
                    await backupToServer();
                    alert(`Restored ${result.restored} settings! Please refresh the page.`);
                    window.location.reload();
                } else {
                    alert('Invalid settings file format');
                }
            } catch (err) {
                console.error('Import failed:', err);
                alert('Failed to import settings. Invalid file format.');
            }
        };
        input.click();
    };

    // Shared tab content renderer - used by both inline and modal versions
    const renderTabContent = () => (
        <>
            {/* AI Providers Tab */}
            {activeTab === 'ai' && (
                <div>
                    <p className="text-sm text-neutral-500 mb-4">
                        Add API keys for AI providers. Keys are rotated automatically during content generation.
                    </p>
                    <AIKeyManager />
                </div>
            )}

            {/* Archived: usage tab (CacheStatusPanel, AIUsagePanel, BarChart3) - use external dashboards */}

            {/* Images Tab */}
            {activeTab === 'images' && (
                <div className="space-y-6">
                    <p className="text-sm text-neutral-500">
                        Configure stock photo APIs for auto-fetching article cover images.
                    </p>

                    {/* Unsplash */}
                    <div className="p-4 bg-gradient-to-br from-neutral-800 to-neutral-850 rounded-xl">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                            📷 Unsplash API
                        </h4>
                        <p className="text-xs text-neutral-400 mb-3">
                            Free tier: 50 requests/hour. Get your key at{' '}
                            <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 hover:underline">unsplash.com/developers</a>
                        </p>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Access Key</label>
                            <input
                                type="password"
                                value={integrations.unsplashKey}
                                onChange={(e) => setIntegration('unsplashKey', e.target.value)}
                                placeholder="Enter Unsplash Access Key"
                                className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded text-sm text-white"
                            />
                        </div>
                    </div>

                    {/* Pexels */}
                    <div className="p-4 bg-gradient-to-br from-neutral-800 to-neutral-850 rounded-xl">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                            🖼️ Pexels API (Backup)
                        </h4>
                        <p className="text-xs text-neutral-400 mb-3">
                            More generous limits. Get your key at{' '}
                            <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 hover:underline">pexels.com/api</a>
                        </p>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">API Key</label>
                            <input
                                type="password"
                                value={integrations.pexelsKey}
                                onChange={(e) => setIntegration('pexelsKey', e.target.value)}
                                placeholder="Enter Pexels API Key"
                                className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded text-sm text-white"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={() => {
                            backupToServer();
                            alert('Image API settings saved!');
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                    >
                        Save Image Settings
                    </button>
                </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <TemplatesPanel />
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className="space-y-6">
                    <p className="text-sm text-neutral-500">
                        Configure external APIs for website management and domain hunting.
                    </p>

                    {/* GitHub & Vercel (Required for Websites) */}
                    <div className="p-4 bg-neutral-800 rounded-xl text-white">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            🔗 GitHub & Vercel (Required for Websites)
                        </h4>
                        <p className="text-xs text-neutral-300 mb-4">
                            Required to create and deploy websites. Tokens are stored locally in your browser.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* GitHub */}
                            <div className="p-3 bg-neutral-700 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-sm">GitHub</span>
                                    <div className="ml-auto">
                                        {integrations.githubToken ? (
                                            <HealthStatusIndicator
                                                serviceId="integration:github"
                                                serviceName="GitHub"
                                                health={githubHealth}
                                                onCheck={handleCheckGitHubHealth}
                                                size="sm"
                                            />
                                        ) : (
                                            <span className="text-xs text-gray-400">Not configured</span>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="password"
                                    value={integrations.githubToken}
                                    onChange={(e) => setIntegration('githubToken', e.target.value)}
                                    placeholder="ghp_xxxx or github_pat_xxxx"
                                    className="w-full px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg text-sm text-white placeholder-neutral-400 mb-2"
                                />
                                <button
                                    onClick={async () => {
                                        if (!integrations.githubToken) return;
                                        setTestingGithub(true);
                                        try {
                                            const res = await fetch('/api/github-setup', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'validate', token: integrations.githubToken })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                setIntegration('githubUser', data.user.username);
                                            } else {
                                                alert(data.error || 'GitHub connection failed');
                                            }
                                        } finally {
                                            setTestingGithub(false);
                                        }
                                    }}
                                    disabled={!integrations.githubToken || testingGithub}
                                    className="w-full px-3 py-2 bg-white text-neutral-800 rounded-lg text-sm disabled:opacity-50"
                                >
                                    {testingGithub ? 'Testing...' : integrations.githubUser ? 'Update' : 'Connect'}
                                </button>
                            </div>
                            {/* Vercel */}
                            <div className="p-3 bg-neutral-700 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-sm">Vercel</span>
                                    <div className="ml-auto">
                                        {integrations.vercelToken ? (
                                            <HealthStatusIndicator
                                                serviceId="integration:vercel"
                                                serviceName="Vercel"
                                                health={vercelHealth}
                                                onCheck={handleCheckVercelHealth}
                                                size="sm"
                                            />
                                        ) : (
                                            <span className="text-xs text-gray-400">Not configured</span>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="password"
                                    value={integrations.vercelToken}
                                    onChange={(e) => setIntegration('vercelToken', e.target.value)}
                                    placeholder="vercel_xxxx"
                                    className="w-full px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg text-sm text-white placeholder-neutral-400 mb-2"
                                />
                                <button
                                    onClick={async () => {
                                        if (!integrations.vercelToken) return;
                                        setTestingVercel(true);
                                        try {
                                            const res = await fetch('/api/vercel-setup', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'validate', token: integrations.vercelToken })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                setIntegration('vercelUser', data.user.username);
                                            } else {
                                                alert(data.error || 'Vercel connection failed');
                                            }
                                        } finally {
                                            setTestingVercel(false);
                                        }
                                    }}
                                    disabled={!integrations.vercelToken || testingVercel}
                                    className="w-full px-3 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                    {testingVercel ? 'Testing...' : integrations.vercelUser ? 'Update' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Spamzilla */}
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                            💎 Spamzilla API (Premium)
                        </h4>
                        <p className="text-xs text-indigo-600 mb-3">
                            Get API key from <a href="https://spamzilla.io" target="_blank" rel="noopener noreferrer" className="underline">spamzilla.io</a> - Provides full SEO metrics for expired domains
                        </p>
                        <input
                            type="password"
                            value={integrations.spamzillaKey}
                            onChange={(e) => setIntegration('spamzillaKey', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            placeholder="Your Spamzilla API Key"
                        />
                    </div>

                    {/* ExpiredDomains.net Guide */}
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                            🔍 ExpiredDomains.net (Discovery Mode)
                        </h4>
                        <p className="text-xs text-emerald-700 mb-3">
                            Browse expired domains manually, then export CSV and import into Ifrit for analysis.
                        </p>
                        <div className="space-y-2">
                            <a
                                href="https://www.expireddomains.net/deleted-domains/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full px-4 py-2 bg-emerald-600 text-white text-center rounded-lg hover:bg-emerald-700 text-sm"
                            >
                                Browse ExpiredDomains.net →
                            </a>
                            <div className="p-3 bg-white rounded-lg border border-emerald-100">
                                <p className="text-xs text-emerald-800 font-medium mb-1">📋 Workflow:</p>
                                <ol className="text-xs text-emerald-700 list-decimal list-inside space-y-1">
                                    <li>Browse & filter domains on their site</li>
                                    <li>Export to CSV (requires free account)</li>
                                    <li>Upload CSV in Domain Finder → Discovery Import</li>
                                    <li>Analyze with Spamzilla for full metrics</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Namecheap */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                            🛒 Namecheap API (Availability Check)
                        </h4>
                        <p className="text-xs text-amber-600 mb-3">
                            Get API access from <a href="https://ap.www.namecheap.com/settings/tools/apiaccess/" target="_blank" rel="noopener noreferrer" className="underline">Namecheap Dashboard</a>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={integrations.namecheapUser}
                                onChange={(e) => setIntegration('namecheapUser', e.target.value)}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                placeholder="API User"
                            />
                            <input
                                type="password"
                                value={integrations.namecheapKey}
                                onChange={(e) => setIntegration('namecheapKey', e.target.value)}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                placeholder="API Key"
                            />
                        </div>
                    </div>

                    {/* Cloudflare */}
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                            ☁️ Cloudflare Registrar (At-Cost Renewals)
                        </h4>
                        <p className="text-xs text-orange-600 mb-3">
                            Transfer domains to Cloudflare for at-cost renewals (.com = $10.11/yr). Get API token from{' '}
                            <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="underline">Cloudflare Dashboard</a>
                        </p>
                        <input
                            type="password"
                            value={integrations.cloudflareToken}
                            onChange={(e) => setIntegration('cloudflareToken', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                            placeholder="Cloudflare API Token"
                        />
                    </div>

                    {/* GoDaddy */}
                    <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                        <h4 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                            🌐 GoDaddy API (Domain Auctions)
                        </h4>
                        <p className="text-xs text-teal-600 mb-3">
                            Access GoDaddy Auctions for expired domains. Get API credentials from{' '}
                            <a href="https://developer.godaddy.com/keys" target="_blank" rel="noopener noreferrer" className="underline">GoDaddy Developer Portal</a>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="password"
                                value={integrations.godaddyKey}
                                onChange={(e) => setIntegration('godaddyKey', e.target.value)}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                placeholder="API Key"
                            />
                            <input
                                type="password"
                                value={integrations.godaddySecret}
                                onChange={(e) => setIntegration('godaddySecret', e.target.value)}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                placeholder="API Secret"
                            />
                        </div>
                    </div>

                    {/* Umami Analytics */}
                    <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                        <h4 className="font-semibold text-violet-900 mb-3 flex items-center gap-2">
                            📊 Umami Analytics (Privacy-Focused)
                        </h4>
                        <p className="text-xs text-violet-600 mb-3">
                            Self-hosted analytics for your websites. Enter Website ID from your{' '}
                            <a href="https://umami.is/docs/getting-started" target="_blank" rel="noopener noreferrer" className="underline">Umami dashboard</a>
                        </p>
                        <input
                            type="text"
                            value={integrations.umamiId}
                            onChange={(e) => setIntegration('umamiId', e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            placeholder="Umami Website ID"
                        />
                        <p className="text-xs text-violet-500 mt-2">
                            Used when deploying websites - embeds tracking script automatically
                        </p>
                    </div>
                </div>
            )}

            {/* Republish/Syndication Tab */}
            {activeTab === 'republish' && (
                <RepublishPanel />
            )}

            {/* Archived: Blog Tab (legacy single-blog setting, not needed for multi-website architecture)
            {activeTab === 'blog' && (
                <div>
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Your Blog Configuration
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Blog URL
                        </label>
                        <input
                            type="url"
                            value={blogUrl}
                            onChange={(e) => setBlogUrl(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="https://yourblog.com"
                        />
                        <p className="text-xs text-neutral-400 mt-1">
                            Used for sitemap URLs and canonical links in generated content
                        </p>
                    </div>
                </div>
            )}
            */}

            {/* AdSense Tab */}
            {activeTab === 'adsense' && (
                <div className="space-y-6">
                    {/* Header */}
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Google AdSense Configuration
                    </h3>

                    {/* Policy Guidance */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                            💡 AdSense Policy (Dec 2025)
                        </h4>
                        <ul className="text-sm text-green-800 space-y-1">
                            <li>• <strong>One account per person</strong> — Google allows only 1 AdSense account per individual</li>
                            <li>• <strong>Multiple sites allowed</strong> — You can monetize unlimited websites with the same Publisher ID</li>
                            <li>• <strong>These settings apply to all websites</strong> created in Ifrit (used during deploy)</li>
                        </ul>
                    </div>

                    {/* Publisher ID */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Publisher ID
                        </label>
                        <input
                            type="text"
                            value={adsenseConfig.publisherId}
                            onChange={(e) => setAdsenseConfig({ publisherId: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="pub-1234567890123456"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                            Format: <code className="bg-neutral-100 px-1 rounded">pub-</code> followed by 16 digits.
                            Find in AdSense → Account → Account information
                        </p>
                    </div>

                    {/* Ad Slots */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Leaderboard Ad Slot
                            </label>
                            <input
                                type="text"
                                value={adsenseConfig.leaderboardSlot}
                                onChange={(e) => setAdsenseConfig({ leaderboardSlot: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="1234567890"
                            />
                            <p className="text-xs text-neutral-500 mt-1">728×90 banner at page top</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                In-Article Ad Slot
                            </label>
                            <input
                                type="text"
                                value={adsenseConfig.articleSlot}
                                onChange={(e) => setAdsenseConfig({ articleSlot: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="0987654321"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Responsive ad within content</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Multiplex Ad Slot
                            </label>
                            <input
                                type="text"
                                value={adsenseConfig.multiplexSlot}
                                onChange={(e) => setAdsenseConfig({ multiplexSlot: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="1122334455"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Grid-style ads at page bottom</p>
                        </div>
                    </div>

                    <p className="text-xs text-neutral-500">
                        Slot IDs are 10 digits. Create ad units in AdSense → Ads → By ad unit → Create new ad unit
                    </p>

                    {/* Verification Link */}
                    <div className="flex gap-3 pt-2">
                        <a
                            href="https://www.google.com/adsense/new/u/0/pub-selector"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                            📊 AdSense Dashboard
                        </a>
                        <a
                            href="https://support.google.com/adsense/answer/2659101"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                            📖 Ad Unit Setup Guide
                        </a>
                    </div>
                </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                        <h3 className="font-medium text-indigo-900 mb-2">Export & Import Settings</h3>
                        <p className="text-sm text-indigo-700">
                            Backup all your API keys, tokens, and configuration to a JSON file.
                            Use this to transfer settings to another machine or create a backup.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Export Section */}
                        <div className="border border-neutral-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-lg">📤</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-neutral-900">Export Settings</h4>
                                    <p className="text-xs text-neutral-500">Download all settings as JSON</p>
                                </div>
                            </div>
                            <ul className="text-xs text-neutral-600 space-y-1 mb-4">
                                <li>✓ AI Provider Keys (Gemini, DeepSeek, OpenRouter, Perplexity)</li>
                                <li>✓ GitHub & Vercel Deployment Tokens</li>
                                <li>✓ AdSense Configuration (Publisher ID, Slots)</li>
                                <li>✓ Domain APIs (Namecheap, Spamzilla, Cloudflare)</li>
                                <li>✓ Stock Images (Unsplash, Pexels)</li>
                                <li>✓ Analytics & Publishing (Umami, Dev.to)</li>
                                <li>✓ MCP Server Configuration</li>
                                <li>✓ Capabilities & Handler Settings</li>
                            </ul>
                            <button
                                onClick={handleExportSettings}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Download Backup File
                            </button>
                        </div>

                        {/* Import Section */}
                        <div className="border border-neutral-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <span className="text-lg">📥</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-neutral-900">Import Settings</h4>
                                    <p className="text-xs text-neutral-500">Restore from backup file</p>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-600 mb-4">
                                Upload a previously exported settings file to restore all your API keys and configuration.
                                The page will reload after importing.
                            </p>
                            <button
                                onClick={handleImportSettings}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Upload Backup File
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                            <strong>⚠️ Security Note:</strong> The exported file contains sensitive API keys.
                            Store it securely and don&apos;t share it publicly.
                        </p>
                    </div>
                </div>
            )}
        </>
    );

    // Render inline version (no floating button or modal wrapper)
    if (inline) {
        return (
            <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-1 border-b">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeTab === tab.id
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            {tab.icon}
                            <span className="text-sm font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content - uses shared tab content renderer */}
                <div className="py-4">
                    {renderTabContent()}
                </div>

                {/* Save Button - hidden on info-only tabs like Templates */}
                {activeTab !== 'templates' && (
                    <div className="flex justify-end pt-4 border-t">
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Save Settings
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Original floating button + modal version
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-3 bg-white rounded-full shadow-lg border border-neutral-200 hover:bg-neutral-50 transition-colors z-50"
                aria-label="Settings"
            >
                <Settings className="w-6 h-6 text-neutral-600" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm overflow-y-auto py-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl m-4 max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center gap-2 p-6 pb-0 text-blue-600">
                            <Lock className="w-5 h-5" />
                            <h2 className="text-xl font-bold">Settings</h2>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 p-4 border-b">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-neutral-600 hover:bg-neutral-100'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content - uses shared tab content renderer */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {renderTabContent()}
                        </div>

                        {/* Footer - Save button hidden on info-only tabs */}
                        <div className="p-6 pt-4 border-t">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-neutral-500 hover:text-neutral-700"
                                >
                                    {activeTab === 'templates' ? 'Close' : 'Cancel'}
                                </button>
                                {activeTab !== 'templates' && (
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        Save Settings
                                    </button>
                                )}
                            </div>
                            <p className="mt-4 text-xs text-neutral-400 text-center">
                                All settings are stored locally in your browser + backed up to server.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
