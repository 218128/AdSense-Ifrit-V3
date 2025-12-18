/**
 * Expired Domains API Integration
 * 
 * Integrates with real expired domain APIs.
 * Requires API configuration - NO MOCK DATA.
 * 
 * Supported APIs:
 * - Spamzilla (has API)
 * - ExpiredDomains.net (requires account)
 */

import { quickQualityCheck, parseDomain, DomainMetrics } from './domainScorer';
import { quickSpamCheck } from './spamChecker';

export interface ExpiredDomain {
    domain: string;
    tld: string;

    // SEO Metrics (when available)
    domainRating?: number;     // DR (Ahrefs-style)
    domainAuthority?: number;  // DA (Moz-style)
    trustFlow?: number;        // TF (Majestic)
    citationFlow?: number;     // CF (Majestic)

    // Backlink data
    backlinks?: number;
    referringDomains?: number;

    // Age
    domainAge?: number;        // Years
    archiveAge?: number;       // Years since first archive

    // Status
    status: 'available' | 'pending-delete' | 'auction' | 'unknown';
    dropDate?: string;

    // Local scoring (from our domainScorer)
    qualityScore?: number;
    spamScore?: number;

    // Source
    source: 'expireddomains' | 'spamzilla' | 'manual' | 'other';
}

export interface SearchFilters {
    tlds?: string[];           // ['com', 'net', 'org']
    minDR?: number;            // Minimum Domain Rating
    maxDR?: number;            // Maximum Domain Rating
    minTF?: number;            // Minimum Trust Flow
    minBacklinks?: number;     // Minimum backlinks
    minRD?: number;            // Minimum referring domains
    minAge?: number;           // Minimum domain age (years)
    maxLength?: number;        // Maximum domain name length
    keywords?: string[];       // Keywords to include
    excludeKeywords?: string[];// Keywords to exclude
    niche?: string;            // Target niche for relevance
    onlyAvailable?: boolean;   // Only show immediately available
}

export interface SearchResult {
    domains: ExpiredDomain[];
    total: number;
    page: number;
    hasMore: boolean;
    source: string;
    filters: SearchFilters;
    error?: string;
}

export interface ExpiredDomainsConfig {
    spamzillaApiKey?: string;
    expiredDomainsUsername?: string;
    expiredDomainsPassword?: string;
}

/**
 * Spamzilla API Response Types
 * Based on https://spamzilla.io/api documentation
 */
interface SpamzillaDomainResponse {
    domain: string;
    tld?: string;
    dr?: number;
    domain_rating?: number;
    tf?: number;
    trust_flow?: number;
    cf?: number;
    citation_flow?: number;
    backlinks?: number;
    bl?: number;
    referring_domains?: number;
    rd?: number;
    age?: number;
    status?: 'available' | 'pending-delete' | 'auction' | 'unknown';
    drop_date?: string;
}

/**
 * Get API configuration from localStorage
 */
function getApiConfig(): ExpiredDomainsConfig {
    if (typeof window === 'undefined') return {};

    return {
        spamzillaApiKey: localStorage.getItem('ifrit_spamzilla_key') || undefined,
        expiredDomainsUsername: localStorage.getItem('ifrit_expireddomains_user') || undefined,
        expiredDomainsPassword: localStorage.getItem('ifrit_expireddomains_pass') || undefined,
    };
}

/**
 * Check if any expired domains API is configured
 */
export function isExpiredDomainsConfigured(): boolean {
    const config = getApiConfig();
    return !!(config.spamzillaApiKey || (config.expiredDomainsUsername && config.expiredDomainsPassword));
}

/**
 * Search for expired domains - REQUIRES API CONFIGURATION
 */
