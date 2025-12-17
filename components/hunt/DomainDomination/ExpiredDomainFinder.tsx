'use client';

/**
 * Expired Domain Finder Component - 3-Column Layout
 * 
 * Features:
 * - Column 1: Manual Import (CSV/text paste)
 * - Column 2: Free Scraping (expiredomains.io)
 * - Column 3: Premium APIs (Spamzilla/ExpiredDomains.net)
 * 
 * All sources feed into a unified results list with scoring.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search,
    Filter,
    Star,
    ExternalLink,
    TrendingUp,
    Shield,
    Clock,
    Link2,
    DollarSign,
    Loader2,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    ShoppingCart,
    Eye,
    Bookmark,
    BookmarkCheck,
    Download,
    Zap,
    HelpCircle,
    AlertTriangle,
    Info,
    Target,
    Upload,
    FileText,
    Globe,
    Sparkles,
    X,
    Settings
} from 'lucide-react';
import MetricTooltip, { DataSourceBanner, FILTER_PRESETS, FilterPreset } from './MetricTooltip';
import DomainSources from './DomainSources';
import { scoreDomain, parseDomain } from '@/lib/domains/domainScorer';

// ============ TYPES ============

interface DomainItem {
    domain: string;
    tld: string;
    source: 'manual' | 'free' | 'premium';
    status: 'unknown' | 'available' | 'pending' | 'auction';
    domainRating?: number;
    trustFlow?: number;
    citationFlow?: number;
    backlinks?: number;
    referringDomains?: number;
    domainAge?: number;
    dropDate?: string;
    spamScore?: number;
    enriched?: boolean;
    enrichedAt?: number;
    score?: {
        overall: number;
        recommendation: string;
        riskLevel: string;
        estimatedValue: number;
    };
    fetchedAt: number;
}

interface WatchlistDomain extends DomainItem {
    addedAt: number;
    notes?: string;
}

interface ActionRequired {
    type: 'captcha' | 'rate_limit' | 'blocked' | 'network';
    message: string;
    action: string;
    url?: string;
}

// Candidate for analysis (exported for HuntDashboard)
export interface AnalyzeCandidate {
    domain: string;
    tld: string;
    score: number;
    recommendation: string;
    estimatedValue?: number;
    spamzillaData?: {
        wasAdult?: boolean;
        wasCasino?: boolean;
        wasPBN?: boolean;
        hadSpam?: boolean;
        domainAge?: number;
    };
}

interface ExpiredDomainFinderProps {
    initialKeywords?: string[];
    onAnalyze?: (domains: AnalyzeCandidate[]) => void;
    onQuickQueue?: (domains: AnalyzeCandidate[]) => void;
}

// ============ CONSTANTS ============

const ITEMS_PER_PAGE = 10;
const WATCHLIST_STORAGE_KEY = 'ifrit_domain_watchlist';

// ============ MAIN COMPONENT ============

export default function ExpiredDomainFinder({
    initialKeywords = [],
    onAnalyze,
    onQuickQueue
}: ExpiredDomainFinderProps) {
    // Manual Import State
    const [manualDomains, setManualDomains] = useState<DomainItem[]>([]);
    const [manualInput, setManualInput] = useState('');
    const [isParsingManual, setIsParsingManual] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Free Scraping State
    const [freeDomains, setFreeDomains] = useState<DomainItem[]>([]);
    const [freeLoading, setFreeLoading] = useState(false);
    const [freeError, setFreeError] = useState<string | null>(null);
    const [freeActionRequired, setFreeActionRequired] = useState<ActionRequired | null>(null);

    // Premium API State
    const [premiumDomains, setPremiumDomains] = useState<DomainItem[]>([]);
    const [premiumLoading, setPremiumLoading] = useState(false);
    const [premiumError, setPremiumError] = useState<string | null>(null);
    const [premiumConfigured, setPremiumConfigured] = useState(false);

    // Combined Results State
    const [allDomains, setAllDomains] = useState<DomainItem[]>([]);
    const [filteredDomains, setFilteredDomains] = useState<DomainItem[]>([]);
    const [page, setPage] = useState(1);

    // Filters
    const [keywordFilter, setKeywordFilter] = useState(initialKeywords.join(', '));
    const [showFilters, setShowFilters] = useState(false);
    const [minScore, setMinScore] = useState(0);
    const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'free' | 'premium'>('all');

    // Watchlist
    const [watchlist, setWatchlist] = useState<WatchlistDomain[]>([]);
    const [showWatchlist, setShowWatchlist] = useState(false);

    // Spamzilla Enrichment
    const [enriching, setEnriching] = useState(false);
    const [enrichingDomain, setEnrichingDomain] = useState<string | null>(null);
    const [spamzillaConfigured, setSpamzillaConfigured] = useState(false);

    // Selection for bulk actions
    const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());

    // ============ LOAD/SAVE WATCHLIST ============

    useEffect(() => {
        const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (saved) {
            try {
                setWatchlist(JSON.parse(saved));
            } catch {
                // Ignore
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    }, [watchlist]);

    // ============ CHECK PREMIUM CONFIGURATION ============

    useEffect(() => {
        const spamzilla = localStorage.getItem('ifrit_spamzilla_key');
        const hasSpamzilla = !!spamzilla;
        setSpamzillaConfigured(hasSpamzilla);
        setPremiumConfigured(hasSpamzilla);
    }, []);

    // ============ COMBINE ALL DOMAINS ============

    useEffect(() => {
        const combined = [...manualDomains, ...freeDomains, ...premiumDomains];
        setAllDomains(combined);
    }, [manualDomains, freeDomains, premiumDomains]);

    // ============ APPLY FILTERS ============

    useEffect(() => {
        let filtered = [...allDomains];

        // Source filter
        if (sourceFilter !== 'all') {
            filtered = filtered.filter(d => d.source === sourceFilter);
        }

        // Score filter
        if (minScore > 0) {
            filtered = filtered.filter(d => (d.score?.overall || 0) >= minScore);
        }

        // Keyword filter
        if (keywordFilter.trim()) {
            const keywords = keywordFilter.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
            filtered = filtered.filter(d =>
                keywords.some(k => d.domain.toLowerCase().includes(k))
            );
        }

        // Sort by score
        filtered.sort((a, b) => (b.score?.overall || 0) - (a.score?.overall || 0));

        setFilteredDomains(filtered);
        setPage(1);
    }, [allDomains, sourceFilter, minScore, keywordFilter]);

    // ============ MANUAL IMPORT ============

    const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setManualInput(prev => prev + '\n' + content);
        };
        reader.readAsText(file);
    };

    const parseManualDomains = async () => {
        if (!manualInput.trim()) return;

        setIsParsingManual(true);
        try {
            const response = await fetch('/api/domains/free-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'parse', domains: manualInput }),
            });

            const data = await response.json();
            if (data.success && data.domains) {
                const parsed: DomainItem[] = data.domains.map((d: { domain: string; tld: string }) => ({
                    ...d,
                    source: 'manual' as const,
                    status: 'unknown' as const,
                    fetchedAt: Date.now(),
                }));

                // Score each domain
                const scored = parsed.map(d => {
                    const { tld, length } = parseDomain(d.domain);
                    const scoreResult = scoreDomain({ domain: d.domain, tld, length, dataSource: 'free-api' });
                    return { ...d, score: scoreResult };
                });

                setManualDomains(prev => {
                    const existing = new Set(prev.map(d => d.domain));
                    const newDomains = scored.filter(d => !existing.has(d.domain));
                    return [...prev, ...newDomains];
                });
                setManualInput('');
            }
        } catch (error) {
            console.error('Parse error:', error);
        } finally {
            setIsParsingManual(false);
        }
    };

    const clearManual = () => {
        setManualDomains([]);
        setManualInput('');
    };

    // ============ FREE SCRAPING ============

    const fetchFreeDomains = async () => {
        setFreeLoading(true);
        setFreeError(null);
        setFreeActionRequired(null);

        try {
            const params = new URLSearchParams();
            if (keywordFilter.trim()) {
                params.set('keywords', keywordFilter);
            }

            const response = await fetch(`/api/domains/free-search?${params.toString()}`);
            const data = await response.json();

            if (data.success && data.domains) {
                const domains: DomainItem[] = data.domains.map((d: { domain: string; tld: string }) => {
                    const { tld, length } = parseDomain(d.domain);
                    const scoreResult = scoreDomain({ domain: d.domain, tld, length, dataSource: 'free-api' });
                    return {
                        ...d,
                        source: 'free' as const,
                        status: 'unknown' as const,
                        fetchedAt: Date.now(),
                        score: scoreResult,
                    };
                });
                setFreeDomains(domains);
            } else {
                setFreeError(data.error || 'Failed to fetch domains');
                if (data.actionRequired) {
                    setFreeActionRequired(data.actionRequired);
                }
            }
        } catch (error) {
            setFreeError(error instanceof Error ? error.message : 'Network error');
        } finally {
            setFreeLoading(false);
        }
    };

    // ============ PREMIUM API ============

    const fetchPremiumDomains = async () => {
        if (!premiumConfigured) return;

        setPremiumLoading(true);
        setPremiumError(null);

        try {
            const params = new URLSearchParams();
            if (keywordFilter.trim()) {
                params.set('keywords', keywordFilter);
            }

            const response = await fetch(`/api/domains/search?${params.toString()}`);
            const data = await response.json();

            if (data.success && data.domains) {
                const domains: DomainItem[] = data.domains.map((d: DomainItem) => ({
                    ...d,
                    source: 'premium' as const,
                    fetchedAt: Date.now(),
                }));
                setPremiumDomains(domains);
            } else {
                setPremiumError(data.error || 'API error');
            }
        } catch (error) {
            setPremiumError(error instanceof Error ? error.message : 'Network error');
        } finally {
            setPremiumLoading(false);
        }
    };

    // ============ WATCHLIST ============

    const toggleWatchlist = (domain: DomainItem) => {
        const exists = watchlist.some(d => d.domain === domain.domain);
        if (exists) {
            setWatchlist(prev => prev.filter(d => d.domain !== domain.domain));
        } else {
            setWatchlist(prev => [...prev, { ...domain, addedAt: Date.now() }]);
        }
    };

    const isWatched = (domain: string) => watchlist.some(d => d.domain === domain);

    const exportWatchlist = () => {
        const csv = [
            ['Domain', 'TLD', 'Score', 'Source', 'Status', 'Added'].join(','),
            ...watchlist.map(d => [
                d.domain,
                d.tld,
                d.score?.overall || '',
                d.source,
                d.status,
                new Date(d.addedAt).toLocaleDateString(),
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `domain-watchlist-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ============ SPAMZILLA ENRICHMENT ============

    const enrichWithSpamzilla = async (domainsToEnrich: DomainItem[]) => {
        if (!spamzillaConfigured) return;

        const apiKey = localStorage.getItem('ifrit_spamzilla_key');
        if (!apiKey) return;

        setEnriching(true);
        try {
            const response = await fetch('/api/domains/enrich', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-spamzilla-key': apiKey,
                },
                body: JSON.stringify({ domains: domainsToEnrich.map(d => d.domain) }),
            });

            const data = await response.json();
            if (data.success && data.domains) {
                // Update domains with enriched data
                const enrichedMap = new Map(data.domains.map((d: DomainItem) => [d.domain, d]));

                setManualDomains(prev => prev.map(d => {
                    const enriched = enrichedMap.get(d.domain);
                    if (enriched && (enriched as DomainItem).enriched) {
                        return { ...d, ...enriched };
                    }
                    return d;
                }));

                setFreeDomains(prev => prev.map(d => {
                    const enriched = enrichedMap.get(d.domain);
                    if (enriched && (enriched as DomainItem).enriched) {
                        return { ...d, ...enriched };
                    }
                    return d;
                }));
            }
        } catch (error) {
            console.error('Enrichment error:', error);
        } finally {
            setEnriching(false);
            setEnrichingDomain(null);
        }
    };

    const enrichSingleDomain = async (domain: DomainItem) => {
        setEnrichingDomain(domain.domain);
        await enrichWithSpamzilla([domain]);
    };

    const enrichAllDomains = async () => {
        const toEnrich = allDomains.filter(d => !d.enriched);
        await enrichWithSpamzilla(toEnrich);
    };

    // ============ RENDER HELPERS ============

    const getSourceBadge = (source: string, enriched?: boolean) => {
        const enrichBadge = enriched ? (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 ml-1">✓ Enriched</span>
        ) : null;

        switch (source) {
            case 'manual':
                return <>{<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">🔍 Discovery</span>}{enrichBadge}</>;
            case 'free':
                return <>{<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">🆓 Free</span>}{enrichBadge}</>;
            case 'premium':
                return <>{<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">💎 Premium</span>}{enrichBadge}</>;
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'bg-green-500';
        if (score >= 50) return 'bg-yellow-500';
        if (score >= 30) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getRecommendationBadge = (rec: string) => {
        switch (rec) {
            case 'strong-buy':
                return <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">🔥 STRONG BUY</span>;
            case 'buy':
                return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">✅ BUY</span>;
            case 'consider':
                return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">🤔 CONSIDER</span>;
            case 'avoid':
                return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">❌ AVOID</span>;
            default:
                return null;
        }
    };

    // Pagination
    const totalPages = Math.ceil(filteredDomains.length / ITEMS_PER_PAGE);
    const paginatedDomains = filteredDomains.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // ============ SELECTION HELPERS ============

    const toggleSelection = (domain: string) => {
        setSelectedDomains(prev => {
            const next = new Set(prev);
            if (next.has(domain)) {
                next.delete(domain);
            } else {
                next.add(domain);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedDomains(new Set(filteredDomains.map(d => d.domain)));
    };

    const deselectAll = () => {
        setSelectedDomains(new Set());
    };

    const getSelectedCandidates = (): AnalyzeCandidate[] => {
        return filteredDomains
            .filter(d => selectedDomains.has(d.domain))
            .map(d => ({
                domain: d.domain,
                tld: d.tld,
                score: d.score?.overall || 0,
                recommendation: d.score?.recommendation || 'consider',
                estimatedValue: d.score?.estimatedValue,
                spamzillaData: d.enriched ? {
                    wasAdult: undefined,
                    wasCasino: undefined,
                    wasPBN: undefined,
                    hadSpam: undefined,
                    domainAge: d.domainAge
                } : undefined
            }));
    };

    const handleAnalyzeSelected = () => {
        if (onAnalyze && selectedDomains.size > 0) {
            onAnalyze(getSelectedCandidates());
            setSelectedDomains(new Set());
        }
    };

    const handleQuickQueueSelected = () => {
        if (onQuickQueue && selectedDomains.size > 0) {
            onQuickQueue(getSelectedCandidates());
            setSelectedDomains(new Set());
        }
    };

    const handleAnalyzeSingle = (d: DomainItem) => {
        if (onAnalyze) {
            onAnalyze([{
                domain: d.domain,
                tld: d.tld,
                score: d.score?.overall || 0,
                recommendation: d.score?.recommendation || 'consider',
                estimatedValue: d.score?.estimatedValue,
                spamzillaData: d.enriched ? { domainAge: d.domainAge } : undefined
            }]);
        }
    };

    const handleQuickQueueSingle = (d: DomainItem) => {
        if (onQuickQueue) {
            onQuickQueue([{
                domain: d.domain,
                tld: d.tld,
                score: d.score?.overall || 0,
                recommendation: d.score?.recommendation || 'consider',
                estimatedValue: d.score?.estimatedValue
            }]);
        }
    };

    // ============ RENDER ============

    return (
        <div className="space-y-6">
            {/* Data Source Banner */}
            <DataSourceBanner type="expired" />

            {/* Domain Sources - 3 Column Import Grid */}
            <DomainSources
                manualInput={manualInput}
                setManualInput={setManualInput}
                handleCSVUpload={handleCSVUpload}
                parseManualDomains={parseManualDomains}
                clearManual={clearManual}
                manualDomains={manualDomains}
                isParsingManual={isParsingManual}
                fetchFreeDomains={fetchFreeDomains}
                freeLoading={freeLoading}
                freeDomains={freeDomains}
                freeError={freeError}
                freeActionRequired={freeActionRequired}
                spamzillaConfigured={spamzillaConfigured}
                enrichAllDomains={enrichAllDomains}
                enriching={enriching}
                allDomains={allDomains}
            />

            {/* Keyword Filter Bar */}
            <div className="flex gap-3 items-center bg-white p-4 rounded-xl border border-neutral-200">
                <div className="flex-1">
                    <input
                        type="text"
                        value={keywordFilter}
                        onChange={(e) => setKeywordFilter(e.target.value)}
                        placeholder="Filter by keywords (comma separated)..."
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg ${showFilters ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}
                >
                    <Filter className="w-5 h-5" />
                </button>
                <div className="flex gap-1 text-sm">
                    <span className="text-neutral-500">{filteredDomains.length} domains</span>
                </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Source</label>
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value as 'all' | 'manual' | 'free' | 'premium')}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="all">All Sources</option>
                                <option value="manual">📥 Manual Import</option>
                                <option value="free">🆓 Free Scraping</option>
                                <option value="premium">💎 Premium</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Min Score: {minScore}</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={minScore}
                                onChange={(e) => setMinScore(parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => { setSourceFilter('all'); setMinScore(0); setKeywordFilter(''); }}
                                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results List */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Domain Results
                            <span className="text-sm font-normal text-emerald-600">({filteredDomains.length} total)</span>
                        </h3>

                        {/* Selection Controls */}
                        {filteredDomains.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={selectedDomains.size === filteredDomains.length ? deselectAll : selectAll}
                                    className="text-xs text-emerald-600 hover:text-emerald-800"
                                >
                                    {selectedDomains.size === filteredDomains.length ? 'Deselect All' : 'Select All'}
                                </button>
                                {selectedDomains.size > 0 && (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                        {selectedDomains.size} selected
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bulk Action Bar - Shows when domains selected */}
                {selectedDomains.size > 0 && (onAnalyze || onQuickQueue) && (
                    <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-800">
                            <Target className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                {selectedDomains.size} domains selected
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {onAnalyze && (
                                <button
                                    onClick={handleAnalyzeSelected}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"
                                >
                                    <Zap className="w-4 h-4" />
                                    🔬 Deep Analyze ({selectedDomains.size})
                                </button>
                            )}
                            {onQuickQueue && (
                                <button
                                    onClick={handleQuickQueueSelected}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-700"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    ✅ Quick Queue ({selectedDomains.size})
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {filteredDomains.length === 0 ? (
                    <div className="p-12 text-center text-neutral-500">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No domains found</p>
                        <p className="text-sm mt-1">Import domains manually, search free sources, or configure a premium API.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {paginatedDomains.map((domain, i) => (
                            <div key={`${domain.domain}-${i}`} className={`px-6 py-4 hover:bg-neutral-50 transition-colors ${selectedDomains.has(domain.domain) ? 'bg-indigo-50/50' : ''}`}>
                                <div className="flex items-start justify-between gap-4">
                                    {/* Checkbox */}
                                    <div className="flex items-center pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedDomains.has(domain.domain)}
                                            onChange={() => toggleSelection(domain.domain)}
                                            className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-semibold text-neutral-900">{domain.domain}</h4>
                                            {getSourceBadge(domain.source, domain.enriched)}
                                            {domain.score && getRecommendationBadge(domain.score.recommendation)}
                                        </div>

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
                                                    <AlertTriangle className={`w-4 h-4 ${domain.spamScore > 30 ? 'text-red-500' : 'text-green-500'}`} />
                                                    <span>Spam: <strong>{domain.spamScore}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Analyze with Spamzilla */}
                                        {!domain.enriched && spamzillaConfigured && (
                                            <button
                                                onClick={() => enrichSingleDomain(domain)}
                                                disabled={enrichingDomain === domain.domain}
                                                className="px-3 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                                                title="Analyze with Spamzilla"
                                            >
                                                {enrichingDomain === domain.domain ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4" />
                                                )}
                                                Analyze
                                            </button>
                                        )}

                                        {/* Score */}
                                        {domain.score && (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getScoreColor(domain.score.overall)}`}>
                                                {domain.score.overall}
                                            </div>
                                        )}

                                        {/* Watchlist */}
                                        <button
                                            onClick={() => toggleWatchlist(domain)}
                                            className={`p-2 rounded-lg transition-colors ${isWatched(domain.domain)
                                                ? 'bg-yellow-100 text-yellow-600'
                                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                                }`}
                                            title={isWatched(domain.domain) ? 'Remove from watchlist' : 'Add to watchlist'}
                                        >
                                            {isWatched(domain.domain) ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                                        </button>

                                        {/* Wayback */}
                                        <a
                                            href={`https://web.archive.org/web/*/${domain.domain}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 rounded-lg"
                                            title="View on Wayback Machine"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </a>

                                        {/* Buy */}
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
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
                        <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Watchlist Panel */}
            {watchlist.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowWatchlist(!showWatchlist)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-yellow-100"
                    >
                        <div className="flex items-center gap-2 text-yellow-800">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="font-medium">{watchlist.length} domains in watchlist</span>
                        </div>
                        {showWatchlist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showWatchlist && (
                        <div className="px-4 py-3 border-t border-yellow-200">
                            <div className="flex justify-between mb-3">
                                <span className="text-sm text-yellow-700">Your saved domains</span>
                                <button onClick={exportWatchlist} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {watchlist.map(d => (
                                    <div key={d.domain} className="flex items-center justify-between bg-white p-2 rounded-lg border border-yellow-200">
                                        <div>
                                            <span className="font-medium text-sm">{d.domain}</span>
                                            <span className="text-xs text-neutral-500 ml-2">Score: {d.score?.overall || '?'}</span>
                                        </div>
                                        <button onClick={() => toggleWatchlist(d)} className="text-neutral-400 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
