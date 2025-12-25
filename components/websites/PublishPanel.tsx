'use client';

import { useState, useEffect } from 'react';
import {
    Upload,
    Globe,
    ExternalLink,
    CheckCircle,
    Loader2,
    AlertCircle,
    Link2,
    Github,
    Rocket
} from 'lucide-react';

interface Article {
    slug: string;
    title: string;
}

interface DomainConfig {
    name: string;
    repoOwner: string;
    repoName: string;
    branch: string;
    projectId?: string;
    projectUrl?: string;
}

interface PublishPanelProps {
    articles: Article[];
    devtoConnected: boolean;
    onSyndicateToDevto: (articleSlug: string, canonicalUrl: string) => Promise<void>;
}

// Storage keys - shared with AutoConfigureWizard
const STORAGE_KEYS = {
    githubToken: 'ifrit_github_token',
    domainConfigs: 'ifrit_domain_configs'
};

export default function PublishPanel({
    articles,
    devtoConnected,
    onSyndicateToDevto
}: PublishPanelProps) {
    const [selectedArticle, setSelectedArticle] = useState<string>('');
    const [selectedDomain, setSelectedDomain] = useState<string>('');
    const [publishing, setPublishing] = useState(false);
    const [syndicating, setSyndicating] = useState(false);
    const [publishResult, setPublishResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

    // Domain configurations (loaded from auto-configure)
    const [domainConfigs, setDomainConfigs] = useState<DomainConfig[]>([]);
    const [githubToken, setGithubToken] = useState('');

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setGithubToken(localStorage.getItem(STORAGE_KEYS.githubToken) || '');
            const savedConfigs = localStorage.getItem(STORAGE_KEYS.domainConfigs);
            if (savedConfigs) {
                try {
                    const configs = JSON.parse(savedConfigs);
                    setDomainConfigs(configs);
                    if (configs.length > 0) {
                        setSelectedDomain(configs[0].name);
                    }
                } catch (err) {
                    // C5 FIX: Log parse errors instead of silently swallowing
                    console.warn('Failed to parse domain configs:', err);
                }
            }
        }
    }, []);

    const handlePublish = async () => {
        if (!selectedArticle || !selectedDomain) return;

        const domainConfig = domainConfigs.find(c => c.name === selectedDomain);
        if (!domainConfig) {
            setPublishResult({ success: false, message: 'Domain not configured. Run Auto-Configure first.' });
            return;
        }

        if (!githubToken) {
            setPublishResult({ success: false, message: 'GitHub token not found. Run Auto-Configure first.' });
            return;
        }

        setPublishing(true);
        setPublishResult(null);

        try {
            const response = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleSlug: selectedArticle,
                    domain: selectedDomain,
                    githubToken,
                    repoOwner: domainConfig.repoOwner,
                    repoName: domainConfig.repoName,
                    branch: domainConfig.branch || 'main'
                })
            });

            const data = await response.json();

            if (data.success) {
                setPublishResult({
                    success: true,
                    message: data.message,
                    url: data.articleUrl
                });
            } else {
                setPublishResult({
                    success: false,
                    message: data.error || 'Publish failed'
                });
            }
        } catch (error) {
            setPublishResult({
                success: false,
                message: error instanceof Error ? error.message : 'Publish failed'
            });
        } finally {
            setPublishing(false);
        }
    };

    const handleSyndicate = async () => {
        if (!selectedArticle || !selectedDomain) return;

        setSyndicating(true);
        setPublishResult(null);

        try {
            const canonicalUrl = `https://${selectedDomain}/${selectedArticle}`;
            await onSyndicateToDevto(selectedArticle, canonicalUrl);
            setPublishResult({ success: true, message: 'Syndicated to Dev.to with canonical URL' });
        } catch (error) {
            setPublishResult({
                success: false,
                message: error instanceof Error ? error.message : 'Syndication failed'
            });
        } finally {
            setSyndicating(false);
        }
    };

    const isConfigured = githubToken && domainConfigs.length > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Publish Article</h3>
                    <p className="text-sm text-neutral-500">Deploy to your configured domains</p>
                </div>
                {isConfigured && (
                    <div className="ml-auto flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {domainConfigs.length} domain{domainConfigs.length > 1 ? 's' : ''} configured
                    </div>
                )}
            </div>

            {!isConfigured && (
                <div className="mb-4 p-4 bg-amber-50 text-amber-700 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Not Configured</p>
                        <p className="text-sm mt-1">
                            Use the Auto-Configure wizard above to set up GitHub repos and Vercel projects for your domains.
                        </p>
                    </div>
                </div>
            )}

            {articles.length === 0 ? (
                <div className="bg-neutral-50 rounded-lg p-6 text-center">
                    <p className="text-neutral-500">No articles to publish. Generate some content in the Websites tab!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Article Selection */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Select Article
                        </label>
                        <select
                            value={selectedArticle}
                            onChange={(e) => setSelectedArticle(e.target.value)}
                            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Choose an article...</option>
                            {articles.map((article) => (
                                <option key={article.slug} value={article.slug}>
                                    {article.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Domain Selection */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Target Domain
                        </label>
                        {domainConfigs.length === 0 ? (
                            <div className="p-3 bg-neutral-100 text-neutral-500 rounded-lg text-sm">
                                No domains configured. Run Auto-Configure first.
                            </div>
                        ) : (
                            <select
                                value={selectedDomain}
                                onChange={(e) => setSelectedDomain(e.target.value)}
                                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                {domainConfigs.map((config) => (
                                    <option key={config.name} value={config.name}>
                                        {config.name} → {config.repoOwner}/{config.repoName}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handlePublish}
                            disabled={!selectedArticle || !selectedDomain || publishing || !isConfigured}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {publishing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Github className="w-4 h-4" />
                            )}
                            Publish to GitHub
                        </button>

                        <button
                            onClick={handleSyndicate}
                            disabled={!selectedArticle || !selectedDomain || !devtoConnected || syndicating}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {syndicating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Link2 className="w-4 h-4" />
                            )}
                            Syndicate to Dev.to
                        </button>
                    </div>

                    {!devtoConnected && (
                        <p className="text-xs text-neutral-500 text-center">
                            Connect Dev.to in the Integrations tab to enable syndication
                        </p>
                    )}

                    {/* Result Message */}
                    {publishResult && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${publishResult.success
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                            }`}>
                            {publishResult.success ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <AlertCircle className="w-4 h-4" />
                            )}
                            <span className="text-sm flex-1">{publishResult.message}</span>
                            {publishResult.url && (
                                <a
                                    href={publishResult.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-green-600 hover:text-green-700"
                                >
                                    View <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Publishing Flow Info */}
            {isConfigured && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <h4 className="font-medium text-sm text-indigo-800 mb-2 flex items-center gap-2">
                        <Rocket className="w-4 h-4" />
                        Publishing Flow
                    </h4>
                    <div className="text-xs text-indigo-700 space-y-1">
                        <p>1. Article pushed to GitHub repo → 2. Vercel auto-deploys → 3. Live at domain!</p>
                    </div>
                </div>
            )}
        </div>
    );
}