export async function searchExpiredDomains(
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
): Promise<SearchResult> {
    const config = getApiConfig();

    // Check if API is configured
    if (!isExpiredDomainsConfigured()) {
        return {
            domains: [],
            total: 0,
            page,
            hasMore: false,
            source: 'none',
            filters,
            error: 'NO API CONFIGURED. Please add Spamzilla API key or ExpiredDomains.net credentials in Settings → Integrations.'
        };
    }

    // Try Spamzilla API first
    if (config.spamzillaApiKey) {
        try {
            return await searchSpamzilla(config.spamzillaApiKey, filters, page, limit);
        } catch (error) {
            return {
                domains: [],
                total: 0,
                page,
                hasMore: false,
                source: 'spamzilla',
                filters,
                error: `Spamzilla API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    // Try ExpiredDomains.net
    if (config.expiredDomainsUsername && config.expiredDomainsPassword) {
        try {
            return await searchExpiredDomainsNet(
                config.expiredDomainsUsername,
                config.expiredDomainsPassword,
                filters,
                page,
                limit
            );
        } catch (error) {
            return {
                domains: [],
                total: 0,
                page,
                hasMore: false,
                source: 'expireddomains',
                filters,
                error: `ExpiredDomains.net Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    return {
        domains: [],
        total: 0,
        page,
        hasMore: false,
        source: 'none',
        filters,
        error: 'NO API CONFIGURED'
    };
}

/**
 * Search using Spamzilla API
 * API Docs: https://spamzilla.io/api
 */
async function searchSpamzilla(
    apiKey: string,
    filters: SearchFilters,
    page: number,
    limit: number
): Promise<SearchResult> {
    const params = new URLSearchParams({
        api_key: apiKey,
        page: String(page),
        limit: String(limit),
    });

    if (filters.minDR) params.append('min_dr', String(filters.minDR));
    if (filters.maxDR) params.append('max_dr', String(filters.maxDR));
    if (filters.minTF) params.append('min_tf', String(filters.minTF));
    if (filters.minBacklinks) params.append('min_bl', String(filters.minBacklinks));
    if (filters.minRD) params.append('min_rd', String(filters.minRD));
    if (filters.tlds?.length) params.append('tlds', filters.tlds.join(','));
    if (filters.keywords?.length) params.append('keywords', filters.keywords.join(','));

    const response = await fetch(`https://api.spamzilla.io/v1/domains?${params}`, {
        headers: {
            'Accept': 'application/json',
        }
    });

    if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
    }

    const domains: ExpiredDomain[] = (data.domains || []).map((d: SpamzillaDomainResponse) => ({
        domain: d.domain,
        tld: d.tld || parseDomain(d.domain).tld,
        domainRating: d.dr || d.domain_rating,
        trustFlow: d.tf || d.trust_flow,
        citationFlow: d.cf || d.citation_flow,
        backlinks: d.backlinks || d.bl,
        referringDomains: d.referring_domains || d.rd,
        domainAge: d.age,
        status: d.status || 'available',
        dropDate: d.drop_date,
        source: 'spamzilla' as const,
        qualityScore: quickQualityCheck(d.domain).pass ? 70 : 30,
        spamScore: quickSpamCheck(d.domain).score,
    }));

    return {
        domains,
        total: data.total || domains.length,
        page,
        hasMore: data.has_more || false,
        source: 'spamzilla',
        filters,
    };
}

/**
 * Search using ExpiredDomains.net
 * Note: This requires web scraping as they don't have an official API
 */
async function searchExpiredDomainsNet(
    _username: string,
    _password: string,
    _filters: SearchFilters,
    _page: number,
    _limit: number
): Promise<SearchResult> {
    // ExpiredDomains.net requires authentication and has no official API
    // This would need server-side implementation with session handling

    throw new Error(
        'ExpiredDomains.net integration requires server-side implementation. ' +
        'Please use Spamzilla API instead, or contact support for custom integration.'
    );
}

/**
 * Save domain to watchlist
 */
export function addToWatchlist(domain: ExpiredDomain): void {
    const watchlist = getWatchlist();

    // Check if already in watchlist
    if (watchlist.some(d => d.domain === domain.domain)) {
        return;
    }

    watchlist.push({
        ...domain,
        addedAt: Date.now(),
    });

    if (typeof window !== 'undefined') {
        localStorage.setItem('ifrit_domain_watchlist', JSON.stringify(watchlist));
    }
}

/**
 * Remove domain from watchlist
 */
export function removeFromWatchlist(domain: string): void {
    const watchlist = getWatchlist();
    const filtered = watchlist.filter(d => d.domain !== domain);

    if (typeof window !== 'undefined') {
        localStorage.setItem('ifrit_domain_watchlist', JSON.stringify(filtered));
    }
}

/**
 * Get watchlist
 */
export function getWatchlist(): (ExpiredDomain & { addedAt: number })[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem('ifrit_domain_watchlist');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Convert ExpiredDomain to DomainMetrics for scoring
 */
export function toMetrics(expired: ExpiredDomain): DomainMetrics {
    const { tld, length } = parseDomain(expired.domain);

    return {
        domain: expired.domain,
        tld: expired.tld || tld,
        length,
        domainRating: expired.domainRating,
        domainAuthority: expired.domainAuthority,
        trustFlow: expired.trustFlow,
        citationFlow: expired.citationFlow,
        backlinks: expired.backlinks,
        referringDomains: expired.referringDomains,
        domainAge: expired.domainAge,
        dataSource: expired.source === 'spamzilla' ? 'spamzilla' : 'free-api',
    };
}

/**
 * Check if a domain is still available for registration
 * Uses Namecheap or similar API - REQUIRES CONFIGURATION
 */
export async function checkAvailability(domain: string): Promise<{
    available: boolean;
    registrar?: string;
    price?: number;
    error?: string;
}> {
    // Check if Namecheap API is configured
    const namecheapUser = typeof window !== 'undefined' ? localStorage.getItem('ifrit_namecheap_user') : null;
    const namecheapKey = typeof window !== 'undefined' ? localStorage.getItem('ifrit_namecheap_key') : null;

    if (!namecheapUser || !namecheapKey) {
        return {
            available: false,
            error: 'Namecheap API not configured. Add credentials in Settings → Integrations.'
        };
    }

    try {
        // Call our API route which handles Namecheap
        const response = await fetch('/api/domains/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        });

        const data = await response.json();

        if (!data.success) {
            return { available: false, error: data.error };
        }

        return {
            available: data.available,
            registrar: 'Namecheap',
            price: data.price
        };
    } catch (error) {
        return {
            available: false,
            error: `Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Get purchase links for different registrars
 */
export function getPurchaseLinks(domain: string): {
    registrar: string;
    url: string;
}[] {
    return [
        {
            registrar: 'Namecheap',
            url: `https://www.namecheap.com/domains/registration/results/?domain=${domain}`,
        },
        {
            registrar: 'Cloudflare',
            url: `https://www.cloudflare.com/products/registrar/`,
        },
        {
            registrar: 'Porkbun',
            url: `https://porkbun.com/checkout/search?q=${domain}`,
        },
        {
            registrar: 'GoDaddy',
            url: `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${domain}`,
        },
    ];
}
