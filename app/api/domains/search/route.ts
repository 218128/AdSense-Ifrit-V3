/**
 * Expired Domain Search API
 * 
 * Search for expired domains with filtering and scoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    searchExpiredDomains,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    checkAvailability,
    getPurchaseLinks,
    isExpiredDomainsConfigured,
    type SearchFilters,
    type ExpiredDomain,
} from '@/lib/domains/expiredDomains';
import { scoreDomain } from '@/lib/domains/domainScorer';
import { toMetrics } from '@/lib/domains/expiredDomains';

export const dynamic = 'force-dynamic';

/**
 * GET - Search expired domains
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

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
        const results = await searchExpiredDomains(filters, page, limit);

        // Add scores to each domain
        const domainsWithScores = results.domains.map(domain => {
            const metrics = toMetrics(domain);
            const score = scoreDomain(metrics, filters.niche);

            return {
                ...domain,
                score: {
                    overall: score.overall,
                    recommendation: score.recommendation,
                    riskLevel: score.riskLevel,
                    estimatedValue: score.estimatedValue,
                },
            };
        });

        return NextResponse.json({
            success: true,
            domains: domainsWithScores,
            total: results.total,
            page: results.page,
            hasMore: results.hasMore,
            source: results.source,
        });
    } catch (error) {
        console.error('Domain search error:', error);
        return NextResponse.json({
            success: false,
            error: 'Search failed',
        }, { status: 500 });
    }
}

/**
 * POST - Actions on domains (watchlist, check availability, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, domain } = body;

        switch (action) {
            case 'add-watchlist': {
                if (!domain) {
                    return NextResponse.json({
                        success: false,
                        error: 'Domain required',
                    }, { status: 400 });
                }
                addToWatchlist(domain as ExpiredDomain);
                return NextResponse.json({
                    success: true,
                    message: 'Added to watchlist',
                    watchlist: getWatchlist(),
                });
            }

            case 'remove-watchlist': {
                if (!body.domainName) {
                    return NextResponse.json({
                        success: false,
                        error: 'Domain name required',
                    }, { status: 400 });
                }
                removeFromWatchlist(body.domainName);
                return NextResponse.json({
                    success: true,
                    message: 'Removed from watchlist',
                    watchlist: getWatchlist(),
                });
            }

            case 'get-watchlist': {
                return NextResponse.json({
                    success: true,
                    watchlist: getWatchlist(),
                });
            }

            case 'check-availability': {
                if (!body.domainName) {
                    return NextResponse.json({
                        success: false,
                        error: 'Domain name required',
                    }, { status: 400 });
                }
                const availability = await checkAvailability(body.domainName);
                const purchaseLinks = getPurchaseLinks(body.domainName);

                return NextResponse.json({
                    success: true,
                    domain: body.domainName,
                    ...availability,
                    purchaseLinks,
                });
            }

            case 'suggest': {
                // suggestDomains was a mock function - not available
                return NextResponse.json({
                    success: false,
                    error: 'Domain suggestions require API configuration. Configure Spamzilla or similar API in Settings.',
                }, { status: 400 });
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
