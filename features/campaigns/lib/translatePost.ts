/**
 * Translate Post - Capability System Wrapper
 * FSD: features/campaigns/lib/translatePost.ts
 * 
 * Translates WP post content using the capability system (provider agnostic).
 * Uses aiServices.execute({ capability: 'translate', ... }) per guidelines.
 * 
 * MIGRATION: Uses dynamic import of aiServices. Engine accessible via @/lib/core.
 */

import type { WPPostResult } from '@/features/wordpress/model/types';

// ============================================================================
// Types
// ============================================================================

export interface TranslatePostOptions {
    targetLanguage: string;
    preserveFormatting?: boolean;
    onProgress?: (status: { phase: string; message: string }) => void;
}

export interface TranslatedContent {
    title: string;
    content: string;
    excerpt: string;
}

// ============================================================================
// Translation Functions (Capability System Compliant)
// ============================================================================

/**
 * Translate a single text using the capability system
 * Provider is selected automatically based on user Settings and handler priority
 */
async function translateText(
    text: string,
    targetLanguage: string,
    preserveFormatting = false
): Promise<{ success: boolean; text?: string; error?: string }> {
    // Dynamic import to avoid SSR issues
    const { aiServices } = await import('@/lib/ai/services');

    // Initialize if not already
    await aiServices.initialize();

    // Execute via capability system - provider agnostic
    const result = await aiServices.execute({
        capability: 'translate',
        prompt: text,
        context: {
            text,
            targetLanguage,
            preserveFormatting,
        },
    });

    return {
        success: result.success,
        text: result.text,
        error: result.error,
    };
}

/**
 * Translate a WordPress post to a target language
 * Uses capability system - handler selection done by AIServices
 */
export async function translatePost(
    post: WPPostResult,
    options: TranslatePostOptions
): Promise<{ success: boolean; content?: TranslatedContent; error?: string }> {
    const { targetLanguage, preserveFormatting = true, onProgress } = options;

    try {
        // 1. Translate title
        onProgress?.({ phase: 'translating', message: `Translating title to ${targetLanguage}...` });

        const titleResult = await translateText(
            post.title?.rendered || '',
            targetLanguage,
            false // Title doesn't need formatting preservation
        );

        if (!titleResult.success) {
            return {
                success: false,
                error: `Title translation failed: ${titleResult.error}`,
            };
        }

        // 2. Translate content (preserve HTML formatting)
        onProgress?.({ phase: 'translating', message: `Translating content to ${targetLanguage}...` });

        const contentResult = await translateText(
            post.content?.rendered || '',
            targetLanguage,
            preserveFormatting
        );

        if (!contentResult.success) {
            return {
                success: false,
                error: `Content translation failed: ${contentResult.error}`,
            };
        }

        // 3. Translate excerpt if present
        let excerpt = '';
        if (post.excerpt?.rendered) {
            onProgress?.({ phase: 'translating', message: `Translating excerpt to ${targetLanguage}...` });

            const excerptResult = await translateText(
                post.excerpt.rendered,
                targetLanguage,
                false
            );

            excerpt = excerptResult.success ? excerptResult.text! : '';
        }

        // Generate excerpt from content if not available
        if (!excerpt && contentResult.text) {
            excerpt = generateExcerpt(contentResult.text);
        }

        return {
            success: true,
            content: {
                title: titleResult.text!,
                content: contentResult.text!,
                excerpt,
            },
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Translation failed',
        };
    }
}

/**
 * Batch translate multiple posts
 */
export async function translatePosts(
    posts: WPPostResult[],
    options: TranslatePostOptions
): Promise<Array<{ postId: number; success: boolean; content?: TranslatedContent; error?: string }>> {
    const results = [];

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        options.onProgress?.({
            phase: 'batch',
            message: `Translating post ${i + 1}/${posts.length}: ${post.title?.rendered || 'Untitled'}`,
        });

        const result = await translatePost(post, options);
        results.push({
            postId: post.id,
            ...result,
        });
    }

    return results;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate excerpt from content (strip HTML, first 160 chars)
 */
function generateExcerpt(htmlContent: string, maxLength = 160): string {
    // Strip HTML tags
    const text = htmlContent.replace(/<[^>]*>/g, '').trim();

    // Truncate and add ellipsis
    if (text.length <= maxLength) {
        return text;
    }

    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
