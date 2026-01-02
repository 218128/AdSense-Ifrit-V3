/**
 * RSS Parser Tests
 * @jest-environment jsdom
 */

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

import { fetchFeed, type ParsedFeed } from '@/features/campaigns/lib/rssParser';
import { fetchRSSSourceItems } from '@/features/campaigns/lib/rssSource';
import type { RSSSourceConfig } from '@/features/campaigns/model/types';

describe('RSS Parser', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('fetchFeed', () => {
        it('should parse RSS 2.0 feed', async () => {
            const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0">
                    <channel>
                        <title>Test Feed</title>
                        <link>https://example.com</link>
                        <item>
                            <title>First Article</title>
                            <link>https://example.com/first</link>
                            <description>First article description</description>
                            <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
                        </item>
                        <item>
                            <title>Second Article</title>
                            <link>https://example.com/second</link>
                        </item>
                    </channel>
                </rss>`;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => rssXml,
            });

            const result = await fetchFeed('https://example.com/feed');

            expect(result.success).toBe(true);
            expect(result.feed?.title).toBe('Test Feed');
            expect(result.feed?.items).toHaveLength(2);
            expect(result.feed?.items[0].title).toBe('First Article');
            expect(result.feed?.feedType).toBe('rss');
        });

        it('should parse Atom feed', async () => {
            const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
                <feed xmlns="http://www.w3.org/2005/Atom">
                    <title>Atom Feed</title>
                    <link href="https://example.com" rel="alternate"/>
                    <entry>
                        <title>Atom Entry</title>
                        <link href="https://example.com/entry" rel="alternate"/>
                        <summary>Entry summary</summary>
                    </entry>
                </feed>`;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => atomXml,
            });

            const result = await fetchFeed('https://example.com/atom');

            expect(result.success).toBe(true);
            expect(result.feed?.feedType).toBe('atom');
            expect(result.feed?.items).toHaveLength(1);
            expect(result.feed?.items[0].title).toBe('Atom Entry');
        });

        it('should handle HTTP errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const result = await fetchFeed('https://example.com/missing');

            expect(result.success).toBe(false);
            expect(result.error).toBe('HTTP 404');
        });

        it('should handle invalid XML', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => 'not xml at all',
            });

            const result = await fetchFeed('https://example.com/invalid');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown feed format');
        });
    });
});

describe('RSS Source', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('should convert feed items to source items', async () => {
        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>Tech News</title>
                    <item>
                        <title>AI Breakthrough</title>
                        <link>https://example.com/ai</link>
                        <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
                    </item>
                </channel>
            </rss>`;

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => rssXml,
        });

        const config: RSSSourceConfig = {
            type: 'rss',
            feedUrls: ['https://example.com/feed'],
            extractFullContent: false,
            aiRewrite: true,
        };

        const result = await fetchRSSSourceItems(config, 10);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].topic).toBe('AI Breakthrough');
        expect(result.items[0].sourceType).toBe('rss');
        expect(result.items[0].metadata?.aiRewrite).toBe(true);
    });

    it('should filter by keywords', async () => {
        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>News</title>
                    <item><title>AI News</title><link>https://example.com/ai</link></item>
                    <item><title>Sports Update</title><link>https://example.com/sports</link></item>
                    <item><title>AI Robots</title><link>https://example.com/robots</link></item>
                </channel>
            </rss>`;

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => rssXml,
        });

        const config: RSSSourceConfig = {
            type: 'rss',
            feedUrls: ['https://example.com/feed'],
            extractFullContent: false,
            aiRewrite: false,
            filterKeywords: ['AI'],
        };

        const result = await fetchRSSSourceItems(config, 10);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(2);
        expect(result.items.map(i => i.topic)).toContain('AI News');
        expect(result.items.map(i => i.topic)).toContain('AI Robots');
    });

    it('should dedupe items by title', async () => {
        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>News</title>
                    <item><title>Same Title</title><link>https://a.com/1</link></item>
                    <item><title>Same Title</title><link>https://b.com/2</link></item>
                </channel>
            </rss>`;

        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: async () => rssXml,
        });

        const config: RSSSourceConfig = {
            type: 'rss',
            feedUrls: ['https://example.com/feed'],
            extractFullContent: false,
            aiRewrite: false,
        };

        const result = await fetchRSSSourceItems(config, 10);

        expect(result.items).toHaveLength(1);
    });
});
