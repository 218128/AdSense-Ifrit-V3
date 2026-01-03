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

// Provider priority order for key retrieval
const PROVIDER_PRIORITY: ProviderId[] = ['gemini', 'perplexity', 'deepseek', 'openrouter'];

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

        for (const provider of PROVIDER_PRIORITY) {
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
