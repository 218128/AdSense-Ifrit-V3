/**
 * Syndication Client
 * FSD: lib/distribution/syndicationClient.ts
 *
 * Publish content to third-party platforms:
 * Medium, Dev.to, Hashnode.
 */

// ============================================================================
// Types
// ============================================================================

export type SyndicationPlatform = 'medium' | 'devto' | 'hashnode';

export interface SyndicationConfig {
    platform: SyndicationPlatform;
    apiKey: string;
    publicationId?: string;   // Medium publication ID
    username?: string;        // Hashnode username
}

export interface ArticlePayload {
    title: string;
    body: string;             // Markdown or HTML
    canonicalUrl?: string;    // Original URL to avoid duplicate content penalty
    tags?: string[];
    coverImage?: string;      // URL to cover image
    publishStatus?: 'draft' | 'public' | 'unlisted';
}

export interface SyndicationResult {
    success: boolean;
    url?: string;
    postId?: string;
    error?: string;
}

// ============================================================================
// Medium Implementation
// ============================================================================

const MEDIUM_API_URL = 'https://api.medium.com/v1';

async function getMediumUserId(apiKey: string): Promise<string | null> {
    try {
        const response = await fetch(`${MEDIUM_API_URL}/me`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.data?.id || null;
    } catch {
        return null;
    }
}

async function publishToMedium(
    config: SyndicationConfig,
    article: ArticlePayload
): Promise<SyndicationResult> {
    try {
        const userId = await getMediumUserId(config.apiKey);
        if (!userId) {
            return { success: false, error: 'Failed to get Medium user ID' };
        }

        // Publish to user or publication
        const endpoint = config.publicationId
            ? `${MEDIUM_API_URL}/publications/${config.publicationId}/posts`
            : `${MEDIUM_API_URL}/users/${userId}/posts`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: article.title,
                contentFormat: 'markdown',
                content: article.body,
                canonicalUrl: article.canonicalUrl,
                tags: article.tags?.slice(0, 5) || [], // Medium allows max 5 tags
                publishStatus: article.publishStatus || 'public',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `Medium: ${response.status} - ${error}` };
        }

        const data = await response.json();
        return {
            success: true,
            url: data.data?.url,
            postId: data.data?.id,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Medium publish failed',
        };
    }
}

// ============================================================================
// Dev.to Implementation
// ============================================================================

const DEVTO_API_URL = 'https://dev.to/api';

async function publishToDevTo(
    config: SyndicationConfig,
    article: ArticlePayload
): Promise<SyndicationResult> {
    try {
        const response = await fetch(`${DEVTO_API_URL}/articles`, {
            method: 'POST',
            headers: {
                'api-key': config.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                article: {
                    title: article.title,
                    body_markdown: article.body,
                    published: article.publishStatus !== 'draft',
                    canonical_url: article.canonicalUrl,
                    tags: article.tags?.slice(0, 4) || [], // Dev.to allows max 4 tags
                    main_image: article.coverImage,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `Dev.to: ${response.status} - ${error}` };
        }

        const data = await response.json();
        return {
            success: true,
            url: data.url,
            postId: data.id?.toString(),
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Dev.to publish failed',
        };
    }
}

// ============================================================================
// Hashnode Implementation
// ============================================================================

const HASHNODE_API_URL = 'https://gql.hashnode.com';

async function publishToHashnode(
    config: SyndicationConfig,
    article: ArticlePayload
): Promise<SyndicationResult> {
    try {
        // Hashnode uses GraphQL
        const mutation = `
            mutation CreateStory($input: CreateStoryInput!) {
                createStory(input: $input) {
                    post {
                        id
                        slug
                        publication {
                            domain
                        }
                    }
                }
            }
        `;

        const response = await fetch(HASHNODE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': config.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: mutation,
                variables: {
                    input: {
                        title: article.title,
                        contentMarkdown: article.body,
                        isRepublished: !!article.canonicalUrl,
                        originalArticleURL: article.canonicalUrl,
                        tags: article.tags?.map(t => ({ slug: t.toLowerCase().replace(/\s+/g, '-'), name: t })) || [],
                        coverImageURL: article.coverImage,
                        // Publication host required for Hashnode
                        publicationId: config.publicationId,
                    },
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `Hashnode: ${response.status} - ${error}` };
        }

        const data = await response.json();

        if (data.errors) {
            return { success: false, error: `Hashnode: ${data.errors[0]?.message}` };
        }

        const post = data.data?.createStory?.post;
        const domain = post?.publication?.domain || `${config.username}.hashnode.dev`;

        return {
            success: true,
            url: `https://${domain}/${post?.slug}`,
            postId: post?.id,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Hashnode publish failed',
        };
    }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Syndicate an article to a third-party platform.
 */
export async function syndicateArticle(
    config: SyndicationConfig,
    article: ArticlePayload
): Promise<SyndicationResult> {
    console.log(`[Syndication] Publishing to ${config.platform}: "${article.title}"`);

    switch (config.platform) {
        case 'medium':
            return publishToMedium(config, article);
        case 'devto':
            return publishToDevTo(config, article);
        case 'hashnode':
            return publishToHashnode(config, article);
        default:
            return { success: false, error: `Unknown platform: ${config.platform}` };
    }
}

/**
 * Validate platform credentials.
 */
export async function validateCredentials(config: SyndicationConfig): Promise<boolean> {
    try {
        switch (config.platform) {
            case 'medium': {
                const userId = await getMediumUserId(config.apiKey);
                return userId !== null;
            }

            case 'devto': {
                const response = await fetch(`${DEVTO_API_URL}/users/me`, {
                    headers: { 'api-key': config.apiKey },
                });
                return response.ok;
            }

            case 'hashnode': {
                const response = await fetch(HASHNODE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': config.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: '{ me { id } }',
                    }),
                });
                const data = await response.json();
                return !!data.data?.me?.id;
            }

            default:
                return false;
        }
    } catch {
        return false;
    }
}

/**
 * Syndicate to multiple platforms at once.
 */
export async function syndicateToMultiple(
    configs: SyndicationConfig[],
    article: ArticlePayload
): Promise<Record<SyndicationPlatform, SyndicationResult>> {
    const results: Record<string, SyndicationResult> = {};

    await Promise.all(
        configs.map(async (config) => {
            results[config.platform] = await syndicateArticle(config, article);
        })
    );

    return results as Record<SyndicationPlatform, SyndicationResult>;
}

/**
 * Platform display metadata.
 */
export const PLATFORM_INFO: Record<SyndicationPlatform, { name: string; icon: string; requiresPublication: boolean }> = {
    medium: { name: 'Medium', icon: '📝', requiresPublication: false },
    devto: { name: 'DEV Community', icon: '👩‍💻', requiresPublication: false },
    hashnode: { name: 'Hashnode', icon: '📘', requiresPublication: true },
};
