/**
 * User configuration utilities
 * 
 * AdSense Ifrit is a localhost tool where users provide their own API keys.
 * This module provides server-side access to configuration that's passed
 * from the client (originally stored in localStorage).
 */

export interface UserConfig {
    geminiApiKey: string;
    googleApiKey?: string;
    blogUrl?: string;
    adsensePublisherId?: string;
    adsenseLeaderboardSlot?: string;
    adsenseArticleSlot?: string;
    adsenseMultiplexSlot?: string;
}

/**
 * Validates that required user configuration is present
 */
export function validateUserConfig(config: Partial<UserConfig>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!config.geminiApiKey) {
        missing.push('Gemini API Key');
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}

/**
 * Optional: Environment variable fallbacks for development/testing
 * In production use, users always provide their own keys via the UI.
 */
export const devFallbacks = {
    geminiApiKey: process.env.GEMINI_API_KEY,
};
