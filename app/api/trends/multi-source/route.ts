import { NextRequest, NextResponse } from 'next/server';
import { fetchMultiSourceTrends, analyzeSearchResultsForTrends, FetchedTrend } from '@/lib/modules/multiSourceTrends';

export const dynamic = 'force-dynamic';

interface MultiTrendResponse {
    success: boolean;
    trends: FetchedTrend[];
    sources: { [key: string]: { success: boolean; count: number; error?: string } };
    totalCount: number;
    aiSuggestions?: string[];
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<MultiTrendResponse>> {
    try {
        const body = await request.json().catch(() => ({}));
        const {
            braveApiKey,
            geminiApiKey,
            categories = ['technology', 'business', 'finance'],
            useAIAnalysis = false
        } = body;

        console.log('[MultiTrendAPI] Fetching trends from multiple sources...');

        // Fetch from all sources
        const result = await fetchMultiSourceTrends({
            useBraveSearch: !!braveApiKey,
            braveApiKey,
            useHackerNews: true,
            useGoogleNews: true,
            useProductHunt: true,
            useReddit: false, // Disabled - Reddit blocks server-side requests
            categories,
            maxPerSource: 5
        });

        console.log(`[MultiTrendAPI] Found ${result.totalCount} trends from ${Object.keys(result.sources).length} sources`);

        // Optionally use AI to analyze and suggest trending topics
        let aiSuggestions: string[] | undefined;
        if (useAIAnalysis && geminiApiKey && result.trends.length > 0) {
            console.log('[MultiTrendAPI] Running AI analysis on trends...');
            aiSuggestions = await analyzeSearchResultsForTrends(
                result.trends.slice(0, 10).map(t => ({ title: t.topic, description: t.context })),
                geminiApiKey
            );
            console.log(`[MultiTrendAPI] AI suggested ${aiSuggestions.length} topics`);
        }

        return NextResponse.json({
            success: true,
            trends: result.trends,
            sources: result.sources,
            totalCount: result.totalCount,
            aiSuggestions
        });

    } catch (error) {
        console.error('[MultiTrendAPI] Error:', error);
        return NextResponse.json({
            success: false,
            trends: [],
            sources: {},
            totalCount: 0,
            error: error instanceof Error ? error.message : 'Failed to fetch trends'
        }, { status: 500 });
    }
}

export async function GET(): Promise<NextResponse<MultiTrendResponse>> {
    // Simple GET without API keys - uses only free sources
    console.log('[MultiTrendAPI] GET request - using free sources only');

    try {
        const result = await fetchMultiSourceTrends({
            useBraveSearch: false,
            useHackerNews: true,
            useGoogleNews: true,
            useProductHunt: true,
            useReddit: true,
            maxPerSource: 5
        });

        return NextResponse.json({
            success: true,
            trends: result.trends,
            sources: result.sources,
            totalCount: result.totalCount
        });

    } catch (error) {
        console.error('[MultiTrendAPI] GET Error:', error);
        return NextResponse.json({
            success: false,
            trends: [],
            sources: {},
            totalCount: 0,
            error: error instanceof Error ? error.message : 'Failed to fetch trends'
        }, { status: 500 });
    }
}
