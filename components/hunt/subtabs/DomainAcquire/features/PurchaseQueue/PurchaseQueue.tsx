'use client';

/**
 * Purchase Queue Component
 * 
 * Step 3 of Domain Acquire workflow.
 * Shows:
 * 1. Domains in purchase queue (waiting to buy)
 * 2. Owned domains (purchased with profile status)
 */

import { useState } from 'react';
import {
    ShoppingCart,
    ExternalLink,
    Trash2,
    Download,
    CheckCircle,
    AlertCircle,
    Lightbulb,
    DollarSign,
    Star,
    ArrowRight,
    Package,
    Sparkles,
    Info,
    RefreshCw,
    Loader2,
    Crown
} from 'lucide-react';
import { CreateSiteButton } from '@/components/hunt/CreateSiteButton';
import type { OwnedDomain, ProfileStatus } from '@/stores/huntStore';

export interface QueuedDomain {
    domain: string;
    tld: string;
    score: number;
    recommendation: string;
    estimatedValue: number;
    addedAt: number;
    purchased?: boolean;  // Track if domain was purchased
    siteCreated?: boolean;  // Track if site was provisioned
}

interface PurchaseQueueProps {
    queue: QueuedDomain[];
    ownedDomains?: OwnedDomain[];
    onRemove: (domain: string) => void;
    onClear: () => void;
    onMarkPurchased: (domain: string) => void;
    onRetryProfile?: (domain: string) => void;
    onSiteCreated?: (domain: string) => void;
}

