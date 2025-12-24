/**
 * MCP Domain Hunter - Main Server
 * 
 * Unified domain search across multiple expired domain sources.
 * Provides professional error handling when API keys are not configured.
 */

import {
    DomainSearchParams,
    DomainSearchResult,
    ExpiredDomain,
    SourceStatus,
    DomainSource,
} from './types';

import {
    searchDynadot,
    hasDynadotCredentials,
    searchGoDaddy,
    hasGoDaddyCredentials,
    searchExpiredDomains,
    hasExpiredDomainsCredentials,
} from './sources';

// ========== SOURCE REGISTRY ==========

const SOURCES: Record<DomainSource, {
    search: (params: DomainSearchParams) => Promise<{ domains: ExpiredDomain[]; status: SourceStatus }>;
    hasCredentials: () => boolean;
    name: string;
}> = {
    dynadot: {
        search: searchDynadot,
        hasCredentials: hasDynadotCredentials,
        name: 'Dynadot Marketplace'
    },
    godaddy: {
        search: searchGoDaddy,
        hasCredentials: hasGoDaddyCredentials,
        name: 'GoDaddy Auctions'
    },
    expireddomains: {
        search: searchExpiredDomains,
        hasCredentials: hasExpiredDomainsCredentials,
        name: 'ExpiredDomains.net'
    },
    namecheap: {
        search: async () => ({ domains: [], status: { source: 'namecheap' as const, status: 'error' as const, domainsFound: 0, message: 'Namecheap integration coming soon' } }),
        hasCredentials: () => false,
        name: 'Namecheap (Coming Soon)'
    }
};

// ========== PUBLIC API ==========

/**
 * Get status of all domain sources
 */
export function getSourcesStatus(): Array<{
    source: DomainSource;
    name: string;
    configured: boolean;
}> {
    return Object.entries(SOURCES).map(([source, config]) => ({
        source: source as DomainSource,
        name: config.name,
        configured: config.hasCredentials(),
    }));
}

/**
 * Get configured sources count
 */
export function getConfiguredSourcesCount(): number {
    return Object.values(SOURCES).filter(s => s.hasCredentials()).length;
}

/**
 * Search for expired domains across all configured sources
 */
export async function searchExpiredDomainsAll(
    params: DomainSearchParams
): Promise<DomainSearchResult> {
    const sourcesToSearch = params.sources || (['dynadot', 'godaddy', 'expireddomains'] as DomainSource[]);

    const results = await Promise.allSettled(
        sourcesToSearch.map(source => {
            const sourceConfig = SOURCES[source];
            if (!sourceConfig) {
                return Promise.resolve({
                    domains: [],
                    status: {
                        source,
                        status: 'error' as const,
                        domainsFound: 0,
                        error: `Unknown source: ${source}`
                    }
                });
            }
            return sourceConfig.search(params);
        })
    );

    const allDomains: ExpiredDomain[] = [];
    const sourceStatuses: SourceStatus[] = [];

    for (const result of results) {
        if (result.status === 'fulfilled') {
            allDomains.push(...result.value.domains);
            sourceStatuses.push(result.value.status);
        } else {
            // This shouldn't happen as we catch errors in individual sources
            sourceStatuses.push({
                source: 'dynadot',
                status: 'error',
                domainsFound: 0,
                error: result.reason?.message || 'Unknown error'
            });
        }
    }

    // Sort by metrics (DA, TF, or price)
    allDomains.sort((a, b) => {
        if (a.domainAuthority && b.domainAuthority) {
            return b.domainAuthority - a.domainAuthority;
        }
        if (a.trustFlow && b.trustFlow) {
            return b.trustFlow - a.trustFlow;
        }
        return 0;
    });

    // Apply limit
    const limitedDomains = params.limit ? allDomains.slice(0, params.limit) : allDomains;

    return {
        domains: limitedDomains,
        totalFound: allDomains.length,
        sources: sourceStatuses,
        searchedAt: Date.now(),
    };
}

/**
 * Search a specific source
 */
export async function searchSource(
    source: DomainSource,
    params: DomainSearchParams
): Promise<{ domains: ExpiredDomain[]; status: SourceStatus }> {
    const sourceConfig = SOURCES[source];
    if (!sourceConfig) {
        return {
            domains: [],
            status: {
                source,
                status: 'error',
                domainsFound: 0,
                error: `Unknown source: ${source}`
            }
        };
    }
    return sourceConfig.search(params);
}
