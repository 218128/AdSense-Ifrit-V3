'use client';

import { useState, useEffect } from 'react';
import { Settings, Lock, Globe, DollarSign, Key, Zap, Link2, BarChart3, Image, Layout } from 'lucide-react';
import { AIKeyManager } from './AIKeyManager';
import { AIUsagePanel } from './AIUsagePanel';
import TemplatesPanel from './TemplatesPanel';

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


type SettingsTab = 'ai' | 'usage' | 'images' | 'templates' | 'blog' | 'adsense' | 'integrations' | 'backup';

interface SettingsModalProps {
    inline?: boolean;
}

export default function SettingsModal({ inline = false }: SettingsModalProps) {
    const [isOpen, setIsOpen] = useState(inline); // Auto-open if inline
    const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

    // Blog settings
    const [blogUrl, setBlogUrl] = useState(() => getStorageItem('USER_BLOG_URL'));

    // AdSense settings
    const [adsensePublisherId, setAdsensePublisherId] = useState(() => getStorageItem('ADSENSE_PUBLISHER_ID'));
    const [adsenseLeaderboardSlot, setAdsenseLeaderboardSlot] = useState(() => getStorageItem('ADSENSE_LEADERBOARD_SLOT'));
    const [adsenseArticleSlot, setAdsenseArticleSlot] = useState(() => getStorageItem('ADSENSE_ARTICLE_SLOT'));
    const [adsenseMultiplexSlot, setAdsenseMultiplexSlot] = useState(() => getStorageItem('ADSENSE_MULTIPLEX_SLOT'));

    // Domain API settings
    const [spamzillaKey, setSpamzillaKey] = useState(() => getStorageItem('ifrit_spamzilla_key'));
    const [namecheapUser, setNamecheapUser] = useState(() => getStorageItem('ifrit_namecheap_user'));
    const [namecheapKey, setNamecheapKey] = useState(() => getStorageItem('ifrit_namecheap_key'));

    // GitHub & Vercel settings
    const [githubToken, setGithubToken] = useState(() => getStorageItem('ifrit_github_token'));
    const [githubUser, setGithubUser] = useState(() => getStorageItem('ifrit_github_user'));
    const [vercelToken, setVercelToken] = useState(() => getStorageItem('ifrit_vercel_token'));
    const [vercelUser, setVercelUser] = useState(() => getStorageItem('ifrit_vercel_user'));
    const [testingGithub, setTestingGithub] = useState(false);
    const [testingVercel, setTestingVercel] = useState(false);

    // Stock image API settings
    const [unsplashKey, setUnsplashKey] = useState(() => getStorageItem('ifrit_unsplash_key'));
    const [pexelsKey, setPexelsKey] = useState(() => getStorageItem('ifrit_pexels_key'));

    // Load settings from server backup on mount (if localStorage is empty)
    useEffect(() => {
        const loadBackup = async () => {
            // Only load if we have no settings in localStorage
            const hasLocalSettings = localStorage.getItem('ADSENSE_PUBLISHER_ID') ||
                localStorage.getItem('ifrit_github_token');
            if (hasLocalSettings) return;

            try {
                const res = await fetch('/api/settings/backup');
                const data = await res.json();
                if (data.success && data.hasBackup && data.backup?.settings) {
                    const { integrations, blog, adsense } = data.backup.settings;

                    // Restore to state
                    if (blog?.url) setBlogUrl(blog.url);
                    if (adsense?.publisherId) setAdsensePublisherId(adsense.publisherId);
                    if (adsense?.leaderboardSlot) setAdsenseLeaderboardSlot(adsense.leaderboardSlot);
                    if (adsense?.articleSlot) setAdsenseArticleSlot(adsense.articleSlot);
                    if (adsense?.multiplexSlot) setAdsenseMultiplexSlot(adsense.multiplexSlot);
                    if (integrations?.githubToken) setGithubToken(integrations.githubToken);
                    if (integrations?.githubUser) setGithubUser(integrations.githubUser);
                    if (integrations?.vercelToken) setVercelToken(integrations.vercelToken);
                    if (integrations?.vercelUser) setVercelUser(integrations.vercelUser);

                    console.log('Settings restored from server backup');
                }
            } catch (err) {
                console.error('Failed to load backup:', err);
            }
        };
        loadBackup();
    }, []);

    const handleSave = async () => {
        // Blog Configuration
        localStorage.setItem('USER_BLOG_URL', blogUrl);

        // AdSense Configuration
        localStorage.setItem('ADSENSE_PUBLISHER_ID', adsensePublisherId);
        localStorage.setItem('ADSENSE_LEADERBOARD_SLOT', adsenseLeaderboardSlot);
        localStorage.setItem('ADSENSE_ARTICLE_SLOT', adsenseArticleSlot);
        localStorage.setItem('ADSENSE_MULTIPLEX_SLOT', adsenseMultiplexSlot);

        // Domain API Configuration
        localStorage.setItem('ifrit_spamzilla_key', spamzillaKey);
        localStorage.setItem('ifrit_namecheap_user', namecheapUser);
        localStorage.setItem('ifrit_namecheap_key', namecheapKey);

        // GitHub & Vercel Configuration (already saved via test buttons, but save again)
        if (githubToken) localStorage.setItem('ifrit_github_token', githubToken);
        if (vercelToken) localStorage.setItem('ifrit_vercel_token', vercelToken);

        // Backup to server for persistence
        try {
            await fetch('/api/settings/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: {
                        integrations: {
                            githubToken,
                            githubUser,
                            vercelToken,
                            vercelUser,
                        },
                        blog: {
                            url: blogUrl,
                        },
                        adsense: {
                            publisherId: adsensePublisherId,
                            leaderboardSlot: adsenseLeaderboardSlot,
                            articleSlot: adsenseArticleSlot,
                            multiplexSlot: adsenseMultiplexSlot,
                        },
                    }
                })
            });
        } catch (err) {
            console.error('Failed to backup settings to server:', err);
        }

        if (!inline) {
            setIsOpen(false);
        }
        alert('Settings saved!');
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'ai', label: 'AI Providers', icon: <Zap className="w-4 h-4" /> },
        { id: 'usage', label: 'AI Usage', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'images', label: 'Images', icon: <Image className="w-4 h-4" /> },
        { id: 'templates', label: 'Templates', icon: <Layout className="w-4 h-4" /> },
        { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> },
        { id: 'blog', label: 'Blog', icon: <Globe className="w-4 h-4" /> },
        { id: 'adsense', label: 'AdSense', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'backup', label: 'Backup', icon: <Key className="w-4 h-4" /> },
    ];

    // Export all settings to downloadable file
    const handleExportSettings = () => {
        // Collect all localStorage keys
        const allKeys = [
            'ifrit_gemini_keys', 'ifrit_deepseek_keys', 'ifrit_openrouter_keys',
            'ifrit_vercel_keys', 'ifrit_perplexity_keys', 'ifrit_enabled_providers',
            'GEMINI_API_KEY', 'ifrit_gemini_key',
            'ifrit_github_token', 'ifrit_github_user', 'ifrit_vercel_token', 'ifrit_vercel_user',
            'ADSENSE_PUBLISHER_ID', 'ADSENSE_LEADERBOARD_SLOT', 'ADSENSE_ARTICLE_SLOT', 'ADSENSE_MULTIPLEX_SLOT',
            'USER_BLOG_URL',
            'ifrit_namecheap_user', 'ifrit_namecheap_key', 'ifrit_spamzilla_key', 'ifrit_cloudflare_token',
            'ifrit_expireddomains_user', 'ifrit_expireddomains_pass',
            'ifrit_devto_api_key', 'devto_api_key',
            'ifrit_unsplash_key', 'ifrit_pexels_key',
        ];

        const settings: Record<string, string> = {};
        for (const key of allKeys) {
            const value = localStorage.getItem(key);
            if (value) settings[key] = value;
        }

        if (Object.keys(settings).length === 0) {
            alert('No settings to export. Please configure some API keys first.');
            return;
        }

        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            app: 'AdSense Ifrit V3',
            settings,
        };

        // Standard file download
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

                if (!data.settings || !data.version) {
                    alert('Invalid settings file format');
                    return;
                }

                // Restore all keys to localStorage
                let restored = 0;
                for (const [key, value] of Object.entries(data.settings)) {
                    if (value) {
                        localStorage.setItem(key, value as string);
                        restored++;
                    }
                }

                // Save to server too
                await fetch('/api/settings/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientSettings: data.settings }),
                });

                alert(`Restored ${restored} settings! Please refresh the page.`);
                window.location.reload();
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

            {/* AI Usage Tab */}
            {activeTab === 'usage' && (
                <div>
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        AI Usage & Cost Tracking
                    </h3>
                    <AIUsagePanel />
                </div>
            )}

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
                                value={unsplashKey}
                                onChange={(e) => setUnsplashKey(e.target.value)}
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
                                value={pexelsKey}
                                onChange={(e) => setPexelsKey(e.target.value)}
                                placeholder="Enter Pexels API Key"
                                className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded text-sm text-white"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={() => {
                            if (unsplashKey) localStorage.setItem('ifrit_unsplash_key', unsplashKey);
                            if (pexelsKey) localStorage.setItem('ifrit_pexels_key', pexelsKey);
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
                                    {githubUser && (
                                        <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                                            ✓ @{githubUser}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    placeholder="ghp_xxxx or github_pat_xxxx"
                                    className="w-full px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg text-sm text-white placeholder-neutral-400 mb-2"
                                />
                                <button
                                    onClick={async () => {
                                        if (!githubToken) return;
                                        setTestingGithub(true);
                                        try {
                                            const res = await fetch('/api/github-setup', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'validate', token: githubToken })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                setGithubUser(data.user.username);
                                                localStorage.setItem('ifrit_github_token', githubToken);
                                                localStorage.setItem('ifrit_github_user', data.user.username);
                                            } else {
                                                alert(data.error || 'GitHub connection failed');
                                            }
                                        } finally {
                                            setTestingGithub(false);
                                        }
                                    }}
                                    disabled={!githubToken || testingGithub}
                                    className="w-full px-3 py-2 bg-white text-neutral-800 rounded-lg text-sm disabled:opacity-50"
                                >
                                    {testingGithub ? 'Testing...' : githubUser ? 'Update' : 'Connect'}
                                </button>
                            </div>
                            {/* Vercel */}
                            <div className="p-3 bg-neutral-700 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-sm">Vercel</span>
                                    {vercelUser && (
                                        <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                                            ✓ @{vercelUser}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    value={vercelToken}
                                    onChange={(e) => setVercelToken(e.target.value)}
                                    placeholder="vercel_xxxx"
                                    className="w-full px-3 py-2 bg-neutral-600 border border-neutral-500 rounded-lg text-sm text-white placeholder-neutral-400 mb-2"
                                />
                                <button
                                    onClick={async () => {
                                        if (!vercelToken) return;
                                        setTestingVercel(true);
                                        try {
                                            const res = await fetch('/api/vercel-setup', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'validate', token: vercelToken })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                setVercelUser(data.user.username);
                                                localStorage.setItem('ifrit_vercel_token', vercelToken);
                                                localStorage.setItem('ifrit_vercel_user', data.user.username);
                                            } else {
                                                alert(data.error || 'Vercel connection failed');
                                            }
                                        } finally {
                                            setTestingVercel(false);
                                        }
                                    }}
                                    disabled={!vercelToken || testingVercel}
                                    className="w-full px-3 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                    {testingVercel ? 'Testing...' : vercelUser ? 'Update' : 'Connect'}
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
                            value={spamzillaKey}
                            onChange={(e) => setSpamzillaKey(e.target.value)}
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
                                value={namecheapUser}
                                onChange={(e) => setNamecheapUser(e.target.value)}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                placeholder="API User"
                            />
                            <input
                                type="password"
                                value={namecheapKey}
                                onChange={(e) => setNamecheapKey(e.target.value)}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                placeholder="API Key"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Blog Tab */}
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

            {/* AdSense Tab */}
            {activeTab === 'adsense' && (
                <div>
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Google AdSense Configuration
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Publisher ID
                            </label>
                            <input
                                type="text"
                                value={adsensePublisherId}
                                onChange={(e) => setAdsensePublisherId(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="pub-1234567890123456"
                            />
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Leaderboard Ad Slot ID
                                </label>
                                <input
                                    type="text"
                                    value={adsenseLeaderboardSlot}
                                    onChange={(e) => setAdsenseLeaderboardSlot(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="1234567890"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    In-Article Ad Slot ID
                                </label>
                                <input
                                    type="text"
                                    value={adsenseArticleSlot}
                                    onChange={(e) => setAdsenseArticleSlot(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="0987654321"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Multiplex Ad Slot ID
                                </label>
                                <input
                                    type="text"
                                    value={adsenseMultiplexSlot}
                                    onChange={(e) => setAdsenseMultiplexSlot(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="1122334455"
                                />
                            </div>
                        </div>
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
                                <li>✓ AI Provider Keys (Gemini, DeepSeek, etc.)</li>
                                <li>✓ GitHub & Vercel Tokens</li>
                                <li>✓ AdSense Configuration</li>
                                <li>✓ Domain API Keys (Namecheap, Spamzilla)</li>
                                <li>✓ Dev.to & Blog Settings</li>
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

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Save Settings
                    </button>
                </div>
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

                        {/* Footer */}
                        <div className="p-6 pt-4 border-t">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-neutral-500 hover:text-neutral-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    Save Settings
                                </button>
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
