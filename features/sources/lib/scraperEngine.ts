/**
 * Scraper Engine
 * FSD: features/sources/lib/scraperEngine.ts
 * 
 * CSS selector-based content extraction from web pages.
 * Converts HTML to Markdown for AI processing.
 */

// ============================================================================
// Types
// ============================================================================

export interface ScrapeOptions {
    /** CSS selector for main content container */
    contentSelector?: string;
    /** CSS selector for title */
    titleSelector?: string;
    /** CSS selector for images */
    imageSelector?: string;
    /** Selectors to remove (ads, nav, footer) */
    removeSelectors?: string[];
    /** Wait time for JS rendering (ms) */
    waitMs?: number;
    /** User agent string */
    userAgent?: string;
    /** Extract metadata (author, date, etc.) */
    extractMeta?: boolean;
}

export interface ExtractedContent {
    title: string;
    content: string; // HTML or Markdown
    excerpt: string;
    images: { url: string; alt: string }[];
    meta: {
        author?: string;
        date?: string;
        categories?: string[];
        tags?: string[];
    };
}

export interface ScrapeResult {
    success: boolean;
    data?: ExtractedContent;
    rawHtml?: string;
    error?: string;
    fetchTimeMs: number;
}

// ============================================================================
// Default Selectors (works for most sites)
// ============================================================================

const DEFAULT_REMOVE_SELECTORS = [
    'nav', 'header', 'footer',
    '.nav', '.header', '.footer',
    '.sidebar', '.widget', '.ad', '.advertisement',
    '.comments', '.comment-section',
    '.social-share', '.related-posts',
    'script', 'style', 'noscript',
    '[role="navigation"]', '[role="banner"]',
];

const DEFAULT_CONTENT_SELECTORS = [
    'article', '.post-content', '.entry-content',
    '.article-content', '.content', 'main',
    '[role="main"]', '.post', '.blog-post',
];

// ============================================================================
// Scraping Functions
// ============================================================================

/**
 * Scrape a URL and extract content
 */
export async function scrapeUrl(
    url: string,
    options: ScrapeOptions = {}
): Promise<ScrapeResult> {
    const startTime = Date.now();

    try {
        // Validate URL
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return { success: false, error: 'Invalid URL protocol', fetchTimeMs: 0 };
        }

        // Fetch page
        const response = await fetch(url, {
            headers: {
                'User-Agent': options.userAgent || 'Mozilla/5.0 (compatible; IfritBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
                fetchTimeMs: Date.now() - startTime,
            };
        }

        const html = await response.text();
        const extracted = extractContent(html, options);

        return {
            success: true,
            data: extracted,
            rawHtml: html,
            fetchTimeMs: Date.now() - startTime,
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Scrape failed',
            fetchTimeMs: Date.now() - startTime,
        };
    }
}

/**
 * Extract content from HTML using selectors
 */
export function extractContent(
    html: string,
    options: ScrapeOptions = {}
): ExtractedContent {
    // Use regex-based extraction (no DOM parser dependency)
    const removeSelectors = options.removeSelectors || DEFAULT_REMOVE_SELECTORS;

    // Clean HTML - remove unwanted elements
    let cleanHtml = html;
    for (const selector of removeSelectors) {
        cleanHtml = removeElementsByTag(cleanHtml, selector);
    }

    // Extract title
    const title = extractTitle(cleanHtml, options.titleSelector);

    // Extract main content
    const contentSelector = options.contentSelector;
    let content = '';

    if (contentSelector) {
        content = extractBySelector(cleanHtml, contentSelector);
    } else {
        // Try default selectors
        for (const selector of DEFAULT_CONTENT_SELECTORS) {
            const found = extractBySelector(cleanHtml, selector);
            if (found && found.length > 200) {
                content = found;
                break;
            }
        }
    }

    // Fallback to body
    if (!content) {
        content = extractByTag(cleanHtml, 'body') || cleanHtml;
    }

    // Extract images
    const images = extractImages(content, options.imageSelector);

    // Extract metadata
    const meta = options.extractMeta ? extractMetadata(html) : {};

    // Clean and convert content
    const cleanContent = cleanHtmlContent(content);
    const excerpt = createExcerpt(cleanContent, 160);

    return {
        title,
        content: cleanContent,
        excerpt,
        images,
        meta,
    };
}

/**
 * Convert HTML to Markdown
 */
export function htmlToMarkdown(html: string): string {
    let md = html;

    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

    // Paragraphs
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

    // Bold/Italic
    md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');

    // Links
    md = md.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    md = md.replace(
        /<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
        '![$2]($1)'
    );
    md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)');

    // Lists
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');

    // Blockquotes
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n');

    // Code
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n');

    // Line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

    // Remove remaining tags
    md = md.replace(/<[^>]+>/g, '');

    // Clean up whitespace
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractTitle(html: string, selector?: string): string {
    if (selector) {
        const found = extractBySelector(html, selector);
        if (found) return cleanText(found);
    }

    // Try h1 first
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) return cleanText(h1Match[1]);

    // Fall back to title tag
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) return cleanText(titleMatch[1].split('|')[0].split('-')[0]);

    return 'Untitled';
}

function extractBySelector(html: string, selector: string): string {
    // Simple selector matching (class or tag)
    if (selector.startsWith('.')) {
        const className = selector.slice(1);
        const regex = new RegExp(
            `<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
            'i'
        );
        const match = html.match(regex);
        return match ? match[1] : '';
    }

    return extractByTag(html, selector);
}

function extractByTag(html: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = html.match(regex);
    return match ? match[1] : '';
}

function removeElementsByTag(html: string, selector: string): string {
    const tag = selector.startsWith('.') ? '[^>]+class="[^"]*' + selector.slice(1) : selector;
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi');
    return html.replace(regex, '');
}

function extractImages(html: string, selector?: string): { url: string; alt: string }[] {
    const images: { url: string; alt: string }[] = [];
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*\/?>/gi;

    let content = html;
    if (selector) {
        content = extractBySelector(html, selector) || html;
    }

    let match;
    while ((match = imgRegex.exec(content)) !== null) {
        const url = match[1];
        const alt = match[2] || '';
        if (url && !url.includes('data:')) {
            images.push({ url, alt });
        }
    }

    return images.slice(0, 10); // Limit to 10 images
}

function extractMetadata(html: string): ExtractedContent['meta'] {
    const meta: ExtractedContent['meta'] = {};

    // Author
    const authorMatch = html.match(
        /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i
    );
    if (authorMatch) meta.author = authorMatch[1];

    // Date
    const dateMatch = html.match(
        /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i
    );
    if (dateMatch) meta.date = dateMatch[1];

    // Categories (from schema or meta)
    const categoryMatch = html.match(/rel=["']category["'][^>]*>([^<]+)</gi);
    if (categoryMatch) {
        meta.categories = categoryMatch.map(m =>
            m.replace(/rel=["']category["'][^>]*>/i, '').replace(/<.*/, '').trim()
        );
    }

    return meta;
}

function cleanText(text: string): string {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanHtmlContent(html: string): string {
    // Remove inline scripts and styles
    let clean = html;
    clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<!--[\s\S]*?-->/g, '');

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ');

    return clean.trim();
}

function createExcerpt(content: string, maxLength: number): string {
    const text = cleanText(content);
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3).trim() + '...';
}
