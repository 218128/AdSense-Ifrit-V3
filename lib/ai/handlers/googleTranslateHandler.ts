/**
 * Google Translate Handler
 * FSD: lib/ai/handlers/googleTranslateHandler.ts
 * 
 * Implements the 'translate' capability using Google Cloud Translation API.
 * Cost-effective translation with broad language support.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Constants
// ============================================================================

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const STORAGE_KEY = 'ifrit_google_translate_api_key';

// Common language codes
export const GOOGLE_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'pl', name: 'Polish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'tr', name: 'Turkish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'id', name: 'Indonesian' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'el', name: 'Greek' },
    { code: 'cs', name: 'Czech' },
    { code: 'ro', name: 'Romanian' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'he', name: 'Hebrew' },
] as const;

// ============================================================================
// Types
// ============================================================================

interface GoogleTranslateResponse {
    data: {
        translations: Array<{
            translatedText: string;
            detectedSourceLanguage?: string;
        }>;
    };
}

// ============================================================================
// Handler Definition
// ============================================================================

export const googleTranslateHandler: CapabilityHandler = {
    id: 'google-translate',
    name: 'Google Translate',
    source: 'integration',
    capabilities: ['translate'],
    priority: 60, // Lower priority than DeepL
    isAvailable: typeof window !== 'undefined' && !!getApiKey(),
    requiresApiKey: true,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const { prompt, context } = options;
        const startTime = Date.now();

        const apiKey = getApiKey();
        if (!apiKey) {
            return {
                success: false,
                error: 'Google Translate API key not configured. Add it in Settings > Automation.',
                handlerUsed: 'google-translate',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Parse translation request
        const text = context?.text as string || prompt;
        const targetLang = (context?.targetLanguage as string || 'en').toLowerCase();
        const sourceLang = context?.sourceLanguage as string | undefined;
        const format = context?.format as 'text' | 'html' || 'text';

        try {
            const url = new URL(GOOGLE_TRANSLATE_URL);
            url.searchParams.set('key', apiKey);

            const body: Record<string, unknown> = {
                q: text,
                target: targetLang,
                format,
            };

            if (sourceLang) {
                body.source = sourceLang.toLowerCase();
            }

            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.error?.message || response.statusText;
                return {
                    success: false,
                    error: `Google Translate API error: ${errorMessage}`,
                    handlerUsed: 'google-translate',
                    source: 'integration',
                    latencyMs: Date.now() - startTime,
                };
            }

            const data = await response.json() as GoogleTranslateResponse;
            const translation = data.data.translations[0];

            return {
                success: true,
                text: translation.translatedText,
                handlerUsed: 'google-translate',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Translation failed',
                handlerUsed: 'google-translate',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
}

/**
 * Set Google Translate API key
 */
export function setGoogleTranslateApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, key);
}

/**
 * Check if Google Translate is configured
 */
export function isGoogleTranslateConfigured(): boolean {
    return !!getApiKey();
}

/**
 * Get supported languages
 */
export function getGoogleLanguages() {
    return GOOGLE_LANGUAGES;
}

export default googleTranslateHandler;
