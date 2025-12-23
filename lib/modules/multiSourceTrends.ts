/**
 * Multi-Source Trend Fetcher
 * 
 * Fetches real-time trends from multiple sources to avoid Google Trends blocking.
 * 
 * Sources:
 * 1. Brave Search - "trending [topic] 2025" queries
 * 2. Exploding Topics RSS - pre-analyzed trending topics
 * 3. Hacker News - tech/startup trends
 * 4. Google News RSS - breaking news
 */

import { analyzeCPC } from './cpcIntelligence';

export interface TrendSource {
    id: string;
    name: string;
    type: 'api' | 'rss' | 'search';
    enabled: boolean;
}

export interface FetchedTrend {
    topic: string;
    context: string;
    source: string;
    sourceType: 'live' | 'rss' | 'search' | 'fallback';
    url?: string;
    timestamp?: Date;
    cpcScore?: number;
    niche?: string;
}

export interface MultiSourceResult {
    trends: FetchedTrend[];
    sources: { [key: string]: { success: boolean; count: number; error?: string } };
    totalCount: number;
}

// ==================== BRAVE SEARCH TRENDS ====================

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Cache for MCP client connections
const mcpClientCache = new Map<string, { client: Client; transport: StdioClientTransport; lastUsed: number }>();
const MCP_CACHE_TTL = 60000; // 1 minute

/**
 * Get or create a Brave Search MCP client (server-side only)
 */
async function getBraveMCPClient(apiKey: string): Promise<Client> {
    const cacheKey = `brave-search-${apiKey.substring(0, 8)}`;

    // Check cache
    const cached = mcpClientCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUsed < MCP_CACHE_TTL) {
        cached.lastUsed = Date.now();
        return cached.client;
    }

    // Create transport and client
    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@brave/brave-search-mcp-server', '--brave-api-key', apiKey],
        env: { ...process.env as Record<string, string>, BRAVE_API_KEY: apiKey }
    });

    const client = new Client({
        name: 'ifrit-brave-search',
        version: '1.0.0'
    });

    await client.connect(transport);

    // Cache for reuse
    mcpClientCache.set(cacheKey, { client, transport, lastUsed: Date.now() });

    // Clean old entries
    for (const [key, val] of mcpClientCache.entries()) {
        if (Date.now() - val.lastUsed > MCP_CACHE_TTL) {
            try { await val.client.close(); } catch { }
            mcpClientCache.delete(key);
        }
    }

    return client;
}

/**
 * Fetch trending topics using Brave Search (server-side direct MCP call)
 * Searches for "trending [category] 2025" to find current hot topics
 */
export async function fetchBraveSearchTrends(
    apiKey: string,
    categories: string[] = ['technology', 'business', 'health', 'finance']
): Promise<FetchedTrend[]> {
    const trends: FetchedTrend[] = [];
    const year = new Date().getFullYear();

    try {
        // Get or create MCP client
        const client = await getBraveMCPClient(apiKey);

        for (const category of categories) {
            try {
                // Call Brave web search directly via MCP
                const result = await client.callTool({
                    name: 'brave_web_search',
                    arguments: {
                        query: `trending ${category} news ${year}`,
                        count: 5
                    }
                });

                const content = result.content as Array<{ type: string; text?: string }>;
                const textContent = content?.find(c => c.type === 'text')?.text;

                console.log(`[TrendFetcher] Brave ${category}: textContent length = ${textContent?.length || 0}`);

                if (textContent) {
                    try {
                        const parsed = JSON.parse(textContent);

                        console.log(`[TrendFetcher] Brave ${category}: parsed keys = ${Object.keys(parsed).join(', ')}`);

                        // Handle different response formats (same as client.ts)
                        let webResults: Array<{ title?: string; url?: string; description?: string; snippet?: string }>;

                        if (parsed.web?.results) {
                            webResults = parsed.web.results;
                        } else if (parsed.results) {
                            webResults = parsed.results;
                        } else if (Array.isArray(parsed)) {
                            webResults = parsed;
                        } else if (parsed.url && parsed.title) {
                            // Single result object - wrap in array
                            webResults = [parsed];
                        } else {
                            webResults = [];
                        }

                        console.log(`[TrendFetcher] Brave ${category}: found ${webResults.length} results`);

                        for (const r of webResults.slice(0, 3)) {
                            const cpc = analyzeCPC(r.title || '');
                            trends.push({
                                topic: r.title || '',
                                context: r.description || r.snippet || '',
                                source: 'Brave Search',
                                sourceType: 'search',
                                url: r.url || '',
                                timestamp: new Date(),
                                cpcScore: cpc.score,
                                niche: category
                            });
                        }
                    } catch (parseErr) {
                        console.error(`[TrendFetcher] Brave ${category}: parse error`, parseErr);
                    }
                }

                // Delay between requests
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`[TrendFetcher] Brave search failed for ${category}:`, error);
            }
        }
    } catch (clientError) {
        console.error('[TrendFetcher] Failed to create Brave MCP client:', clientError);
    }

    return trends;
}

