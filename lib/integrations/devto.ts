/**
 * Dev.to API Client
 * 
 * Integration with Dev.to for cross-platform content distribution.
 * Docs: https://developers.forem.com/api
 */

export interface DevToConfig {
    apiKey: string;
}

export interface DevToArticle {
    id?: number;
    title: string;
    body_markdown: string;
    published?: boolean;
    tags?: string[];
    canonical_url?: string;
    description?: string;
    series?: string;
    main_image?: string;
    organization_id?: number;
}

export interface DevToPublishedArticle {
    id: number;
    title: string;
    description: string;
    slug: string;
    url: string;
    canonical_url: string | null;
    published: boolean;
    published_at: string | null;
    created_at: string;
    edited_at: string | null;
    page_views_count: number;
    positive_reactions_count: number;
    comments_count: number;
    reading_time_minutes: number;
    tags: string[];
}

export interface DevToUser {
    id: number;
    username: string;
    name: string;
    twitter_username: string | null;
    github_username: string | null;
    website_url: string | null;
    profile_image: string;
}

const DEV_TO_API_URL = 'https://dev.to/api';

/**
 * Dev.to API Client
 */
export class DevToClient {
    private apiKey: string;

    constructor(config: DevToConfig) {
        this.apiKey = config.apiKey;
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: Record<string, unknown>
    ): Promise<T> {
        const url = `${DEV_TO_API_URL}${endpoint}`;

        const headers: Record<string, string> = {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
        };

        const options: RequestInit = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error(`Dev.to API error:`, error);
            throw error;
        }
    }

    /**
     * Get authenticated user info
     */
    async getMe(): Promise<DevToUser> {
        return this.request<DevToUser>('/users/me');
    }

    /**
     * Get user's published articles
     */
    async getMyArticles(page: number = 1, perPage: number = 30): Promise<DevToPublishedArticle[]> {
        return this.request<DevToPublishedArticle[]>(
            `/articles/me/published?page=${page}&per_page=${perPage}`
        );
    }

    /**
     * Get user's unpublished articles
     */
    async getMyDrafts(page: number = 1, perPage: number = 30): Promise<DevToPublishedArticle[]> {
        return this.request<DevToPublishedArticle[]>(
            `/articles/me/unpublished?page=${page}&per_page=${perPage}`
        );
    }

    /**
     * Get article by ID
     */
    async getArticle(id: number): Promise<DevToPublishedArticle> {
        return this.request<DevToPublishedArticle>(`/articles/${id}`);
    }

    /**
     * Publish a new article
     */
    async publishArticle(article: DevToArticle): Promise<DevToPublishedArticle> {
        return this.request<DevToPublishedArticle>('/articles', 'POST', {
            article
        });
    }

    /**
     * Update an existing article
     */
    async updateArticle(id: number, article: Partial<DevToArticle>): Promise<DevToPublishedArticle> {
        return this.request<DevToPublishedArticle>(`/articles/${id}`, 'PUT', {
            article
        });
    }

    /**
     * Test API connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.getMe();
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Create Dev.to client from localStorage settings
 */
export function createDevToClientFromSettings(): DevToClient | null {
    if (typeof window === 'undefined') return null;

    try {
        const apiKey = localStorage.getItem('devto_api_key');

        if (!apiKey) {
            return null;
        }

        return new DevToClient({ apiKey });
    } catch {
        return null;
    }
}

/**
 * Adapt article content for Dev.to
 * - Removes AdSense placeholders
 * - Adds canonical URL
 * - Converts frontmatter
 */
export function adaptArticleForDevTo(
    markdown: string,
    canonicalUrl: string,
    tags: string[] = []
): DevToArticle {
    // Extract title from frontmatter
    const titleMatch = markdown.match(/title:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : 'Untitled';

    // Extract description from frontmatter
    const descMatch = markdown.match(/description:\s*"([^"]+)"/);
    const description = descMatch ? descMatch[1] : undefined;

    // Remove frontmatter for Dev.to (they use their own)
    let content = markdown.replace(/^---[\s\S]*?---\n\n?/, '');

    // Remove AdSense placeholders
    content = content.replace(/<!-- AD:?\w* -->/g, '');
    content = content.replace(/<script[^>]*adsbygoogle[^>]*>[\s\S]*?<\/script>/gi, '');

    // Add canonical note at the bottom
    content += `\n\n---\n\n*Originally published at [${new URL(canonicalUrl).hostname}](${canonicalUrl})*`;

    // Clean up extra blank lines
    content = content.replace(/\n{3,}/g, '\n\n');

    return {
        title,
        body_markdown: content,
        published: false, // Save as draft first
        tags: tags.slice(0, 4), // Dev.to allows max 4 tags
        canonical_url: canonicalUrl,
        description
    };
}

/**
 * Map article niche to Dev.to tags
 */
export function nicheToDevToTags(niche: string): string[] {
    const tagMap: Record<string, string[]> = {
        'Technology': ['technology', 'programming', 'webdev', 'tutorial'],
        'Personal Finance': ['finance', 'productivity', 'career', 'money'],
        'Investing & Crypto': ['crypto', 'blockchain', 'finance', 'investing'],
        'SaaS': ['saas', 'startup', 'productivity', 'webdev'],
        'Cybersecurity': ['security', 'cybersecurity', 'privacy', 'tutorial'],
        'Health & Wellness': ['health', 'productivity', 'lifestyle', 'career'],
        'Business & Marketing': ['marketing', 'business', 'startup', 'career'],
        'Education': ['learning', 'career', 'productivity', 'tutorial'],
        'General': ['programming', 'webdev', 'productivity', 'tutorial']
    };

    return tagMap[niche] || tagMap['General'];
}
