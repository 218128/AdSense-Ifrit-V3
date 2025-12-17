'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Globe,
    Share2,
    Search,
    ExternalLink,
    CheckCircle,
    XCircle,
    Loader2,
    RefreshCw,
    AlertTriangle,
    Upload,
    Save
} from 'lucide-react';
import DomainSetup from './DomainSetup';
import PublishPanel from './PublishPanel';
import AutoConfigureWizard from './AutoConfigureWizard';


type TabId = 'domains' | 'integrations' | 'seo' | 'publish';

interface ConnectionStatus {
    devto: 'unknown' | 'testing' | 'connected' | 'failed';
    namecheap: 'unknown' | 'testing' | 'connected' | 'failed';
}

interface NamecheapDomain {
    name: string;
    expires: string;
    isExpired: boolean;
    autoRenew: boolean;
}

interface ArticleForAudit {
    slug: string;
    title: string;
}

interface SEOAuditResult {
    score: number;
    issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; fix: string }>;
}

// Storage keys
const STORAGE_KEYS = {
    devtoKey: 'ifrit_devto_api_key',
    namecheapUser: 'ifrit_namecheap_api_user',
    namecheapKey: 'ifrit_namecheap_api_key',
    namecheapUsername: 'ifrit_namecheap_username',
    namecheapClientIp: 'ifrit_namecheap_client_ip',
    namecheapDomains: 'ifrit_namecheap_domains'
};

function getStorageItem(key: string): string {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(key) || '';
    }
    return '';
}

function setStorageItem(key: string, value: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
    }
}

interface StoreDashboardProps {
    articles?: ArticleForAudit[];
}

