/**
 * Domain Capability Handlers
 * FSD: lib/ai/handlers/domainHandlers.ts
 * 
 * Implements handlers for domain-search, domain-analyze, and wayback-lookup capabilities.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// SpamZilla Handler (Requires API Key)
// ============================================================================

export const spamzillaHandler: CapabilityHandler = {
    id: 'spamzilla-domains',
    name: 'SpamZilla',
    source: 'integration',
    capabilities: ['domain-search'],
    priority: 80,
    isAvailable: false, // Set true when API key configured
    requiresApiKey: true,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const apiKey = options.context?.apiKey as string;

        if (!apiKey) {
            return {
                success: false,
                error: 'SpamZilla API key required. Configure in Settings → Integrations.',
                handlerUsed: 'spamzilla-domains',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const filters = options.context?.filters as Record<string, unknown> || {};
            const page = (options.context?.page as number) || 1;
            const limit = (options.context?.limit as number) || 20;

            const params = new URLSearchParams({
                api_key: apiKey,
                page: String(page),
                limit: String(limit),
            });

            if (filters.minDR) params.append('min_dr', String(filters.minDR));
            if (filters.maxDR) params.append('max_dr', String(filters.maxDR));
            if (filters.minTF) params.append('min_tf', String(filters.minTF));
            if (filters.tlds) params.append('tlds', (filters.tlds as string[]).join(','));

            const res = await fetch(`https://api.spamzilla.io/v1/domains?${params}`, {
                headers: { 'Accept': 'application/json' },
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`SpamZilla API error ${res.status}: ${text.substring(0, 200)}`);
            }

            const data = await res.json();

            return {
                success: true,
                data: {
                    domains: data.domains || [],
                    total: data.total || 0,
                    hasMore: data.has_more || false,
                },
                handlerUsed: 'spamzilla-domains',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'SpamZilla search failed',
                handlerUsed: 'spamzilla-domains',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Wayback Machine Handler (Free, No Auth)
// ============================================================================

export const waybackHandler: CapabilityHandler = {
    id: 'wayback-history',
    name: 'Wayback Machine',
    source: 'integration',
    capabilities: ['wayback-lookup', 'domain-analyze'],
    priority: 60,
    isAvailable: true,
    requiresApiKey: false,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const domain = options.prompt || (options.context?.domain as string);

        if (!domain) {
            return {
                success: false,
                error: 'Domain required for Wayback lookup',
                handlerUsed: 'wayback-history',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            // Query Wayback CDX API
            const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=100`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Ifrit/1.0)' },
                signal: AbortSignal.timeout(15000),
            });

            if (!res.ok) throw new Error(`Wayback API error: ${res.status}`);

            const data = await res.json();

            if (!Array.isArray(data) || data.length < 2) {
                return {
                    success: true,
                    data: {
                        hasHistory: false,
                        totalCaptures: 0,
                    },
                    handlerUsed: 'wayback-history',
                    source: 'integration',
                    latencyMs: Date.now() - startTime,
                };
            }

            // Parse CDX response (first row is headers)
            const captures = data.slice(1);
            const timestamps = captures.map((c: string[]) => c[1]); // timestamp is index 1

            // Parse dates
            const parseWaybackDate = (ts: string) => {
                const y = ts.slice(0, 4);
                const m = ts.slice(4, 6);
                const d = ts.slice(6, 8);
                return new Date(`${y}-${m}-${d}`);
            };

            const firstCapture = timestamps.length > 0 ? parseWaybackDate(timestamps[0]) : null;
            const lastCapture = timestamps.length > 0 ? parseWaybackDate(timestamps[timestamps.length - 1]) : null;

            return {
                success: true,
                data: {
                    hasHistory: true,
                    totalCaptures: captures.length,
                    firstCaptureDate: firstCapture?.toISOString(),
                    lastCaptureDate: lastCapture?.toISOString(),
                    estimatedAge: firstCapture
                        ? Math.floor((Date.now() - firstCapture.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                        : undefined,
                },
                handlerUsed: 'wayback-history',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Wayback lookup failed',
                handlerUsed: 'wayback-history',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// DNS Blacklist Handler (Free, No Auth)
// ============================================================================

export const dnsBlacklistHandler: CapabilityHandler = {
    id: 'dns-blacklist',
    name: 'DNS Blacklist Check',
    source: 'local',
    capabilities: ['domain-analyze'],
    priority: 50,
    isAvailable: true,
    requiresApiKey: false,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const domain = options.prompt || (options.context?.domain as string);

        if (!domain) {
            return {
                success: false,
                error: 'Domain required for blacklist check',
                handlerUsed: 'dns-blacklist',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            // Call server-side API for DNS lookups (can't do DNS in browser)
            const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

            const res = await fetch('/api/domains/blacklist-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: cleanDomain }),
            });

            if (!res.ok) {
                throw new Error(`Blacklist API error: ${res.status}`);
            }

            const data = await res.json();

            return {
                success: data.success,
                data: {
                    domain: cleanDomain,
                    listed: data.listed || false,
                    details: data.details || [],
                },
                handlerUsed: 'dns-blacklist',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Blacklist check failed',
                handlerUsed: 'dns-blacklist',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// ExpiredDomains.io Scraper Handler (Free, No Auth)
// ============================================================================

export const expiredDomainsIOHandler: CapabilityHandler = {
    id: 'expireddomains-io',
    name: 'ExpiredDomains.io',
    source: 'integration',
    capabilities: ['domain-search'],
    priority: 30, // Lower priority, often blocked
    isAvailable: true,
    requiresApiKey: false,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const startTime = Date.now();
        const keywords = options.context?.keywords as string;

        try {
            const url = keywords
                ? `https://expiredomains.io/search/?q=${encodeURIComponent(keywords)}`
                : 'https://expiredomains.io/expired-domains/';

            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html',
                },
                signal: AbortSignal.timeout(10000),
            });

            if (!res.ok) {
                if (res.status === 403) {
                    return {
                        success: false,
                        error: 'Access blocked by expiredomains.io',
                        handlerUsed: 'expireddomains-io',
                        source: 'integration',
                        latencyMs: Date.now() - startTime,
                    };
                }
                throw new Error(`HTTP ${res.status}`);
            }

            const html = await res.text();

            // Check for CAPTCHA
            if (html.toLowerCase().includes('captcha')) {
                return {
                    success: false,
                    error: 'CAPTCHA required - use manual import or SpamZilla',
                    handlerUsed: 'expireddomains-io',
                    source: 'integration',
                    latencyMs: Date.now() - startTime,
                };
            }

            // Parse domains
            const domainRegex = /([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+([a-zA-Z]{2,63})/g;
            const matches = html.match(domainRegex) || [];
            const seen = new Set<string>();
            const domains: { domain: string; tld: string }[] = [];

            for (const match of matches) {
                const domain = match.toLowerCase();
                if (domain.includes('expiredomains.io')) continue;
                if (domain.includes('google.') || domain.includes('cloudflare')) continue;
                if (domain.length < 5 || domain.length > 50) continue;
                if (seen.has(domain)) continue;

                seen.add(domain);
                const parts = domain.split('.');
                domains.push({
                    domain,
                    tld: parts[parts.length - 1],
                });
            }

            return {
                success: domains.length > 0,
                data: { domains: domains.slice(0, 50) },
                handlerUsed: 'expireddomains-io',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Scrape failed',
                handlerUsed: 'expireddomains-io',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Export all handlers
// ============================================================================

export const domainHandlers = [
    spamzillaHandler,
    waybackHandler,
    dnsBlacklistHandler,
    expiredDomainsIOHandler,
];

export default domainHandlers;
