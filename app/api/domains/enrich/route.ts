/**
 * Domain Enrichment API
 * 
 * Uses Spamzilla API to get full SEO metrics for domains.
 * This is the "Analysis Mode" - takes discovered domains and enriches them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scoreDomain, parseDomain } from '@/lib/domains/domainScorer';
import { quickSpamCheck } from '@/lib/domains/spamChecker';

export const dynamic = 'force-dynamic';

interface EnrichedDomain {
    domain: string;
    tld: string;
    domainRating?: number;
    trustFlow?: number;
    citationFlow?: number;
    backlinks?: number;
    referringDomains?: number;
    domainAge?: number;
    spamScore?: number;
    score?: {
        overall: number;
        recommendation: string;
        riskLevel: string;
        estimatedValue: number;
    };
    enriched: boolean;
    enrichedAt?: number;
    error?: string;
}

interface EnrichRequest {
    domains: string[];
    apiKey?: string; // Optional - will use from localStorage via header
}

interface EnrichResponse {
    success: boolean;
    domains: EnrichedDomain[];
    enrichedCount: number;
    failedCount: number;
    error?: string;
}

/**
 * Fetch metrics from Spamzilla API for a single domain
 */
async function enrichFromSpamzilla(domain: string, apiKey: string): Promise<EnrichedDomain> {
    const { tld, length } = parseDomain(domain);

    try {
        const response = await fetch(`https://api.spamzilla.io/v1/domain/${encodeURIComponent(domain)}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            if (response.status === 401) {
                return {
                    domain,
                    tld,
                    enriched: false,
                    error: 'Invalid API key',
                };
            }
            if (response.status === 429) {
                return {
                    domain,
                    tld,
                    enriched: false,
                    error: 'Rate limited - try again later',
                };
            }
            return {
                domain,
                tld,
                enriched: false,
                error: `API error: ${response.status}`,
            };
        }

        const data = await response.json();

        if (!data.success) {
            return {
                domain,
                tld,
                enriched: false,
                error: data.error || 'Unknown API error',
            };
        }

        // Extract metrics from Spamzilla response
        const metrics = {
            domain,
            tld,
            length,
            domainRating: data.dr || data.domain_rating,
            domainAuthority: data.da || data.domain_authority,
            trustFlow: data.tf || data.trust_flow,
            citationFlow: data.cf || data.citation_flow,
            backlinks: data.backlinks || data.bl,
            referringDomains: data.referring_domains || data.rd,
            domainAge: data.age || data.domain_age,
            dataSource: 'spamzilla' as const,
        };

        // Calculate local score
        const scoreResult = scoreDomain(metrics);

        // Get spam score
        const spamCheck = quickSpamCheck(domain);

        return {
            domain,
            tld,
            domainRating: metrics.domainRating,
            trustFlow: metrics.trustFlow,
            citationFlow: metrics.citationFlow,
            backlinks: metrics.backlinks,
            referringDomains: metrics.referringDomains,
            domainAge: metrics.domainAge,
            spamScore: spamCheck.score,
            score: scoreResult,
            enriched: true,
            enrichedAt: Date.now(),
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
            return {
                domain,
                tld,
                enriched: false,
                error: 'Request timed out',
            };
        }
        return {
            domain,
            tld,
            enriched: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * POST - Enrich domains with Spamzilla data
 */
export async function POST(request: NextRequest): Promise<NextResponse<EnrichResponse>> {
    try {
        const body: EnrichRequest = await request.json();
        const { domains, apiKey: providedKey } = body;

        if (!domains || !Array.isArray(domains) || domains.length === 0) {
            return NextResponse.json({
                success: false,
                domains: [],
                enrichedCount: 0,
                failedCount: 0,
                error: 'No domains provided',
            }, { status: 400 });
        }

        // Get API key from request header or body
        const apiKey = providedKey || request.headers.get('x-spamzilla-key');

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                domains: [],
                enrichedCount: 0,
                failedCount: 0,
                error: 'Spamzilla API key required. Configure in Settings → Integrations.',
            }, { status: 400 });
        }

        // Limit to 20 domains per request to avoid rate limits
        const domainsToEnrich = domains.slice(0, 20);
        const enrichedDomains: EnrichedDomain[] = [];
        let enrichedCount = 0;
        let failedCount = 0;

        // Process domains with small delay to avoid rate limiting
        for (const domain of domainsToEnrich) {
            const result = await enrichFromSpamzilla(domain, apiKey);
            enrichedDomains.push(result);

            if (result.enriched) {
                enrichedCount++;
            } else {
                failedCount++;
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        return NextResponse.json({
            success: true,
            domains: enrichedDomains,
            enrichedCount,
            failedCount,
        });
    } catch (error) {
        console.error('Enrichment error:', error);
        return NextResponse.json({
            success: false,
            domains: [],
            enrichedCount: 0,
            failedCount: 0,
            error: error instanceof Error ? error.message : 'Enrichment failed',
        }, { status: 500 });
    }
}

/**
 * GET - Check if enrichment is configured
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const apiKey = request.headers.get('x-spamzilla-key');

    return NextResponse.json({
        configured: !!apiKey,
        message: apiKey
            ? 'Spamzilla API configured and ready'
            : 'Configure Spamzilla API key in Settings → Integrations',
    });
}
