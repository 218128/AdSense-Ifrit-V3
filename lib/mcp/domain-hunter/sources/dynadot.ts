/**
 * MCP Domain Hunter - Dynadot Source
 * 
 * Integration with Dynadot's expired domain marketplace.
 * API Documentation: https://www.dynadot.com/domain/api3.html
 */

import {
    ExpiredDomain,
    DomainSearchParams,
    SourceStatus,
    DomainHunterError,
    CREDENTIAL_ERRORS
} from '../types';

const DYNADOT_API_BASE = 'https://api.dynadot.com/api3.json';

interface DynadotApiResponse {
    status: string;
    domains?: Array<{
        domain: string;
        price: number;
        currency: string;
        expiry_date?: string;
    }>;
    error?: string;
}

/**
 * Check if Dynadot credentials are configured
 */
export function hasDynadotCredentials(): boolean {
    return !!process.env.DYNADOT_API_KEY;
}

/**
 * Get Dynadot API key
 */
function getApiKey(): string {
    const apiKey = process.env.DYNADOT_API_KEY;
    if (!apiKey) {
        throw new DomainHunterError(
            CREDENTIAL_ERRORS.dynadot,
            'dynadot',
            'NO_CREDENTIALS'
        );
    }
    return apiKey;
}

/**
 * Search Dynadot marketplace for expired domains
 */
export async function searchDynadot(
    params: DomainSearchParams
): Promise<{ domains: ExpiredDomain[]; status: SourceStatus }> {
    // Check credentials first
    if (!hasDynadotCredentials()) {
        return {
            domains: [],
            status: {
                source: 'dynadot',
                status: 'no-credentials',
                domainsFound: 0,
                message: CREDENTIAL_ERRORS.dynadot
            }
        };
    }

    try {
        const apiKey = getApiKey();

        // Build search URL
        const url = new URL(DYNADOT_API_BASE);
        url.searchParams.set('key', apiKey);
        url.searchParams.set('command', 'search_expired');

        if (params.keywords?.length) {
            url.searchParams.set('keyword', params.keywords.join(','));
        }
        if (params.tlds?.length) {
            url.searchParams.set('tld', params.tlds.join(','));
        }
        if (params.maxPrice) {
            url.searchParams.set('max_price', params.maxPrice.toString());
        }
        if (params.limit) {
            url.searchParams.set('limit', params.limit.toString());
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new DomainHunterError(
                `Dynadot API returned ${response.status}: ${response.statusText}`,
                'dynadot',
                'API_ERROR'
            );
        }

        const data: DynadotApiResponse = await response.json();

        if (data.status !== 'success') {
            throw new DomainHunterError(
                data.error || 'Unknown Dynadot API error',
                'dynadot',
                'API_ERROR'
            );
        }

        const domains: ExpiredDomain[] = (data.domains || []).map(d => ({
            domain: d.domain,
            tld: d.domain.split('.').pop() || '',
            registrar: 'Dynadot',
            expiryDate: d.expiry_date || '',
            price: d.price,
            currency: d.currency,
            auctionType: 'buy-now' as const,
            source: 'dynadot' as const,
            sourceUrl: `https://www.dynadot.com/market/search?domain=${d.domain}`,
            fetchedAt: Date.now(),
        }));

        return {
            domains,
            status: {
                source: 'dynadot',
                status: 'success',
                domainsFound: domains.length,
            }
        };

    } catch (error) {
        if (error instanceof DomainHunterError) {
            return {
                domains: [],
                status: {
                    source: 'dynadot',
                    status: error.code === 'NO_CREDENTIALS' ? 'no-credentials' : 'error',
                    domainsFound: 0,
                    error: error.message
                }
            };
        }

        return {
            domains: [],
            status: {
                source: 'dynadot',
                status: 'error',
                domainsFound: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}
