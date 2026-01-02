/**
 * Competitor Mirror
 * FSD: features/sources/lib/competitorMirror.ts
 * 
 * Analyze competitor sites and extract content patterns.
 * Generate "inspired" topics from successful monetized sites.
 */

import { scrapeUrl, extractContent, type ExtractedContent } from './scraperEngine';
import { findTemplateForDomain } from './scraperTemplates';

// ============================================================================
// Types
// ============================================================================

export interface ArticleLink {
    url: string;
    title: string;
    excerpt?: string;
    imageUrl?: string;
    date?: string;
}

export interface CompetitorAnalysis {
    domain: string;
    siteName: string;
    niche: string;
    articleCount: number;
    articles: ArticleLink[];
    commonTopics: string[];
    contentStyle: {
        avgWordCount: number;
        hasImages: boolean;
        hasFAQ: boolean;
        hasLists: boolean;
    };
    monetization: {
        hasAds: boolean;
        adNetworks: string[];
        hasAffiliate: boolean;
    };
    scrapedAt: number;
}

export interface InspiredTopic {
    topic: string;
    originalTitle: string;
    sourceUrl: string;
    angle: string;
}

// ============================================================================
// Competitor Analysis
// ============================================================================

/**
 * Analyze a competitor website
 */
export async function analyzeCompetitor(url: string): Promise<CompetitorAnalysis> {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace('www.', '');

    // Get template for this domain type
    const template = findTemplateForDomain(domain);

    // Scrape main page
    const mainResult = await scrapeUrl(url, {
        contentSelector: template.selectors.content,
        titleSelector: template.selectors.title,
        removeSelectors: template.removeSelectors,
        extractMeta: true,
    });

    // Extract article links from homepage
    const articles = mainResult.rawHtml
        ? extractArticleLinks(mainResult.rawHtml, domain)
        : [];

    // Detect monetization
    const monetization = mainResult.rawHtml
        ? detectMonetization(mainResult.rawHtml)
        : { hasAds: false, adNetworks: [], hasAffiliate: false };

    // Extract common topics from article titles
    const commonTopics = extractCommonTopics(articles.map(a => a.title));

    // Detect niche from content and topics
    const niche = detectNiche(commonTopics, mainResult.data?.content || '');

    // Analyze content style (sample first few articles)
    const contentStyle = await analyzeContentStyle(articles.slice(0, 3), template);

    return {
        domain,
        siteName: mainResult.data?.title || domain,
        niche,
        articleCount: articles.length,
        articles,
        commonTopics,
        contentStyle,
        monetization,
        scrapedAt: Date.now(),
    };
}

/**
 * Extract article links from HTML
 */
