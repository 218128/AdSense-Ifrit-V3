'use client';

/**
 * Unified Websites Dashboard
 * 
 * Single source of truth for all website management.
 * Uses unified API for storage and integrates WebsiteDetail for per-site management.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Globe,
    Plus,
    CheckCircle,
    Clock,
    AlertTriangle,
    Settings,
    ArrowRight,
    ExternalLink,
    BarChart3,
    Loader2,
    Rocket,
    Sparkles,
    RefreshCw,
    Upload,
    ArrowUpCircle,
    Github,
    Key
} from 'lucide-react';
import WebsiteDetail from './WebsiteDetail';
import { useSettingsStore } from '@/stores/settingsStore';

// Types matching websiteStore
interface Website {
    id: string;
    domain: string;
    name: string;
    niche: string;
    template: {
        id: string;
        version: string;
        installedAt: number;
        upgradeAvailable?: string;
    };
    fingerprint: {
        providers: string[];
        contentStrategy: string;
        eeatEnabled: boolean;
        aiOverviewOptimized: boolean;
        generatedAt: number;
    };
    deployment: {
        githubRepo: string;
        liveUrl: string;
        pendingChanges: number;
    };
    stats: {
        articlesCount: number;
        totalWords: number;
        estimatedMonthlyRevenue: number;
    };
    status: string;
    createdAt: number;
    updatedAt: number;
}

interface WebsitesDashboardProps {
    articles?: Array<{ slug: string; title: string }>;
}

export default function WebsitesDashboard({ articles = [] }: WebsitesDashboardProps) {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [migrating, setMigrating] = useState(false);
    const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

    // Get tokens from settings store
    const integrations = useSettingsStore(state => state.integrations);
    const setIntegration = useSettingsStore(state => state.setIntegration);

    const githubToken = integrations.githubToken;
    const vercelToken = integrations.vercelToken;
    const githubUser = integrations.githubUser;
    const vercelUser = integrations.vercelUser;
    const hasTokens = !!(githubToken && vercelToken);

    // Token testing states
    const [testingGithub, setTestingGithub] = useState(false);
    const [testingVercel, setTestingVercel] = useState(false);

    const testGithub = async () => {
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
                setIntegration('githubUser', data.user.username);
            } else {
                alert(data.error || 'GitHub connection failed');
            }
        } finally {
            setTestingGithub(false);
        }
    };

    const testVercel = async () => {
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
                setIntegration('vercelUser', data.user.username);
            } else {
                alert(data.error || 'Vercel connection failed');
            }
        } finally {
            setTestingVercel(false);
        }
    };

    // Fetch websites from unified API
    const fetchWebsites = useCallback(async () => {
        try {
            const response = await fetch('/api/websites');
            const data = await response.json();

            if (data.success) {
                setWebsites(data.websites);
            }
        } catch (error) {
            console.error('Failed to fetch websites:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWebsites();
    }, [fetchWebsites]);

    // Run migration from legacy storage
    const runMigration = async () => {
        setMigrating(true);
        setMigrationMessage(null);

        try {
            const response = await fetch('/api/websites/migrate', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                setMigrationMessage(
                    data.migrated.length > 0
                        ? `Migrated ${data.migrated.length} website(s): ${data.migrated.join(', ')}`
                        : 'No new websites to migrate'
                );
                fetchWebsites();
            }
        } catch {
            setMigrationMessage('Migration failed');
        } finally {
            setMigrating(false);
        }
    };

    // Show detail view if domain selected
    if (selectedDomain) {
        return (
            <WebsiteDetail
                domain={selectedDomain}
                onBack={() => {
                    setSelectedDomain(null);
                    fetchWebsites();
                }}
            />
        );
    }

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            'live': { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
            'building': { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> },
            'setup': { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Settings className="w-3 h-3" /> },
            'pending-deploy': { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Upload className="w-3 h-3" /> },
            'error': { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-3 h-3" /> }
        };

        const c = config[status] || config['setup'];

        return (
            <span className={`flex items-center gap-1 px-2 py-1 ${c.bg} ${c.text} text-xs font-medium rounded-full`}>
                {c.icon}
                {status.replace('-', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Globe className="w-8 h-8" />
                            <h2 className="text-2xl font-bold">🌐 Websites</h2>
                        </div>
                        <p className="text-indigo-100">
                            Unified website management. Create, upgrade, and deploy.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={runMigration}
                            disabled={migrating}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
                            title="Import websites from legacy storage"
                        >
                            {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Sync
                        </button>
                        <button
                            onClick={() => setShowWizard(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            New Website
                        </button>
                    </div>
                </div>
            </div>

            {/* Migration Message */}
            {migrationMessage && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    {migrationMessage}
                </div>
            )}

            {/* Connection Status - Show if tokens configured */}
            {hasTokens && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>Connected: GitHub (@{githubUser}) &amp; Vercel (@{vercelUser})</span>
                    </div>
                    <span className="text-xs text-green-600">
                        Manage in Settings → Integrations
                    </span>
                </div>
            )}

            {/* Tokens Not Configured - Redirect to Settings */}
            {!hasTokens && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-amber-600" />
                        <div>
                            <p className="font-medium text-amber-800">GitHub &amp; Vercel Required</p>
                            <p className="text-sm text-amber-600">
                                Configure your GitHub and Vercel tokens in <strong>Settings → Integrations</strong> to create and manage websites.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{websites.length}</div>
                    <div className="text-sm text-neutral-500">Total Sites</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-green-600">
                        {websites.filter(w => w.status === 'live').length}
                    </div>
                    <div className="text-sm text-neutral-500">Live</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-amber-600">
                        {websites.filter(w => w.template?.upgradeAvailable).length}
                    </div>
                    <div className="text-sm text-neutral-500">Upgrades Available</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-purple-600">
                        ${websites.reduce((sum, w) => sum + (w.stats?.estimatedMonthlyRevenue || 0), 0)}/mo
                    </div>
                    <div className="text-sm text-neutral-500">Est. Revenue</div>
                </div>
            </div>

            {/* Websites List */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900">Your Websites</h3>
                    <span className="text-sm text-neutral-500">{websites.length} websites</span>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                        <p className="mt-2 text-neutral-500">Loading websites...</p>
                    </div>
                ) : websites.length === 0 ? (
                    <div className="p-12 text-center">
                        <Rocket className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                        <h4 className="text-lg font-semibold text-neutral-700 mb-2">No websites yet</h4>
                        <p className="text-neutral-500 mb-4">
                            Create your first website or click Sync to import existing sites.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={runMigration}
                                disabled={migrating}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Sync Existing
                            </button>
                            <button
                                onClick={() => setShowWizard(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Create Website
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {websites.map(website => (
                            <div
                                key={website.id}
                                className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                                onClick={() => setSelectedDomain(website.domain)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                            {website.domain.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-neutral-900">{website.domain}</h4>
                                                {getStatusBadge(website.status)}
                                                {website.template?.upgradeAvailable && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                                        <ArrowUpCircle className="w-3 h-3" />
                                                        Upgrade
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-neutral-500 mt-0.5 flex items-center gap-2">
                                                <span>{website.niche}</span>
                                                <span>•</span>
                                                <span>{website.stats?.articlesCount || 0} articles</span>
                                                <span>•</span>
                                                <span className="text-neutral-400">
                                                    {website.template?.id} v{website.template?.version}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* AI Fingerprint Badge */}
                                        {website.fingerprint?.providers?.length > 0 && (
                                            <div className="hidden md:flex items-center gap-1">
                                                {website.fingerprint.providers.slice(0, 2).map(p => (
                                                    <span key={p} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <div className="font-medium text-green-600">
                                                ${website.stats?.estimatedMonthlyRevenue || 0}/mo
                                            </div>
                                            <div className="text-xs text-neutral-500">Est. revenue</div>
                                        </div>
                                        <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Setup Wizard Modal */}
            {showWizard && (
                <SetupWizard
                    onClose={() => setShowWizard(false)}
                    onWebsiteCreated={() => {
                        setShowWizard(false);
                        fetchWebsites();
                    }}
                    articles={articles}
                />
            )}
        </div>
    );
}

/**
 * Setup Wizard Component
 * Step-by-step website creation
 */
function SetupWizard({
    onClose,
    onWebsiteCreated,
    articles
}: {
    onClose: () => void;
    onWebsiteCreated: () => void;
    articles: Array<{ slug: string; title: string }>;
}) {
    const [step, setStep] = useState(1);
    const [domain, setDomain] = useState('');
    const [niche, setNiche] = useState('');

    // Get tokens and keys from settings store
    const integrations = useSettingsStore(state => state.integrations);
    const providerKeys = useSettingsStore(state => state.providerKeys);
    const enabledProviders = useSettingsStore(state => state.enabledProviders);
    const [umamiId, setUmamiId] = useState('');
    const [template, setTemplate] = useState<'niche-authority' | 'topical-magazine' | 'expert-hub'>('niche-authority');
    const [isProcessing, setIsProcessing] = useState(false);
    const [creationStatus, setCreationStatus] = useState('');

    // Domain Profile integration
    const [loadedProfile, setLoadedProfile] = useState<{
        primaryKeywords: string[];
        secondaryKeywords: string[];
        questionKeywords: string[];
        suggestedTopics: string[];
        niche: string;
    } | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const NICHES = [
        { value: 'technology', label: 'Technology' },
        { value: 'finance', label: 'Finance' },
        { value: 'health', label: 'Health' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'gaming', label: 'Gaming' },
        { value: 'travel', label: 'Travel' },
        { value: 'lifestyle', label: 'Lifestyle' },
    ];

    // Check for saved profile when domain changes
    useEffect(() => {
        const checkProfile = async () => {
            if (!domain || domain.length < 4) {
                setLoadedProfile(null);
                return;
            }

            setProfileLoading(true);
            try {
                const response = await fetch(`/api/domain-profiles?domain=${encodeURIComponent(domain)}`);
                const data = await response.json();

                if (data.success && data.profile) {
                    setLoadedProfile(data.profile);
                    // Auto-fill niche if not already set
                    if (!niche && data.profile.niche) {
                        setNiche(data.profile.niche);
                    }
                } else {
                    setLoadedProfile(null);
                }
            } catch {
                setLoadedProfile(null);
            } finally {
                setProfileLoading(false);
            }
        };

        const debounce = setTimeout(checkProfile, 500);
        return () => clearTimeout(debounce);
    }, [domain, niche]);


    const handleSubmit = async () => {
        setIsProcessing(true);
        setCreationStatus('Creating website...');

        try {
            // Get tokens from settings store
            const { githubToken, vercelToken, githubUser } = integrations;

            if (!githubToken || !vercelToken) {
                throw new Error('Please configure GitHub and Vercel tokens first (click "Connect" button).');
            }

            if (!githubUser) {
                throw new Error('GitHub username required. Validate your token in Settings → Integrations.');
            }

            // Step 1: Create website via unified API (GitHub repo + Vercel project)
            setCreationStatus('Setting up GitHub & Vercel...');
            const createResponse = await fetch('/api/websites/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain,
                    niche,
                    githubToken,
                    vercelToken,
                    siteConfig: {
                        siteName: domain.split('.')[0],
                        domain,
                        tagline: `Best source for ${niche} insights`,
                        umamiId: umamiId || undefined,
                        template
                    }
                })
            });

            const createData = await createResponse.json();

            if (!createData.success) {
                throw new Error(createData.error || 'Failed to create website');
            }

            // Step 2: Start content generation job (async - runs in background)
            setCreationStatus('Starting content generation...');

            // Get AI provider keys from store
            const getStoreProviderKeys = () => {
                const result: Record<string, string[]> = {};
                const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'] as const;

                for (const provider of providers) {
                    const isEnabled = enabledProviders.includes(provider);
                    const keys = providerKeys[provider] || [];

                    if (isEnabled && keys.length > 0) {
                        result[provider] = keys.map(k => k.key);
                    } else {
                        result[provider] = [];
                    }
                }
                return result;
            };

            const apiProviderKeys = getStoreProviderKeys();
            const hasAnyKeys = Object.values(apiProviderKeys).some(keys => keys.length > 0);

            if (hasAnyKeys) {
                // Build pillars from profile keywords if available
                const pillars = loadedProfile?.primaryKeywords?.slice(0, 4).map(kw => `${kw} Guide`) || [
                    `Best ${niche} Guide`,
                    `Top ${niche} Tips`,
                    `${niche} For Beginners`,
                    `Advanced ${niche} Strategies`
                ];

                // Start site builder job (this runs async in the background)
                const builderResponse = await fetch('/api/site-builder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        config: {
                            domain,
                            siteName: domain.split('.')[0],
                            siteTagline: `Best source for ${niche} insights`,
                            niche,
                            targetAudience: `People interested in ${niche}`,
                            template,
                            author: {
                                name: 'Editorial Team',
                                role: 'Content Team',
                                experience: 'Expert writers in this field'
                            },
                            // Use keywords from profile or fallback
                            pillars,
                            clustersPerPillar: 3,
                            includeAbout: true,
                            includeEssentialPages: true,
                            // Pass all keywords for AI context
                            targetKeywords: loadedProfile ? {
                                primary: loadedProfile.primaryKeywords,
                                secondary: loadedProfile.secondaryKeywords,
                                questions: loadedProfile.questionKeywords
                            } : undefined
                        },
                        providerKeys: apiProviderKeys,
                        githubConfig: {
                            token: githubToken,
                            owner: githubUser,  // C2 FIX: No hardcoded fallback
                            repo: domain.replace(/\./g, '-'),
                            branch: 'main'
                        }
                    })
                });

                const builderData = await builderResponse.json();

                if (builderData.success) {
                    setCreationStatus(`Website created! Content generation started (${builderData.totalItems} items). Check progress in website list.`);
                } else {
                    // Job didn't start but website was created
                    setCreationStatus('Website created! AI content generation will start when you open the website.');
                    console.warn('Site builder job failed to start:', builderData.error);
                }
            } else {
                setCreationStatus('Website created! Configure AI keys in Settings to generate content.');
            }

            // Close wizard after brief delay (website will show as "building" in list)
            await new Promise(resolve => setTimeout(resolve, 2000));
            onWebsiteCreated();
        } catch (error) {
            console.error('Error creating website:', error);
            setCreationStatus(error instanceof Error ? error.message : 'Error creating website');
            setTimeout(() => setIsProcessing(false), 3000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-neutral-900">🚀 New Website Setup</h3>
                        <p className="text-sm text-neutral-500">Step {step} of 4</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">✕</button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(s => (
                            <div
                                key={s}
                                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-indigo-500' : 'bg-neutral-200'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 1: Choose Your Domain</h4>
                            <p className="text-neutral-600">Enter the domain for your website.</p>
                            <input
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="yourdomain.com"
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />

                            {/* Profile Detected Banner */}
                            {profileLoading && (
                                <div className="p-3 bg-neutral-100 rounded-lg text-sm text-neutral-500 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Checking for saved research...
                                </div>
                            )}
                            {!profileLoading && loadedProfile && (
                                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        <span className="font-semibold text-purple-800">Research Profile Found!</span>
                                    </div>
                                    <p className="text-sm text-purple-700 mb-2">
                                        Your saved keywords will be used to generate targeted content.
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {loadedProfile.primaryKeywords.slice(0, 5).map((kw, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                {kw}
                                            </span>
                                        ))}
                                        {loadedProfile.primaryKeywords.length > 5 && (
                                            <span className="text-xs text-purple-500">
                                                +{loadedProfile.primaryKeywords.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 2: Niche & Template</h4>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-700">Niche</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {NICHES.map(n => (
                                        <button
                                            key={n.value}
                                            onClick={() => setNiche(n.value)}
                                            className={`p-3 border-2 rounded-lg text-left transition-all ${niche === n.value
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-neutral-200 hover:border-neutral-300'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">{n.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-medium text-neutral-700">Template</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'niche-authority', name: 'Authority', icon: '📝', desc: 'Standard Blog' },
                                        { id: 'topical-magazine', name: 'Magazine', icon: '📰', desc: 'News Grid' },
                                        { id: 'expert-hub', name: 'Expert Hub', icon: '🧠', desc: 'Pillar Content' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTemplate(t.id as typeof template)}
                                            className={`p-3 border-2 rounded-lg text-left transition-all ${template === t.id
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-neutral-200 hover:border-neutral-300'
                                                }`}
                                        >
                                            <div className="text-xl mb-1">{t.icon}</div>
                                            <div className="font-medium text-sm">{t.name}</div>
                                            <div className="text-xs text-neutral-500">{t.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 3: Configure</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                    <div>
                                        <div className="font-medium">GitHub Repository</div>
                                        <div className="text-sm text-neutral-500">Auto-create repo for {domain}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                    <div>
                                        <div className="font-medium">Vercel Deployment</div>
                                        <div className="text-sm text-neutral-500">Auto-deploy with custom domain</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 mt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="w-5 h-5 text-neutral-600" />
                                    <span className="font-medium text-neutral-900">Analytics (Optional)</span>
                                </div>
                                <input
                                    type="text"
                                    value={umamiId}
                                    onChange={(e) => setUmamiId(e.target.value)}
                                    placeholder="Umami Website ID (optional)"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 4: Review & Launch</h4>
                            <div className="p-4 bg-neutral-50 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Domain:</span>
                                    <span className="font-medium">{domain}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Niche:</span>
                                    <span className="font-medium">{niche}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Template:</span>
                                    <span className="font-medium">{template}</span>
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="font-semibold text-green-800 mb-2">🎉 Ready to Launch!</div>
                                <p className="text-sm text-green-700">
                                    Click Launch to create your website with GitHub repo and Vercel deployment.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-200 flex justify-between">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                    >
                        {step === 1 ? 'Cancel' : '← Back'}
                    </button>
                    <button
                        onClick={() => step < 4 ? setStep(step + 1) : handleSubmit()}
                        disabled={
                            (step === 1 && !domain.trim()) ||
                            (step === 2 && !niche) ||
                            isProcessing
                        }
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {creationStatus || 'Creating...'}
                            </>
                        ) : step === 4 ? (
                            <>
                                <Rocket className="w-4 h-4" />
                                Launch Website
                            </>
                        ) : (
                            <>
                                Next Step
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
