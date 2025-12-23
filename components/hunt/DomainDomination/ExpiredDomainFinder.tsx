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
    Settings,
    Save
} from 'lucide-react';
import MetricTooltip, { DataSourceBanner, FILTER_PRESETS, FilterPreset } from './MetricTooltip';
import DomainSources from './DomainSources';
import { scoreDomain, parseDomain } from '@/lib/domains/domainScorer';
import { parseSpamZillaCSV, SpamZillaDomain, getTierInfo, getPresetInfo, SpamZillaImportResult } from '@/lib/domains/spamzillaParser';

// ============ TYPES ============

interface DomainItem {
    domain: string;
    tld: string;
    source: 'manual' | 'free' | 'premium' | 'spamzilla';
    status: 'unknown' | 'available' | 'pending' | 'auction';
    domainRating?: number;
    trustFlow?: number;
    citationFlow?: number;
    tfCfRatio?: number;          // SpamZilla: TF/CF ratio
    backlinks?: number;
    referringDomains?: number;
    domainAge?: number;
    dropDate?: string;
    spamScore?: number;
    szScore?: number;            // SpamZilla Score (0-20 = clean)
    szDrops?: number;            // Previous drops
    szActiveHistory?: number;    // Years of real content
    qualityTier?: 'gold' | 'silver' | 'bronze' | 'avoid';  // Gold Standard tier
    adsenseReady?: boolean;
    price?: string;
    auctionSource?: string;
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

    // SpamZilla CSV Import State
    const [spamzillaDomains, setSpamzillaDomains] = useState<DomainItem[]>([]);
    const [spamzillaImportStats, setSpamzillaImportStats] = useState<SpamZillaImportResult['stats'] | null>(null);
    const [spamzillaPreset, setSpamzillaPreset] = useState<string>('');

    // Premium API State (legacy - kept for compatibility)
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
    const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'free' | 'premium' | 'spamzilla'>('all');
    const [tierFilter, setTierFilter] = useState<'all' | 'gold' | 'silver' | 'bronze'>('all');

    // Watchlist
    const [watchlist, setWatchlist] = useState<WatchlistDomain[]>([]);
    const [showWatchlist, setShowWatchlist] = useState(false);

    // Spamzilla Enrichment
    const [enriching, setEnriching] = useState(false);
    const [enrichingDomain, setEnrichingDomain] = useState<string | null>(null);
    const [spamzillaConfigured, setSpamzillaConfigured] = useState(false);

