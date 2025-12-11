import { NextRequest, NextResponse } from 'next/server';
import { TrendScanner } from '@/lib/modules/trendScanner';
import { ContentGenerator } from '@/lib/modules/contentGenerator';

// Force dynamic since we use external APIs
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { geminiKey } = await req.json();

        if (!geminiKey) {
            return NextResponse.json({ error: 'Gemini API Key is required' }, { status: 400 });
        }

        // 1. Scan for Trends
        const scanner = new TrendScanner();
        const trends = await scanner.scan();

        if (!trends || trends.length === 0) {
            return NextResponse.json({ message: 'No trends found' }, { status: 200 });
        }

        // 2. Generate Content for top trend
        const generator = new ContentGenerator();
        const selectedTrend = trends[0]; // Just take top 1 for now to be fast

        // Simple Keyword "Hunting" (simulated here for speed, or we can port KeywordHunter too)
        // For now, let's just use the trend topic as the main keyword slug
        const keyword = selectedTrend.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        if (generator.exists(keyword)) {
            return NextResponse.json({
                message: 'Content already exists for top trend',
                trend: selectedTrend.topic
            }, { status: 200 });
        }

        const article = await generator.generate(keyword, selectedTrend.context, geminiKey);
        generator.save(article);

        return NextResponse.json({
            success: true,
            message: 'Article generated successfully',
            article: article.title
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
