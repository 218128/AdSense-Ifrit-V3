'use client';

/**
 * Websites Dashboard Component
 * 
 * Wizard-based mode for managing websites (domain = website).
 * Shows all websites and provides setup wizard for new ones.
 */

import { useState, useEffect } from 'react';
import {
    Globe,
    Plus,
    CheckCircle,
    Clock,
    AlertTriangle,
    Settings,
    ArrowRight,
    ExternalLink,
    FileText,
    BarChart3,
    Loader2,
    Rocket,
    Sparkles
} from 'lucide-react';

// No external component imports - wizard is self-contained

export interface Website {
    id: string;
    domain: string;
    name: string;
    niche: string;
    status: 'setup' | 'building' | 'live' | 'error';
    articlesCount: number;
    estimatedRevenue: number;
    githubRepo?: string;
    vercelProject?: string;
    createdAt: number;
    updatedAt: number;
}

interface WebsitesDashboardProps {
    articles?: Array<{ slug: string; title: string }>;
}

const STORAGE_KEY = 'ifrit_websites';

export default function WebsitesDashboard({ articles = [] }: WebsitesDashboardProps) {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [showWizard, setShowWizard] = useState(false);
    const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);

    // Load websites
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setWebsites(JSON.parse(saved));
            } catch {
                // Ignore
            }
        }
    }, []);

    // Save websites to localStorage
    const saveWebsites = (updated: Website[]) => {
        setWebsites(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    // Add a new website
    const addWebsite = (website: Website) => {
        const updated = [...websites, website];
        saveWebsites(updated);
    };

    // Update a website
    const updateWebsite = (website: Website) => {
        const updated = websites.map(w => w.id === website.id ? website : w);
        saveWebsites(updated);
    };

    // Delete a website
    const deleteWebsite = (id: string) => {
        const updated = websites.filter(w => w.id !== id);
        saveWebsites(updated);
    };

    // Check for domains from watchlist that need to be converted
    useEffect(() => {
        // Check if there are domains from Flip Pipeline that are "acquired"
        const flipProjects = localStorage.getItem('ifrit_flip_projects');
        if (flipProjects) {
            try {
                const projects = JSON.parse(flipProjects);
                // Could auto-suggest converting acquired domains to websites
            } catch {
                // Ignore
            }
        }
    }, []);

    const getStatusBadge = (status: Website['status']) => {
        switch (status) {
            case 'live':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Live
                    </span>
                );
            case 'building':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        <Clock className="w-3 h-3" />
                        Building
                    </span>
                );
            case 'setup':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        <Settings className="w-3 h-3" />
                        Setup
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Error
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Websites Mode Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Globe className="w-8 h-8" />
                            <h2 className="text-2xl font-bold">🌐 Websites</h2>
                        </div>
                        <p className="text-indigo-100">
                            Your revenue-generating websites. Each domain is a website project.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        New Website
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{websites.length}</div>
                    <div className="text-sm text-neutral-500">Total Websites</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-green-600">
                        {websites.filter(w => w.status === 'live').length}
                    </div>
                    <div className="text-sm text-neutral-500">Live</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-amber-600">
                        {websites.filter(w => w.status === 'building' || w.status === 'setup').length}
                    </div>
                    <div className="text-sm text-neutral-500">In Progress</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-purple-600">
                        ${websites.reduce((sum, w) => sum + (w.estimatedRevenue || 0), 0)}/mo
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

                {websites.length === 0 ? (
                    <div className="p-12 text-center">
                        <Rocket className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                        <h4 className="text-lg font-semibold text-neutral-700 mb-2">No websites yet</h4>
                        <p className="text-neutral-500 mb-6">
                            Start by hunting domains in the Hunt tab, then create your first website.
                        </p>
                        <button
                            onClick={() => setShowWizard(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Website
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {websites.map(website => (
                            <div key={website.id} className="p-4 hover:bg-neutral-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                            {website.domain.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-neutral-900">{website.domain}</h4>
                                                {getStatusBadge(website.status)}
                                            </div>
                                            <div className="text-sm text-neutral-500 mt-0.5">
                                                {website.niche} • {website.articlesCount} articles
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-medium text-green-600">
                                                ${website.estimatedRevenue}/mo
                                            </div>
                                            <div className="text-xs text-neutral-500">Est. revenue</div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedWebsite(website)}
                                            className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
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
                    onWebsiteCreated={addWebsite}
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
    onWebsiteCreated: (website: Website) => void;
    articles: Array<{ slug: string; title: string }>;
}) {
    const [step, setStep] = useState(1);
    const [domain, setDomain] = useState('');
    const [niche, setNiche] = useState('');
    const [umamiId, setUmamiId] = useState(''); // Optional analytics
    const [template, setTemplate] = useState<'niche' | 'magazine' | 'expert'>('niche');
    const [isProcessing, setIsProcessing] = useState(false);
    const [creationStatus, setCreationStatus] = useState('');

    const NICHES = [
        { value: 'technology', label: '💻 Technology', crossPublish: ['dev.to', 'Hashnode', 'Medium'] },
        { value: 'finance', label: '💰 Finance', crossPublish: ['LinkedIn', 'Seeking Alpha'] },
        { value: 'health', label: '🏥 Health', crossPublish: ['Medium', 'Google News'] },
        { value: 'marketing', label: '📈 Marketing', crossPublish: ['Medium', 'LinkedIn'] },
        { value: 'gaming', label: '🎮 Gaming', crossPublish: ['Reddit', 'Discord'] },
        { value: 'travel', label: '✈️ Travel', crossPublish: ['Pinterest', 'Instagram'] },
        { value: 'lifestyle', label: '🌟 Lifestyle', crossPublish: ['Pinterest', 'Instagram'] },
    ];

    const selectedNicheInfo = NICHES.find(n => n.value === niche);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-neutral-900">🚀 New Website Setup</h3>
                        <p className="text-sm text-neutral-500">Step {step} of 5</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(s => (
                            <div
                                key={s}
                                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-indigo-500' : 'bg-neutral-200'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 1: Choose Your Domain</h4>
                            <p className="text-neutral-600">
                                Enter the domain you acquired from Hunt mode.
                            </p>
                            <input
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="yourdomain.com"
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                                💡 <strong>Tip:</strong> Use domains from your Hunt mode watchlist for best results.
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 2: Niche & Style</h4>
                            <p className="text-neutral-600">
                                Choose your site's topic and visual template.
                            </p>

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
                                            <div className="text-xs text-neutral-500 mt-0.5">
                                                To: {n.crossPublish.join(', ')}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-medium text-neutral-700">Template Style</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'niche', name: 'Authority', icon: '📝', desc: 'Standard Blog' },
                                        { id: 'magazine', name: 'Magazine', icon: '📰', desc: 'Newspaper Grid' },
                                        { id: 'expert', name: 'Expert Hub', icon: '🧠', desc: 'Pillar Content' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTemplate(t.id as any)}
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
                            <h4 className="text-lg font-semibold">Step 3: Configure Hosting</h4>
                            <p className="text-neutral-600">
                                We&apos;ll set up GitHub repository and Vercel deployment automatically.
                            </p>
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
                                        <div className="font-medium">Vercel Project</div>
                                        <div className="text-sm text-neutral-500">Auto-deploy with custom domain</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                    <div>
                                        <div className="font-medium">DNS Configuration</div>
                                        <div className="text-sm text-neutral-500">Point {domain} to Vercel</div>
                                    </div>
                                </div>
                            </div>

                            {/* Analytics Input */}
                            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 mt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="w-5 h-5 text-neutral-600" />
                                    <span className="font-medium text-neutral-900">Analytics (Optional)</span>
                                </div>
                                <p className="text-sm text-neutral-500 mb-3">
                                    Add your Umami Website ID to track visitors privacy-first.
                                </p>
                                <input
                                    type="text"
                                    value={umamiId}
                                    onChange={(e) => setUmamiId(e.target.value)}
                                    placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <p className="text-xs text-neutral-400 mt-1">
                                    Don't have one? You can add it later or skip this step.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 4: Generate Initial Content</h4>
                            <p className="text-neutral-600">
                                We&apos;ll generate HIGH-CPC optimized articles based on your niche.
                            </p>
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2 text-purple-700 mb-2">
                                    <Sparkles className="w-5 h-5" />
                                    <span className="font-semibold">Content Plan</span>
                                </div>
                                <ul className="text-sm text-purple-600 space-y-1 ml-7">
                                    <li>• 5 pillar articles (comprehensive guides)</li>
                                    <li>• 15 cluster articles (supporting content)</li>
                                    <li>• SEO-optimized for HIGH-CPC keywords</li>
                                    <li>• Internal linking structure</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold">Step 5: Launch & Monetize</h4>
                            <p className="text-neutral-600">
                                Final steps to go live and start earning.
                            </p>
                            <div className="space-y-3">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="font-semibold text-green-800 mb-2">🎉 Next Steps After Launch:</div>
                                    <ol className="text-sm text-green-700 space-y-2 ml-4 list-decimal">
                                        <li>Apply for Google AdSense</li>
                                        <li>Set up Google Search Console</li>
                                        {selectedNicheInfo && (
                                            <li>
                                                Cross-publish to: {selectedNicheInfo.crossPublish.join(', ')}
                                            </li>
                                        )}
                                        <li>Submit sitemap for indexing</li>
                                        <li>Monitor in Dashboard</li>
                                    </ol>
                                </div>
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
                        onClick={async () => {
                            if (step < 5) {
                                setStep(step + 1);
                            } else {
                                // Final step - create website
                                setIsProcessing(true);
                                setCreationStatus('Initializing...');

                                try {
                                    // Get tokens from settings
                                    const settings = localStorage.getItem('ifrit_settings');
                                    const { githubToken, vercelToken } = settings ? JSON.parse(settings) : { githubToken: '', vercelToken: '' };

                                    if (!githubToken || !vercelToken) {
                                        throw new Error('Please configure GitHub and Vercel tokens in Settings first.');
                                    }

                                    setCreationStatus('Creating GitHub Repository...');

                                    const response = await fetch('/api/websites/create', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            domain,
                                            niche,
                                            githubToken,
                                            vercelToken,
                                            siteConfig: {
                                                siteName: domain.split('.')[0],
                                                domain: domain,
                                                tagline: `Best source for ${niche} insights`,
                                                umamiId: umamiId || undefined,
                                                template: template
                                            }
                                        })
                                    });

                                    const data = await response.json();

                                    if (!data.success) {
                                        throw new Error(data.error || 'Failed to create website');
                                    }

                                    setCreationStatus('Website created! 🎉');

                                    // Create the website object with real data
                                    const nicheLabel = NICHES.find(n => n.value === niche)?.label || niche;
                                    const newWebsite: Website = {
                                        id: data.website.id,
                                        domain: data.website.domain,
                                        name: domain.split('.')[0],
                                        niche: nicheLabel,
                                        status: 'building',
                                        articlesCount: 0,
                                        estimatedRevenue: 0,
                                        createdAt: Date.now(),
                                        updatedAt: Date.now(),
                                        githubRepo: data.website.repoUrl,
                                        vercelProject: data.website.projectUrl
                                    };

                                    // Save the website
                                    onWebsiteCreated(newWebsite);

                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    onClose();
                                } catch (error) {
                                    console.error('Error creating website:', error);
                                    setCreationStatus(error instanceof Error ? error.message : 'Error creating website');
                                    // Don't close, let user see error
                                    setTimeout(() => setIsProcessing(false), 3000);
                                }
                            }
                        }}
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
                        ) : step === 5 ? (
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
        </div >
    );
}
