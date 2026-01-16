/**
 * ConfigProvider - Isomorphic Configuration Interface
 * 
 * Abstracts the source of configuration (browser localStorage vs server env).
 * This allows the Engine to run identically on client and server.
 * 
 * @module core/ConfigProvider
 */

import type { ProviderId } from '@/lib/ai/types/providers';

// ============================================
// TYPES
// ============================================

export interface StoredKey {
    key: string;
    addedAt: number;
    lastUsed?: number;
    isValid?: boolean;
    label?: string;
}

export interface CapabilitySettings {
    isEnabled: boolean;
    defaultHandlerId?: string;
    fallbackHandlerIds?: string[];
}

/**
 * Configuration Provider Interface
 * 
 * Implementations:
 * - BrowserConfigProvider: Reads from Zustand settingsStore
 * - ServerConfigProvider: Reads from process.env or external source
 */
export interface ConfigProvider {
    /**
     * Get all API keys for a provider
     */
    getProviderKeys(providerId: ProviderId): StoredKey[];

    /**
     * Get the first available key for a provider
     */
    getFirstKey(providerId: ProviderId): string | undefined;

    /**
     * Get settings for a specific capability
     */
    getCapabilitySettings(capabilityId: string): CapabilitySettings | undefined;

    /**
     * Get list of enabled provider IDs
     */
    getEnabledProviders(): ProviderId[];

    /**
     * Check if a provider has at least one valid key
     */
    hasValidKey(providerId: ProviderId): boolean;
}

// ============================================
// BROWSER CONFIG PROVIDER
// ============================================

/**
 * Browser-side configuration provider.
 * Reads from Zustand settingsStore (localStorage-backed).
 */
export class BrowserConfigProvider implements ConfigProvider {
    private getStore() {
        if (typeof window === 'undefined') {
            throw new Error('BrowserConfigProvider cannot be used on the server');
        }
        // Dynamic import to avoid SSR issues
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useSettingsStore } = require('@/stores/settingsStore');
        return useSettingsStore.getState();
    }

    getProviderKeys(providerId: ProviderId): StoredKey[] {
        const store = this.getStore();
        return store.providerKeys[providerId] || [];
    }

    getFirstKey(providerId: ProviderId): string | undefined {
        const keys = this.getProviderKeys(providerId);
        const validKey = keys.find(k => k.isValid !== false);
        return validKey?.key;
    }

    getCapabilitySettings(capabilityId: string): CapabilitySettings | undefined {
        const store = this.getStore();
        return store.capabilitiesConfig?.capabilitySettings?.[capabilityId];
    }

    getEnabledProviders(): ProviderId[] {
        const store = this.getStore();
        return store.enabledProviders || [];
    }

    hasValidKey(providerId: ProviderId): boolean {
        const keys = this.getProviderKeys(providerId);
        return keys.some(k => k.isValid !== false && k.key);
    }
}

// ============================================
// SERVER CONFIG PROVIDER
// ============================================

/**
 * Server-side configuration provider.
 * Reads from request context or environment variables.
 * 
 * Usage: Pass keys directly from API request body or headers.
 */
export class ServerConfigProvider implements ConfigProvider {
    private keys: Map<ProviderId, StoredKey[]> = new Map();
    private enabledProviders: ProviderId[] = [];

    /**
     * Create a server config provider with explicit keys.
     * 
     * @param providerKeys - Map of provider ID to API keys
     */
    constructor(providerKeys?: Record<string, string | string[]>) {
        if (providerKeys) {
            for (const [providerId, keyOrKeys] of Object.entries(providerKeys)) {
                const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
                this.keys.set(providerId as ProviderId, keys.map(k => ({
                    key: k,
                    addedAt: Date.now(),
                    isValid: true
                })));
                if (keys.length > 0) {
                    this.enabledProviders.push(providerId as ProviderId);
                }
            }
        }
    }

    getProviderKeys(providerId: ProviderId): StoredKey[] {
        return this.keys.get(providerId) || [];
    }

    getFirstKey(providerId: ProviderId): string | undefined {
        const keys = this.getProviderKeys(providerId);
        return keys[0]?.key;
    }

    getCapabilitySettings(): CapabilitySettings | undefined {
        // Server-side uses defaults; all capabilities enabled
        return { isEnabled: true };
    }

    getEnabledProviders(): ProviderId[] {
        return this.enabledProviders;
    }

    hasValidKey(providerId: ProviderId): boolean {
        const keys = this.getProviderKeys(providerId);
        return keys.length > 0 && Boolean(keys[0]?.key);
    }

    /**
     * Add a key at runtime (useful for request-scoped configuration)
     */
    addKey(providerId: ProviderId, key: string): void {
        const existing = this.keys.get(providerId) || [];
        existing.push({ key, addedAt: Date.now(), isValid: true });
        this.keys.set(providerId, existing);
        if (!this.enabledProviders.includes(providerId)) {
            this.enabledProviders.push(providerId);
        }
    }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create the appropriate config provider based on environment.
 * 
 * @param serverKeys - Optional keys for server-side execution
 */
export function createConfigProvider(
    serverKeys?: Record<string, string | string[]>
): ConfigProvider {
    if (typeof window === 'undefined') {
        // Server-side: use explicit keys
        return new ServerConfigProvider(serverKeys);
    }
    // Browser-side: use settingsStore
    return new BrowserConfigProvider();
}
