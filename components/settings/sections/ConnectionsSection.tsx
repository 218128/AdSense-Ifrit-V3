'use client';

import { useState, useCallback } from 'react';
import { Github, Cloud, Search, ShoppingCart, Image, BarChart3, Share2, Server } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { checkGitHubHealth, checkVercelHealth, type ServiceHealth } from '@/lib/config/healthMonitor';
import { HealthStatusIndicator } from '../HealthStatusIndicator';
import { ConnectionGroup } from '../shared/ConnectionGroup';
import { ApiKeyInput } from '../shared/ApiKeyInput';
import { IntegrationManager } from '../shared/IntegrationManager';

export function ConnectionsSection() {
    const store = useSettingsStore();
    const { integrations, setIntegration } = store;

    // UI state for testing
    const [testingGithub, setTestingGithub] = useState(false);
    const [testingVercel, setTestingVercel] = useState(false);

    // Health status
    const [githubHealth, setGithubHealth] = useState<ServiceHealth | undefined>();
    const [vercelHealth, setVercelHealth] = useState<ServiceHealth | undefined>();

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

    const handleTestGitHub = async () => {
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
    };

    const handleTestVercel = async () => {
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
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-neutral-500">
                Configure external APIs for website deployment, domain hunting, media, and analytics.
            </p>

            {/* Deployment - Required */}
            <ConnectionGroup
                title="Deployment (Required)"
                icon={<Cloud className="w-5 h-5" />}
                description="GitHub & Vercel for website creation and hosting"
                defaultOpen={true}
            >
                <div className="grid md:grid-cols-2 gap-4">
                    {/* GitHub */}
                    <div className="p-3 bg-neutral-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Github className="w-4 h-4 text-white" />
                            <span className="font-medium text-sm text-white">GitHub</span>
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
                        <ApiKeyInput
                            value={integrations.githubToken}
                            onChange={(e) => setIntegration('githubToken', e.target.value)}
                            placeholder="ghp_xxxx or github_pat_xxxx"
                            variant="dark"
                        />
                        <button
                            onClick={handleTestGitHub}
                            disabled={!integrations.githubToken || testingGithub}
                            className="w-full mt-2 px-3 py-2 bg-white text-neutral-800 rounded-lg text-sm disabled:opacity-50"
                        >
                            {testingGithub ? 'Testing...' : integrations.githubUser ? `✓ ${integrations.githubUser}` : 'Connect'}
                        </button>
                    </div>

                    {/* Vercel */}
                    <div className="p-3 bg-neutral-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Cloud className="w-4 h-4 text-white" />
                            <span className="font-medium text-sm text-white">Vercel</span>
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
                        <ApiKeyInput
                            value={integrations.vercelToken}
                            onChange={(e) => setIntegration('vercelToken', e.target.value)}
                            placeholder="vercel_xxxx"
                            variant="dark"
                        />
                        <button
                            onClick={handleTestVercel}
                            disabled={!integrations.vercelToken || testingVercel}
                            className="w-full mt-2 px-3 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50"
                        >
                            {testingVercel ? 'Testing...' : integrations.vercelUser ? `✓ ${integrations.vercelUser}` : 'Connect'}
                        </button>
                    </div>
                </div>

                {/* Resource Manager for GitHub/Vercel Management */}
                <IntegrationManager />
            </ConnectionGroup>

            {/* Domain Tools */}
            <ConnectionGroup
                title="Domain Tools"
                icon={<Search className="w-5 h-5" />}
                description="APIs for expired domain discovery and registration"
                defaultOpen={false}
            >
                <div className="space-y-4">
                    {/* Spamzilla */}
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <h5 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                            💎 Spamzilla API (Premium)
                        </h5>
                        <p className="text-xs text-indigo-600 mb-3">
                            Full SEO metrics for expired domains.{' '}
                            <a href="https://spamzilla.io" target="_blank" rel="noopener noreferrer" className="underline">
                                Get API key
                            </a>
                        </p>
                        <ApiKeyInput
                            value={integrations.spamzillaKey}
                            onChange={(e) => setIntegration('spamzillaKey', e.target.value)}
                            placeholder="Your Spamzilla API Key"
                        />
                    </div>

                    {/* Namecheap */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <h5 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                            🛒 Namecheap API
                        </h5>
                        <p className="text-xs text-amber-600 mb-3">
                            Domain availability checks.{' '}
                            <a href="https://ap.www.namecheap.com/settings/tools/apiaccess/" target="_blank" rel="noopener noreferrer" className="underline">
                                Get credentials
                            </a>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={integrations.namecheapUser}
                                onChange={(e) => setIntegration('namecheapUser', e.target.value)}
                                className="px-4 py-2 border rounded-lg text-sm"
                                placeholder="API User"
                            />
                            <ApiKeyInput
                                value={integrations.namecheapKey}
                                onChange={(e) => setIntegration('namecheapKey', e.target.value)}
                                placeholder="API Key"
                            />
                        </div>
                    </div>

                    {/* Cloudflare */}
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <h5 className="font-medium text-orange-900 mb-2">☁️ Cloudflare Registrar</h5>
                        <p className="text-xs text-orange-600 mb-3">
                            At-cost domain renewals (.com = $10.11/yr).{' '}
                            <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="underline">
                                Get token
                            </a>
                        </p>
                        <ApiKeyInput
                            value={integrations.cloudflareToken}
                            onChange={(e) => setIntegration('cloudflareToken', e.target.value)}
                            placeholder="Cloudflare API Token"
                        />
                    </div>

                    {/* GoDaddy */}
                    <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                        <h5 className="font-medium text-teal-900 mb-2">🌐 GoDaddy API</h5>
                        <p className="text-xs text-teal-600 mb-3">
                            Domain auctions access.{' '}
                            <a href="https://developer.godaddy.com/keys" target="_blank" rel="noopener noreferrer" className="underline">
                                Get credentials
                            </a>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <ApiKeyInput
                                value={integrations.godaddyKey}
                                onChange={(e) => setIntegration('godaddyKey', e.target.value)}
                                placeholder="API Key"
                            />
                            <ApiKeyInput
                                value={integrations.godaddySecret}
                                onChange={(e) => setIntegration('godaddySecret', e.target.value)}
                                placeholder="API Secret"
                            />
                        </div>
                    </div>
                </div>
            </ConnectionGroup>

            {/* Media */}
            <ConnectionGroup
                title="Media & Images"
                icon={<Image className="w-5 h-5" />}
                description="Stock photo APIs for article cover images"
                defaultOpen={false}
            >
                <div className="space-y-4">
                    {/* Unsplash */}
                    <div className="p-4 bg-neutral-800 rounded-xl">
                        <h5 className="font-semibold mb-2 text-white flex items-center gap-2">
                            📷 Unsplash API
                        </h5>
                        <p className="text-xs text-neutral-400 mb-3">
                            Free tier: 50 requests/hour.{' '}
                            <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                Get key
                            </a>
                        </p>
                        <ApiKeyInput
                            value={integrations.unsplashKey}
                            onChange={(e) => setIntegration('unsplashKey', e.target.value)}
                            placeholder="Enter Unsplash Access Key"
                            variant="dark"
                        />
                    </div>

                    {/* Pexels */}
                    <div className="p-4 bg-neutral-800 rounded-xl">
                        <h5 className="font-semibold mb-2 text-white flex items-center gap-2">
                            🖼️ Pexels API (Backup)
                        </h5>
                        <p className="text-xs text-neutral-400 mb-3">
                            More generous limits.{' '}
                            <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                Get key
                            </a>
                        </p>
                        <ApiKeyInput
                            value={integrations.pexelsKey}
                            onChange={(e) => setIntegration('pexelsKey', e.target.value)}
                            placeholder="Enter Pexels API Key"
                            variant="dark"
                        />
                    </div>
                </div>
            </ConnectionGroup>

            {/* Analytics */}
            <ConnectionGroup
                title="Analytics"
                icon={<BarChart3 className="w-5 h-5" />}
                description="Privacy-focused analytics for your websites"
                defaultOpen={false}
            >
                <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                    <h5 className="font-medium text-violet-900 mb-2 flex items-center gap-2">
                        📊 Umami Analytics
                    </h5>
                    <p className="text-xs text-violet-600 mb-3">
                        Self-hosted privacy-focused analytics.{' '}
                        <a href="https://umami.is/docs/getting-started" target="_blank" rel="noopener noreferrer" className="underline">
                            Setup guide
                        </a>
                    </p>
                    <div className="space-y-3">
                        <ApiKeyInput
                            label="Website ID (for embed script)"
                            value={integrations.umamiId}
                            onChange={(e) => setIntegration('umamiId', e.target.value)}
                            placeholder="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-violet-700 mb-1">API URL</label>
                                <input
                                    type="url"
                                    value={integrations.umamiApiUrl}
                                    onChange={(e) => setIntegration('umamiApiUrl', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg text-sm"
                                    placeholder="https://analytics.yourdomain.com"
                                />
                            </div>
                            <ApiKeyInput
                                label="API Token"
                                value={integrations.umamiApiKey}
                                onChange={(e) => setIntegration('umamiApiKey', e.target.value)}
                                placeholder="Your Umami API Token"
                            />
                        </div>
                    </div>
                </div>
            </ConnectionGroup>

            {/* Publishing/Syndication */}
            <ConnectionGroup
                title="Publishing & Syndication"
                icon={<Share2 className="w-5 h-5" />}
                description="Cross-post articles to other platforms"
                defaultOpen={false}
            >
                <div className="p-4 bg-neutral-800 rounded-xl">
                    <h5 className="font-semibold mb-2 text-white flex items-center gap-2">
                        📝 Dev.to API
                    </h5>
                    <p className="text-xs text-neutral-400 mb-3">
                        Syndicate articles to Dev.to.{' '}
                        <a href="https://dev.to/settings/extensions" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            Get API key
                        </a>
                    </p>
                    <ApiKeyInput
                        value={integrations.devtoKey}
                        onChange={(e) => setIntegration('devtoKey', e.target.value)}
                        placeholder="Enter Dev.to API Key"
                        variant="dark"
                    />
                </div>
            </ConnectionGroup>

            {/* WP Automation - Placeholder for Hostinger */}
            <ConnectionGroup
                title="WordPress Automation"
                icon={<Server className="w-5 h-5" />}
                description="Hostinger MCP and WordPress REST API"
                defaultOpen={false}
            >
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">🚀 Hostinger MCP</h5>
                    <p className="text-xs text-blue-600 mb-3">
                        Configure Hostinger MCP server connection for automated WordPress site provisioning.
                        This is configured via the MCP Tools panel in the AI section.
                    </p>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            // Would navigate to AI section
                        }}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Go to AI → Capabilities → MCP Tools
                    </a>
                </div>
            </ConnectionGroup>
        </div>
    );
}

export default ConnectionsSection;
