/**
 * Google News Trends API
 * Server-side fetch for Google News RSS
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RSSItem {
    title: string;
    link: string;
    description?: string;
    pubDate?: string;
}

function parseRSSItems(xml: string): RSSItem[] {
    const items: RSSItem[] = [];
    const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches) {
        const title = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
        const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
        const description = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || '';
        const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';

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
        const topic = body.topic || '';
        const maxItems = body.maxItems || 10;

        // Per 2026 docs: /rss/search?q= for topic, /rss for general
        const url = topic
            ? `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`
            : `https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en`;

        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)' },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            throw new Error(`Google News RSS error: ${res.status}`);
        }

        const xml = await res.text();
        const items = parseRSSItems(xml);

        const trends = items.slice(0, maxItems).map(item => ({
            topic: item.title,
            context: item.description || '',
            source: 'Google News',
            sourceType: 'rss',
            url: item.link,
            timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
            niche: topic || 'general',
        }));

        return NextResponse.json({
            success: true,
            data: trends,
            latencyMs: Date.now() - startTime,
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Google News fetch failed',
            latencyMs: Date.now() - startTime,
        }, { status: 500 });
    }
}
