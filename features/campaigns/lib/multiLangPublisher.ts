/**
 * Multi-Language Publisher
 * FSD: features/campaigns/lib/multiLangPublisher.ts
 * 
 * Orchestrates content translation and publishing to multiple language versions.
 * Integrates with translation feature and WordPress publishing.
 */

import type { WPSite } from '@/features/wordpress';
import type { Campaign, PipelineContext } from '../model/types';
import { translateArticle, COMMON_LANGUAGES } from '@/features/translation';
import { publishToWordPress } from './wpPublisher';

// ============================================================================
// Types
// ============================================================================

export interface MultiLangConfig {
    /** Languages to translate to */
    targetLanguages: string[];
    /** Skip if translation fails (continue with other languages) */
    skipOnError?: boolean;
    /** Delay between publishing (ms) - avoid rate limits */
    publishDelay?: number;
    /** Custom slug format: 'prefix' = /fr/article, 'suffix' = /article-fr */
    slugFormat?: 'prefix' | 'suffix';
    /** Whether to link translations together */
    linkTranslations?: boolean;
}

export interface MultiLangResult {
    success: boolean;
    originalPostId?: number;
    originalUrl?: string;
    translations: TranslatedPost[];
    errors: string[];
}

export interface TranslatedPost {
    language: string;
    languageName: string;
    postId: number;
    url: string;
    success: boolean;
    error?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_MULTILANG_CONFIG: MultiLangConfig = {
    targetLanguages: [],
    skipOnError: true,
    publishDelay: 1000,
    slugFormat: 'suffix',
    linkTranslations: true,
};

// ============================================================================
// Multi-Language Publisher
// ============================================================================

/**
 * Publish content in multiple languages
 * 
 * Flow:
 * 1. Publish original content
 * 2. For each target language:
 *    a. Translate title and body
 *    b. Generate localized slug
 *    c. Publish to WordPress
 *    d. Link to original (if enabled)
 */
export async function publishMultiLang(
    wpSite: WPSite,
    campaign: Campaign,
    context: PipelineContext,
    config: MultiLangConfig = DEFAULT_MULTILANG_CONFIG
): Promise<MultiLangResult> {
    const result: MultiLangResult = {
        success: false,
        translations: [],
        errors: [],
    };

    // 1. Publish original (source language)
    try {
        const originalResult = await publishToWordPress(wpSite, campaign, context);

        if (!originalResult?.postId) {
            result.errors.push('Failed to publish original content');
            return result;
        }

        result.originalPostId = originalResult.postId;
        result.originalUrl = originalResult.postUrl;

    } catch (error) {
        result.errors.push(`Original publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return result;
    }

    // If no target languages, we're done
    if (!config.targetLanguages.length) {
        result.success = true;
        return result;
    }

    // 2. Translate and publish for each language
    for (const langCode of config.targetLanguages) {
        const langInfo = COMMON_LANGUAGES.find(l => l.code === langCode);
        const langName = langInfo?.name || langCode.toUpperCase();

        try {
            // Translate title
            const titleResult = await translateArticle(
                context.content?.title || '',
                langCode,
                'en' // assuming source is English
            );

            if (!titleResult.success || !titleResult.translatedText) {
                throw new Error(titleResult.error || 'Title translation failed');
            }

            // Translate body
            const bodyResult = await translateArticle(
                context.content?.body || '',
                langCode,
                'en'
            );

            if (!bodyResult.success || !bodyResult.translatedText) {
                throw new Error(bodyResult.error || 'Body translation failed');
            }

            // Generate localized slug
            const originalSlug = context.content?.slug || slugify(context.content?.title || '');
            const localizedSlug = config.slugFormat === 'prefix'
                ? `${langCode}/${originalSlug}`
                : `${originalSlug}-${langCode}`;

            // Create translated context
            const translatedContext: PipelineContext = {
                ...context,
                content: {
                    ...context.content!,
                    title: titleResult.translatedText,
                    body: bodyResult.translatedText,
                    slug: localizedSlug,
                },
            };

            // Add delay to avoid rate limits
            if (config.publishDelay && result.translations.length > 0) {
                await sleep(config.publishDelay);
            }

            // Publish translated version
            const wpResult = await publishToWordPress(wpSite, campaign, translatedContext);

            if (!wpResult?.postId) {
                throw new Error('WordPress publish failed');
            }

            // Add translation linking metadata
            if (config.linkTranslations && result.originalPostId) {
                await addTranslationMeta(wpSite, wpResult.postId, {
                    originalPostId: result.originalPostId,
                    language: langCode,
                });
            }

            result.translations.push({
                language: langCode,
                languageName: langName,
                postId: wpResult.postId,
                url: wpResult.postUrl || '',
                success: true,
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            result.translations.push({
                language: langCode,
                languageName: langName,
                postId: 0,
                url: '',
                success: false,
                error: errorMessage,
            });

            result.errors.push(`${langName}: ${errorMessage}`);

            if (!config.skipOnError) {
                break;
            }
        }
    }

    result.success = result.translations.some(t => t.success) || result.translations.length === 0;
    return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add translation metadata to post
 * This helps translation plugins (like WPML, Polylang) track relationships
 */
async function addTranslationMeta(
    wpSite: WPSite,
    postId: number,
    meta: { originalPostId: number; language: string }
): Promise<void> {
    try {
        const auth = Buffer.from(`${wpSite.username}:${wpSite.appPassword}`).toString('base64');

        await fetch(`${wpSite.url}/wp-json/wp/v2/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
            },
            body: JSON.stringify({
                meta: {
                    _ifrit_original_post_id: meta.originalPostId,
                    _ifrit_language: meta.language,
                    _ifrit_translation_group: meta.originalPostId, // Group ID for translations
                },
            }),
        });
    } catch (error) {
        console.warn(`[MultiLang] Failed to add translation meta: ${error}`);
    }
}

/**
 * Simple slugify function
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 75);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Language Selector Utilities
// ============================================================================

/**
 * Get popular target languages for campaigns
 */
export function getPopularTargetLanguages() {
    return [
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'de', name: 'German', flag: '🇩🇪' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
        { code: 'it', name: 'Italian', flag: '🇮🇹' },
        { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
        { code: 'ko', name: 'Korean', flag: '🇰🇷' },
        { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
        { code: 'ru', name: 'Russian', flag: '🇷🇺' },
        { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    ];
}

/**
 * Get all supported languages with DeepL/Google availability
 */
export function getAllSupportedLanguages() {
    return COMMON_LANGUAGES.map(lang => ({
        code: lang.code,
        name: lang.name,
        hasDeepL: lang.deeplCode !== null,
        hasGoogle: lang.googleCode !== null,
    }));
}
