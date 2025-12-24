/**
 * Domain Hunter API Route
 * 
 * Provides access to expired domain search across multiple sources.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    searchExpiredDomainsAll,
    searchSource,
    getSourcesStatus,
    getConfiguredSourcesCount,
    DomainSearchParams,
    DomainSource,
} from '@/lib/mcp/domain-hunter';

// GET - Get sources status
export async function GET() {
    try {
        const sources = getSourcesStatus();
        const configuredCount = getConfiguredSourcesCount();

        return NextResponse.json({
            success: true,
            sources,
            configuredCount,
            totalSources: sources.length,
        });
    } catch (error) {
        console.error('[Domain Hunter] Error getting sources:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get sources status' },
            { status: 500 }
        );
    }
}

// POST - Search for expired domains
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const params: DomainSearchParams = {
            keywords: body.keywords,
            tlds: body.tlds,
            minAge: body.minAge,
            maxAge: body.maxAge,
            minDA: body.minDA,
            maxPrice: body.maxPrice,
            sources: body.sources,
            limit: body.limit || 50,
        };

        // If specific source requested, search only that source
        if (body.source && typeof body.source === 'string') {
            const result = await searchSource(body.source as DomainSource, params);
            return NextResponse.json({
                success: true,
                domains: result.domains,
                sources: [result.status],
                totalFound: result.domains.length,
            });
        }

        // Search all sources
        const result = await searchExpiredDomainsAll(params);

        return NextResponse.json({
            success: true,
            domains: result.domains,
            sources: result.sources,
            totalFound: result.totalFound,
            searchedAt: result.searchedAt,
        });

    } catch (error) {
        console.error('[Domain Hunter] Search error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Search failed',
                domains: [],
                sources: [],
            },
            { status: 500 }
        );
    }
}
