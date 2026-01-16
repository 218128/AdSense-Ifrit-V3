/**
 * Translation Service
 * FSD: features/translation/index.ts
 * 
 * Unified translation API with multi-provider support.
 * Uses aiServices for handler selection and fallback.
 * 
 * MIGRATION: Uses lib/ai/client which wraps aiServices. Engine accessible via @/lib/core.
 */

// Re-export handlers
export {
    deeplHandler,
    setDeepLApiKey,
    isDeepLConfigured,
    getDeepLLanguages,
    DEEPL_LANGUAGES,
} from '@/lib/ai/handlers/deeplHandler';

export {
    googleTranslateHandler,
    setGoogleTranslateApiKey,
    isGoogleTranslateConfigured,
    getGoogleLanguages,
    GOOGLE_LANGUAGES,
} from '@/lib/ai/handlers/googleTranslateHandler';

// ============================================================================
// Types
// ============================================================================

export interface TranslationRequest {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
    preserveFormatting?: boolean;
    format?: 'text' | 'html';
}

export interface TranslationResult {
    success: boolean;
    translatedText?: string;
    detectedLanguage?: string;
    provider: 'deepl' | 'google' | 'unknown';
    error?: string;
}

// ============================================================================
// Language Utilities
// ============================================================================

export const COMMON_LANGUAGES = [
    { code: 'en', name: 'English', deeplCode: 'EN-US', googleCode: 'en' },
    { code: 'es', name: 'Spanish', deeplCode: 'ES', googleCode: 'es' },
    { code: 'fr', name: 'French', deeplCode: 'FR', googleCode: 'fr' },
    { code: 'de', name: 'German', deeplCode: 'DE', googleCode: 'de' },
    { code: 'it', name: 'Italian', deeplCode: 'IT', googleCode: 'it' },
    { code: 'pt', name: 'Portuguese', deeplCode: 'PT-PT', googleCode: 'pt' },
    { code: 'pt-br', name: 'Portuguese (Brazil)', deeplCode: 'PT-BR', googleCode: 'pt' },
    { code: 'ru', name: 'Russian', deeplCode: 'RU', googleCode: 'ru' },
    { code: 'ja', name: 'Japanese', deeplCode: 'JA', googleCode: 'ja' },
    { code: 'ko', name: 'Korean', deeplCode: 'KO', googleCode: 'ko' },
    { code: 'zh', name: 'Chinese (Simplified)', deeplCode: 'ZH', googleCode: 'zh' },
    { code: 'ar', name: 'Arabic', deeplCode: null, googleCode: 'ar' }, // No DeepL
    { code: 'hi', name: 'Hindi', deeplCode: null, googleCode: 'hi' }, // No DeepL
    { code: 'pl', name: 'Polish', deeplCode: 'PL', googleCode: 'pl' },
    { code: 'nl', name: 'Dutch', deeplCode: 'NL', googleCode: 'nl' },
    { code: 'tr', name: 'Turkish', deeplCode: 'TR', googleCode: 'tr' },
    { code: 'uk', name: 'Ukrainian', deeplCode: 'UK', googleCode: 'uk' },
] as const;

/**
 * Get language by code
 */
export function getLanguageByCode(code: string) {
    return COMMON_LANGUAGES.find(
        l => l.code === code.toLowerCase() ||
            l.deeplCode?.toLowerCase() === code.toLowerCase() ||
            l.googleCode?.toLowerCase() === code.toLowerCase()
    );
}

/**
 * Check if DeepL supports a language
 */
export function isDeepLSupported(langCode: string): boolean {
    const lang = getLanguageByCode(langCode);
    return lang?.deeplCode !== null && lang?.deeplCode !== undefined;
}

// ============================================================================
// High-Level Translation API
// ============================================================================

/**
 * Translate text using best available provider
 * Uses unified AIClient pattern
 */
export async function translateText(
    request: TranslationRequest
): Promise<TranslationResult> {
    try {
        // Dynamic import ai client to avoid circular deps
        const { ai } = await import('@/lib/ai/client');

        const result = await ai.translate(request.text, {
            targetLanguage: request.targetLanguage,
            sourceLanguage: request.sourceLanguage,
        });

        if (result.success && result.text) {
            return {
                success: true,
                translatedText: result.text,
                provider: result.handlerUsed.includes('deepl') ? 'deepl' : 'google',
            };
        }

        return {
            success: false,
            error: result.error || 'Translation failed',
            provider: 'unknown',
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Translation failed',
            provider: 'unknown',
        };
    }
}

/**
 * Translate article content (preserves structure)
 */
export async function translateArticle(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
): Promise<TranslationResult> {
    // Detect if content is HTML or Markdown
    const isHtml = /<[^>]+>/.test(content);

    return translateText({
        text: content,
        targetLanguage,
        sourceLanguage,
        preserveFormatting: true,
        format: isHtml ? 'html' : 'text',
    });
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
): Promise<TranslationResult[]> {
    // Translate in parallel with concurrency limit
    const results: TranslationResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(text => translateText({
                text,
                targetLanguage,
                sourceLanguage,
            }))
        );
        results.push(...batchResults);
    }

    return results;
}
