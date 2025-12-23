/**
 * DomainRow Component
 * 
 * Single row in domain list table.
 * Pure presentational component.
 */

'use client';

import {
    TrendingUp,
    Shield,
    Link2,
    Clock,
    AlertTriangle,
    Eye,
    ShoppingCart,
    Bookmark,
    BookmarkCheck,
    FileText,
    Loader2
} from 'lucide-react';
import type { DomainItem } from '@/lib/domains/types';

// ============ PROPS ============

export interface DomainRowProps {
    /** Domain data */
    domain: DomainItem;
    /** Whether domain is selected */
    isSelected: boolean;
    /** Toggle selection */
    onSelect: () => void;
    /** Whether domain is in watchlist */
    isWatched: boolean;
    /** Toggle watchlist */
    onToggleWatchlist: () => void;
    /** Generate profile callback */
    onGenerateProfile: () => void;
    /** Whether profile is being generated */
    isGeneratingProfile: boolean;
}

// ============ HELPERS ============

function getScoreColor(score: number): string {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
}

function getSourceBadge(source: string, enriched?: boolean) {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
        manual: { bg: 'bg-purple-100', text: 'text-purple-700', label: '📝 Manual' },
        free: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🆓 Free' },
        spamzilla: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🔥 SZ' },
        premium: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '⭐ Premium' },
    };
    const badge = badges[source] || badges.manual;
    return (
        <span className={`px-2 py-0.5 text-xs rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
            {enriched && ' ✓'}
        </span>
    );
}

function getRecommendationBadge(recommendation: string) {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
        'strong-buy': { bg: 'bg-green-100', text: 'text-green-700', label: '🔥 Strong Buy' },
        'buy': { bg: 'bg-blue-100', text: 'text-blue-700', label: '✅ Buy' },
        'consider': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🤔 Consider' },
        'avoid': { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Avoid' },
    };
    const badge = badges[recommendation] || badges.consider;
    return (
        <span className={`px-2 py-0.5 text-xs rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
        </span>
    );
}

// ============ COMPONENT ============

export function DomainRow({
    domain,
    isSelected,
    onSelect,
    isWatched,
    onToggleWatchlist,
    onGenerateProfile,
    isGeneratingProfile,
}: DomainRowProps) {
    return (
        <div
            className={`px-6 py-4 hover:bg-neutral-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                {/* Checkbox */}
                <div className="flex items-center pt-1">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onSelect}
                        className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                </div>

                {/* Domain info */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-neutral-900">
                            {domain.domain}
                        </h4>
                        {getSourceBadge(domain.source, domain.enriched)}
                        {domain.score && getRecommendationBadge(domain.score.recommendation)}
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                        {domain.domainRating !== undefined && (
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                <span>DR: <strong>{domain.domainRating}</strong></span>
                            </div>
                        )}
                        {domain.trustFlow !== undefined && (
                            <div className="flex items-center gap-1">
                                <Shield className="w-4 h-4 text-green-500" />
                                <span>TF: <strong>{domain.trustFlow}</strong></span>
                            </div>
                        )}
                        {domain.referringDomains !== undefined && (
                            <div className="flex items-center gap-1">
                                <Link2 className="w-4 h-4 text-purple-500" />
                                <span>RD: <strong>{domain.referringDomains}</strong></span>
                            </div>
                        )}
                        {domain.domainAge !== undefined && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span><strong>{domain.domainAge}</strong> years</span>
                            </div>
                        )}
                        {domain.spamScore !== undefined && (
                            <div className="flex items-center gap-1">
                                <AlertTriangle
                                    className={`w-4 h-4 ${domain.spamScore > 30 ? 'text-red-500' : 'text-green-500'
                                        }`}
                                />
                                <span>Spam: <strong>{domain.spamScore}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Score badge */}
                    {domain.score && (
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getScoreColor(
                                domain.score.overall
                            )}`}
                        >
                            {domain.score.overall}
                        </div>
                    )}

                    {/* Generate Profile */}
                    <button
                        onClick={onGenerateProfile}
                        disabled={isGeneratingProfile}
                        className="px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                        title="Generate website profile"
                    >
                        {isGeneratingProfile ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        Profile
                    </button>

                    {/* Watchlist */}
                    <button
                        onClick={onToggleWatchlist}
                        className={`p-2 rounded-lg transition-colors ${isWatched
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                        title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                        {isWatched ? (
                            <BookmarkCheck className="w-5 h-5" />
                        ) : (
                            <Bookmark className="w-5 h-5" />
                        )}
                    </button>

                    {/* Wayback link */}
                    <a
                        href={`https://web.archive.org/web/*/${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 rounded-lg"
                        title="View on Wayback Machine"
                    >
                        <Eye className="w-5 h-5" />
                    </a>

                    {/* Buy link */}
                    <a
                        href={`https://www.namecheap.com/domains/registration/results/?domain=${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg"
                        title="Check availability"
                    >
                        <ShoppingCart className="w-5 h-5" />
                    </a>
                </div>
            </div>
        </div>
    );
}
