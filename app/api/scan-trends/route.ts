import { NextResponse } from 'next/server';
import { TrendScanner } from '@/lib/modules/trendScanner';
import { analyzeCPC } from '@/lib/modules/cpcIntelligence';

export const dynamic = 'force-dynamic';

interface TrendItem {
    topic: string;
    context: string;
    source: 'live' | 'fallback';
    cpcScore?: number;
    niche?: string;
}

interface ScanResponse {
    liveTraends: TrendItem[];
    highCpcKeywords: TrendItem[];
    hasLiveTrends: boolean;
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

export async function GET(): Promise<NextResponse<ScanResponse>> {
    try {
        // Try to fetch live trends
        const scanner = new TrendScanner();
        const scanResult = await scanner.scan();

        let liveTraends: TrendItem[] = [];
        const hasLiveTrends = scanResult.source === 'google_trends' && scanResult.trends.length > 0;

        if (hasLiveTrends) {
            liveTraends = scanResult.trends.slice(0, 8).map(t => {
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

        return NextResponse.json({
            liveTraends,
            highCpcKeywords,
            hasLiveTrends
        });

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

        return NextResponse.json({
            liveTraends: [],
            highCpcKeywords,
            hasLiveTrends: false
        });
    }
}
