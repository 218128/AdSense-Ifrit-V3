/**
 * ExpiredDomainFinder - Refactored Version
 * 
 * Uses modular hooks and components for clean separation:
 * - useDomainImport: Handles import state
 * - useDomainFilters: Handles filtering
 * - useWatchlist: Handles watchlist persistence
 * - Components: ManualImport, FreeScraper, SpamZillaImport, DomainFilters, DomainRow
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    Search,
    Globe,
    Zap,
    ShoppingCart,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

// Import hooks
import {
    useDomainImport,
    useDomainFilters,
    useWatchlist,
} from './hooks';

// Import components  
import {
    ManualImport,
    FreeScraper,
    SpamZillaImport,
    ExternalDomainImport,
    DomainFilters,
    DomainRow,
} from './components';

// Import API functions
import { generateProfile } from '@/lib/domains/api';

// Types
import type { DomainItem, DomainProfile } from '@/lib/domains/types';
import type { AnalyzeCandidate } from '@/stores/huntStore';

// ============ PROPS ============

interface ExpiredDomainFinderProps {
    /** Initial keywords from Keyword Hunter */
    initialKeywords?: string[];
    /** Callback when domains are sent to analyze */
    onAnalyze?: (domains: AnalyzeCandidate[]) => void;
    /** Callback for quick queue (skip analyze) */
    onQuickQueue?: (domains: AnalyzeCandidate[]) => void;
}

// ============ CONSTANTS ============

const PAGE_SIZE = 10;

// ============ COMPONENT ============

