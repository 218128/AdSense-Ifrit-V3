'use client';

/**
 * Website Detail Dashboard
 * 
 * Full management view for a single website with tabs:
 * - Overview: Stats, fingerprint, deployment
 * - Content: Article CRUD, drop zone
 * - Versions: History, rollback
 * - Upgrades: Template upgrades
 * - Settings: Configuration
 */

import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft,
    Globe,
    FileText,
    History,
    ArrowUpCircle,
    Settings,
    ExternalLink,
    Github,
    Upload,
    Trash2,
    Edit,
    Eye,
    Plus,
    AlertTriangle,
    CheckCircle,
    Clock,
    Loader2,
    Cpu,
    Sparkles,
    RotateCcw,
    Rocket,
    Palette,
    Send
} from 'lucide-react';
import BuildingProgress from './BuildingProgress';
// GenerateArticleModal removed - called dead /api/generate
import DNSConfigPanel from './DNSConfigPanel';
import GenerationHistory, { addToGenerationHistory } from './GenerationHistory';
import ArticleActionsMenu from './ArticleActionsMenu';
import SmartDropZone from './SmartDropZone';
import PromptExporter from './PromptExporter';
// BulkArticleQueue removed - called dead /api/generate
import ArticleEditor from './ArticleEditor';
import PendingImports from './PendingImports';
import PagesTab from './PagesTab';
import BatchOperationsPanel from './BatchOperationsPanel';
import ImageGallery from './ImageGallery';
import SiteDecisionsPanel from './SiteDecisionsPanel';
import ThemeEditor from './ThemeEditor';
import CompetitorAnalysisPanel from './CompetitorAnalysisPanel';
import { useSettingsStore } from '@/stores/settingsStore';

// C4 FIX: Default website categories - can be extended from website config
const DEFAULT_CATEGORIES = ['how-to', 'reviews', 'guides', 'tutorials', 'tips', 'listicles', 'comparisons'];

// Types from websiteStore
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
        articleTemplatesUsed: string[];
    };
    deployment: {
        githubRepo: string;
        githubOwner: string;
        vercelProject: string;
        liveUrl: string;
        lastDeployAt?: number;
        lastDeployCommit?: string;
        pendingChanges: number;
    };
    stats: {
        articlesCount: number;
        totalWords: number;
        lastPublishedAt?: number;
        estimatedMonthlyRevenue: number;
    };
    versions: {
        version: string;
        templateVersion: string;
        deployedAt: number;
        commitSha: string;
        changes: string[];
        canRollback: boolean;
    }[];
    author: {
        name: string;
        role: string;
        experience?: string;
        bio?: string;
    };
    status: string;
    createdAt: number;
    updatedAt: number;
}

interface Article {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    category: string;
    tags: string[];
    contentType: string;
    wordCount: number;
    readingTime: number;
    eeatSignals: string[];
    aiOverviewBlocks: string[];
    generatedBy?: string;
    generatedAt?: number;
    isExternal: boolean;
    status: 'draft' | 'ready' | 'published';
    publishedAt?: number;
    lastModifiedAt: number;
}

interface WebsiteDetailProps {
    domain: string;
    onBack: () => void;
}

type TabId = 'overview' | 'content' | 'pages' | 'theme' | 'versions' | 'upgrades' | 'ai' | 'settings';

