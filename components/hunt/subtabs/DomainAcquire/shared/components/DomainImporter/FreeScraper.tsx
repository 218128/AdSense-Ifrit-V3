/**
 * FreeScraper Component
 * 
 * Searches for expired domains across multiple sources using MCP Domain Hunter.
 * Shows professional error messages when API keys are not configured.
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Globe,
    Loader2,
    Search,
    AlertCircle,
    CheckCircle,
    Settings,
    ExternalLink,
    RefreshCw
} from 'lucide-react';

// ============ TYPES ============

interface SourceInfo {
    source: string;
    name: string;
    configured: boolean;
}

interface SourceStatus {
    source: string;
    status: 'success' | 'error' | 'no-credentials' | 'rate-limited';
    domainsFound: number;
    message?: string;
    error?: string;
}

interface ExpiredDomain {
    domain: string;
    tld: string;
    registrar: string;
    price?: number;
    currency?: string;
    domainAuthority?: number;
    trustFlow?: number;
    age?: number;
    source: string;
    sourceUrl?: string;
}

// ============ PROPS ============

export interface FreeScraperProps {
    /** Callback when domains are found */
    onDomainsFound?: (domains: ExpiredDomain[]) => void;
}

// ============ COMPONENT ============

export function FreeScraper({ onDomainsFound }: FreeScraperProps) {
    const [sources, setSources] = useState<SourceInfo[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        domains: ExpiredDomain[];
        sources: SourceStatus[];
    } | null>(null);
    const [keywords, setKeywords] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Fetch sources status on mount
    useEffect(() => {
        fetchSourcesStatus();
    }, []);

    const fetchSourcesStatus = async () => {
        setIsLoadingSources(true);
        try {
            const response = await fetch('/api/domain-hunter');
            if (response.ok) {
                const data = await response.json();
                setSources(data.sources || []);
            }
        } catch (err) {
            console.error('Failed to fetch sources:', err);
        } finally {
            setIsLoadingSources(false);
        }
    };

    const handleSearch = async () => {
        if (!keywords.trim()) return;

        setIsSearching(true);
        setError(null);
        setSearchResults(null);

        try {
            const response = await fetch('/api/domain-hunter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
                    limit: 50,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSearchResults({
                    domains: data.domains || [],
                    sources: data.sources || [],
                });

                if (onDomainsFound && data.domains?.length > 0) {
                    onDomainsFound(data.domains);
                }
            } else {
                setError(data.error || 'Search failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    const configuredCount = sources.filter(s => s.configured).length;
    const hasConfiguredSources = configuredCount > 0;

    return (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-sm text-blue-800">
                    🌐 Domain Hunter
                </span>
                <span className="text-xs text-blue-500 ml-auto">
                    {isLoadingSources
                        ? 'Loading...'
                        : `${configuredCount}/${sources.length} sources`
                    }
                </span>
            </div>

            {/* Sources Status */}
            {!isLoadingSources && (
                <div className="mb-4 space-y-1">
                    {sources.map(source => (
                        <div
                            key={source.source}
                            className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${source.configured
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                        >
                            {source.configured
                                ? <CheckCircle className="w-3 h-3" />
                                : <AlertCircle className="w-3 h-3" />
                            }
                            <span>{source.name}</span>
                            {!source.configured && (
                                <span className="ml-auto text-amber-500">
                                    Configure API key
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Search Input */}
            {hasConfiguredSources ? (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Keywords (comma separated)..."
                            className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={isSearching}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !keywords.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSearching ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    Search
                                </>
                            )}
                        </button>
                    </div>

                    {/* Results */}
                    {searchResults && (
                        <div className="mt-3 space-y-2">
                            {/* Source Results */}
                            <div className="flex flex-wrap gap-2">
                                {searchResults.sources.map(src => (
                                    <div
                                        key={src.source}
                                        className={`text-xs px-2 py-1 rounded ${src.status === 'success'
                                                ? 'bg-green-100 text-green-700'
                                                : src.status === 'no-credentials'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}
                                    >
                                        {src.source}: {src.domainsFound} found
                                        {src.message && ` - ${src.message}`}
                                    </div>
                                ))}
                            </div>

                            {/* Domain List */}
                            {searchResults.domains.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {searchResults.domains.slice(0, 10).map((d, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between bg-white p-2 rounded border"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{d.domain}</span>
                                                {d.sourceUrl && (
                                                    <a
                                                        href={d.sourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:text-blue-700"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-neutral-500">
                                                {d.domainAuthority && <span>DA: {d.domainAuthority}</span>}
                                                {d.trustFlow && <span>TF: {d.trustFlow}</span>}
                                                {d.price && <span>${d.price}</span>}
                                                <span className="text-blue-500">{d.source}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {searchResults.domains.length > 10 && (
                                        <p className="text-xs text-neutral-500 text-center">
                                            +{searchResults.domains.length - 10} more domains
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-500 text-center py-2">
                                    No domains found matching your keywords
                                </p>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                /* No sources configured */
                <div className="space-y-3">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Settings className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="text-amber-800 font-medium">API Keys Required</p>
                                <p className="text-amber-700 mt-1">
                                    Configure at least one domain source to enable search:
                                </p>
                                <ul className="text-amber-600 mt-2 space-y-1 list-disc list-inside">
                                    <li>DYNADOT_API_KEY</li>
                                    <li>GODADDY_API_KEY + GODADDY_API_SECRET</li>
                                    <li>EXPIRED_DOMAINS_USERNAME + EXPIRED_DOMAINS_PASSWORD</li>
                                </ul>
                                <p className="text-amber-500 mt-2">
                                    Add these to your .env.local file
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={fetchSourcesStatus}
                        disabled={isLoadingSources}
                        className="w-full px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingSources ? 'animate-spin' : ''}`} />
                        Refresh Status
                    </button>
                </div>
            )}
        </div>
    );
}