export default function ExpiredDomainFinder({
    initialKeywords = [],
    onAnalyze,
    onQuickQueue,
}: ExpiredDomainFinderProps) {
    // ============ HOOKS ============

    // Import hook - handles manual, free, and SpamZilla imports
    const {
        manualDomains,
        manualInput,
        setManualInput,
        isParsingManual,
        parseManualDomains,
        clearManual,
        freeDomains,
        freeLoading,
        freeError,
        freeActionRequired,
        fetchFreeDomains,
        spamzillaDomains,
        spamzillaPreset,
        handleCSVUpload,
        allDomains,
    } = useDomainImport();

    // Filter hook - handles filtering and sorting
    const {
        filters,
        setKeyword,
        setSourceFilter,
        setTierFilter,
        setMinScore,
        resetFilters,
        filteredDomains,
    } = useDomainFilters(allDomains, initialKeywords.join(', '));

    // Watchlist hook - handles persistence
    const {
        isWatched,
        toggleWatchlist,
    } = useWatchlist();

    // ============ LOCAL STATE ============

    // Selection
    const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Profile generation
    const [generatingProfile, setGeneratingProfile] = useState<string | null>(null);
    const [generatedProfile, setGeneratedProfile] = useState<DomainProfile | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // V5: Niche research
    const [researchingNiche, setResearchingNiche] = useState<string | null>(null);
    const [nicheResearchResults, setNicheResearchResults] = useState<{
        domain: string;
        findings: string[];
    } | null>(null);

    // ============ COMPUTED ============

    const totalPages = Math.ceil(filteredDomains.length / PAGE_SIZE);
    const paginatedDomains = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredDomains.slice(start, start + PAGE_SIZE);
    }, [filteredDomains, currentPage]);

    // Check if SpamZilla is configured
    const spamzillaConfigured = useMemo(() => {
        if (typeof window !== 'undefined') {
            return !!localStorage.getItem('ifrit_spamzilla_key');
        }
        return false;
    }, []);

    // ============ HANDLERS ============

    const toggleSelection = useCallback((domain: string) => {
        setSelectedDomains(prev => {
            const next = new Set(prev);
            if (next.has(domain)) {
                next.delete(domain);
            } else {
                next.add(domain);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        if (selectedDomains.size === paginatedDomains.length) {
            setSelectedDomains(new Set());
        } else {
            setSelectedDomains(new Set(paginatedDomains.map(d => d.domain)));
        }
    }, [paginatedDomains, selectedDomains.size]);

    const handleGenerateProfile = useCallback(async (domain: DomainItem) => {
        setGeneratingProfile(domain.domain);
        try {
            // Get API key from localStorage
            const apiKey = typeof window !== 'undefined'
                ? localStorage.getItem('gemini_api_key') || undefined
                : undefined;

            const result = await generateProfile(
                domain.domain,
                {
                    trustFlow: domain.trustFlow,
                    citationFlow: domain.citationFlow,
                    domainAuthority: domain.domainRating,
                    age: domain.domainAge,
                    szScore: domain.szScore,
                },
                apiKey
            );

            if (result.success && result.profile) {
                setGeneratedProfile(result.profile);
                setShowProfileModal(true);
            } else {
                // Show raw API error
                alert(`Profile generation failed:\n${JSON.stringify(result, null, 2)}`);
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setGeneratingProfile(null);
        }
    }, []);

    // V5: Research niche for a domain
    const handleResearchNiche = useCallback(async (domain: DomainItem) => {
        setResearchingNiche(domain.domain);
        setNicheResearchResults(null);

        try {
            const perplexityKey = typeof window !== 'undefined'
                ? localStorage.getItem('ifrit_mcp_perplexity_key')
                : null;

            if (!perplexityKey) {
                alert('Perplexity API key not configured. Go to Settings → MCP Tools.');
                return;
            }

            const response = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `What niche and content topics would work best for the domain "${domain.domain}"? Include monetization potential and competition analysis.`,
                    type: 'deep',
                    tool: 'perplexity',
                    apiKey: perplexityKey
                })
            });

            const data = await response.json();

            if (data.success && data.keyFindings) {
                setNicheResearchResults({
                    domain: domain.domain,
                    findings: data.keyFindings
                });
            }
        } catch (err) {
            console.error('Niche research failed:', err);
        } finally {
            setResearchingNiche(null);
        }
    }, []);

    const handleAnalyzeSelected = useCallback(() => {
        if (!onAnalyze || selectedDomains.size === 0) return;

        const selected = filteredDomains
            .filter(d => selectedDomains.has(d.domain))
            .map(d => ({
                domain: d.domain,
                tld: d.tld,
                score: d.score?.overall || 0,
                recommendation: d.score?.recommendation || 'consider',
                estimatedValue: d.score?.estimatedValue,
                spamzillaData: {
                    domainAge: d.domainAge,
                },
            }));

        onAnalyze(selected);
        setSelectedDomains(new Set());
    }, [onAnalyze, selectedDomains, filteredDomains]);

    const handleQuickQueueSelected = useCallback(() => {
        if (!onQuickQueue || selectedDomains.size === 0) return;

        const selected = filteredDomains
            .filter(d => selectedDomains.has(d.domain))
            .map(d => ({
                domain: d.domain,
                tld: d.tld,
                score: d.score?.overall || 0,
                recommendation: d.score?.recommendation || 'consider',
                estimatedValue: d.score?.estimatedValue,
            }));

        onQuickQueue(selected);
        setSelectedDomains(new Set());
    }, [onQuickQueue, selectedDomains, filteredDomains]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleCSVUpload(file);
        }
    }, [handleCSVUpload]);

    // ============ RENDER ============

    return (
        <div className="space-y-6">
            {/* Import Sources - 4 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ManualImport
                    value={manualInput}
                    onChange={setManualInput}
                    onParse={parseManualDomains}
                    onFileUpload={(file) => handleCSVUpload(file)}
                    onClear={clearManual}
                    importedCount={manualDomains.length}
                    isParsing={isParsingManual}
                />

                <FreeScraper />

                <SpamZillaImport
                    onFileUpload={(file) => handleCSVUpload(file)}
                    importedCount={spamzillaDomains.length}
                    preset={spamzillaPreset}
                />

                <ExternalDomainImport />
            </div>

            {/* Filters */}
            <DomainFilters
                keyword={filters.keyword}
                onKeywordChange={setKeyword}
                sourceFilter={filters.sourceFilter}
                onSourceFilterChange={setSourceFilter}
                tierFilter={filters.tierFilter}
                onTierFilterChange={setTierFilter}
                minScore={filters.minScore}
                onMinScoreChange={setMinScore}
                onReset={resetFilters}
                totalCount={allDomains.length}
                filteredCount={filteredDomains.length}
            />

            {/* Domain Results */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-neutral-900">Domain Results</h3>
                            <span className="text-sm text-neutral-500">
                                {filteredDomains.length} domains
                            </span>
                        </div>

                        {/* Bulk actions */}
                        {selectedDomains.size > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-500">
                                    {selectedDomains.size} selected
                                </span>
                                {onAnalyze && (
                                    <button
                                        onClick={handleAnalyzeSelected}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Deep Analyze ({selectedDomains.size})
                                    </button>
                                )}
                                {onQuickQueue && (
                                    <button
                                        onClick={handleQuickQueueSelected}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-700"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        Quick Queue ({selectedDomains.size})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Select all */}
                    {paginatedDomains.length > 0 && (
                        <div className="mt-2">
                            <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedDomains.size === paginatedDomains.length && paginatedDomains.length > 0}
                                    onChange={selectAll}
                                    className="w-4 h-4 rounded border-neutral-300 text-indigo-600"
                                />
                                Select all on page
                            </label>
                        </div>
                    )}
                </div>

                {/* Domain List */}
                {filteredDomains.length === 0 ? (
                    <div className="p-12 text-center text-neutral-500">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No domains found</p>
                        <p className="text-sm mt-1">
                            Import domains manually, search free sources, or upload a SpamZilla CSV.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {paginatedDomains.map((domain) => (
                            <DomainRow
                                key={domain.domain}
                                domain={domain}
                                isSelected={selectedDomains.has(domain.domain)}
                                onSelect={() => toggleSelection(domain.domain)}
                                isWatched={isWatched(domain.domain)}
                                onToggleWatchlist={() => toggleWatchlist(domain)}
                                onResearchNiche={() => handleResearchNiche(domain)}
                                isResearchingNiche={researchingNiche === domain.domain}
                                onGenerateProfile={() => handleGenerateProfile(domain)}
                                isGeneratingProfile={generatingProfile === domain.domain}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-neutral-500">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Modal */}
            {showProfileModal && generatedProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
                        <h3 className="text-lg font-bold mb-4">
                            Generated Profile: {generatedProfile.domain}
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="font-medium">Niche:</span> {generatedProfile.niche}
                            </div>
                            <div>
                                <span className="font-medium">Primary Keywords:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {generatedProfile.primaryKeywords.map((kw, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">Suggested Topics:</span>
                                <ul className="list-disc list-inside mt-1 text-neutral-600">
                                    {generatedProfile.suggestedTopics.slice(0, 5).map((topic, i) => (
                                        <li key={i}>{topic}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Save profile
                                    setShowProfileModal(false);
                                }}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
