/**
 * Traffic Acquisition Module (S4)
 * 
 * Tools for SEO optimization, internal linking, and traffic strategies.
 */

export interface InternalLink {
    sourceSlug: string;
    targetSlug: string;
    anchorText: string;
    relevanceScore: number;
}

export interface TopicCluster {
    pillarTopic: string;
    pillarSlug: string;
    clusterTopics: Array<{
        topic: string;
        slug: string;
        status: 'published' | 'planned' | 'draft';
    }>;
    averageCPC: number;
    completeness: number; // 0-100
}

export interface SEOAudit {
    slug: string;
    title: string;
    issues: SEOIssue[];
    score: number;
}

export interface SEOIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    fix: string;
}

/**
 * Analyze article content for SEO issues
 */
export function auditArticleSEO(content: string, keyword: string): SEOAudit {
    const issues: SEOIssue[] = [];
    let score = 100;

    // Extract components
    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';
    const descMatch = content.match(/description:\s*"([^"]+)"/);
    const description = descMatch ? descMatch[1] : '';
    const bodyContent = content.replace(/^---[\s\S]*?---/, '');
    const wordCount = bodyContent.split(/\s+/).length;
    const keywordLower = keyword.toLowerCase();

    // Title checks
    if (title.length < 30) {
        issues.push({ type: 'warning', message: 'Title is too short (< 30 chars)', fix: 'Expand title to 50-60 characters' });
        score -= 10;
    }
    if (title.length > 70) {
        issues.push({ type: 'warning', message: 'Title is too long (> 70 chars)', fix: 'Shorten title to 50-60 characters' });
        score -= 5;
    }
    if (!title.toLowerCase().includes(keywordLower)) {
        issues.push({ type: 'error', message: 'Keyword not in title', fix: 'Include primary keyword in title' });
        score -= 15;
    }

    // Description checks
    if (description.length < 120) {
        issues.push({ type: 'warning', message: 'Meta description too short', fix: 'Expand to 150-160 characters' });
        score -= 10;
    }
    if (description.length > 170) {
        issues.push({ type: 'warning', message: 'Meta description too long', fix: 'Shorten to 150-160 characters' });
        score -= 5;
    }

    // Content checks
    if (wordCount < 1500) {
        issues.push({ type: 'warning', message: `Content is short (${wordCount} words)`, fix: 'Aim for 2000+ words for authority' });
        score -= 10;
    }

    // Heading checks
    const h2Count = (bodyContent.match(/^## /gm) || []).length;
    if (h2Count < 3) {
        issues.push({ type: 'warning', message: 'Too few H2 headings', fix: 'Add more section headings for structure' });
        score -= 10;
    }

    // FAQ check
    const hasFAQ = bodyContent.toLowerCase().includes('frequently asked') || bodyContent.includes('## ❓');
    if (!hasFAQ) {
        issues.push({ type: 'info', message: 'No FAQ section detected', fix: 'Add FAQ for featured snippet potential' });
        score -= 5;
    }

    // Internal links check
    const internalLinks = (bodyContent.match(/\[.*?\]\(\/.*?\)/g) || []).length;
    if (internalLinks < 2) {
        issues.push({ type: 'warning', message: 'Few internal links', fix: 'Add 3-5 internal links to related content' });
        score -= 10;
    }

    const slug = keyword.toLowerCase().replace(/\s+/g, '-');

    return {
        slug,
        title,
        issues,
        score: Math.max(0, score)
    };
}

/**
 * Generate internal link suggestions between articles
 */
export function suggestInternalLinks(
    articles: Array<{ slug: string; title: string; keywords: string[] }>
): InternalLink[] {
    const links: InternalLink[] = [];

    for (let i = 0; i < articles.length; i++) {
        for (let j = 0; j < articles.length; j++) {
            if (i === j) continue;

            const source = articles[i];
            const target = articles[j];

            // Calculate relevance based on keyword overlap
            const overlap = source.keywords.filter(k =>
                target.keywords.some(tk =>
                    k.toLowerCase().includes(tk.toLowerCase()) ||
                    tk.toLowerCase().includes(k.toLowerCase())
                )
            );

            if (overlap.length > 0) {
                links.push({
                    sourceSlug: source.slug,
                    targetSlug: target.slug,
                    anchorText: target.title,
                    relevanceScore: Math.min(100, overlap.length * 25)
                });
            }
        }
    }

    // Sort by relevance and return top links
    return links
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 20);
}

