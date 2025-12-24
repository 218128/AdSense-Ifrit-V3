/**
 * MCP Domain Hunter - GoDaddy Source
 * 
 * Integration with GoDaddy Auctions API.
 * API Documentation: https://developer.godaddy.com/doc/endpoint/domains
 */

import {
    ExpiredDomain,
    DomainSearchParams,
    SourceStatus,
    DomainHunterError,
    CREDENTIAL_ERRORS
} from '../types';

const GODADDY_API_BASE = 'https://api.godaddy.com/v1';

interface GoDaddyAuctionResult {
    domainName: string;
    price: number;
    auctionEndTime?: string;
    traffic?: number;
    domainAge?: number;
    bid_count?: number;
}

interface GoDaddyApiResponse {
    auctions?: GoDaddyAuctionResult[];
    error?: string;
    code?: string;
}

/**
 * Check if GoDaddy credentials are configured
 */
export function hasGoDaddyCredentials(): boolean {
    return !!(process.env.GODADDY_API_KEY && process.env.GODADDY_API_SECRET);
}

/**
 * Get GoDaddy auth header
 */
function getAuthHeader(): string {
    const apiKey = process.env.GODADDY_API_KEY;
    const apiSecret = process.env.GODADDY_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new DomainHunterError(
            CREDENTIAL_ERRORS.godaddy,
            'godaddy',
            'NO_CREDENTIALS'
        );
    }

    return `sso-key ${apiKey}:${apiSecret}`;
}

/**
 * Search GoDaddy Auctions for expired domains
 */
export async function searchGoDaddy(
    params: DomainSearchParams
): Promise<{ domains: ExpiredDomain[]; status: SourceStatus }> {
    // Check credentials first
    if (!hasGoDaddyCredentials()) {
        return {
            domains: [],
            status: {
                source: 'godaddy',
                status: 'no-credentials',
                domainsFound: 0,
                message: CREDENTIAL_ERRORS.godaddy
            }
        };
    }

    try {
        const authHeader = getAuthHeader();

        // Build search URL for auctions
        const url = new URL(`${GODADDY_API_BASE}/domains/auctions/list`);

        if (params.keywords?.length) {
            url.searchParams.set('query', params.keywords.join(' '));
        }
        if (params.tlds?.length) {
            url.searchParams.set('tlds', params.tlds.join(','));
        }
        if (params.maxPrice) {
            url.searchParams.set('maxPrice', params.maxPrice.toString());
        }
        if (params.limit) {
            url.searchParams.set('limit', Math.min(params.limit, 100).toString());
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
            },
        });

        // Handle rate limiting
        if (response.status === 429) {
            return {
                domains: [],
                status: {
                    source: 'godaddy',
                    status: 'rate-limited',
                    domainsFound: 0,
                    message: 'GoDaddy API rate limit exceeded. Please try again later.'
                }
            };
        }

        if (!response.ok) {
            throw new DomainHunterError(
                `GoDaddy API returned ${response.status}: ${response.statusText}`,
                'godaddy',
                'API_ERROR'
            );
        }

        const data: GoDaddyApiResponse = await response.json();

        if (data.error) {
            throw new DomainHunterError(
                data.error,
                'godaddy',
                'API_ERROR'
            );
        }

        const domains: ExpiredDomain[] = (data.auctions || []).map(auction => ({
            domain: auction.domainName,
            tld: auction.domainName.split('.').pop() || '',
            registrar: 'GoDaddy',
            expiryDate: auction.auctionEndTime || '',
            age: auction.domainAge,
            price: auction.price,
            currency: 'USD',
            auctionType: 'auction' as const,
            source: 'godaddy' as const,
            sourceUrl: `https://auctions.godaddy.com/trpItemListing.aspx?domain=${auction.domainName}`,
            fetchedAt: Date.now(),
        }));

        return {
            domains,
            status: {
                source: 'godaddy',
                status: 'success',
                domainsFound: domains.length,
            }
        };

    } catch (error) {
        if (error instanceof DomainHunterError) {
            return {
                domains: [],
                status: {
                    source: 'godaddy',
                    status: error.code === 'NO_CREDENTIALS' ? 'no-credentials' : 'error',
                    domainsFound: 0,
                    error: error.message
                }
            };
        }

        return {
            domains: [],
            status: {
                source: 'godaddy',
                status: 'error',
                domainsFound: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}