// ==================== PRODUCT HUNT RSS ====================

/**
 * Fetch trending products from Product Hunt (great for tech/startup trends)
 */
export async function fetchProductHuntTrends(): Promise<FetchedTrend[]> {
    const trends: FetchedTrend[] = [];

    try {
        // Product Hunt Atom feed
        const response = await fetch('https://www.producthunt.com/feed', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)'
            }
        });

        if (response.ok) {
            const xml = await response.text();
            // Parse Atom feed (different from RSS)
            const items = parseAtomEntries(xml);

            for (const item of items.slice(0, 10)) {
                const cpc = analyzeCPC(item.title);
                trends.push({
                    topic: item.title,
                    context: item.description || 'Trending on Product Hunt',
                    source: 'Product Hunt',
                    sourceType: 'rss',
                    url: item.link,
                    timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
                    cpcScore: cpc.score,
                    niche: 'Technology'
                });
            }
        }
    } catch (error) {
        console.error('[TrendFetcher] Product Hunt failed:', error);
    }

    return trends;
}

// ==================== REDDIT TRENDING ====================

/**
 * Fetch trending posts from Reddit (multiple subreddits)
 * Uses public JSON endpoints - no API key required!
 */
export async function fetchRedditTrends(): Promise<FetchedTrend[]> {
    const trends: FetchedTrend[] = [];

    // Fetch from multiple subreddits for diverse trends
    const subreddits = ['popular', 'technology', 'business', 'news'];

    for (const subreddit of subreddits) {
        try {
            const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`, {
                headers: {
                    'User-Agent': 'TrendScanner/1.0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const posts = data?.data?.children || [];

                for (const post of posts.slice(0, 3)) {
                    const postData = post.data;
                    if (postData && postData.title && !postData.stickied) {
                        const cpc = analyzeCPC(postData.title);
                        trends.push({
                            topic: postData.title,
                            context: `${postData.score} upvotes on r/${postData.subreddit}`,
                            source: 'Reddit',
                            sourceType: 'live',
                            url: `https://reddit.com${postData.permalink}`,
                            timestamp: new Date(postData.created_utc * 1000),
                            cpcScore: cpc.score,
                            niche: postData.subreddit
                        });
                    }
                }
            }

            // Small delay between subreddits to be nice to Reddit
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
            console.error(`[TrendFetcher] Reddit r/${subreddit} failed:`, error);
        }
    }

    return trends;
}

// ==================== HACKER NEWS API ====================

/**
 * Fetch top stories from Hacker News (great for tech trends)
 */
export async function fetchHackerNewsTrends(): Promise<FetchedTrend[]> {
    const trends: FetchedTrend[] = [];

    try {
        // Get top story IDs
        const idsResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const storyIds: number[] = await idsResponse.json();

        // Fetch details for top 10 stories
        const storyPromises = storyIds.slice(0, 10).map(async (id) => {
            const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            return res.json();
        });

        const stories = await Promise.all(storyPromises);

        for (const story of stories) {
            if (story && story.title) {
                const cpc = analyzeCPC(story.title);
                trends.push({
                    topic: story.title,
                    context: story.url ? `${story.score} points on Hacker News` : story.text?.substring(0, 100) || '',
                    source: 'Hacker News',
                    sourceType: 'live',
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    timestamp: new Date(story.time * 1000),
                    cpcScore: cpc.score,
                    niche: 'Technology'
                });
            }
        }
    } catch (error) {
        console.error('[TrendFetcher] Hacker News failed:', error);
    }

    return trends;
}

// ==================== GOOGLE NEWS RSS ====================

/**
 * Fetch trending news from Google News RSS
 */
export async function fetchGoogleNewsRSS(topic?: string): Promise<FetchedTrend[]> {
    const trends: FetchedTrend[] = [];

    try {
        // Google News RSS feed
        const url = topic
            ? `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`
            : 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)'
            }
        });

        if (response.ok) {
            const xml = await response.text();
            const items = parseRSSItems(xml);

            for (const item of items.slice(0, 10)) {
                const cpc = analyzeCPC(item.title);
                trends.push({
                    topic: item.title,
                    context: item.description || '',
                    source: 'Google News',
                    sourceType: 'rss',
                    url: item.link,
                    timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
                    cpcScore: cpc.score,
                    niche: cpc.primaryNiche
                });
            }
        }
    } catch (error) {
        console.error('[TrendFetcher] Google News RSS failed:', error);
    }

    return trends;
}

// ==================== RSS PARSER HELPER ====================

interface RSSItem {
    title: string;
    link: string;
    description?: string;
    pubDate?: string;
}