export default function WebsiteDetail({ domain, onBack }: WebsiteDetailProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [website, setWebsite] = useState<Website | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deploying, setDeploying] = useState(false);
    const [deployMessage, setDeployMessage] = useState<string | null>(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    // Get tokens and settings from store
    const integrations = useSettingsStore(state => state.integrations);
    const adsenseConfig = useSettingsStore(state => state.adsenseConfig);

    // Fetch website data
    const fetchWebsite = useCallback(async () => {
        try {
            const response = await fetch(`/api/websites/${domain}`);
            const data = await response.json();

            if (data.success) {
                setWebsite(data.website);
                setArticles(data.articles || []);
            } else {
                setError(data.error || 'Failed to load website');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }, [domain]);

    useEffect(() => {
        fetchWebsite();
    }, [fetchWebsite]);

    // Handle verified deployment
    const handleDeploy = async () => {
        const { githubToken } = integrations;
        if (!githubToken) {
            setDeployMessage('❌ GitHub token required. Configure in Settings.');
            return;
        }

        setDeploying(true);
        setDeployMessage(null);

        try {
            const adsensePublisherId = adsenseConfig.publisherId;
            const umamiId = integrations.umamiId;

            const response = await fetch(`/api/websites/${domain}/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    githubToken,
                    adsensePublisherId,
                    umamiId
                })
            });

            const data = await response.json();

            if (data.success) {
                setDeployMessage(data.verified
                    ? '✅ Deployed and verified!'
                    : '⏳ Deployed - verification pending');
                fetchWebsite(); // Refresh to get new status
            } else {
                setDeployMessage(`❌ ${data.error}`);
            }
        } catch {
            setDeployMessage('❌ Deployment failed');
        } finally {
            setDeploying(false);
        }
    };

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
        { id: 'content', label: 'Content', icon: <FileText className="w-4 h-4" /> },
        { id: 'pages', label: 'Pages', icon: <FileText className="w-4 h-4" /> },
        { id: 'theme', label: 'Theme', icon: <Palette className="w-4 h-4" /> },
        { id: 'versions', label: 'Versions', icon: <History className="w-4 h-4" /> },
        { id: 'upgrades', label: 'Upgrades', icon: <ArrowUpCircle className="w-4 h-4" /> },
        { id: 'ai', label: 'AI Config', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !website) {
        return (
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Error</h3>
                <p className="text-neutral-600 mb-4">{error || 'Website not found'}</p>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-neutral-100 rounded-lg hover:bg-neutral-200"
                >
                    ← Back to Websites
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {website.domain.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">{website.domain}</h2>
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                <span>{website.niche}</span>
                                <span>•</span>
                                <StatusBadge status={website.status} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {deployMessage && (
                        <span className={`text-sm font-medium ${deployMessage.startsWith('✅') ? 'text-green-600' :
                            deployMessage.startsWith('⏳') ? 'text-amber-600' :
                                'text-red-600'
                            }`}>
                            {deployMessage}
                        </span>
                    )}
                    <button
                        onClick={handleDeploy}
                        disabled={deploying}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {deploying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Rocket className="w-4 h-4" />
                        )}
                        {deploying ? 'Deploying...' : 'Deploy'}
                    </button>
                    {website.deployment.pendingChanges > 0 && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            {website.deployment.pendingChanges} pending changes
                        </span>
                    )}
                    {website.template.upgradeAvailable && (
                        <button
                            onClick={() => setActiveTab('upgrades')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <ArrowUpCircle className="w-4 h-4" />
                            Upgrade Available
                        </button>
                    )}
                    <a
                        href={website.deployment.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Site
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-200">
                <nav className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                {/* Show BuildingProgress when status is 'building' */}
                {website.status === 'building' && (
                    <div className="mb-6">
                        <BuildingProgress
                            domain={domain}
                            onComplete={fetchWebsite}
                        />
                    </div>
                )}

                {activeTab === 'overview' && (
                    <OverviewTab
                        website={website}
                        onDeploy={handleDeploy}
                        deploying={deploying}
                        onNewArticle={() => setShowGenerateModal(true)}
                        onEditTheme={() => setActiveTab('theme')}
                        onEditPages={() => setActiveTab('pages')}
                    />
                )}
                {activeTab === 'content' && (
                    <ContentTab
                        domain={domain}
                        niche={website.niche}
                        articles={articles}
                        author={website.author}
                        onRefresh={fetchWebsite}
                    />
                )}
                {activeTab === 'pages' && (
                    <PagesTab
                        domain={domain}
                        onRefresh={fetchWebsite}
                    />
                )}
                {activeTab === 'theme' && (
                    <ThemeEditor
                        domain={domain}
                        onRefresh={fetchWebsite}
                    />
                )}
                {activeTab === 'versions' && (
                    <VersionsTab
                        website={website}
                        onRefresh={fetchWebsite}
                    />
                )}
                {activeTab === 'upgrades' && (
                    <UpgradesTab
                        website={website}
                        onRefresh={fetchWebsite}
                        onDeploy={handleDeploy}
                        deploying={deploying}
                        deployMessage={deployMessage}
                    />
                )}
                {activeTab === 'ai' && (
                    <SiteDecisionsPanel domain={domain} onRefresh={fetchWebsite} />
                )}
                {activeTab === 'settings' && (
                    <SettingsTab website={website} />
                )}
            </div>

            {/* GenerateArticleModal removed - was dead code calling /api/generate */}
        </div>
    );
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        'live': { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
        'building': { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> },
        'setup': { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Settings className="w-3 h-3" /> },
        'pending-deploy': { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Upload className="w-3 h-3" /> },
        'error': { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-3 h-3" /> }
    };

    const c = config[status] || config['setup'];

    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 ${c.bg} ${c.text} rounded-full text-xs font-medium`}>
            {c.icon}
            {status.replace('-', ' ')}
        </span>
    );
}

// ============================================
// OVERVIEW TAB
// ============================================

function OverviewTab({
    website,
    onDeploy,
    deploying,
    onNewArticle,
    onEditTheme,
    onEditPages
}: {
    website: Website;
    onDeploy: () => void;
    deploying: boolean;
    onNewArticle: () => void;
    onEditTheme: () => void;
    onEditPages: () => void;
}) {
    const formatDate = (ts: number) => new Date(ts).toLocaleDateString();
    const [pendingChanges, setPendingChanges] = useState<{
        hasChanges: boolean;
        theme: boolean;
        articles: string[];
        pages: string[];
        plugins: boolean;
        summary: Record<string, string | null>;
    } | null>(null);

    // Fetch pending changes on mount
    useEffect(() => {
        fetch(`/api/websites/${website.domain}/deploy`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setPendingChanges(data.pendingChanges);
                }
            })
            .catch(console.error);
    }, [website.domain]);

    // Build pending items list
    const pendingItems = pendingChanges ? [
        pendingChanges.summary.articlesLabel,
        pendingChanges.summary.pagesLabel,
        pendingChanges.summary.themeLabel,
        pendingChanges.summary.pluginsLabel
    ].filter(Boolean) : [];

    return (
        <div className="space-y-6">
            {/* Quick Actions Bar */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-indigo-900">Quick Actions</h3>
                    {pendingItems.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {pendingItems.map((item, i) => (
                                <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={onNewArticle}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium"
                    >
                        <FileText className="w-4 h-4 text-indigo-600" />
                        New Article
                    </button>
                    <button
                        onClick={onDeploy}
                        disabled={deploying}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                        {deploying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Rocket className="w-4 h-4" />
                        )}
                        {deploying ? 'Deploying...' : pendingItems.length > 0 ? `Deploy (${pendingItems.length})` : 'Deploy'}
                    </button>
                    <a
                        href={website.deployment.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium"
                    >
                        <ExternalLink className="w-4 h-4 text-indigo-600" />
                        View Live Site
                    </a>
                    <button
                        onClick={onEditTheme}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium"
                    >
                        <Palette className="w-4 h-4 text-purple-600" />
                        Edit Theme
                    </button>
                    <button
                        onClick={onEditPages}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium"
                    >
                        <FileText className="w-4 h-4 text-blue-600" />
                        Add Page
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-neutral-900">
                        {website.stats.articlesCount}
                    </div>
                    <div className="text-sm text-neutral-500">Articles</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-neutral-900">
                        {(website.stats.totalWords / 1000).toFixed(1)}k
                    </div>
                    <div className="text-sm text-neutral-500">Words</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">
                        ${website.stats.estimatedMonthlyRevenue}
                    </div>
                    <div className="text-sm text-neutral-500">Est. Revenue/mo</div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl">
                    <div className="text-2xl font-bold text-indigo-600">
                        v{website.template.version}
                    </div>
                    <div className="text-sm text-neutral-500">{website.template.id}</div>
                </div>
            </div>

            {/* AI Fingerprint */}
            <div className="p-4 border border-neutral-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold">AI Fingerprint</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-neutral-500 mb-1">AI Providers</div>
                        <div className="flex flex-wrap gap-1">
                            {website.fingerprint.providers.length > 0
                                ? website.fingerprint.providers.map(p => (
                                    <span key={p} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                                        {p}
                                    </span>
                                ))
                                : <span className="text-neutral-400 text-sm">No providers recorded</span>
                            }
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-neutral-500 mb-1">Content Strategy</div>
                        <div className="font-medium">{website.fingerprint.contentStrategy}</div>
                    </div>
                    <div>
                        <div className="text-sm text-neutral-500 mb-1">E-E-A-T</div>
                        <span className={`px-2 py-0.5 rounded text-xs ${website.fingerprint.eeatEnabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-neutral-100 text-neutral-500'
                            }`}>
                            {website.fingerprint.eeatEnabled ? '✓ Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <div>
                        <div className="text-sm text-neutral-500 mb-1">AI Overview Optimized</div>
                        <span className={`px-2 py-0.5 rounded text-xs ${website.fingerprint.aiOverviewOptimized
                            ? 'bg-green-100 text-green-700'
                            : 'bg-neutral-100 text-neutral-500'
                            }`}>
                            {website.fingerprint.aiOverviewOptimized ? '✓ Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Deployment Info */}
            <div className="p-4 border border-neutral-200 rounded-xl">
                <h3 className="font-semibold mb-3">Deployment</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-neutral-500 mb-1">GitHub</div>
                        {website.deployment.githubRepo ? (
                            <a
                                href={`https://github.com/${website.deployment.githubOwner}/${website.deployment.githubRepo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-indigo-600 hover:underline"
                            >
                                <Github className="w-4 h-4" />
                                {website.deployment.githubOwner}/{website.deployment.githubRepo}
                            </a>
                        ) : (
                            <span className="text-neutral-400">Not connected</span>
                        )}
                    </div>
                    <div>
                        <div className="text-neutral-500 mb-1">Live URL</div>
                        <a
                            href={website.deployment.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                            <ExternalLink className="w-4 h-4" />
                            {website.deployment.liveUrl}
                        </a>
                    </div>
                    <div>
                        <div className="text-neutral-500 mb-1">Last Deploy</div>
                        <span>
                            {website.deployment.lastDeployAt
                                ? formatDate(website.deployment.lastDeployAt)
                                : 'Never'
                            }
                        </span>
                    </div>
                    <div>
                        <div className="text-neutral-500 mb-1">Created</div>
                        <span>{formatDate(website.createdAt)}</span>
                    </div>
                </div>
            </div>

            {/* Author */}
            <div className="p-4 border border-neutral-200 rounded-xl">
                <h3 className="font-semibold mb-3">Author</h3>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                        {website.author.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-medium">{website.author.name}</div>
                        <div className="text-sm text-neutral-500">{website.author.role}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// CONTENT TAB
// ============================================

function ContentTab({
    domain,
    niche,
    articles,
    author,
    onRefresh
}: {
    domain: string;
    niche: string;
    articles: Article[];
    author: { name: string; role: string };
    onRefresh: () => void;
}) {
    const [filter, setFilter] = useState<'all' | 'draft' | 'ready' | 'published'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropZone, setShowDropZone] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showBulkQueue, setShowBulkQueue] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [showPrompts, setShowPrompts] = useState(false);
    const [showImages, setShowImages] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [publishMessage, setPublishMessage] = useState<string | null>(null);
    // V5: Competitor Analysis
    const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false);

    // Get GitHub token from store
    const githubToken = useSettingsStore(state => state.integrations.githubToken);

    // C7 FIX: Auto-clear sync and publish messages after 5 seconds
    useEffect(() => {
        if (syncMessage) {
            const timer = setTimeout(() => setSyncMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [syncMessage]);

    useEffect(() => {
        if (publishMessage) {
            const timer = setTimeout(() => setPublishMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [publishMessage]);

    const filteredArticles = articles.filter(a => {
        if (filter !== 'all' && a.status !== filter) return false;
        if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleDelete = async (articleId: string) => {
        if (!confirm('Delete this article?')) return;

        setDeleting(articleId);
        // C1 FIX: Clear any previous messages
        setSyncMessage(null);

        try {
            const response = await fetch(`/api/websites/${domain}/content/${articleId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSyncMessage('✅ Article deleted successfully');
                onRefresh();
            } else {
                // C1 FIX: Show error message to user
                setSyncMessage(`❌ Delete failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            // C1 FIX: Show error for network/parsing failures
            setSyncMessage(`❌ Delete failed: ${err instanceof Error ? err.message : 'Network error'}`);
        } finally {
            setDeleting(null);
        }
    };

    const handleSync = async () => {
        // Use GitHub token from store
        if (!githubToken) {
            setSyncMessage('⚠️ GitHub token required. Configure in Settings → Integrations.');
            return;
        }

        setSyncing(true);
        setSyncMessage(null);

        try {
            const response = await fetch(`/api/websites/${domain}/sync-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ githubToken })
            });

            const data = await response.json();

            if (data.success) {
                setSyncMessage(
                    `✅ Synced! ${data.result.imported.length} imported, ${data.result.updated.length} updated`
                );
                onRefresh();
            } else {
                setSyncMessage(`❌ ${data.error}`);
            }
        } catch {
            setSyncMessage('❌ Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    // Publish articles to GitHub
    const handlePublish = async (articleIds: string[]) => {
        // Use GitHub token from store
        if (!githubToken) {
            setPublishMessage('⚠️ GitHub token required. Configure in Settings → Integrations.');
            return;
        }

        if (articleIds.length === 0) {
            setPublishMessage('⚠️ No articles selected.');
            return;
        }

        setPublishing(true);
        setPublishMessage(null);

        try {
            const response = await fetch(`/api/websites/${domain}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleIds, githubToken })
            });

            const data = await response.json();

            if (data.success) {
                setPublishMessage(`✅ ${data.message}`);
                setSelectedIds(new Set());
                onRefresh();
            } else {
                setPublishMessage(`❌ ${data.error || data.message}`);
            }
        } catch {
            setPublishMessage('❌ Publish failed');
        } finally {
            setPublishing(false);
        }
    };

    const readyArticleIds = articles.filter(a => a.status === 'ready' || a.status === 'draft').map(a => a.id);

    return (
        <div className="space-y-4">
            {/* Sync Message */}
            {syncMessage && (
                <div className={`p-3 rounded-lg text-sm ${syncMessage.startsWith('✅') ? 'bg-green-50 text-green-700' :
                    syncMessage.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                    }`}>
                    {syncMessage}
                </div>
            )}

            {/* Publish Message */}
            {publishMessage && (
                <div className={`p-3 rounded-lg text-sm ${publishMessage.startsWith('✅') ? 'bg-green-50 text-green-700' :
                    publishMessage.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                    }`}>
                    {publishMessage}
                </div>
            )}

            {/* Drafts Folder Import */}
            <PendingImports domain={domain} onImportComplete={onRefresh} />

            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="px-3 py-2 border border-neutral-200 rounded-lg w-64"
                    />
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as typeof filter)}
                        className="px-3 py-2 border border-neutral-200 rounded-lg"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="ready">Ready</option>
                        <option value="published">Published</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                        title="Sync articles from GitHub"
                    >
                        {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Github className="w-4 h-4" />
                        )}
                        {syncing ? 'Syncing...' : 'Sync GitHub'}
                    </button>
                    <button
                        onClick={() => setShowDropZone(!showDropZone)}
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                    >
                        <Upload className="w-4 h-4" />
                        Import
                    </button>
                    <button
                        onClick={() => setShowPrompts(!showPrompts)}
                        className="flex items-center gap-2 px-4 py-2 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50"
                    >
                        <FileText className="w-4 h-4" />
                        Prompts
                    </button>
                    <button
                        onClick={() => setShowImages(!showImages)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${showImages ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 hover:bg-neutral-50'}`}
                    >
                        <Eye className="w-4 h-4" />
                        Images
                    </button>
                    <button
                        onClick={() => setShowEditor(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                    >
                        <Edit className="w-4 h-4" />
                        Manual
                    </button>
                    <button
                        onClick={() => setShowBulkQueue(!showBulkQueue)}
                        className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50"
                    >
                        <Plus className="w-4 h-4" />
                        Bulk
                    </button>
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate
                    </button>
                    {/* U9 FIX: Clarify publish buttons - Selection vs All Ready */}
                    {/* Only show selection publish if items are selected */}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => handlePublish(Array.from(selectedIds))}
                            disabled={publishing}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Publish ${selectedIds.size} selected article(s) to website`}
                        >
                            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                            Publish Selected ({selectedIds.size})
                        </button>
                    )}
                    {/* Always show the "Publish Ready" button if there are ready articles */}
                    {readyArticleIds.length > 0 && (
                        <button
                            onClick={() => {
                                // C15 FIX: Add confirmation before bulk publish
                                if (confirm(`Publish all ${readyArticleIds.length} draft/ready articles? This will push changes to GitHub.`)) {
                                    handlePublish(readyArticleIds);
                                }
                            }}
                            disabled={publishing}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Publish all ${readyArticleIds.length} draft/ready articles`}
                        >
                            <Send className="w-4 h-4" />
                            Publish All Ready ({readyArticleIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* V5: Competitor Analysis Panel */}
            {showCompetitorAnalysis && (
                <CompetitorAnalysisPanel
                    domain={domain}
                    niche={niche}
                    onClose={() => setShowCompetitorAnalysis(false)}
                />
            )}

            {/* Competitor Analysis Toggle Button (when not expanded) */}
            {!showCompetitorAnalysis && (
                <button
                    onClick={() => setShowCompetitorAnalysis(true)}
                    className="w-full p-4 border border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                    <Globe className="w-5 h-5" />
                    <span className="font-medium">Competitor Analysis</span>
                    <span className="text-xs text-indigo-500">(Playwright MCP)</span>
                </button>
            )}

            {showDropZone && (
                <SmartDropZone
                    domain={domain}
                    niche={niche}
                    websiteCategories={DEFAULT_CATEGORIES}
                    onArticleSaved={onRefresh}
                />
            )}

            {/* Prompt Exporter */}
            {showPrompts && (
                <PromptExporter
                    domain={domain}
                    niche={niche}
                    siteName={domain.split('.')[0]}
                    template="niche-authority"
                    author={author}
                />
            )}

            {/* BulkArticleQueue removed - was dead code calling /api/generate */}

            {/* Manual Editor Modal */}
            {(showEditor || editingArticle) && (
                <ArticleEditor
                    domain={domain}
                    niche={niche}
                    author={author}
                    websiteCategories={DEFAULT_CATEGORIES}
                    initialContent={editingArticle?.content || ''}
                    articleId={editingArticle?.id}
                    onSave={() => { setShowEditor(false); setEditingArticle(null); onRefresh(); }}
                    onClose={() => { setShowEditor(false); setEditingArticle(null); }}
                />
            )}

            {/* Image Gallery */}
            {showImages && (
                <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <ImageGallery domain={domain} />
                </div>
            )}

            {/* Batch Operations Panel */}
            <BatchOperationsPanel
                domain={domain}
                articles={filteredArticles.map(a => ({
                    id: a.id,
                    title: a.title,
                    slug: a.slug,
                    status: a.status,
                    category: a.category,
                    wordCount: a.wordCount
                }))}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onOperationComplete={onRefresh}
            />

            {/* Articles List */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-neutral-50 text-left text-sm text-neutral-600">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredArticles.length && filteredArticles.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(new Set(filteredArticles.map(a => a.id)));
                                        } else {
                                            setSelectedIds(new Set());
                                        }
                                    }}
                                    className="rounded border-neutral-300"
                                />
                            </th>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Words</th>
                            <th className="px-4 py-3">Updated</th>
                            <th className="px-4 py-3 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredArticles.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                                    {articles.length === 0
                                        ? 'No articles yet. Create or import your first article.'
                                        : 'No articles match your filters.'
                                    }
                                </td>
                            </tr>
                        ) : (
                            filteredArticles.map(article => (
                                <tr key={article.id} className={`hover:bg-neutral-50 ${selectedIds.has(article.id) ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(article.id)}
                                            onChange={(e) => {
                                                const newSelected = new Set(selectedIds);
                                                if (e.target.checked) {
                                                    newSelected.add(article.id);
                                                } else {
                                                    newSelected.delete(article.id);
                                                }
                                                setSelectedIds(newSelected);
                                            }}
                                            className="rounded border-neutral-300"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-neutral-900">{article.title}</div>
                                        <div className="text-sm text-neutral-500">/{article.slug}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs">
                                            {article.contentType}
                                        </span>
                                        {article.isExternal && (
                                            <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                                external
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs ${article.status === 'published' ? 'bg-green-100 text-green-700' :
                                            article.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                                                'bg-neutral-100 text-neutral-600'
                                            }`}>
                                            {article.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">
                                        {article.wordCount.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">
                                        {new Date(article.lastModifiedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setEditingArticle(article)}
                                                className="p-1 hover:bg-neutral-100 rounded"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4 text-neutral-500" />
                                            </button>
                                            <a
                                                href={`https://${domain}/${article.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 hover:bg-neutral-100 rounded"
                                                title="Preview"
                                            >
                                                <Eye className="w-4 h-4 text-neutral-500" />
                                            </a>
                                            <ArticleActionsMenu
                                                domain={domain}
                                                articleSlug={article.slug}
                                                articleTitle={article.title}
                                                canonicalUrl={`https://${domain}/${article.slug}`}
                                                onDelete={() => handleDelete(article.id)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="text-sm text-neutral-500">
                Showing {filteredArticles.length} of {articles.length} articles
            </div>

            {/* Generation History */}
            <div className="mt-4">
                <GenerationHistory />
            </div>

            {/* GenerateArticleModal removed - was dead code calling /api/generate */}
        </div>
    );
}

// ============================================
// VERSIONS TAB
// ============================================

function VersionsTab({
    website,
    onRefresh
}: {
    website: Website;
    onRefresh: () => void;
}) {
    const [rolling, setRolling] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRollback = async (version: string) => {
        if (!confirm(`Rollback to version ${version}? Content will be preserved.`)) return;

        setRolling(version);
        setError(null);

        try {
            const response = await fetch(`/api/websites/${website.domain}/rollback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetVersion: version, acknowledgeWarnings: true })
            });

            const data = await response.json();

            if (data.success) {
                onRefresh();
            } else {
                setError(data.error || 'Rollback failed');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setRolling(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Version History</h3>
                    <p className="text-sm text-neutral-500">
                        Last 5 template versions. Content is preserved during rollback.
                    </p>
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    Current: v{website.template.version}
                </span>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                {website.versions.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 border border-neutral-200 rounded-xl">
                        No version history yet
                    </div>
                ) : (
                    website.versions.map((version, index) => (
                        <div
                            key={version.version}
                            className={`p-4 border rounded-xl ${index === 0 ? 'border-indigo-300 bg-indigo-50' : 'border-neutral-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">v{version.version}</span>
                                        {index === 0 && (
                                            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs">
                                                Current
                                            </span>
                                        )}
                                        <span className="text-sm text-neutral-500">
                                            (Template: v{version.templateVersion})
                                        </span>
                                    </div>
                                    <div className="text-sm text-neutral-500 mt-1">
                                        Deployed: {new Date(version.deployedAt).toLocaleDateString()}
                                    </div>
                                    <ul className="mt-2 text-sm text-neutral-600">
                                        {version.changes.map((change, i) => (
                                            <li key={i}>• {change}</li>
                                        ))}
                                    </ul>
                                </div>
                                {version.canRollback && index > 0 && (
                                    <button
                                        onClick={() => handleRollback(version.version)}
                                        disabled={rolling === version.version}
                                        className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        {rolling === version.version ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RotateCcw className="w-4 h-4" />
                                        )}
                                        Rollback
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ============================================
// UPGRADES TAB
// ============================================

interface UpgradeInfo {
    available: boolean;
    latestVersion?: string;
    changelog?: string[];
    compatibility?: { warnings: string[] };
}

function UpgradesTab({
    website,
    onRefresh,
    onDeploy,
    deploying: deployingProp,
    deployMessage: deployMessageProp
}: {
    website: Website;
    onRefresh: () => void;
    onDeploy: () => Promise<void>;
    deploying: boolean;
    deployMessage: string | null;
}) {
    const [upgradeInfo, setUpgradeInfo] = useState<UpgradeInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use props from parent for deploy state
    const deploying = deployingProp;
    const deployMessage = deployMessageProp;

    useEffect(() => {
        const fetchUpgrade = async () => {
            try {
                const response = await fetch(`/api/websites/${website.domain}/upgrade`);
                const data = await response.json();
                if (data.success) {
                    setUpgradeInfo(data);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchUpgrade();
    }, [website.domain]);

    const handleUpgrade = async () => {
        if (!confirm('Apply template upgrade? Your content will be preserved.')) return;

        setUpgrading(true);
        setError(null);

        try {
            const response = await fetch(`/api/websites/${website.domain}/upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acknowledgeWarnings: true })
            });

            const data = await response.json();

            if (data.success) {
                onRefresh();
            } else {
                setError(data.error || 'Upgrade failed');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setUpgrading(false);
        }
    };

    // Use shared deploy function from parent
    const handleDeploy = onDeploy;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold">Template Upgrades</h3>
                <p className="text-sm text-neutral-500">
                    Current template: {website.template.id} v{website.template.version}
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Step 2: Pending Deploy - Show after upgrade */}
            {website.status === 'pending-deploy' && (
                <div className="p-6 border-2 border-green-200 bg-green-50 rounded-xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-900">
                                    Step 1: Upgrade Complete ✓
                                </span>
                            </div>
                            <p className="text-sm text-green-700 mb-3">
                                Template upgraded to v{website.template.version}.
                                Now deploy to apply changes to your live site.
                            </p>
                            {deployMessage && (
                                <div className={`text-sm font-medium ${deployMessage.startsWith('✅') ? 'text-green-700' :
                                    deployMessage.startsWith('⏳') ? 'text-amber-700' :
                                        'text-red-700'
                                    }`}>
                                    {deployMessage}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleDeploy}
                            disabled={deploying}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {deploying ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Rocket className="w-4 h-4" />
                            )}
                            {deploying ? 'Deploying...' : 'Step 2: Deploy Now'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 1: Upgrade Available */}
            {upgradeInfo?.available && website.status !== 'pending-deploy' ? (
                <div className="p-6 border-2 border-indigo-200 bg-indigo-50 rounded-xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                                <span className="font-semibold text-indigo-900">
                                    v{upgradeInfo.latestVersion} Available
                                </span>
                            </div>
                            <div className="text-sm text-indigo-700 space-y-1">
                                {upgradeInfo.changelog?.slice(0, 5).map((line: string, i: number) => (
                                    <div key={i}>{line}</div>
                                ))}
                            </div>

                            {(upgradeInfo.compatibility?.warnings?.length ?? 0) > 0 && (
                                <div className="mt-4 p-3 bg-amber-100 border border-amber-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        Compatibility Warnings
                                    </div>
                                    <ul className="text-sm text-amber-700">
                                        {upgradeInfo.compatibility?.warnings?.map((w: string, i: number) => (
                                            <li key={i}>• {w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleUpgrade}
                            disabled={upgrading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {upgrading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowUpCircle className="w-4 h-4" />
                            )}
                            Step 1: Upgrade Now
                        </button>
                    </div>
                </div>
            ) : website.status !== 'pending-deploy' && (
                <div className="p-8 text-center border border-neutral-200 rounded-xl">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <h4 className="font-semibold text-neutral-900">You&apos;re Up to Date!</h4>
                    <p className="text-neutral-500 text-sm mt-1">
                        Running the latest version of {website.template.id}
                    </p>
                </div>
            )}
        </div>
    );
}

// ============================================
// SETTINGS TAB
// ============================================

function SettingsTab({ website }: { website: Website }) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold mb-4">Website Settings</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Site Name
                        </label>
                        <input
                            type="text"
                            defaultValue={website.name}
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Niche
                        </label>
                        <input
                            type="text"
                            defaultValue={website.niche}
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            <hr className="border-neutral-200" />

            {/* DNS Configuration */}
            <div>
                <h3 className="font-semibold mb-4">DNS Configuration</h3>
                <DNSConfigPanel domain={website.domain} />
            </div>

            <hr className="border-neutral-200" />

            <div>
                <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>
                <button className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                    Delete Website
                </button>
            </div>
        </div>
    );
}
