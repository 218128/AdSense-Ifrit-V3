'use client';

/**
 * DNS Manager Component
 * 
 * Configure email deliverability for domains.
 * Generates SPF, DKIM, DMARC records for various providers.
 */

import { useState } from 'react';
import {
    Mail,
    Shield,
    Check,
    Copy,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ExternalLink,
    Info,
    Loader2,
} from 'lucide-react';
import {
    EMAIL_PROVIDERS,
    generateEmailConfig,
    estimateDeliverability,
    formatRecordForDisplay,
    saveEmailConfig,
    getSavedConfigs,
    type EmailDNSConfig,
    type DNSRecord,
    type EmailProvider,
} from '@/lib/domains/emailDeliverability';

export default function DNSManager() {
    const [domain, setDomain] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('improvmx');
    const [config, setConfig] = useState<EmailDNSConfig | null>(null);
    // Use lazy initializer to avoid setState in useEffect
    const [savedDomains, setSavedDomains] = useState<string[]>(() => Object.keys(getSavedConfigs()));
    const [copiedRecord, setCopiedRecord] = useState<number | null>(null);
    const [showProviders, setShowProviders] = useState(false);

    const handleGenerate = () => {
        if (!domain.trim()) return;

        const newConfig = generateEmailConfig(domain.trim(), selectedProvider, {
            dmarcPolicy: 'quarantine',
            includeReceiving: true,
        });

        setConfig(newConfig);
    };

    const handleSave = () => {
        if (!config) return;
        saveEmailConfig(config);
        setSavedDomains(prev => [...new Set([...prev, config.domain])]);
    };

    const handleLoadSaved = (savedDomain: string) => {
        const configs = getSavedConfigs();
        if (configs[savedDomain]) {
            setConfig(configs[savedDomain]);
            setDomain(savedDomain);
        }
    };

    const copyToClipboard = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedRecord(index);
            setTimeout(() => setCopiedRecord(null), 2000);
        } catch {
            // Fallback
        }
    };

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'A': return 'bg-green-500';
            case 'B': return 'bg-blue-500';
            case 'C': return 'bg-yellow-500';
            case 'D': return 'bg-orange-500';
            case 'F': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getProvider = (id: string) => EMAIL_PROVIDERS.find(p => p.id === id);
    const currentProvider = getProvider(selectedProvider);

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Mail className="w-6 h-6" />
                    Email Deliverability Setup
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                    Configure DNS records for reliable email delivery
                </p>
            </div>

            {/* Configuration */}
            <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                    {/* Domain Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Domain
                        </label>
                        <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {savedDomains.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {savedDomains.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => handleLoadSaved(d)}
                                        className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Provider Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Provider
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setShowProviders(!showProviders)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white hover:bg-gray-50"
                            >
                                <div>
                                    <span className="font-medium">{currentProvider?.name}</span>
                                    <span className="text-gray-500 text-sm ml-2">
                                        ({currentProvider?.tier})
                                    </span>
                                </div>
                                {showProviders ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                            </button>

                            {showProviders && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                                    {EMAIL_PROVIDERS.map(provider => (
                                        <button
                                            key={provider.id}
                                            onClick={() => {
                                                setSelectedProvider(provider.id);
                                                setShowProviders(false);
                                            }}
                                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${selectedProvider === provider.id ? 'bg-blue-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-medium">{provider.name}</span>
                                                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${provider.tier === 'free'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {provider.tier}
                                                    </span>
                                                </div>
                                                {selectedProvider === provider.id && (
                                                    <Check className="w-4 h-4 text-blue-600" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {provider.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={!domain.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Generate DNS Records
                    </button>
                    {config && (
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Save Configuration
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            {config && (
                <div className="p-6">
                    {/* Score */}
                    <div className="mb-6">
                        {(() => {
                            const deliverability = estimateDeliverability(config);
                            return (
                                <div className="flex items-start gap-4">
                                    <div className={`w-16 h-16 ${getGradeColor(deliverability.grade)} rounded-xl flex items-center justify-center text-white text-2xl font-bold`}>
                                        {deliverability.grade}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-semibold">
                                                Deliverability Score: {deliverability.score}/100
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mt-1">{deliverability.prediction}</p>
                                        {deliverability.tips.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {deliverability.tips.slice(0, 3).map((tip, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                                        💡 {tip}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* DNS Records */}
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            DNS Records to Add
                        </h3>
                        <div className="space-y-3">
                            {config.records.map((record, idx) => {
                                const formatted = formatRecordForDisplay(record);
                                return (
                                    <div
                                        key={idx}
                                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${record.purpose === 'spf' ? 'bg-green-100 text-green-700' :
                                                    record.purpose === 'dkim' ? 'bg-blue-100 text-blue-700' :
                                                        record.purpose === 'dmarc' ? 'bg-purple-100 text-purple-700' :
                                                            record.purpose === 'mx' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {record.purpose.toUpperCase()}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {formatted.type} Record
                                                </span>
                                                {record.required && (
                                                    <span className="text-xs text-red-600">Required</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(formatted.value, idx)}
                                                className="p-1.5 text-gray-500 hover:text-gray-700"
                                                title="Copy value"
                                            >
                                                {copiedRecord === idx ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">Name:</span>
                                                <code className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">
                                                    {formatted.name}
                                                </code>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-gray-500">Value:</span>
                                                <code className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-800 text-xs break-all">
                                                    {formatted.value.length > 80
                                                        ? `${formatted.value.slice(0, 80)}...`
                                                        : formatted.value}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recommendations */}
                    {config.recommendations.length > 0 && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                Recommendations
                            </h4>
                            <ul className="space-y-1">
                                {config.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                                        <span>•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Provider Links */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">Next Steps</h4>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href={`https://${currentProvider?.id === 'improvmx' ? 'improvmx.com' : currentProvider?.id === 'sendgrid' ? 'sendgrid.com' : currentProvider?.id === 'resend' ? 'resend.com' : currentProvider?.id === 'mailgun' ? 'mailgun.com' : 'buttondown.email'}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                            >
                                Set up {currentProvider?.name}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                            <a
                                href="https://mxtoolbox.com/spf.aspx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                            >
                                Verify SPF
                                <ExternalLink className="w-3 h-3" />
                            </a>
                            <a
                                href="https://mxtoolbox.com/dmarc.aspx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                            >
                                Verify DMARC
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!config && (
                <div className="p-12 text-center text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a domain and select a provider to generate DNS records</p>
                    <p className="text-sm mt-2">
                        Proper email setup is essential for newsletter monetization
                    </p>
                </div>
            )}
        </div>
    );
}
