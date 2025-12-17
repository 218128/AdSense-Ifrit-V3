/**
 * DNS Blacklist Check API
 * 
 * Server-side DNS queries to Spamhaus DNSBL.
 * Browser JS cannot make DNS queries, so this runs on the server.
 * 
 * Free to use for low volume queries.
 */

import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const dnsResolve4 = promisify(dns.resolve4);

// DNS Blacklist zones to check
const BLACKLIST_ZONES = [
    { zone: 'dbl.spamhaus.org', type: 'domain', name: 'Spamhaus DBL' },
    { zone: 'zen.spamhaus.org', type: 'ip', name: 'Spamhaus ZEN' },
];

interface BlacklistResult {
    domain: string;
    listed: boolean;
    details: {
        zone: string;
        name: string;
        listed: boolean;
        returnCode?: string;
    }[];
}

interface BlacklistResponse {
    success: boolean;
    result?: BlacklistResult;
    error?: string;
}

/**
 * Check if a domain is on DNS blacklists
 */
async function checkDomainBlacklist(domain: string): Promise<BlacklistResult> {
    const details: BlacklistResult['details'] = [];
    let isListed = false;

    // Clean domain
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

    for (const { zone, type, name } of BLACKLIST_ZONES) {
        // Only check domain-based lists (DBL) for domains
        if (type === 'ip') continue;

        try {
            // Query: domain.dbl.spamhaus.org
            const queryDomain = `${cleanDomain}.${zone}`;
            const addresses = await dnsResolve4(queryDomain);

            // If it resolves, the domain is listed
            if (addresses && addresses.length > 0) {
                isListed = true;
                details.push({
                    zone,
                    name,
                    listed: true,
                    returnCode: addresses[0],
                });
            }
        } catch (error) {
            // ENOTFOUND = not listed (good!)
            // ENODATA = not listed
            // Other errors = query failed
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
                details.push({
                    zone,
                    name,
                    listed: false,
                });
            } else {
                // Query failed, skip this zone
                console.error(`Blacklist check failed for ${zone}:`, err.message);
            }
        }
    }

    return {
        domain: cleanDomain,
        listed: isListed,
        details,
    };
}

/**
 * GET - Check single domain
 */
export async function GET(request: NextRequest): Promise<NextResponse<BlacklistResponse>> {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
        return NextResponse.json({
            success: false,
            error: 'Domain parameter required',
        }, { status: 400 });
    }

    try {
        const result = await checkDomainBlacklist(domain);
        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error('Blacklist check error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Check failed',
        }, { status: 500 });
    }
}

/**
 * POST - Check multiple domains
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { domains } = body;

        if (!domains || !Array.isArray(domains) || domains.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Domains array required',
            }, { status: 400 });
        }

        // Limit to 20 domains to avoid rate limits
        const domainsToCheck = domains.slice(0, 20);
        const results: BlacklistResult[] = [];

        for (const domain of domainsToCheck) {
            const result = await checkDomainBlacklist(domain);
            results.push(result);

            // Small delay between queries
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return NextResponse.json({
            success: true,
            results,
            checked: results.length,
            listedCount: results.filter(r => r.listed).length,
        });
    } catch (error) {
        console.error('Bulk blacklist check error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Check failed',
        }, { status: 500 });
    }
}