    // Selection for bulk actions
    const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());

    // Profile Generation
    const [generatingProfile, setGeneratingProfile] = useState<string | null>(null);
    const [generatedProfile, setGeneratedProfile] = useState<{
        domain: string;
        niche: string;
        primaryKeywords: string[];
        secondaryKeywords: string[];
        questionKeywords: string[];
        suggestedTopics: string[];
    } | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

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
        const combined = [...manualDomains, ...freeDomains, ...premiumDomains, ...spamzillaDomains];
        setAllDomains(combined);
    }, [manualDomains, freeDomains, premiumDomains, spamzillaDomains]);

    // ============ APPLY FILTERS ============

    useEffect(() => {
        let filtered = [...allDomains];

        // Source filter
        if (sourceFilter !== 'all') {
            filtered = filtered.filter(d => d.source === sourceFilter);
        }

        // Tier filter (Gold/Silver/Bronze from SpamZilla scoring)
        if (tierFilter !== 'all') {
            filtered = filtered.filter(d => d.qualityTier === tierFilter);
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

        // Sort by quality tier first, then by score
        const tierOrder = { gold: 0, silver: 1, bronze: 2, avoid: 3, undefined: 4 };
        filtered.sort((a, b) => {
            const tierDiff = (tierOrder[a.qualityTier as keyof typeof tierOrder] ?? 4) - (tierOrder[b.qualityTier as keyof typeof tierOrder] ?? 4);
            if (tierDiff !== 0) return tierDiff;
            return (b.score?.overall || 0) - (a.score?.overall || 0);
        });

        setFilteredDomains(filtered);
        setPage(1);
    }, [allDomains, sourceFilter, tierFilter, minScore, keywordFilter]);

    // ============ CSV IMPORT (Smart Detection) ============

    const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const filename = file.name;

            // Try to detect SpamZilla CSV format
            const firstLine = content.split('\n')[0];
            const isSpamZillaFormat = firstLine.includes('TF') && firstLine.includes('SZ Score');

            if (isSpamZillaFormat) {
                // Parse as SpamZilla CSV with full metrics
                try {
                    const result = parseSpamZillaCSV(content, filename);

                    // Convert SpamZillaDomain to DomainItem
                    const domainItems: DomainItem[] = result.domains.map(sz => ({
                        domain: sz.domain,
                        tld: sz.tld,
                        source: 'spamzilla' as const,
                        status: 'unknown' as const,
                        trustFlow: sz.trustFlow,
                        citationFlow: sz.citationFlow,
                        tfCfRatio: sz.tfCfRatio,
                        domainRating: sz.domainAuthority,
                        domainAge: sz.age,
                        backlinks: sz.backlinks,
                        referringDomains: sz.referringDomains,
                        szScore: sz.szScore,
                        szDrops: sz.szDrops,
                        szActiveHistory: sz.szActiveHistory,
                        qualityTier: sz.qualityTier,
                        adsenseReady: sz.adsenseReady,
                        price: sz.price,
                        auctionSource: sz.auctionSource,
                        enriched: true,
                        fetchedAt: Date.now(),
                        score: {
                            overall: calculateOverallScore(sz),
                            recommendation: sz.qualityTier === 'gold' ? 'strong-buy' :
                                sz.qualityTier === 'silver' ? 'buy' :
                                    sz.qualityTier === 'bronze' ? 'consider' : 'avoid',
                            riskLevel: sz.szScore <= 10 ? 'low' : sz.szScore <= 15 ? 'medium' : 'high',
                            estimatedValue: estimateValue(sz),
                        },
                    }));

                    setSpamzillaDomains(prev => {
                        const existing = new Set(prev.map(d => d.domain));
                        const newDomains = domainItems.filter(d => !existing.has(d.domain));
                        return [...prev, ...newDomains];
                    });
                    setSpamzillaImportStats(result.stats);
                    setSpamzillaPreset(result.preset);

                    console.log(`[SpamZilla Import] ${result.domains.length} domains imported from ${result.preset} preset`);
                    console.log(`[SpamZilla Import] ${result.stats.adsenseReady} AdSense-ready domains`);

                } catch (error) {
                    console.error('[SpamZilla Import] Error:', error);
                    // Fall back to manual input
                    setManualInput(prev => prev + '\n' + content);
                }
            } else {
                // Regular CSV/text - add to manual input
                setManualInput(prev => prev + '\n' + content);
            }
        };
        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    };

    // Helper: Calculate overall score from SpamZilla data
    const calculateOverallScore = (sz: SpamZillaDomain): number => {
        let score = 0;

        // TF contributes up to 30 points
        score += Math.min(30, sz.trustFlow * 1.5);

        // DA contributes up to 25 points
        score += Math.min(25, sz.domainAuthority * 0.5);

        // SZ Score (inverted - lower is better) contributes up to 25 points
        score += Math.max(0, 25 - sz.szScore);

        // TF:CF ratio contributes up to 10 points
        score += Math.min(10, sz.tfCfRatio * 10);

        // Age contributes up to 10 points
        score += Math.min(10, (sz.age || 0) * 0.5);

        return Math.round(Math.min(100, score));
    };

    // Helper: Estimate domain value
    const estimateValue = (sz: SpamZillaDomain): number => {
        let value = 50; // Base value

        if (sz.qualityTier === 'gold') value += 200;
        else if (sz.qualityTier === 'silver') value += 100;
        else if (sz.qualityTier === 'bronze') value += 50;

        value += sz.trustFlow * 5;
        value += sz.domainAuthority * 3;

        if (sz.tld === 'com') value *= 1.5;

        return Math.round(value);
    };

    // ============ MANUAL IMPORT ============

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

        // Get API key from localStorage
        const apiKey = localStorage.getItem('ifrit_spamzilla_key');
        if (!apiKey) {
            setPremiumError('Spamzilla API key not found. Please add it in Settings → Integrations.');
            return;
        }

        setPremiumLoading(true);
        setPremiumError(null);

        try {
            const params = new URLSearchParams();
            if (keywordFilter.trim()) {
                params.set('keywords', keywordFilter);
            }

            // Pass API key via header
            const response = await fetch(`/api/domains/search?${params.toString()}`, {
                headers: {
                    'x-spamzilla-key': apiKey,
                }
            });
            const data = await response.json();

            if (data.success && data.domains) {
                const domains: DomainItem[] = data.domains.map((d: DomainItem) => ({
                    ...d,
                    source: 'premium' as const,
                    fetchedAt: Date.now(),
                }));
                setPremiumDomains(domains);
                console.log(`[SpamZilla] Fetched ${domains.length} premium domains`);
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

    // ============ PROFILE GENERATION ============

    const handleGenerateProfile = async (domain: DomainItem) => {
        setGeneratingProfile(domain.domain);
        try {
            // Get AI API key from localStorage (user's configured keys)
            const geminiKeys = localStorage.getItem('ifrit_gemini_keys');
            let apiKey: string | null = null;
            if (geminiKeys) {
                try {
                    const keys = JSON.parse(geminiKeys);
                    if (keys.length > 0) {
                        apiKey = keys[0].key; // Use first available key
                    }
                } catch (e) {
                    console.warn('[Profile] Failed to parse Gemini keys');
                }
            }

            const response = await fetch('/api/domain-profiles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: domain.domain,
                    spamzillaData: {
                        trustFlow: domain.trustFlow,
                        citationFlow: domain.citationFlow,
                        domainAuthority: domain.domainRating,
                        age: domain.domainAge,
                        szScore: domain.szScore,
                    },
                    saveProfile: false, // Let user review first
                    apiKey // Send the key to server
                })
            });

            const data = await response.json();
            if (data.success && data.profile) {
                setGeneratedProfile({
                    domain: data.profile.domain,
                    niche: data.profile.niche,
                    primaryKeywords: data.profile.primaryKeywords,
                    secondaryKeywords: data.profile.secondaryKeywords,
                    questionKeywords: data.profile.questionKeywords,
                    suggestedTopics: data.profile.suggestedTopics,
                });
                setShowProfileModal(true);
            } else {
                console.error('[Profile Generate] Error:', data.error);
                alert('Failed to generate profile. Please try again.');
            }
        } catch (error) {
            console.error('[Profile Generate] Error:', error);
            alert('Failed to generate profile. Network error.');
        } finally {
            setGeneratingProfile(null);
        }
    };

    const handleSaveProfile = async () => {
        if (!generatedProfile) return;

        try {
            const response = await fetch('/api/domain-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...generatedProfile,
                    researchedAt: Date.now(),
                    notes: 'Auto-generated from domain name analysis'
                })
            });

            if (response.ok) {
                setShowProfileModal(false);
                setGeneratedProfile(null);
                alert(`Profile saved for ${generatedProfile.domain}! Go to Websites tab to create site.`);
            }
        } catch (error) {
            console.error('[Save Profile] Error:', error);
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

                                        {/* Generate Profile */}
                                        <button
                                            onClick={() => handleGenerateProfile(domain)}
                                            disabled={generatingProfile === domain.domain}
                                            className="px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                                            title="Generate website profile from this domain"
                                        >
                                            {generatingProfile === domain.domain ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <FileText className="w-4 h-4" />
                                            )}
                                            Profile
                                        </button>

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

            {/* Profile Generation Modal */}
            {showProfileModal && generatedProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-t-2xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">🎯 Generated Profile: {generatedProfile.domain}</h3>
                                <p className="text-purple-100 text-sm">AI-discovered keywords based on domain name</p>
                            </div>
                            <button
                                onClick={() => { setShowProfileModal(false); setGeneratedProfile(null); }}
                                className="p-2 hover:bg-white/20 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Niche */}
                            <div className="bg-purple-50 p-4 rounded-xl">
                                <h4 className="text-sm font-semibold text-purple-800 mb-1">Detected Niche</h4>
                                <p className="text-lg font-bold text-purple-900">{generatedProfile.niche}</p>
                            </div>

                            {/* Primary Keywords */}
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-700 mb-2">🎯 Primary Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                    {generatedProfile.primaryKeywords.map((kw, i) => (
                                        <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Secondary Keywords */}
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-700 mb-2">📊 Secondary Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                    {generatedProfile.secondaryKeywords.slice(0, 8).map((kw, i) => (
                                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Question Keywords */}
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-700 mb-2">❓ Question Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                    {generatedProfile.questionKeywords.map((kw, i) => (
                                        <span key={i} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Suggested Topics */}
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-700 mb-2">📝 Suggested Article Topics</h4>
                                <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
                                    {generatedProfile.suggestedTopics.map((topic, i) => (
                                        <li key={i}>{topic}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-neutral-50 rounded-b-2xl flex justify-between items-center">
                            <p className="text-sm text-neutral-500">
                                Save this profile to use when building your website
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowProfileModal(false); setGeneratedProfile(null); }}
                                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
