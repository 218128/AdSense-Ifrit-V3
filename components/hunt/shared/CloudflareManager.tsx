'use client';

/**
 * Cloudflare Manager Component
 * 
 * Manage domains through Cloudflare Registrar at-cost.
 * Features: domain listing, renewal status, DNS management, transfer.
 */

import { useState, useEffect } from 'react';
import {
    Cloud,
    RefreshCw,
    Check,
    X,
    AlertTriangle,
    ExternalLink,
    Settings,
    Lock,
    Unlock,
    DollarSign,
    Calendar,
    Globe,
    Loader2,
    Key,
    Save,
    Trash2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    validateToken,
    listDomains,
    updateDomain,
    saveCloudflareConfig,
    getCloudflareConfig,
    clearCloudflareConfig,
    getAtCostPricing,
    calculateSavings,
    type CloudflareDomain,
    type CloudflareConfig,
} from '@/lib/domains/cloudflareAPI';

export default function CloudflareManager() {
    const [config, setConfig] = useState<CloudflareConfig | null>(null);
    const [tokenInput, setTokenInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [domains, setDomains] = useState<CloudflareDomain[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showPricing, setShowPricing] = useState(false);

    // Load saved config on mount
    useEffect(() => {
        const saved = getCloudflareConfig();
        if (saved) {
            setConfig(saved);
            loadDomains(saved);
        }
    }, []);

    const loadDomains = async (cfg: CloudflareConfig) => {
        setLoading(true);
        setError(null);

        const result = await listDomains(cfg);

        if (!result.success) {
            setError(result.error || 'Failed to load domains');
        } else {
            setDomains(result.domains);
        }

        setLoading(false);
    };

    const handleConnect = async () => {
        if (!tokenInput.trim()) return;

        setValidating(true);
        setError(null);

        const newConfig: CloudflareConfig = { apiToken: tokenInput.trim() };
        const validation = await validateToken(newConfig);

        if (!validation.valid) {
            setError(validation.error || 'Invalid API token');
            setValidating(false);
            return;
        }

        // Save and load domains
        saveCloudflareConfig(newConfig);
        setConfig(newConfig);
        setTokenInput('');
        await loadDomains(newConfig);
        setValidating(false);
    };

    const handleDisconnect = () => {
        clearCloudflareConfig();
        setConfig(null);
        setDomains([]);
    };

    const handleToggleAutoRenew = async (domain: CloudflareDomain) => {
        if (!config) return;

        const result = await updateDomain(config, domain.name, {
            autoRenew: !domain.autoRenew,
        });

        if (result.success) {
            // Reload domains
            await loadDomains(config);
        } else {
            setError(result.error || 'Failed to update domain');
        }
    };

    const getExpiryColor = (days?: number) => {
        if (days === undefined) return 'text-gray-500';
        if (days < 30) return 'text-red-600';
        if (days < 90) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Active</span>;
            case 'pending':
                return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Pending</span>;
            case 'expired':
                return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Expired</span>;
            case 'transferring':
                return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Transferring</span>;
            case 'locked':
                return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Locked</span>;
            default:
                return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{status}</span>;
        }
    };

    const atCostPricing = getAtCostPricing();

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Cloud className="w-6 h-6" />
                    Cloudflare Registrar
                </h2>
                <p className="text-orange-100 text-sm mt-1">
                    Manage domains at wholesale pricing
                </p>
            </div>

            {/* Connection Status */}
            {!config ? (
                <div className="p-6 border-b border-gray-200">
                    <div className="max-w-md mx-auto">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Key className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Connect Cloudflare</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                Enter your API token to manage domains at-cost
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    API Token
                                </label>
                                <input
                                    type="password"
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    placeholder="Enter your Cloudflare API token"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Needs: <code>Zone:Read</code>, <code>DNS:Edit</code>, <code>Registrar:Edit</code>
                                </p>
                            </div>

                            <button
                                onClick={handleConnect}
                                disabled={validating || !tokenInput.trim()}
                                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {validating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Validating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Connect
                                    </>
                                )}
                            </button>

                            <a
                                href="https://dash.cloudflare.com/profile/api-tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center text-sm text-orange-600 hover:underline"
                            >
                                Get API Token from Cloudflare →
                            </a>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Connected Header */}
                    <div className="px-6 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-700">
                            <Check className="w-4 h-4" />
                            <span className="font-medium">Connected to Cloudflare</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadDomains(config)}
                                disabled={loading}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                title="Disconnect"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-200">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Domains List */}
                    <div className="divide-y divide-gray-100">
                        {loading && domains.length === 0 ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600 mb-4" />
                                <p className="text-gray-500">Loading domains...</p>
                            </div>
                        ) : domains.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No domains in Cloudflare Registrar</p>
                                <a
                                    href="https://dash.cloudflare.com/?to=/:account/domains/register"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                                >
                                    Register or Transfer a Domain
                                </a>
                            </div>
                        ) : (
                            domains.map(domain => (
                                <div key={domain.id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {domain.name}
                                                </h3>
                                                {getStatusBadge(domain.status)}
                                                {domain.locked && (
                                                    <span className="text-gray-400">
                                                        <Lock className="w-4 h-4" />
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span>Expires: {new Date(domain.expiresAt).toLocaleDateString()}</span>
                                                    <span className={`font-medium ${getExpiryColor(domain.daysUntilExpiry)}`}>
                                                        ({domain.daysUntilExpiry} days)
                                                    </span>
                                                </div>
                                                {domain.pricing && (
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="w-4 h-4 text-green-500" />
                                                        <span>Renewal: ${domain.pricing.renewal}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Auto-Renew Toggle */}
                                            <button
                                                onClick={() => handleToggleAutoRenew(domain)}
                                                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${domain.autoRenew
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {domain.autoRenew ? (
                                                    <>
                                                        <Check className="w-3 h-3" />
                                                        Auto-Renew
                                                    </>
                                                ) : (
                                                    <>
                                                        <X className="w-3 h-3" />
                                                        Manual
                                                    </>
                                                )}
                                            </button>

                                            {/* Cloudflare Dashboard Link */}
                                            <a
                                                href={`https://dash.cloudflare.com/?to=/:account/domains/manage/${domain.name}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg"
                                                title="Manage in Cloudflare"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* At-Cost Pricing Info */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                    onClick={() => setShowPricing(!showPricing)}
                    className="w-full flex items-center justify-between text-sm text-gray-600"
                >
                    <span className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Cloudflare At-Cost Pricing</span>
                    </span>
                    {showPricing ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>

                {showPricing && (
                    <div className="mt-4 grid grid-cols-5 gap-2">
                        {Object.entries(atCostPricing).map(([tld, pricing]) => (
                            <div key={tld} className="p-2 bg-white rounded border border-gray-200 text-center">
                                <div className="font-medium text-gray-800">.{tld}</div>
                                <div className="text-sm text-green-600">${pricing.renewal}/yr</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