export function extractArticleLinks(html: string, baseDomain: string): ArticleLink[] {
    const articles: ArticleLink[] = [];

    // Match post/article links with various patterns
    const linkPatterns = [
        // WordPress-style posts
        /<article[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/article>/gi,
        // Generic post links
        /<a[^>]*href=["']([^"']+(?:\/\d{4}\/\d{2}\/|\/post\/|\/blog\/|\/article\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
        // H2/H3 links (common in archives)
        /<h[23][^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi,
    ];

    const seenUrls = new Set<string>();

    for (const pattern of linkPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const url = match[1];
            const title = cleanText(match[2] || '');

            // Skip if no title or already seen
            if (!title || title.length < 10 || seenUrls.has(url)) continue;

            // Only include internal links
            if (!url.includes(baseDomain) && !url.startsWith('/')) continue;

            // Skip common non-article links
            if (isNonArticleLink(url)) continue;

            seenUrls.add(url);
            articles.push({
                url: url.startsWith('/') ? `https://${baseDomain}${url}` : url,
                title,
            });
        }
    }

    return articles.slice(0, 50); // Limit results
}

/**
 * Generate inspired topics from competitor articles
 */
export function generateInspiredTopics(
    articles: ArticleLink[],
    yourNiche: string
): InspiredTopic[] {
    return articles.slice(0, 20).map(article => {
        const angle = generateAngle(article.title, yourNiche);
        return {
            topic: transformTitle(article.title),
            originalTitle: article.title,
            sourceUrl: article.url,
            angle,
        };
    });
}

// ============================================================================
// Detection Functions
// ============================================================================

function detectMonetization(html: string): CompetitorAnalysis['monetization'] {
    const adNetworks: string[] = [];

    // Check for common ad networks
    if (html.includes('mediavine') || html.includes('mv-ad')) {
        adNetworks.push('Mediavine');
    }
    if (html.includes('adthrive') || html.includes('adthrive-seo')) {
        adNetworks.push('AdThrive');
    }
    if (html.includes('googlesyndication') || html.includes('google_ad')) {
        adNetworks.push('AdSense');
    }
    if (html.includes('ezoic')) {
        adNetworks.push('Ezoic');
    }
    if (html.includes('monumetric') || html.includes('medianel')) {
        adNetworks.push('Monumetric');
    }

    // Check for affiliate links
    const hasAffiliate =
        html.includes('amazon.com/') ||
        html.includes('shareasale') ||
        html.includes('awin') ||
        html.includes('partnerize') ||
        html.includes('ref=') ||
        html.includes('affiliate');

    return {
        hasAds: adNetworks.length > 0,
        adNetworks,
        hasAffiliate,
    };
}

function detectNiche(topics: string[], content: string): string {
    const allText = [...topics, content].join(' ').toLowerCase();

    const nicheKeywords: Record<string, string[]> = {
        'Couponing': ['coupon', 'deal', 'discount', 'save', 'free', 'promo'],
        'Travel': ['travel', 'destination', 'hotel', 'flight', 'vacation', 'trip'],
        'Food/Recipe': ['recipe', 'cook', 'food', 'ingredient', 'bake', 'meal'],
        'Lifestyle': ['lifestyle', 'home', 'decor', 'organize', 'diy'],
        'Fashion': ['fashion', 'outfit', 'style', 'wear', 'dress', 'clothing'],
        'Tech': ['tech', 'phone', 'computer', 'gadget', 'software', 'app'],
        'Finance': ['money', 'budget', 'invest', 'finance', 'save', 'credit'],
        'Health': ['health', 'fitness', 'workout', 'diet', 'wellness', 'exercise'],
        'Parenting': ['kid', 'child', 'parent', 'baby', 'family', 'mom', 'dad'],
        'Crafts': ['craft', 'sewing', 'knit', 'crochet', 'diy', 'handmade'],
    };

    let bestNiche = 'General';
    let bestScore = 0;

    for (const [niche, keywords] of Object.entries(nicheKeywords)) {
        const score = keywords.filter(kw => allText.includes(kw)).length;
        if (score > bestScore) {
            bestScore = score;
            bestNiche = niche;
        }
    }

    return bestNiche;
}

function extractCommonTopics(titles: string[]): string[] {
    const words: Record<string, number> = {};
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'how', 'why',
        'when', 'where', 'which', 'who', 'your', 'my', 'our', 'their',
    ]);

    for (const title of titles) {
        const titleWords = title.toLowerCase().split(/\s+/);
        for (const word of titleWords) {
            const clean = word.replace(/[^a-z]/g, '');
            if (clean.length > 3 && !stopWords.has(clean)) {
                words[clean] = (words[clean] || 0) + 1;
            }
        }
    }

    // Return top topics by frequency
    return Object.entries(words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}

async function analyzeContentStyle(
    articles: ArticleLink[],
    template: ReturnType<typeof findTemplateForDomain>
): Promise<CompetitorAnalysis['contentStyle']> {
    let totalWordCount = 0;
    let hasImages = false;
    let hasFAQ = false;
    let hasLists = false;
    let validSamples = 0;

    for (const article of articles) {
        try {
            const result = await scrapeUrl(article.url, {
                contentSelector: template.selectors.content,
                removeSelectors: template.removeSelectors,
            });

            if (result.success && result.data?.content) {
                validSamples++;
                const content = result.data.content;
                totalWordCount += content.split(/\s+/).length;
                hasImages = hasImages || (result.data.images?.length || 0) > 0;
                hasFAQ = hasFAQ || /faq|frequently asked/i.test(content);
                hasLists = hasLists || /<[uo]l/i.test(content);
            }
        } catch {
            // Skip failed fetches
        }
    }

    return {
        avgWordCount: validSamples > 0 ? Math.round(totalWordCount / validSamples) : 0,
        hasImages,
        hasFAQ,
        hasLists,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

function cleanText(text: string): string {
    return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function isNonArticleLink(url: string): boolean {
    const skipPatterns = [
        '/category/', '/tag/', '/author/', '/page/',
        '/wp-', '/feed', '/comment', '/login', '/register',
        '.xml', '.rss', '#', 'javascript:',
    ];
    return skipPatterns.some(p => url.toLowerCase().includes(p));
}

function transformTitle(title: string): string {
    // Make title unique while keeping the essence
    const transformations = [
        // Add "Ultimate Guide" prefix
        (t: string) => `The Ultimate Guide to ${t.replace(/^the\s+/i, '')}`,
        // Add year
        (t: string) => `${t} (${new Date().getFullYear()})`,
        // Add "Best" angle
        (t: string) => t.replace(/^how to/i, 'The Best Way to'),
    ];

    const transform = transformations[Math.floor(Math.random() * transformations.length)];
    return transform(title);
}

function generateAngle(title: string, niche: string): string {
    const angles = [
        `Cover this topic from a ${niche} perspective`,
        'Add personal experience and examples',
        'Include more detailed step-by-step instructions',
        'Focus on budget-friendly options',
        'Add comparison data and alternatives',
        'Include expert quotes and statistics',
    ];
    return angles[Math.floor(Math.random() * angles.length)];
}
