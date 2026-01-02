/**
 * Internal Linking System
 * FSD: features/campaigns/lib/internalLinking.ts
 * 
 * Fetch existing posts and suggest/inject internal links.
 */

import type { WPSite } from '@/features/wordpress';

// ============================================================================
// Types
// ============================================================================

export interface ExistingPost {
    id: number;
    title: string;
    slug: string;
    url: string;
    categories: number[];
    keywords: string[];
}

export interface LinkSuggestion {
    anchor: string;
    url: string;
    postId: number;
    postTitle: string;
    score: number;
}

export interface LinkingResult {
    content: string;
    linksAdded: number;
    suggestions: LinkSuggestion[];
}

// ============================================================================
// Fetch Existing Posts
// ============================================================================

/**
 * Fetch existing posts from WordPress site for internal linking
 */
export async function fetchExistingPosts(site: WPSite): Promise<ExistingPost[]> {
    try {
        const authHeader = btoa(`${site.username}:${site.appPassword}`);

        const response = await fetch(`${site.url}/wp-json/wp/v2/posts?per_page=100&status=publish`, {
            headers: {
                'Authorization': `Basic ${authHeader}`,
            },
        });

        if (!response.ok) return [];

        const posts = await response.json();

        return posts.map((post: {
            id: number;
            title: { rendered: string };
            slug: string;
            link: string;
            categories: number[];
        }) => ({
            id: post.id,
            title: decodeHtml(post.title.rendered),
            slug: post.slug,
            url: post.link,
            categories: post.categories || [],
            keywords: extractKeywords(decodeHtml(post.title.rendered)),
        }));
    } catch {
        return [];
    }
}

/**
 * Extract keywords from post title
 */
function extractKeywords(title: string): string[] {
    const stopWords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom',
    ]);

    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Decode HTML entities
 */
function decodeHtml(html: string): string {
    return html
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

// ============================================================================
// Link Suggestions
// ============================================================================

/**
 * Find internal link opportunities in content
 */
export function findLinkOpportunities(
    content: string,
    existingPosts: ExistingPost[],
    maxLinks: number = 5
): LinkSuggestion[] {
    const suggestions: LinkSuggestion[] = [];
    const contentLower = content.toLowerCase();

    for (const post of existingPosts) {
        for (const keyword of post.keywords) {
            const index = contentLower.indexOf(keyword);
            if (index !== -1) {
                // Check if not already linked
                const beforeContext = content.substring(Math.max(0, index - 50), index);
                if (beforeContext.includes('<a ') && !beforeContext.includes('</a>')) {
                    continue; // Already in a link
                }

                const score = calculateRelevance(keyword, post.title, content);

                suggestions.push({
                    anchor: keyword,
                    url: post.url,
                    postId: post.id,
                    postTitle: post.title,
                    score,
                });
            }
        }
    }

    // Sort by score and dedupe by post
    const seen = new Set<number>();
    return suggestions
        .sort((a, b) => b.score - a.score)
        .filter(s => {
            if (seen.has(s.postId)) return false;
            seen.add(s.postId);
            return true;
        })
        .slice(0, maxLinks);
}

/**
 * Calculate relevance score for a link
 */
function calculateRelevance(keyword: string, postTitle: string, content: string): number {
    let score = 0;

    // Keyword length bonus
    score += Math.min(keyword.length / 10, 1);

    // Frequency in content
    const regex = new RegExp(keyword, 'gi');
    const matches = content.match(regex)?.length || 0;
    score += Math.min(matches * 0.2, 1);

    // Title similarity bonus
    const titleWords = postTitle.toLowerCase().split(/\s+/);
    const keywordInTitle = titleWords.some(w => w.includes(keyword));
    if (keywordInTitle) score += 0.5;

    return score;
}

// ============================================================================
// Auto-Link Injection
// ============================================================================

/**
 * Automatically inject internal links into content
 */
export function injectInternalLinks(
    content: string,
    suggestions: LinkSuggestion[],
    maxLinks: number = 3
): LinkingResult {
    let modifiedContent = content;
    let linksAdded = 0;
    const usedPosts = new Set<number>();

    for (const suggestion of suggestions) {
        if (linksAdded >= maxLinks) break;
        if (usedPosts.has(suggestion.postId)) continue;

        // Find first occurrence not already linked
        const regex = new RegExp(`\\b(${escapeRegex(suggestion.anchor)})\\b(?![^<]*<\\/a>)`, 'i');
        const match = modifiedContent.match(regex);

        if (match) {
            const link = `<a href="${suggestion.url}" title="${suggestion.postTitle}">${match[1]}</a>`;
            modifiedContent = modifiedContent.replace(regex, link);
            linksAdded++;
            usedPosts.add(suggestion.postId);
        }
    }

    return {
        content: modifiedContent,
        linksAdded,
        suggestions,
    };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
