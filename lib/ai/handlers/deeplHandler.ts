/**
 * DeepL Translation Handler
 * FSD: lib/ai/handlers/deeplHandler.ts
 * 
 * Implements the 'translate' capability using DeepL API.
 * High-quality neural machine translation.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Constants
// ============================================================================

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_PRO_URL = 'https://api.deepl.com/v2/translate';
const STORAGE_KEY = 'ifrit_deepl_api_key';

// Supported languages
export const DEEPL_LANGUAGES = {
    source: [
        'BG', 'CS', 'DA', 'DE', 'EL', 'EN', 'ES', 'ET', 'FI', 'FR',
        'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL',
        'PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TR', 'UK', 'ZH',
    ],
    target: [
        'BG', 'CS', 'DA', 'DE', 'EL', 'EN-GB', 'EN-US', 'ES', 'ET', 'FI',
        'FR', 'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL',
        'PL', 'PT-BR', 'PT-PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TR', 'UK', 'ZH',
    ],
} as const;

// ============================================================================
// Types
// ============================================================================

interface DeepLResponse {
    translations: Array<{
        detected_source_language: string;
        text: string;
    }>;
}

// ============================================================================
// Handler Definition
// ============================================================================

export const deeplHandler: CapabilityHandler = {
    id: 'deepl-translate',
    name: 'DeepL Translation',
    source: 'integration',
    capabilities: ['translate'],
    priority: 80, // High priority - premium translation
    isAvailable: typeof window !== 'undefined' && !!getApiKey(),
    requiresApiKey: true,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const { prompt, context } = options;
        const startTime = Date.now();

        const apiKey = getApiKey();
        if (!apiKey) {
            return {
                success: false,
                error: 'DeepL API key not configured. Add it in Settings > Automation.',
                handlerUsed: 'deepl-translate',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        // Parse translation request
        const text = context?.text as string || prompt;
        const targetLang = (context?.targetLanguage as string || 'EN-US').toUpperCase();
        const sourceLang = context?.sourceLanguage as string | undefined;
        const preserveFormatting = context?.preserveFormatting !== false;

        try {
            const isPro = apiKey.endsWith(':fx') === false && apiKey.length > 30;
            const apiUrl = isPro ? DEEPL_PRO_URL : DEEPL_API_URL;

            const params = new URLSearchParams({
                text,
                target_lang: targetLang,
                ...(sourceLang && { source_lang: sourceLang.toUpperCase() }),
                ...(preserveFormatting && { preserve_formatting: '1' }),
            });

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `DeepL API error: ${response.status} - ${errorText}`,
                    handlerUsed: 'deepl-translate',
                    source: 'integration',
                    latencyMs: Date.now() - startTime,
                };
            }

            const data = await response.json() as DeepLResponse;
            const translation = data.translations[0];

            return {
                success: true,
                text: translation.text,
                handlerUsed: 'deepl-translate',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Translation failed',
                handlerUsed: 'deepl-translate',
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
 * Set DeepL API key
 */
export function setDeepLApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, key);
}

/**
 * Check if DeepL is configured
 */
export function isDeepLConfigured(): boolean {
    return !!getApiKey();
}

/**
 * Get supported languages
 */
export function getDeepLLanguages() {
    return DEEPL_LANGUAGES;
}

export default deeplHandler;
