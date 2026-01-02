/**
 * DNS Blacklist Check API
 * 
 * Server-side DNS lookup to check if a domain is on spam blacklists.
 * This runs on Node.js server, not in browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const resolve4 = promisify(dns.resolve4);

// Common DNSBL services
const BLACKLISTS = [
    { zone: 'dbl.spamhaus.org', name: 'Spamhaus DBL' },
    { zone: 'uribl.spamhaus.org', name: 'Spamhaus URIBL' },
];

interface BlacklistResult {
    domain: string;
    listed: boolean;
    details: Array<{
        zone: string;
        name: string;
        listed: boolean;
        returnCode?: string;
    }>;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const domain = body.domain?.toLowerCase().replace(/^www\./, '');

        if (!domain) {
            return NextResponse.json({
                success: false,
                error: 'Domain is required'
            }, { status: 400 });
        }

        const result: BlacklistResult = {
            domain,
            listed: false,
            details: [],
        };

        // Check each blacklist in parallel
        const checks = await Promise.allSettled(
            BLACKLISTS.map(async (bl) => {
                const queryDomain = `${domain}.${bl.zone}`;
                try {
                    const addresses = await resolve4(queryDomain);
                    return {
                        zone: bl.zone,
                        name: bl.name,
                        listed: addresses && addresses.length > 0,
                        returnCode: addresses?.[0],
                    };
                } catch (err) {
                    const error = err as NodeJS.ErrnoException;
                    // ENOTFOUND or ENODATA means not listed (good)
                    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
                        return {
                            zone: bl.zone,
                            name: bl.name,
                            listed: false,
                        };
                    }
                    // Other errors - treat as inconclusive
                    return {
                        zone: bl.zone,
                        name: bl.name,
                        listed: false,
                        error: error.code,
                    };
                }
            })
        );

        for (const check of checks) {
            if (check.status === 'fulfilled') {
                result.details.push(check.value);
                if (check.value.listed) {
                    result.listed = true;
                }
            }
        }

        return NextResponse.json({
            success: true,
            ...result,
        });

    } catch (error) {
        console.error('Blacklist check error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Blacklist check failed'
        }, { status: 500 });
    }
}