function parseRSSItems(xml: string): RSSItem[] {
    const items: RSSItem[] = [];

    // Simple XML parsing (for server-side, consider using a proper XML parser)
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

/**
 * Parse Atom feed entries (used by Product Hunt)
 */
function parseAtomEntries(xml: string): RSSItem[] {
    const items: RSSItem[] = [];

    // Atom uses <entry> instead of <item>
    const entryMatches = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];

    for (const entryXml of entryMatches) {
        const title = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
        // Atom uses <link href="..."/> format
        const link = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim() || '';
        // Atom uses <content> instead of <description>
        const description = entryXml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim()
            || entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.trim() || '';
        // Atom uses <published> or <updated>
        const pubDate = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
            || entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() || '';

        if (title) {
            items.push({ title, link, description, pubDate });
        }
    }

    return items;
}

// ==================== MAIN AGGREGATOR ====================

export interface FetchTrendsOptions {
    useBraveSearch?: boolean;
    braveApiKey?: string;
    useHackerNews?: boolean;
    useGoogleNews?: boolean;
    useProductHunt?: boolean;
    useReddit?: boolean;
    categories?: string[];
    maxPerSource?: number;
}

/**
 * Fetch trends from multiple sources and aggregate
 */
export async function fetchMultiSourceTrends(
    options: FetchTrendsOptions = {}
): Promise<MultiSourceResult> {
    const {
        useBraveSearch = true,
        braveApiKey,
        useHackerNews = true,
        useGoogleNews = true,
        useProductHunt = true,
        useReddit = true,
        categories = ['technology', 'business', 'finance'],
        maxPerSource = 5
    } = options;

    const allTrends: FetchedTrend[] = [];
    const sources: { [key: string]: { success: boolean; count: number; error?: string } } = {};

    // Fetch from all enabled sources in parallel
    const promises: Promise<void>[] = [];

    if (useBraveSearch && braveApiKey) {
        promises.push(
            fetchBraveSearchTrends(braveApiKey, categories)
                .then(trends => {
                    allTrends.push(...trends.slice(0, maxPerSource));
                    sources['brave_search'] = { success: true, count: trends.length };
                })
                .catch(error => {
                    sources['brave_search'] = { success: false, count: 0, error: error.message };
                })
        );
    }

    if (useHackerNews) {
        promises.push(
            fetchHackerNewsTrends()
                .then(trends => {
                    allTrends.push(...trends.slice(0, maxPerSource));
                    sources['hacker_news'] = { success: true, count: trends.length };
                })
                .catch(error => {
                    sources['hacker_news'] = { success: false, count: 0, error: error.message };
                })
        );
    }

    if (useGoogleNews) {
        promises.push(
            fetchGoogleNewsRSS()
                .then(trends => {
                    allTrends.push(...trends.slice(0, maxPerSource));
                    sources['google_news'] = { success: true, count: trends.length };
                })
                .catch(error => {
                    sources['google_news'] = { success: false, count: 0, error: error.message };
                })
        );
    }

    if (useProductHunt) {
        promises.push(
            fetchProductHuntTrends()
                .then(trends => {
                    allTrends.push(...trends.slice(0, maxPerSource));
                    sources['product_hunt'] = { success: true, count: trends.length };
                })
                .catch(error => {
                    sources['product_hunt'] = { success: false, count: 0, error: error.message };
                })
        );
    }

    if (useReddit) {
        promises.push(
            fetchRedditTrends()
                .then(trends => {
                    allTrends.push(...trends.slice(0, maxPerSource));
                    sources['reddit'] = { success: true, count: trends.length };
                })
                .catch(error => {
                    sources['reddit'] = { success: false, count: 0, error: error.message };
                })
        );
    }

    await Promise.all(promises);

    // Sort by CPC score (highest first)
    allTrends.sort((a, b) => (b.cpcScore || 0) - (a.cpcScore || 0));

    // Deduplicate by similar topics
    const seen = new Set<string>();
    const uniqueTrends = allTrends.filter(trend => {
        const key = trend.topic.toLowerCase().substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        trends: uniqueTrends,
        sources,
        totalCount: uniqueTrends.length
    };
}

// ==================== AI TREND ANALYSIS ====================

/**
 * Use AI to analyze search results and extract trending topics
 */
export async function analyzeSearchResultsForTrends(
    searchResults: Array<{ title: string; description: string }>,
    geminiApiKey: string
): Promise<string[]> {
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const prompt = `Analyze these search results and extract the TOP 5 most trending/newsworthy topics that would make good blog articles:

${searchResults.map((r, i) => `${i + 1}. ${r.title}: ${r.description}`).join('\n')}

Return ONLY a JSON array of 5 topic strings, focusing on:
- Breaking news or new product releases
- Viral topics people are talking about
- Time-sensitive trends
- High commercial intent topics

Example: ["iPhone 17 AI features review", "New tax law changes 2025", ...]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                temperature: 0.3,
                maxOutputTokens: 500
            }
        });

        const text = response.text || '[]';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (error) {
        console.error('[TrendFetcher] AI analysis failed:', error);
    }

    return [];
}
