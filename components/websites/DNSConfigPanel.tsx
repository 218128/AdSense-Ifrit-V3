'use client';

/**
 * DNS Configuration Panel
 * 
 * Component for configuring DNS records for a domain.
 * Supports Namecheap with extensible provider architecture.
 */

import { useState, useEffect } from 'react';
import {
    Loader2,
    CheckCircle,
    AlertTriangle,
    Globe,
    RefreshCw,
    ExternalLink,
    Settings
} from 'lucide-react';
import {
    DNS_PROVIDERS,
    getDNSCredentials,
    saveDNSCredentials,
    VERCEL_DNS_RECORDS,
    type DNSProvider,
    type DNSProviderCredentials
} from '@/lib/dns/dnsProviders';

interface DNSConfigPanelProps {
    domain: string;
    onConfigured?: () => void;
    compact?: boolean;
}

interface NamecheapDomain {
    name: string;
    expires: string;
    isExpired: boolean;
}

type ConfigStep = 'select-provider' | 'configure-credentials' | 'select-domain' | 'configure-dns' | 'done';

export default function DNSConfigPanel({ domain, onConfigured, compact = false }: DNSConfigPanelProps) {
    const [step, setStep] = useState<ConfigStep>('select-provider');
    const [selectedProvider, setSelectedProvider] = useState<DNSProvider | null>(null);
    const [credentials, setCredentials] = useState<DNSProviderCredentials | null>(null);
    const [domains, setDomains] = useState<NamecheapDomain[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Namecheap credentials form
    const [ncApiUser, setNcApiUser] = useState('');
    const [ncApiKey, setNcApiKey] = useState('');
    const [ncUsername, setNcUsername] = useState('');
    const [ncClientIp, setNcClientIp] = useState('');

    // Load saved credentials on mount
    useEffect(() => {
        const saved = getDNSCredentials('namecheap');
        if (saved) {
            setNcApiUser(saved.namecheapApiUser || '');
            setNcApiKey(saved.namecheapApiKey || '');
            setNcUsername(saved.namecheapUsername || '');
            setNcClientIp(saved.namecheapClientIp || '');
            setSelectedProvider('namecheap');
            setCredentials(saved);
        }
    }, []);

    // Get public IP for Namecheap
    const fetchPublicIP = async () => {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            setNcClientIp(data.ip);
        } catch {
            // Fallback - user needs to enter manually
        }
    };

    // Test connection and fetch domains
    const testConnection = async () => {
        if (!ncApiUser || !ncApiKey) {
            setError('API User and API Key are required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const creds: DNSProviderCredentials = {
                provider: 'namecheap',
                namecheapApiUser: ncApiUser,
                namecheapApiKey: ncApiKey,
                namecheapUsername: ncUsername || ncApiUser,
                namecheapClientIp: ncClientIp,
            };

            const res = await fetch('/api/namecheap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiUser: creds.namecheapApiUser,
                    apiKey: creds.namecheapApiKey,
                    username: creds.namecheapUsername,
                    clientIp: creds.namecheapClientIp,
                    command: 'getDomains',
                }),
            });

            const data = await res.json();

            if (data.success) {
                setDomains(data.domains || []);
                setCredentials(creds);
                saveDNSCredentials(creds);
                setStep('configure-dns');
            } else {
                setError(data.error || 'Failed to connect');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    // Configure DNS for the domain
    const configureDNS = async () => {
        if (!credentials || !domain) {
            setError('Missing credentials or domain');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/namecheap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiUser: credentials.namecheapApiUser,
                    apiKey: credentials.namecheapApiKey,
                    username: credentials.namecheapUsername,
                    clientIp: credentials.namecheapClientIp,
                    command: 'setDNS',
                    domain,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(true);
                setStep('done');
                onConfigured?.();
            } else {
                setError(data.error || 'DNS configuration failed');
            }
        } catch (err) {
            setError('Failed to configure DNS');
        } finally {
            setLoading(false);
        }
    };

    // Check if domain is in the list
    const domainInAccount = domains.some(d => d.name.toLowerCase() === domain.toLowerCase());

    // Compact view for inline use
    if (compact) {
        return (
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium">DNS Configuration</span>
                    </div>
                    {success ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Configured
                        </span>
                    ) : credentials ? (
                        <button
                            onClick={configureDNS}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                            Configure DNS
                        </button>
                    ) : (
                        <span className="text-sm text-neutral-500">Configure in Settings</span>
                    )}
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-white">
                <div className="flex items-center gap-2">
                    <Globe className="w-6 h-6" />
                    <h3 className="font-bold text-lg">Configure DNS for {domain}</h3>
                </div>
                <p className="text-indigo-100 text-sm mt-1">
                    Set up DNS records to point your domain to Vercel
                </p>
            </div>

            <div className="p-6">
                {/* Error Alert */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* Success State */}
                {step === 'done' && success && (
                    <div className="text-center py-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-neutral-900 mb-2">DNS Configured!</h4>
                        <p className="text-neutral-600 mb-4">
                            Your domain is now pointing to Vercel. DNS changes may take up to 48 hours to propagate.
                        </p>
                        <div className="bg-neutral-50 rounded-lg p-4 text-left max-w-md mx-auto">
                            <h5 className="font-medium mb-2">DNS Records Set:</h5>
                            {VERCEL_DNS_RECORDS.map((record, i) => (
                                <div key={i} className="text-sm text-neutral-600 flex justify-between">
                                    <span>{record.type} - {record.host}</span>
                                    <span className="text-neutral-400">{record.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Provider Selection */}
                {step === 'select-provider' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold">Select DNS Provider</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {DNS_PROVIDERS.map(provider => (
                                <button
                                    key={provider.id}
                                    onClick={() => {
                                        if (provider.implemented) {
                                            setSelectedProvider(provider.id);
                                            setStep('configure-credentials');
                                            if (provider.id === 'namecheap') {
                                                fetchPublicIP();
                                            }
                                        }
                                    }}
                                    disabled={!provider.implemented}
                                    className={`p-4 border-2 rounded-lg text-left transition-all ${provider.implemented
                                            ? 'border-neutral-200 hover:border-indigo-300 cursor-pointer'
                                            : 'border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{provider.icon}</span>
                                        <span className="font-medium">{provider.name}</span>
                                        {!provider.implemented && (
                                            <span className="text-xs bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded">
                                                Coming Soon
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-neutral-500">{provider.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Namecheap Credentials */}
                {step === 'configure-credentials' && selectedProvider === 'namecheap' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Connect Namecheap</h4>
                            <a
                                href="https://ap.www.namecheap.com/settings/tools/apiaccess/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                Get API Access <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    API User *
                                </label>
                                <input
                                    type="text"
                                    value={ncApiUser}
                                    onChange={e => setNcApiUser(e.target.value)}
                                    placeholder="Your Namecheap username"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    API Key *
                                </label>
                                <input
                                    type="password"
                                    value={ncApiKey}
                                    onChange={e => setNcApiKey(e.target.value)}
                                    placeholder="Your API key"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Username (optional)
                                </label>
                                <input
                                    type="text"
                                    value={ncUsername}
                                    onChange={e => setNcUsername(e.target.value)}
                                    placeholder="Same as API User if blank"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Client IP *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={ncClientIp}
                                        onChange={e => setNcClientIp(e.target.value)}
                                        placeholder="Your whitelisted IP"
                                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg"
                                    />
                                    <button
                                        onClick={fetchPublicIP}
                                        className="px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                                        title="Detect my IP"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                            <strong>Note:</strong> Your IP must be whitelisted in Namecheap API settings
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep('select-provider')}
                                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={testConnection}
                                disabled={loading || !ncApiUser || !ncApiKey || !ncClientIp}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    'Connect & Continue'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Configure DNS */}
                {step === 'configure-dns' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold">Configure DNS for {domain}</h4>

                        {/* Domain status */}
                        <div className={`p-4 rounded-lg border ${domainInAccount
                                ? 'bg-green-50 border-green-200'
                                : 'bg-amber-50 border-amber-200'
                            }`}>
                            {domainInAccount ? (
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle className="w-5 h-5" />
                                    <span><strong>{domain}</strong> found in your Namecheap account</span>
                                </div>
                            ) : (
                                <div className="text-amber-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span><strong>{domain}</strong> not found in your account</span>
                                    </div>
                                    <p className="text-sm">
                                        You can still configure DNS, but make sure you own this domain.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* DNS Records Preview */}
                        <div className="bg-neutral-50 rounded-lg p-4">
                            <h5 className="font-medium mb-2">DNS Records to Set:</h5>
                            <div className="space-y-2">
                                {VERCEL_DNS_RECORDS.map((record, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                        <span className="font-mono">
                                            <span className="text-indigo-600 font-medium">{record.type}</span>
                                            {' '}{record.host === '@' ? domain : `${record.host}.${domain}`}
                                        </span>
                                        <span className="text-neutral-500">{record.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep('configure-credentials')}
                                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={configureDNS}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Configuring DNS...
                                    </>
                                ) : (
                                    <>
                                        <Settings className="w-4 h-4" />
                                        Configure DNS
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
