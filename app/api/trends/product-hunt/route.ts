/**
 * Product Hunt Trends API
 * Server-side fetch for Product Hunt Atom feed
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AtomEntry {
    title: string;
    link: string;
    description?: string;
    pubDate?: string;
}

function parseAtomEntries(xml: string): AtomEntry[] {
    const items: AtomEntry[] = [];
    const entryMatches = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];

    for (const entryXml of entryMatches) {
        const title = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
        const link = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim() || '';
        const description = entryXml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim()
            || entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.trim() || '';
        const pubDate = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
            || entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() || '';

        if (title) {
            items.push({ title, link, description, pubDate });
        }
    }
    return items;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json().catch(() => ({}));
        const maxItems = body.maxItems || 10;

        const res = await fetch('https://www.producthunt.com/feed', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)' },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            throw new Error(`Product Hunt feed error: ${res.status}`);
        }

        const xml = await res.text();
        const items = parseAtomEntries(xml);

        const trends = items.slice(0, maxItems).map(item => ({
            topic: item.title,
            context: item.description || 'Trending on Product Hunt',
            source: 'Product Hunt',
            sourceType: 'rss',
            url: item.link,
            timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
            niche: 'startups',
        }));

        return NextResponse.json({
            success: true,
            data: trends,
            latencyMs: Date.now() - startTime,
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Product Hunt fetch failed',
            latencyMs: Date.now() - startTime,
        }, { status: 500 });
    }
}
