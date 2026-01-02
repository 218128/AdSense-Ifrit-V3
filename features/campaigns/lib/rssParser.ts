/**
 * RSS Feed Parser
 * FSD: features/campaigns/lib/rssParser.ts
 * 
 * Parses RSS and Atom feeds to extract article topics.
 */

import { XMLParser } from 'fast-xml-parser';

// ============================================================================
// Types
// ============================================================================

export interface FeedItem {
    id: string;
    title: string;
    link: string;
    description?: string;
    pubDate?: number;
    author?: string;
    categories?: string[];
}

export interface ParsedFeed {
    title: string;
    link: string;
    description?: string;
    items: FeedItem[];
    feedType: 'rss' | 'atom';
}

export interface FetchResult {
    success: boolean;
    feed?: ParsedFeed;
    error?: string;
}

// ============================================================================
// Parser
// ============================================================================

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
});

/**
 * Fetch and parse an RSS or Atom feed
 */
export async function fetchFeed(url: string): Promise<FetchResult> {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Ifrit RSS Reader/1.0' },
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const xml = await response.text();
        const parsed = xmlParser.parse(xml);

        // Detect feed type and parse accordingly
        if (parsed.rss?.channel) {
            return { success: true, feed: parseRSS(parsed.rss.channel) };
        } else if (parsed.feed) {
            return { success: true, feed: parseAtom(parsed.feed) };
        } else {
            return { success: false, error: 'Unknown feed format' };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fetch failed',
        };
    }
}

/**
 * Parse RSS 2.0 format
 */
function parseRSS(channel: RSSChannel): ParsedFeed {
    const items = normalizeArray(channel.item).map((item, i) => {
        // Extract guid with proper type narrowing
        let guidValue: string = `rss_${i}`;
        if (typeof item.guid === 'string') {
            guidValue = item.guid;
        } else if (item.guid && typeof item.guid === 'object' && '#text' in item.guid) {
            guidValue = item.guid['#text'];
        } else if (item.link) {
            guidValue = item.link;
        }

        return {
            id: guidValue,
            title: cleanText(item.title),
            link: item.link || '',
            description: cleanText(item.description),
            pubDate: parseDate(item.pubDate),
            author: item.author || item['dc:creator'],
            categories: normalizeArray(item.category).map(c =>
                typeof c === 'string' ? c : (c as { '#text': string })['#text'] || ''
            ).filter(Boolean),
        };
    });

    return {
        title: cleanText(channel.title) || 'Untitled Feed',
        link: channel.link || '',
        description: cleanText(channel.description),
        items,
        feedType: 'rss',
    };
}

/**
 * Parse Atom format
 */
function parseAtom(feed: AtomFeed): ParsedFeed {
    const items = normalizeArray(feed.entry).map((entry, i) => {
        const link = normalizeArray(entry.link).find(l =>
            !l['@_rel'] || l['@_rel'] === 'alternate'
        );

        return {
            id: entry.id || `atom_${i}`,
            title: cleanText(entry.title), // cleanText handles { '#text': string } case
            link: link?.['@_href'] || '',
            description: cleanText(entry.summary || entry.content),
            pubDate: parseDate(entry.published || entry.updated),
            author: entry.author?.name,
            categories: normalizeArray(entry.category).map(c => c['@_term'] || '').filter(Boolean),
        };
    });

    return {
        title: cleanText(feed.title) || 'Untitled Feed',
        link: normalizeArray(feed.link).find(l => l['@_rel'] === 'alternate')?.['@_href'] || '',
        description: cleanText(feed.subtitle),
        items,
        feedType: 'atom',
    };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function cleanText(text: unknown): string {
    if (!text) return '';
    const str = typeof text === 'object' ? (text as { '#text'?: string })['#text'] || '' : String(text);
    return str.replace(/<[^>]*>/g, '').trim();
}

function parseDate(dateStr: string | undefined): number | undefined {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date.getTime();
}

// ============================================================================
// Type Definitions for Parsed XML
// ============================================================================

interface RSSChannel {
    title?: string;
    link?: string;
    description?: string;
    item?: RSSItem | RSSItem[];
}

interface RSSItem {
    title?: string;
    link?: string;
    description?: string;
    pubDate?: string;
    author?: string;
    'dc:creator'?: string;
    guid?: string | { '#text': string };
    category?: (string | { '#text': string })[] | string | { '#text': string };
}

interface AtomFeed {
    title?: string | { '#text': string };
    subtitle?: string | { '#text': string };
    link?: AtomLink | AtomLink[];
    entry?: AtomEntry | AtomEntry[];
}

interface AtomEntry {
    id?: string;
    title?: string | { '#text': string };
    summary?: string | { '#text': string };
    content?: { '#text': string };
    link?: AtomLink | AtomLink[];
    published?: string;
    updated?: string;
    author?: { name?: string };
    category?: { '@_term': string }[];
}

interface AtomLink {
    '@_href'?: string;
    '@_rel'?: string;
}