export default function StoreDashboard({ articles = [] }: StoreDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabId>('domains');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
        devto: 'unknown',
        namecheap: 'unknown'
    });
    const [saveConfirmation, setSaveConfirmation] = useState(false);

    // Integration credentials state - initialized from localStorage
    const [devtoKey, setDevtoKey] = useState('');
    const [devtoUser, setDevtoUser] = useState<string | null>(null);
    const [namecheapUser, setNamecheapUser] = useState('');
    const [namecheapKey, setNamecheapKey] = useState('');
    const [namecheapUsername, setNamecheapUsername] = useState('');
    const [namecheapClientIp, setNamecheapClientIp] = useState('');

    // Namecheap domains
    const [namecheapDomains, setNamecheapDomains] = useState<NamecheapDomain[]>([]);
    const [fetchingDomains, setFetchingDomains] = useState(false);

    // SEO Audit state
    const [selectedArticle, setSelectedArticle] = useState<string>('');
    const [auditResult, setAuditResult] = useState<SEOAuditResult | null>(null);
    const [auditing, setAuditing] = useState(false);

    // Key to force refresh of PublishPanel when config changes
    const [publishPanelKey, setPublishPanelKey] = useState(0);

    // Load from localStorage on mount
    useEffect(() => {
        setDevtoKey(getStorageItem(STORAGE_KEYS.devtoKey));
        setNamecheapUser(getStorageItem(STORAGE_KEYS.namecheapUser));
        setNamecheapKey(getStorageItem(STORAGE_KEYS.namecheapKey));
        setNamecheapUsername(getStorageItem(STORAGE_KEYS.namecheapUsername));
        setNamecheapClientIp(getStorageItem(STORAGE_KEYS.namecheapClientIp));

        // Load cached domains
        const cachedDomains = getStorageItem(STORAGE_KEYS.namecheapDomains);
        if (cachedDomains) {
            try {
                setNamecheapDomains(JSON.parse(cachedDomains));
                setConnectionStatus(prev => ({ ...prev, namecheap: 'connected' }));
            } catch { }
        }
    }, []);

    const tabs = [
        { id: 'domains' as TabId, label: 'Domains', icon: Globe },
        { id: 'integrations' as TabId, label: 'Integrations', icon: Share2 },
        { id: 'publish' as TabId, label: 'Publish', icon: Upload },
        { id: 'seo' as TabId, label: 'SEO Tools', icon: Search }
    ];

    const saveIntegrations = useCallback(() => {
        setStorageItem(STORAGE_KEYS.devtoKey, devtoKey);
        setStorageItem(STORAGE_KEYS.namecheapUser, namecheapUser);
        setStorageItem(STORAGE_KEYS.namecheapKey, namecheapKey);
        setStorageItem(STORAGE_KEYS.namecheapUsername, namecheapUsername);
        setStorageItem(STORAGE_KEYS.namecheapClientIp, namecheapClientIp);

        setSaveConfirmation(true);
        setTimeout(() => setSaveConfirmation(false), 2000);
    }, [devtoKey, namecheapUser, namecheapKey, namecheapUsername, namecheapClientIp]);

    // Test Dev.to via proxy API
    const testDevToConnection = async () => {
        if (!devtoKey) {
            alert('Please enter your Dev.to API key first');
            return;
        }

        // Save first
        setStorageItem(STORAGE_KEYS.devtoKey, devtoKey);

        setConnectionStatus(prev => ({ ...prev, devto: 'testing' }));
        setDevtoUser(null);

        try {
            const response = await fetch('/api/test-devto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: devtoKey })
            });

            const data = await response.json();

            if (data.success) {
                setConnectionStatus(prev => ({ ...prev, devto: 'connected' }));
                setDevtoUser(data.user?.username || 'Connected');
            } else {
                setConnectionStatus(prev => ({ ...prev, devto: 'failed' }));
            }
        } catch {
            setConnectionStatus(prev => ({ ...prev, devto: 'failed' }));
        }
    };

    // Fetch Namecheap domains via proxy API
    const fetchNamecheapDomains = async () => {
        if (!namecheapUser || !namecheapKey || !namecheapUsername || !namecheapClientIp) {
            alert('Please fill in all Namecheap credentials first');
            return;
        }

        // Save first
        setStorageItem(STORAGE_KEYS.namecheapUser, namecheapUser);
        setStorageItem(STORAGE_KEYS.namecheapKey, namecheapKey);
        setStorageItem(STORAGE_KEYS.namecheapUsername, namecheapUsername);
        setStorageItem(STORAGE_KEYS.namecheapClientIp, namecheapClientIp);

        setFetchingDomains(true);
        setConnectionStatus(prev => ({ ...prev, namecheap: 'testing' }));

        try {
            const response = await fetch('/api/namecheap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiUser: namecheapUser,
                    apiKey: namecheapKey,
                    username: namecheapUsername,
                    clientIp: namecheapClientIp,
                    command: 'getDomains'
                })
            });

            const data = await response.json();

            if (data.success) {
                setConnectionStatus(prev => ({ ...prev, namecheap: 'connected' }));
                setNamecheapDomains(data.domains || []);
                // Cache domains
                setStorageItem(STORAGE_KEYS.namecheapDomains, JSON.stringify(data.domains || []));
            } else {
                setConnectionStatus(prev => ({ ...prev, namecheap: 'failed' }));
                alert(data.error || 'Failed to fetch domains');
            }
        } catch {
            setConnectionStatus(prev => ({ ...prev, namecheap: 'failed' }));
        } finally {
            setFetchingDomains(false);
        }
    };

    // Run SEO Audit - REAL API CALL
    const runSEOAudit = async () => {
        if (!selectedArticle) return;

        setAuditing(true);
        setAuditResult(null);

        try {
            const response = await fetch(`/api/seo/audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleSlug: selectedArticle })
            });

            const data = await response.json();

            if (data.success) {
                setAuditResult(data.result);
            } else {
                setAuditResult({
                    score: 0,
                    issues: [{
                        type: 'error',
                        message: data.error || 'SEO Audit Failed',
                        fix: 'Check API configuration or try again'
                    }]
                });
            }
        } catch (error) {
            setAuditResult({
                score: 0,
                issues: [{
                    type: 'error',
                    message: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    fix: 'Check if the server is running and API is available'
                }]
            });
        } finally {
            setAuditing(false);
        }
    };



    const handleSyndicateToDevto = async (articleSlug: string, canonicalUrl: string) => {
        // This would call the Dev.to API via proxy
        console.log(`Syndicating ${articleSlug} to Dev.to with canonical: ${canonicalUrl}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    };

    const getStatusIcon = (status: ConnectionStatus['devto']) => {
        switch (status) {
            case 'testing':
                return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
            case 'connected':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return null;
        }
    };


    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Domains Tab */}
            {activeTab === 'domains' && (
                <div className="space-y-6">
                    {/* Namecheap Domains Section */}
                    {namecheapDomains.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-sm">Namecheap Domains ({namecheapDomains.length})</h3>
                                <button
                                    onClick={fetchNamecheapDomains}
                                    disabled={fetchingDomains}
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                >
                                    <RefreshCw className={`w-3 h-3 ${fetchingDomains ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {namecheapDomains.map((domain, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-neutral-400" />
                                            <span className="font-medium text-sm">{domain.name}</span>
                                            {domain.isExpired && (
                                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">Expired</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-neutral-500">Exp: {domain.expires}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DomainSetup />

                    {namecheapDomains.length === 0 && (
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-sm text-blue-700">
                                💡 Configure Namecheap in the <strong>Integrations</strong> tab to fetch your domains
                            </p>
                        </div>
                    )}
                </div>
            )}



            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className="space-y-6">
                    {/* Dev.to Integration */}
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold">D</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Dev.to</h3>
                                    <p className="text-sm text-neutral-500">Cross-publish articles</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(connectionStatus.devto)}
                                {devtoUser && connectionStatus.devto === 'connected' && (
                                    <span className="text-xs text-green-600">@{devtoUser}</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    value={devtoKey}
                                    onChange={(e) => setDevtoKey(e.target.value)}
                                    placeholder="Get from dev.to/settings/extensions"
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={testDevToConnection}
                                    disabled={connectionStatus.devto === 'testing'}
                                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {connectionStatus.devto === 'testing' ? 'Testing...' : 'Test Connection'}
                                </button>
                                <a
                                    href="https://dev.to/settings/extensions"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                >
                                    Get API Key <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Namecheap Integration */}
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold">N</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Namecheap</h3>
                                    <p className="text-sm text-neutral-500">Domain management</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(connectionStatus.namecheap)}
                                {connectionStatus.namecheap === 'connected' && (
                                    <span className="text-xs text-green-600">{namecheapDomains.length} domains</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                                        API User
                                    </label>
                                    <input
                                        type="text"
                                        value={namecheapUser}
                                        onChange={(e) => setNamecheapUser(e.target.value)}
                                        placeholder="API username"
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={namecheapUsername}
                                        onChange={(e) => setNamecheapUsername(e.target.value)}
                                        placeholder="Namecheap username"
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    value={namecheapKey}
                                    onChange={(e) => setNamecheapKey(e.target.value)}
                                    placeholder="API key from Namecheap"
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Your IP Address
                                </label>
                                <input
                                    type="text"
                                    value={namecheapClientIp}
                                    onChange={(e) => setNamecheapClientIp(e.target.value)}
                                    placeholder="Required for Namecheap API"
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={fetchNamecheapDomains}
                                    disabled={fetchingDomains}
                                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {fetchingDomains ? 'Fetching...' : 'Fetch Domains'}
                                </button>
                                <a
                                    href="https://www.namecheap.com/support/api/intro/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                >
                                    Get API Access <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>


                    {/* Save Button */}
                    <button
                        onClick={saveIntegrations}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saveConfirmation ? '✓ Saved!' : 'Save Integration Settings'}
                    </button>
                </div>
            )}

            {/* Publish Tab */}
            {activeTab === 'publish' && (
                <div className="space-y-6">
                    {/* Auto-Configure Wizard */}
                    <AutoConfigureWizard
                        namecheapDomains={namecheapDomains.map(d => ({ name: d.name, expires: d.expires }))}
                        onComplete={() => setPublishPanelKey(prev => prev + 1)}
                    />

                    {/* Manual Publishing */}
                    <div className="border-t border-neutral-200 pt-6">
                        <h3 className="font-semibold text-lg mb-4">Manual Publishing</h3>
                        <PublishPanel
                            key={publishPanelKey}
                            articles={articles}
                            devtoConnected={connectionStatus.devto === 'connected'}
                            onSyndicateToDevto={handleSyndicateToDevto}
                        />
                    </div>
                </div>
            )}

            {/* SEO Tools Tab */}
            {activeTab === 'seo' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5 text-green-600" />
                            SEO Article Audit
                        </h3>

                        {articles.length === 0 ? (
                            <div className="bg-neutral-50 rounded-lg p-4 text-center text-neutral-500">
                                <p className="text-sm">No articles available. Generate some content first!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                                        Select Article to Audit
                                    </label>
                                    <select
                                        value={selectedArticle}
                                        onChange={(e) => {
                                            setSelectedArticle(e.target.value);
                                            setAuditResult(null);
                                        }}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="">Choose an article...</option>
                                        {articles.map((article) => (
                                            <option key={article.slug} value={article.slug}>
                                                {article.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={runSEOAudit}
                                    disabled={!selectedArticle || auditing}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {auditing ? 'Auditing...' : 'Run SEO Audit'}
                                </button>

                                {auditResult && (
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`text-3xl font-bold ${auditResult.score >= 80 ? 'text-green-600' :
                                                auditResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                {auditResult.score}
                                            </div>
                                            <div className="text-sm text-neutral-500">SEO Score</div>
                                        </div>

                                        <div className="space-y-2">
                                            {auditResult.issues.map((issue, i) => (
                                                <div key={i} className={`p-3 rounded-lg text-sm ${issue.type === 'error' ? 'bg-red-50 text-red-700' :
                                                    issue.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                                                        'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        <span className="font-medium">{issue.message}</span>
                                                    </div>
                                                    <div className="mt-1 text-xs opacity-75">Fix: {issue.fix}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                        <h3 className="font-semibold mb-4">Backlink Strategy</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                <span className="text-blue-600">📌</span>
                                <span className="text-sm">Submit to Hacker News for tech articles</span>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                                <span className="text-purple-600">📌</span>
                                <span className="text-sm">Share on relevant Reddit communities</span>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                                <span className="text-green-600">📌</span>
                                <span className="text-sm">Cross-post to Dev.to with canonical URL</span>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                                <span className="text-orange-600">📌</span>
                                <span className="text-sm">Answer Quora questions with article links</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
