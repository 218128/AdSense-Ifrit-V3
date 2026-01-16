/**
 * Capability Key Utility
 * 
 * Provides a standardized way to retrieve API keys on the CLIENT side
 * for passing to server routes that need AI capabilities.
 * 
 * ARCHITECTURE PATTERN:
 * - Keys are stored in client localStorage via settingsStore
 * - Server routes CANNOT access client localStorage
 * - Client must retrieve key and pass in request body
 * - Server passes key to executor via context.apiKey
 * 
 * USAGE:
 * ```typescript
 * // In infrastructure API (client-side)
 * const apiKey = await getCapabilityKey();
 * fetch('/api/some-route', {
 *     body: JSON.stringify({ ...data, apiKey })
 * });
 * ```
 */

import type { ProviderId } from '@/lib/keys';
import { TEXT_PROVIDER_IDS } from '../types/providers';

// Fallback priority if AIServices not initialized (should match handler priorities)
// Order: gemini(80), perplexity(75), deepseek(70), openrouter(60)
const FALLBACK_PRIORITY: ProviderId[] = ['gemini', 'perplexity', 'deepseek', 'openrouter'];

/**
 * Get provider priority order from AIServices handlers.
 * Falls back to static order if AIServices not available.
 */
async function getProviderPriority(): Promise<ProviderId[]> {
    try {
        const { aiServices } = await import('../services');
        const handlers = aiServices.getHandlers();

        // Filter to AI provider handlers and sort by priority (descending)
        const aiProviders = handlers
            .filter(h => h.source === 'ai-provider' && (TEXT_PROVIDER_IDS as readonly string[]).includes(h.providerId ?? ''))
            .sort((a, b) => b.priority - a.priority)
            .map(h => h.providerId as ProviderId);

        // Use handler order if available, otherwise fallback
        return aiProviders.length > 0 ? aiProviders : FALLBACK_PRIORITY;
    } catch {
        return FALLBACK_PRIORITY;
    }
}

/**
 * Get an API key for AI capabilities from the client-side keyManager.
 * Tries providers in priority order and returns the first available key.
 * 
 * @returns API key string or undefined if no keys configured
 */
export async function getCapabilityKey(): Promise<string | undefined> {
    // Only works on client side
    if (typeof window === 'undefined') {
        console.warn('[getCapabilityKey] Called on server - keys must be passed from client');
        return undefined;
    }

    try {
        const { keyManager } = await import('@/lib/keys');
        const providerPriority = await getProviderPriority();

        for (const provider of providerPriority) {
            const key = keyManager.getKey(provider);
            if (key?.key) {
                return key.key;
            }
        }
    } catch (error) {
        console.warn('[getCapabilityKey] KeyManager not available:', error);
    }

    return undefined;
}

/**
 * Get ALL provider keys as a map.
 * Used to pass all keys from client to server so each handler gets its own key.
 * 
 * @returns Record of providerId -> apiKey
 */
export async function getAllProviderKeys(): Promise<Record<string, string>> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const { keyManager } = await import('@/lib/keys');
        const providers: ProviderId[] = ['gemini', 'perplexity', 'deepseek', 'openrouter', 'vercel'];
        const result: Record<string, string> = {};

        for (const provider of providers) {
            const key = keyManager.getKey(provider);
            if (key?.key) {
                result[provider] = key.key;
            }
        }

        return result;
    } catch {
        return {};
    }
}

/**
 * Get API key for a specific provider.
 * 
 * @param provider - The provider ID to get key for
 * @returns API key string or undefined
 */
export async function getProviderKey(provider: ProviderId): Promise<string | undefined> {
    if (typeof window === 'undefined') {
        return undefined;
    }

    try {
        const { keyManager } = await import('@/lib/keys');
        const key = keyManager.getKey(provider);
        return key?.key;
    } catch {
        return undefined;
    }
}

/**
 * Get ALL integration keys (Unsplash, Pexels, etc.)
 * Used to pass integration keys from client to server for image search handlers.
 * 
 * @returns Record of keyName -> apiKey
 */
export async function getAllIntegrationKeys(): Promise<Record<string, string>> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const { useSettingsStore } = await import('@/stores/settingsStore');
        const { keyManager } = await import('@/lib/keys');
        const integrations = useSettingsStore.getState().integrations;
        const result: Record<string, string> = {};

        // Collect all integration keys that are configured
        if (integrations.unsplashKey) result.unsplashKey = integrations.unsplashKey;
        if (integrations.pexelsKey) result.pexelsKey = integrations.pexelsKey;
        if (integrations.braveApiKey) result.braveApiKey = integrations.braveApiKey;

        // Add Perplexity key from keyManager (for perplexity-images handler)
        const perplexityKey = keyManager.getKey('perplexity');
        if (perplexityKey?.key) result.perplexityApiKey = perplexityKey.key;

        return result;
    } catch {
        return {};
    }
}