const REGISTRARS = [
    {
        name: 'Namecheap',
        color: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
        url: (domain: string) => `https://www.namecheap.com/domains/registration/results/?domain=${domain}`,
        tip: 'Great support & UI'
    },
    {
        name: 'Cloudflare',
        color: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
        url: (domain: string) => `https://dash.cloudflare.com/?to=/:account/domains/register/${domain}`,
        tip: 'At-cost renewals!'
    },
    {
        name: 'Porkbun',
        color: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
        url: (domain: string) => `https://porkbun.com/checkout/search?q=${domain}`,
        tip: 'Cheapest first-year'
    },
    {
        name: 'GoDaddy',
        color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
        url: (domain: string) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${domain}`,
        tip: 'Auction domains'
    },
];

const TIPS = [
    {
        icon: '💰',
        title: 'Cloudflare Savings',
        content: 'Transfer domains to Cloudflare for at-cost renewals. .com = $10.11/year vs $15+ elsewhere!'
    },
    {
        icon: '🏷️',
        title: 'First-Year Deals',
        content: 'Porkbun often has the lowest first-year pricing. Great for testing domains.'
    },
    {
        icon: '🔄',
        title: 'Domain Transfers',
        content: 'Most registrars offer free transfers. Buy cheap, transfer to Cloudflare for renewals.'
    },
    {
        icon: '⏰',
        title: 'Expired vs Auction',
        content: 'Expired = available for regular price. Auction = bidding required (often higher value).'
    },
];

export default function PurchaseQueue({
    queue,
    ownedDomains = [],
    onRemove,
    onClear,
    onMarkPurchased,
    onRetryProfile,
    onSiteCreated,
}: PurchaseQueueProps) {
    const [showTips, setShowTips] = useState(true);

    const getProfileStatusBadge = (status: ProfileStatus, error?: string) => {
        switch (status) {
            case 'generating':
                return (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating Profile...
                    </span>
                );
            case 'success':
                return (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Profile Ready
                    </span>
                );
            case 'failed':
                return (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded flex items-center gap-1" title={error}>
                        <AlertCircle className="w-3 h-3" />
                        Profile Failed
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                        Pending
                    </span>
                );
        }
    };

    const exportCSV = () => {
        const csv = [
            ['Domain', 'TLD', 'Score', 'Recommendation', 'Est. Value'].join(','),
            ...queue.map(d => [
                d.domain,
                d.tld,
                d.score,
                d.recommendation,
                d.estimatedValue
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase-queue-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getRecommendationBadge = (rec: string) => {
        switch (rec) {
            case 'strong-buy':
                return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">🔥 STRONG BUY</span>;
            case 'buy':
                return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">✅ BUY</span>;
            case 'consider':
                return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">🤔 CONSIDER</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                        Purchase Queue
                        {queue.length > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                                {queue.length} {queue.length === 1 ? 'domain' : 'domains'}
                            </span>
                        )}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                        Domains ready to purchase. Click registrar buttons to buy.
                    </p>
                </div>
                {queue.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={exportCSV}
                            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm flex items-center gap-1"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                        <button
                            onClick={onClear}
                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm flex items-center gap-1"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* Tips Section */}
            {showTips && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-blue-800 font-medium">
                            <Lightbulb className="w-4 h-4" />
                            💡 Smart Buying Tips
                        </div>
                        <button
                            onClick={() => setShowTips(false)}
                            className="text-blue-500 text-sm hover:underline"
                        >
                            Hide
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {TIPS.map((tip, i) => (
                            <div key={i} className="bg-white/70 rounded-lg p-3">
                                <div className="font-medium text-sm text-blue-900 mb-1">
                                    {tip.icon} {tip.title}
                                </div>
                                <div className="text-xs text-blue-700">
                                    {tip.content}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Queue */}
            {queue.length === 0 ? (
                <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-xl p-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                    <p className="text-neutral-600 font-medium">No domains in queue</p>
                    <p className="text-sm text-neutral-500 mt-1">
                        Find domains in Step 1, analyze in Step 2, then add to queue.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-400">
                        <span>Find</span>
                        <ArrowRight className="w-4 h-4" />
                        <span>Analyze</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="font-medium text-emerald-600">Purchase</span>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {queue.map((domain) => (
                        <div
                            key={domain.domain}
                            className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-neutral-900">
                                            {domain.domain}
                                        </span>
                                        {getRecommendationBadge(domain.recommendation)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                            <DollarSign className="w-4 h-4" />
                                            Est. ${domain.estimatedValue}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            Score: {domain.score}/100
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemove(domain.domain)}
                                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                        title="Remove from queue"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Registrar Buttons */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {REGISTRARS.map((reg) => (
                                    <a
                                        key={reg.name}
                                        href={reg.url(domain.domain)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-3 py-1.5 ${reg.color} rounded-lg text-sm font-medium flex items-center gap-1 transition-colors`}
                                        title={reg.tip}
                                    >
                                        {reg.name}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                                <div className="text-xs text-neutral-400">
                                    Added {new Date(domain.addedAt).toLocaleDateString()}
                                </div>
                                <button
                                    onClick={() => onMarkPurchased(domain.domain)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-emerald-700"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Mark as Purchased
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            {queue.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-emerald-600">Total Estimated Value</div>
                            <div className="text-2xl font-bold text-emerald-800">
                                ${queue.reduce((sum, d) => sum + d.estimatedValue, 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-emerald-600">Strong Buys</div>
                            <div className="text-2xl font-bold text-emerald-800 flex items-center gap-1">
                                <Star className="w-5 h-5" />
                                {queue.filter(d => d.recommendation === 'strong-buy').length}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ OWNED DOMAINS SECTION ============ */}
            {ownedDomains.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-bold text-neutral-900">
                            Owned Domains
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-sm rounded-full">
                                {ownedDomains.length}
                            </span>
                        </h3>
                    </div>
                    <p className="text-sm text-neutral-500">
                        Your purchased domains. Create websites after profile is ready.
                    </p>

                    <div className="space-y-3">
                        {ownedDomains.map((domain) => (
                            <div
                                key={domain.domain}
                                className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-neutral-900">
                                            {domain.domain}
                                        </span>
                                        {getProfileStatusBadge(domain.profileStatus, domain.profileError)}
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-purple-600 font-medium">
                                            <DollarSign className="w-4 h-4" />
                                            Est. ${domain.estimatedValue}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            Score: {domain.score}/100
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Info - Expandable */}
                                {domain.profile && (
                                    <details className="mb-3 group">
                                        <summary className="cursor-pointer p-2 bg-white/60 rounded-lg text-sm flex items-center justify-between hover:bg-white/80">
                                            <div>
                                                <span className="font-medium text-purple-800">Niche:</span>{' '}
                                                <span className="text-purple-600">{domain.profile.niche}</span>
                                                {domain.profile.primaryKeywords?.length > 0 && (
                                                    <span className="ml-3 text-neutral-500">
                                                        • {domain.profile.primaryKeywords.length} keywords
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-purple-500 group-open:hidden">Click to expand ▼</span>
                                            <span className="text-xs text-purple-500 hidden group-open:inline">Click to collapse ▲</span>
                                        </summary>
                                        <div className="mt-2 p-3 bg-white/80 rounded-lg space-y-3 text-sm">
                                            {/* Primary Keywords */}
                                            {domain.profile.primaryKeywords?.length > 0 && (
                                                <div>
                                                    <div className="font-medium text-purple-800 mb-1">Primary Keywords:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {domain.profile.primaryKeywords.map((kw, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Secondary Keywords */}
                                            {domain.profile.secondaryKeywords?.length > 0 && (
                                                <div>
                                                    <div className="font-medium text-indigo-800 mb-1">Secondary Keywords:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {domain.profile.secondaryKeywords.map((kw, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Question Keywords */}
                                            {domain.profile.questionKeywords?.length > 0 && (
                                                <div>
                                                    <div className="font-medium text-blue-800 mb-1">Question Keywords:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {domain.profile.questionKeywords.map((kw, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Suggested Topics */}
                                            {domain.profile.suggestedTopics?.length > 0 && (
                                                <div>
                                                    <div className="font-medium text-emerald-800 mb-1">Suggested Topics:</div>
                                                    <ul className="list-disc list-inside text-emerald-700 text-xs space-y-0.5">
                                                        {domain.profile.suggestedTopics.slice(0, 5).map((topic, i) => (
                                                            <li key={i}>{topic}</li>
                                                        ))}
                                                        {domain.profile.suggestedTopics.length > 5 && (
                                                            <li className="text-neutral-400">+{domain.profile.suggestedTopics.length - 5} more</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                                    <div className="text-xs text-neutral-400">
                                        Purchased {new Date(domain.purchasedAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Retry button for failed profiles */}
                                        {domain.profileStatus === 'failed' && onRetryProfile && (
                                            <button
                                                onClick={() => onRetryProfile(domain.domain)}
                                                className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-orange-200"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Retry Profile
                                            </button>
                                        )}

                                        {/* Create Website button - available regardless of profile status */}
                                        {domain.siteCreated ? (
                                            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4" />
                                                Site Created
                                            </span>
                                        ) : (
                                            <CreateSiteButton
                                                domain={domain.domain}
                                                onSuccess={() => onSiteCreated?.(domain.domain)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
