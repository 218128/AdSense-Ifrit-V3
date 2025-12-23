import { NextResponse } from 'next/server';
import { analyzeCPC } from '@/lib/modules/cpcIntelligence';
import { fetchMultiSourceTrends } from '@/lib/modules/multiSourceTrends';

export const dynamic = 'force-dynamic';

interface TrendItem {
    topic: string;
    context: string;
    source: 'live' | 'fallback';
    cpcScore?: number;
    niche?: string;
}

interface ScanResponse {
    liveTrends: TrendItem[];
    liveTraends?: TrendItem[];  // Keep for backward compatibility
    highCpcKeywords: TrendItem[];
    hasLiveTrends: boolean;
    success: boolean;
    error?: string;
}

// High-CPC fallback keywords (always available)
const HIGH_CPC_KEYWORDS = [
    { topic: 'Best VPN Services 2025', context: 'Review and comparison of top VPN providers for privacy and security', niche: 'Technology' },
    { topic: 'Credit Card Comparison 2025', context: 'Compare rewards, cashback, and travel credit cards', niche: 'Finance' },
    { topic: 'Life Insurance Quotes Online', context: 'How to get the best life insurance rates and coverage', niche: 'Insurance' },
    { topic: 'Small Business Loans Guide', context: 'Best financing options for startups and small businesses', niche: 'Finance' },
    { topic: 'Cloud Hosting Comparison', context: 'AWS vs Azure vs Google Cloud for businesses', niche: 'Technology' },
    { topic: 'Mortgage Refinance Calculator', context: 'When and how to refinance your home mortgage', niche: 'Finance' },
    { topic: 'Best CRM Software 2025', context: 'Top customer relationship management tools for sales teams', niche: 'Business' },
    { topic: 'Cybersecurity Best Practices', context: 'Protect your business from cyber threats and data breaches', niche: 'Technology' },
];

async function scanTrends(): Promise<ScanResponse> {
    try {
        // Use multi-source trends (free sources only, no API key needed)
        const result = await fetchMultiSourceTrends({
            useBraveSearch: false,  // No API key in this context
            useHackerNews: true,
            useGoogleNews: true,
            useProductHunt: true,
            useReddit: false,
            maxPerSource: 5
        });

        let liveTrends: TrendItem[] = [];
        const hasLiveTrends = result.trends.length > 0;

        if (hasLiveTrends) {
            liveTrends = result.trends.slice(0, 8).map(t => {
                const cpc = analyzeCPC(t.topic);
                return {
                    topic: t.topic,
                    context: t.context,
                    source: 'live' as const,
                    cpcScore: cpc.score,
                    niche: cpc.primaryNiche
                };
            });
        }

        // Always include high-CPC keywords
        const highCpcKeywords: TrendItem[] = HIGH_CPC_KEYWORDS.map(k => {
            const cpc = analyzeCPC(k.topic);
            return {
                ...k,
                source: 'fallback' as const,
                cpcScore: cpc.score
            };
        });

        return {
            liveTrends,
            liveTraends: liveTrends,  // Backward compatibility
            highCpcKeywords,
            hasLiveTrends,
            success: true
        };

    } catch (error) {
        console.error('Scan trends error:', error);

        // Return fallbacks on error
        const highCpcKeywords: TrendItem[] = HIGH_CPC_KEYWORDS.map(k => {
            const cpc = analyzeCPC(k.topic);
            return {
                ...k,
                source: 'fallback' as const,
                cpcScore: cpc.score
            };
        });

        return {
            liveTrends: [],
            liveTraends: [],
            highCpcKeywords,
            hasLiveTrends: false,
            success: true,
            error: error instanceof Error ? error.message : 'Failed to fetch live trends'
        };
    }
}

export async function GET(): Promise<NextResponse<ScanResponse>> {
    const result = await scanTrends();
    return NextResponse.json(result);
}

export async function POST(): Promise<NextResponse<ScanResponse>> {
    const result = await scanTrends();
    return NextResponse.json(result);
}
