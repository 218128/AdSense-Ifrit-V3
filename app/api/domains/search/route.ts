/**
 * Expired Domain Search API
 * 
 * Search for expired domains with filtering and scoring.
 * API key must be passed via x-spamzilla-key header from client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scoreDomain, parseDomain, quickQualityCheck } from '@/lib/domains/domainScorer';
import { quickSpamCheck } from '@/lib/domains/spamChecker';

export const dynamic = 'force-dynamic';

interface SearchFilters {
    tlds?: string[];
    minDR?: number;
    maxDR?: number;
    minTF?: number;
    minBacklinks?: number;
    minRD?: number;
    minAge?: number;
    maxLength?: number;
    keywords?: string[];
    excludeKeywords?: string[];
    niche?: string;
    onlyAvailable?: boolean;
}

interface SpamzillaDomainResponse {
    domain: string;
    tld?: string;
    dr?: number;
    domain_rating?: number;
    tf?: number;
    trust_flow?: number;
    cf?: number;
    citation_flow?: number;
    backlinks?: number;
    bl?: number;
    referring_domains?: number;
    rd?: number;
    age?: number;
    status?: 'available' | 'pending-delete' | 'auction' | 'unknown';
    drop_date?: string;
}

/**
 * GET - Search expired domains via Spamzilla API
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Get API key from header or query param
    const spamzillaKey = request.headers.get('x-spamzilla-key') || searchParams.get('apiKey');

    if (!spamzillaKey) {
        return NextResponse.json({
            success: false,
            error: 'Spamzilla API key required. Add your API key in Settings → Integrations.',
            configured: false,
        }, { status: 400 });
    }

    // Parse filters from query params
    const filters: SearchFilters = {};

    const tlds = searchParams.get('tlds');
    if (tlds) filters.tlds = tlds.split(',');

    const minDR = searchParams.get('minDR');
    if (minDR) filters.minDR = parseInt(minDR);

    const maxDR = searchParams.get('maxDR');
    if (maxDR) filters.maxDR = parseInt(maxDR);

    const minTF = searchParams.get('minTF');
    if (minTF) filters.minTF = parseInt(minTF);

    const minBacklinks = searchParams.get('minBacklinks');
    if (minBacklinks) filters.minBacklinks = parseInt(minBacklinks);

    const minRD = searchParams.get('minRD');
    if (minRD) filters.minRD = parseInt(minRD);

    const minAge = searchParams.get('minAge');
    if (minAge) filters.minAge = parseInt(minAge);

    const maxLength = searchParams.get('maxLength');
    if (maxLength) filters.maxLength = parseInt(maxLength);

    const keywords = searchParams.get('keywords');
    if (keywords) filters.keywords = keywords.split(',');

    const excludeKeywords = searchParams.get('excludeKeywords');
    if (excludeKeywords) filters.excludeKeywords = excludeKeywords.split(',');

    const niche = searchParams.get('niche');
    if (niche) filters.niche = niche;

    const onlyAvailable = searchParams.get('onlyAvailable');
    if (onlyAvailable === 'true') filters.onlyAvailable = true;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        // Call Spamzilla API directly
        const apiParams = new URLSearchParams({
            api_key: spamzillaKey,
            page: String(page),
            limit: String(limit),
        });

        if (filters.minDR) apiParams.append('min_dr', String(filters.minDR));
        if (filters.maxDR) apiParams.append('max_dr', String(filters.maxDR));
        if (filters.minTF) apiParams.append('min_tf', String(filters.minTF));
        if (filters.minBacklinks) apiParams.append('min_bl', String(filters.minBacklinks));
        if (filters.minRD) apiParams.append('min_rd', String(filters.minRD));
        if (filters.tlds?.length) apiParams.append('tlds', filters.tlds.join(','));
        if (filters.keywords?.length) apiParams.append('keywords', filters.keywords.join(','));

        console.log(`[SpamZilla API] Fetching domains with filters: ${apiParams.toString()}`);

        const response = await fetch(`https://api.spamzilla.io/v1/domains?${apiParams}`, {
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SpamZilla API] Error ${response.status}: ${errorText}`);
            return NextResponse.json({
                success: false,
                error: `Spamzilla API returned ${response.status}: ${response.statusText}`,
                details: errorText.substring(0, 500),
            }, { status: response.status });
        }

        const data = await response.json();

        if (!data.success && data.error) {
            return NextResponse.json({
                success: false,
                error: data.error,
            }, { status: 400 });
        }

        // Process domains and add scores
        const domains = (data.domains || []).map((d: SpamzillaDomainResponse) => {
            const domain = d.domain;
            const { tld, length } = parseDomain(domain);

            const metrics = {
                domain,
                tld: d.tld || tld,
                length,
                domainRating: d.dr || d.domain_rating,
                trustFlow: d.tf || d.trust_flow,
                citationFlow: d.cf || d.citation_flow,
                backlinks: d.backlinks || d.bl,
                referringDomains: d.referring_domains || d.rd,
                domainAge: d.age,
                dataSource: 'spamzilla' as const,
            };

            const score = scoreDomain(metrics, filters.niche);

            return {
                domain,
                tld: d.tld || tld,
                domainRating: d.dr || d.domain_rating,
                trustFlow: d.tf || d.trust_flow,
                citationFlow: d.cf || d.citation_flow,
                backlinks: d.backlinks || d.bl,
                referringDomains: d.referring_domains || d.rd,
                domainAge: d.age,
                status: d.status || 'available',
                dropDate: d.drop_date,
                source: 'spamzilla',
                qualityScore: quickQualityCheck(domain).pass ? 70 : 30,
                spamScore: quickSpamCheck(domain).score,
                score: {
                    overall: score.overall,
                    recommendation: score.recommendation,
                    riskLevel: score.riskLevel,
                    estimatedValue: score.estimatedValue,
                },
            };
        });

        console.log(`[SpamZilla API] Found ${domains.length} domains`);

        return NextResponse.json({
            success: true,
            domains,
            total: data.total || domains.length,
            page,
            hasMore: data.has_more || false,
            source: 'spamzilla',
        });

    } catch (error) {
        console.error('[SpamZilla API] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Search failed',
        }, { status: 500 });
    }
}

/**
 * POST - Actions on domains (check availability, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'check-availability': {
                if (!body.domainName) {
                    return NextResponse.json({
                        success: false,
                        error: 'Domain name required',
                    }, { status: 400 });
                }

                // Generate purchase links (availability check requires registrar API)
                const domain = body.domainName;
                const purchaseLinks = [
                    { registrar: 'Namecheap', url: `https://www.namecheap.com/domains/registration/results/?domain=${domain}` },
                    { registrar: 'Cloudflare', url: `https://dash.cloudflare.com/?to=/:account/domains/register/${domain}` },
                    { registrar: 'Porkbun', url: `https://porkbun.com/checkout/search?q=${domain}` },
                    { registrar: 'GoDaddy', url: `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${domain}` },
                ];

                return NextResponse.json({
                    success: true,
                    domain,
                    available: 'unknown',
                    message: 'Click a registrar link to check exact availability and price',
                    purchaseLinks,
                });
            }

            default:
                return NextResponse.json({
                    success: false,
                    error: 'Unknown action',
                }, { status: 400 });
        }
    } catch (error) {
        console.error('Domain action error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Action failed',
        }, { status: 500 });
    }
}