/**
 * Create a topic cluster plan
 */
export function createTopicCluster(
    pillarTopic: string,
    relatedKeywords: string[],
    existingArticles: Array<{ slug: string; keyword: string }>
): TopicCluster {
    const pillarSlug = pillarTopic.toLowerCase().replace(/\s+/g, '-');

    const clusterTopics = relatedKeywords.map(keyword => {
        const slug = keyword.toLowerCase().replace(/\s+/g, '-');
        const existing = existingArticles.find(a =>
            a.keyword.toLowerCase() === keyword.toLowerCase() ||
            a.slug === slug
        );

        return {
            topic: keyword,
            slug,
            status: existing ? 'published' as const : 'planned' as const
        };
    });

    const publishedCount = clusterTopics.filter(t => t.status === 'published').length;
    const completeness = Math.round((publishedCount / clusterTopics.length) * 100);

    return {
        pillarTopic,
        pillarSlug,
        clusterTopics,
        averageCPC: 0, // Would need CPC analysis
        completeness
    };
}

/**
 * Generate featured snippet-optimized content
 */
export function generateFeaturedSnippetContent(
    type: 'paragraph' | 'list' | 'table',
    question: string,
    answer: string | string[] | string[][]
): string {
    switch (type) {
        case 'paragraph':
            // Optimal length: 40-60 words
            return `**${question}**\n\n${answer}\n`;

        case 'list':
            if (!Array.isArray(answer)) return '';
            return `**${question}**\n\n${(answer as string[]).map((item, i) => `${i + 1}. ${item}`).join('\n')}\n`;

        case 'table':
            if (!Array.isArray(answer) || !Array.isArray(answer[0])) return '';
            const rows = answer as string[][];
            const header = rows[0];
            let table = `| ${header.join(' | ')} |\n`;
            table += `| ${header.map(() => '---').join(' | ')} |\n`;
            rows.slice(1).forEach(row => {
                table += `| ${row.join(' | ')} |\n`;
            });
            return table;

        default:
            return '';
    }
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(baseUrl: string, slug: string): string {
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanSlug = slug.replace(/^\//, '');
    return `${cleanBase}/${cleanSlug}`;
}

/**
 * Generate backlink strategy suggestions
 */
export function suggestBacklinkOpportunities(niche: string): string[] {
    const strategies: Record<string, string[]> = {
        'Technology': [
            'Submit to Hacker News with engaging title',
            'Share on Reddit r/technology or r/programming',
            'Guest post on tech blogs like CSS-Tricks, Smashing Magazine',
            'Answer related questions on Stack Overflow with link to article'
        ],
        'Personal Finance': [
            'Submit to Reddit r/personalfinance or r/financialindependence',
            'Guest post on Investopedia or NerdWallet blogs',
            'Create infographics for Pinterest',
            'Contribute to FIRE community forums'
        ],
        'Cybersecurity': [
            'Share on Reddit r/netsec or r/cybersecurity',
            'Submit to Hacker News',
            'Contribute to security community forums',
            'Partner with VPN/security review sites'
        ],
        'General': [
            'Cross-post to Dev.to, Medium, LinkedIn',
            'Share on relevant subreddits',
            'Create shareable infographics',
            'Guest post on industry blogs',
            'Answer Quora questions with links'
        ]
    };

    return strategies[niche] || strategies['General'];
}
