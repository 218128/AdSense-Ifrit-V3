/**
 * MCP Domain Hunter - ExpiredDomains.net Source
 * 
 * Integration with ExpiredDomains.net for expired domain listings.
 * Note: This uses their API/authenticated endpoints.
 */

import {
    ExpiredDomain,
    DomainSearchParams,
    SourceStatus,
    DomainHunterError,
    CREDENTIAL_ERRORS
} from '../types';

const EXPIRED_DOMAINS_BASE = 'https://www.expireddomains.net';

/**
 * Check if ExpiredDomains.net credentials are configured
 */
export function hasExpiredDomainsCredentials(): boolean {
    return !!(process.env.EXPIRED_DOMAINS_USERNAME && process.env.EXPIRED_DOMAINS_PASSWORD);
}

/**
 * Search ExpiredDomains.net for expired domains
 */
export async function searchExpiredDomains(
    params: DomainSearchParams
): Promise<{ domains: ExpiredDomain[]; status: SourceStatus }> {
    // Check credentials first
    if (!hasExpiredDomainsCredentials()) {
        return {
            domains: [],
            status: {
                source: 'expireddomains',
                status: 'no-credentials',
                domainsFound: 0,
                message: CREDENTIAL_ERRORS.expireddomains
            }
        };
    }

    try {
        const username = process.env.EXPIRED_DOMAINS_USERNAME!;
        const password = process.env.EXPIRED_DOMAINS_PASSWORD!;

        // First, authenticate and get session
        const loginResponse = await fetch(`${EXPIRED_DOMAINS_BASE}/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'login': username,
                'password': password,
            }),
            redirect: 'manual',
        });

        // Extract session cookie
        const cookies = loginResponse.headers.get('set-cookie');
        if (!cookies) {
            throw new DomainHunterError(
                'Failed to authenticate with ExpiredDomains.net. Please check your credentials.',
                'expireddomains',
                'API_ERROR'
            );
        }

        // Build search URL
        const searchUrl = new URL(`${EXPIRED_DOMAINS_BASE}/domain-lists/`);

        if (params.keywords?.length) {
            searchUrl.searchParams.set('q', params.keywords.join(' '));
        }
        if (params.tlds?.length) {
            // ExpiredDomains uses specific TLD pages, we'll search all for now
            searchUrl.searchParams.set('ftld', params.tlds.join(','));
        }
        if (params.minDA) {
            searchUrl.searchParams.set('fmajesticda_min', params.minDA.toString());
        }
        if (params.minAge) {
            searchUrl.searchParams.set('fage_min', params.minAge.toString());
        }

        // Fetch search results
        const searchResponse = await fetch(searchUrl.toString(), {
            headers: {
                'Cookie': cookies,
                'Accept': 'text/html',
            },
        });

        if (!searchResponse.ok) {
            throw new DomainHunterError(
                `ExpiredDomains.net returned ${searchResponse.status}`,
                'expireddomains',
                'API_ERROR'
            );
        }

        const html = await searchResponse.text();

        // Parse HTML response to extract domain data
        const domains = parseExpiredDomainsHtml(html, params.limit || 50);

        return {
            domains,
            status: {
                source: 'expireddomains',
                status: 'success',
                domainsFound: domains.length,
            }
        };

    } catch (error) {
        if (error instanceof DomainHunterError) {
            return {
                domains: [],
                status: {
                    source: 'expireddomains',
                    status: error.code === 'NO_CREDENTIALS' ? 'no-credentials' : 'error',
                    domainsFound: 0,
                    error: error.message
                }
            };
        }

        return {
            domains: [],
            status: {
                source: 'expireddomains',
                status: 'error',
                domainsFound: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

/**
 * Parse ExpiredDomains.net HTML to extract domain data
 */
function parseExpiredDomainsHtml(html: string, limit: number): ExpiredDomain[] {
    const domains: ExpiredDomain[] = [];

    // Use regex to extract domain rows from the table
    // ExpiredDomains.net uses a table with class "base1"
    const tableMatch = html.match(/<table[^>]*class="[^"]*base1[^"]*"[^>]*>([\s\S]*?)<\/table>/);
    if (!tableMatch) {
        return domains;
    }

    // Extract rows
    const rowMatches = tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g);

    for (const rowMatch of rowMatches) {
        if (domains.length >= limit) break;

        const row = rowMatch[1];

        // Skip header rows
        if (row.includes('<th')) continue;

        // Extract domain name
        const domainMatch = row.match(/class="field_domain"[^>]*>([^<]+)/);
        if (!domainMatch) continue;

        const domain = domainMatch[1].trim();

        // Extract metrics
        const blMatch = row.match(/class="field_bl"[^>]*>([^<]+)/);
        const daMatch = row.match(/class="field_domainpop"[^>]*>([^<]+)/);
        const tfMatch = row.match(/class="field_tf"[^>]*>([^<]+)/);
        const cfMatch = row.match(/class="field_cf"[^>]*>([^<]+)/);
        const ageMatch = row.match(/class="field_age"[^>]*>([^<]+)/);

        domains.push({
            domain,
            tld: domain.split('.').pop() || '',
            registrar: 'Unknown',
            expiryDate: '',
            backlinks: blMatch ? parseInt(blMatch[1].replace(/,/g, '')) || 0 : undefined,
            domainAuthority: daMatch ? parseInt(daMatch[1]) || undefined : undefined,
            trustFlow: tfMatch ? parseInt(tfMatch[1]) || undefined : undefined,
            citationFlow: cfMatch ? parseInt(cfMatch[1]) || undefined : undefined,
            age: ageMatch ? parseInt(ageMatch[1]) || undefined : undefined,
            source: 'expireddomains',
            sourceUrl: `https://www.expireddomains.net/domain-name-search/?q=${domain}`,
            fetchedAt: Date.now(),
        });
    }

    return domains;
}
