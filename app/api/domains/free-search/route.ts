/**
 * Free Expired Domain Search API
 * 
 * Attempts to scrape public expired domain sources.
 * NO MOCK DATA - Returns real errors if scraping fails.
 * 
 * Sources attempted:
 * - expiredomains.io (public feed)
 * - freedirectorywebsites.com
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FreeDomain {
    domain: string;
    tld: string;
    source: 'expiredomains_io' | 'freedirectory' | 'manual';
    status: 'unknown' | 'available' | 'pending';
    fetchedAt: number;
}

interface FreeSearchResponse {
    success: boolean;
    domains: FreeDomain[];
    source: string;
    error?: string;
    actionRequired?: {
        type: 'captcha' | 'rate_limit' | 'blocked' | 'network';
        message: string;
        action: string;
        url?: string;
    };
    debugInfo?: string;
}

/**
 * Attempt to scrape expiredomains.io
 */
async function scrapeExpiredDomainsIO(keywords?: string): Promise<{
    domains: FreeDomain[];
    error?: string;
    actionRequired?: FreeSearchResponse['actionRequired'];
}> {
    try {
        // expiredomains.io has a public list page
        const url = keywords
            ? `https://expiredomains.io/search/?q=${encodeURIComponent(keywords)}`
            : 'https://expiredomains.io/expired-domains/';

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
            if (response.status === 403) {
                return {
                    domains: [],
                    error: 'Access blocked by expiredomains.io',
                    actionRequired: {
                        type: 'blocked',
                        message: 'expiredomains.io is blocking automated requests.',
                        action: 'Visit the site manually and copy domain names, or use the Manual Import feature.',
                        url: 'https://expiredomains.io/expired-domains/',
                    },
                };
            }
            if (response.status === 429) {
                return {
                    domains: [],
                    error: 'Rate limited by expiredomains.io',
                    actionRequired: {
                        type: 'rate_limit',
                        message: 'Too many requests to expiredomains.io.',
                        action: 'Wait 5-10 minutes before trying again, or use Manual Import.',
                        url: 'https://expiredomains.io/expired-domains/',
                    },
                };
            }
            return {
                domains: [],
                error: `HTTP ${response.status}: ${response.statusText}`,
            };
        }

        const html = await response.text();

        // Check for CAPTCHA
        if (html.includes('captcha') || html.includes('Captcha') || html.includes('CAPTCHA') || html.includes('challenge')) {
            return {
                domains: [],
                error: 'CAPTCHA required',
                actionRequired: {
                    type: 'captcha',
                    message: 'expiredomains.io requires CAPTCHA verification.',
                    action: 'Open the site in your browser, complete the CAPTCHA, then try again or use Manual Import.',
                    url: 'https://expiredomains.io/expired-domains/',
                },
            };
        }

        // Parse domains from HTML
        // Look for domain patterns in the page
        const domainRegex = /([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+([a-zA-Z]{2,63})/g;
        const matches = html.match(domainRegex) || [];

        // Filter to likely expired domain entries (not navigation/footer links)
        const domains: FreeDomain[] = [];
        const seen = new Set<string>();

        for (const match of matches) {
            const domain = match.toLowerCase();

            // Skip common non-domain patterns
            if (domain.includes('expiredomains.io')) continue;
            if (domain.includes('google.') || domain.includes('facebook.') || domain.includes('twitter.')) continue;
            if (domain.includes('cloudflare') || domain.includes('jquery') || domain.includes('bootstrap')) continue;
            if (domain.length < 5 || domain.length > 50) continue;
            if (seen.has(domain)) continue;

            seen.add(domain);

            const parts = domain.split('.');
            const tld = parts[parts.length - 1];

            domains.push({
                domain,
                tld,
                source: 'expiredomains_io',
                status: 'unknown',
                fetchedAt: Date.now(),
            });
        }

        if (domains.length === 0) {
            return {
                domains: [],
                error: 'No domains found in response',
                actionRequired: {
                    type: 'blocked',
                    message: 'Could not parse domains from expiredomains.io.',
                    action: 'The site structure may have changed. Use Manual Import or configure a premium API.',
                    url: 'https://expiredomains.io/expired-domains/',
                },
            };
        }

        return { domains: domains.slice(0, 50) }; // Limit to 50 domains
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
                return {
                    domains: [],
                    error: 'Request timed out',
                    actionRequired: {
                        type: 'network',
                        message: 'Connection to expiredomains.io timed out.',
                        action: 'Check your internet connection and try again.',
                    },
                };
            }
        }

        return {
            domains: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * GET - Search free expired domain sources
 */
export async function GET(request: NextRequest): Promise<NextResponse<FreeSearchResponse>> {
    const { searchParams } = new URL(request.url);
    const keywords = searchParams.get('keywords') || undefined;

    // Try expiredomains.io first
    const result = await scrapeExpiredDomainsIO(keywords);

    if (result.domains.length > 0) {
        return NextResponse.json({
            success: true,
            domains: result.domains,
            source: 'expiredomains.io',
        });
    }

    // If scraping failed, return helpful error
    return NextResponse.json({
        success: false,
        domains: [],
        source: 'none',
        error: result.error || 'No domains found',
        actionRequired: result.actionRequired || {
            type: 'blocked',
            message: 'Free domain scraping is currently unavailable.',
            action: 'Use Manual Import to paste domains, or configure a premium API (Spamzilla) in Settings → Integrations.',
        },
    });
}

/**
 * POST - Parse manually imported domains
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { action, domains: rawDomains } = body;

        if (action === 'parse') {
            // Parse domains from text input
            const text = rawDomains as string;
            const lines = text.split(/[\n,;]+/).map((l: string) => l.trim()).filter(Boolean);

            const domains: FreeDomain[] = [];
            const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,63}$/;

            for (const line of lines) {
                // Extract domain from line (might include extra info)
                const words = line.split(/\s+/);
                for (const word of words) {
                    const cleaned = word.toLowerCase().replace(/[^a-z0-9.-]/g, '');
                    if (domainRegex.test(cleaned)) {
                        const parts = cleaned.split('.');
                        domains.push({
                            domain: cleaned,
                            tld: parts[parts.length - 1],
                            source: 'manual',
                            status: 'unknown',
                            fetchedAt: Date.now(),
                        });
                        break; // Take first valid domain per line
                    }
                }
            }

            return NextResponse.json({
                success: true,
                domains,
                count: domains.length,
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Unknown action',
        }, { status: 400 });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Parse failed',
        }, { status: 500 });
    }
}
