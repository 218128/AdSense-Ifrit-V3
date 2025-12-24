/**
 * MCP Domain Hunter - Types
 * 
 * Shared type definitions for expired domain data sources.
 */

// ========== DOMAIN DATA TYPES ==========

export interface ExpiredDomain {
    domain: string;
    tld: string;
    registrar: string;
    expiryDate: string;
    dropDate?: string;

    // Metrics
    age?: number;
    backlinks?: number;
    referringDomains?: number;
    domainAuthority?: number;
    trustFlow?: number;
    citationFlow?: number;

    // Pricing
    price?: number;
    currency?: string;
    auctionType?: 'buy-now' | 'auction' | 'make-offer';

    // Source metadata
    source: DomainSource;
    sourceUrl?: string;
    fetchedAt: number;
}

export type DomainSource =
    | 'dynadot'
    | 'godaddy'
    | 'expireddomains'
    | 'namecheap';

// ========== SEARCH PARAMETERS ==========

export interface DomainSearchParams {
    keywords?: string[];
    tlds?: string[];
    minAge?: number;
    maxAge?: number;
    minDA?: number;
    maxPrice?: number;
    sources?: DomainSource[];
    limit?: number;
}

export interface DomainSearchResult {
    domains: ExpiredDomain[];
    totalFound: number;
    sources: SourceStatus[];
    searchedAt: number;
}

// ========== SOURCE STATUS ==========

export interface SourceStatus {
    source: DomainSource;
    status: 'success' | 'error' | 'no-credentials' | 'rate-limited';
    domainsFound: number;
    error?: string;
    message?: string;
}

// ========== API CREDENTIALS ==========

export interface SourceCredentials {
    dynadot?: {
        apiKey: string;
    };
    godaddy?: {
        apiKey: string;
        apiSecret: string;
    };
    expireddomains?: {
        username: string;
        password: string;
    };
}

// ========== ERROR TYPES ==========

export class DomainHunterError extends Error {
    constructor(
        message: string,
        public readonly source: DomainSource,
        public readonly code: 'NO_CREDENTIALS' | 'API_ERROR' | 'RATE_LIMITED' | 'PARSE_ERROR'
    ) {
        super(message);
        this.name = 'DomainHunterError';
    }
}

// ========== PROFESSIONAL ERROR MESSAGES ==========

export const CREDENTIAL_ERRORS: Record<DomainSource, string> = {
    dynadot: 'Dynadot API key not configured. Add DYNADOT_API_KEY to your environment variables. Get your API key from: https://www.dynadot.com/account/domain/setting/api.html',
    godaddy: 'GoDaddy API credentials not configured. Add GODADDY_API_KEY and GODADDY_API_SECRET to your environment variables. Get your API keys from: https://developer.godaddy.com/keys',
    expireddomains: 'ExpiredDomains.net credentials not configured. Add EXPIRED_DOMAINS_USERNAME and EXPIRED_DOMAINS_PASSWORD to your environment variables. Register at: https://www.expireddomains.net/register/',
    namecheap: 'Namecheap API credentials not configured. Add NAMECHEAP_API_KEY and NAMECHEAP_USERNAME to your environment variables.',
};
