/**
 * KeyManager - Unified Key Management
 * 
 * Central hub for API key validation, rotation, and health monitoring.
 * Integrates with settingsStore as the single source of truth.
 * 
 * Architecture:
 * - Extracts and enhances existing validation from multiProvider.ts
 * - Extracts and enhances existing rotation from contentGenerator.ts
 * - Integrates with healthMonitor.ts for health checks
 * - Uses settingsStore for all key storage
 * 
 * Design (per implementation_plan.md):
 * - NO cache checks
 * - NO usage tracking
 * - NO rate limiting
 */

import { useSettingsStore, type ProviderId, type StoredKey } from '@/stores/settingsStore';
import { checkProviderHealth, type ServiceHealth } from '@/lib/config/healthMonitor';
import { isValidApiKeyFormat } from '@/lib/config/schemas';

// ============ TYPES ============

export interface ValidatedKey {
    key: string;
    provider: ProviderId;
    validated: boolean;
    validatedAt?: number;
    label?: string;
}

export interface ValidationResult {
    valid: boolean;
    provider: ProviderId;
    models?: string[];
    error?: string;
    responseTime?: number;
}

export interface RotationStatus {
    currentIndex: number;
    total: number;
    provider: ProviderId;
}

export interface KeyManagerConfig {
    autoRotate: boolean;
    validateOnAdd: boolean;
}

// ============ ROTATION STATE ============

// Track current key index per provider for rotation
const rotationState: Record<ProviderId, number> = {
    gemini: 0,
    deepseek: 0,
    openrouter: 0,
    vercel: 0,
    perplexity: 0,
};

// ============ KEY MANAGER CLASS ============

/**
 * KeyManager - Unified key access with rotation and validation
 * 
 * Uses settingsStore as single source of truth.
 * Provides rotation logic extracted from contentGenerator.ts.
 * Provides validation logic extracted from multiProvider.ts.
 */
export class KeyManager {
    private config: KeyManagerConfig;

    constructor(config: Partial<KeyManagerConfig> = {}) {
        this.config = {
            autoRotate: true,
            validateOnAdd: true,
            ...config,
        };
    }

    // ============ KEY ACCESS ============

    /**
     * Get the current active key for a provider with rotation
     * Extracted from contentGenerator.ts rotation pattern
     */
    getKey(provider: ProviderId): ValidatedKey | null {
        const state = useSettingsStore.getState();
        const keys = state.providerKeys[provider] || [];
        const isEnabled = state.enabledProviders.includes(provider);

        if (!isEnabled || keys.length === 0) {
            return null;
        }

        // Get current rotation index
        const currentIndex = rotationState[provider] % keys.length;
        const key = keys[currentIndex];

        return {
            key: key.key,
            provider,
            validated: key.validated || false,
            validatedAt: key.validatedAt,
            label: key.label,
        };
    }

    /**
     * Get all keys for a provider (for batch operations)
     */
    getAllKeys(provider: ProviderId): ValidatedKey[] {
        const state = useSettingsStore.getState();
        const keys = state.providerKeys[provider] || [];

        return keys.map(k => ({
            key: k.key,
            provider,
            validated: k.validated || false,
            validatedAt: k.validatedAt,
            label: k.label,
        }));
    }

    /**
     * Get keys formatted for API calls (string arrays per provider)
     * Matches the format expected by contentGenerator.ts
     */
    getProviderKeysForApi(): Record<ProviderId, string[]> {
        const state = useSettingsStore.getState();
        const result: Record<ProviderId, string[]> = {
            gemini: [],
            deepseek: [],
            openrouter: [],
            vercel: [],
            perplexity: [],
        };

        for (const provider of Object.keys(result) as ProviderId[]) {
            const isEnabled = state.enabledProviders.includes(provider);
            const keys = state.providerKeys[provider] || [];

            if (isEnabled && keys.length > 0) {
                result[provider] = keys.map(k => k.key);
            }
        }

        return result;
    }

    // ============ ROTATION ============

    /**
     * Rotate to next key for a provider
     * Extracted from contentGenerator.ts try-each-key pattern
     */
    rotateKey(provider: ProviderId): ValidatedKey | null {
        const state = useSettingsStore.getState();
        const keys = state.providerKeys[provider] || [];

        if (keys.length === 0) {
            return null;
        }

        // Move to next key
        rotationState[provider] = (rotationState[provider] + 1) % keys.length;

        return this.getKey(provider);
    }

    /**
     * Get rotation status for a provider
     */
    getRotationStatus(provider: ProviderId): RotationStatus {
        const state = useSettingsStore.getState();
        const keys = state.providerKeys[provider] || [];

        return {
            currentIndex: rotationState[provider] % Math.max(keys.length, 1),
            total: keys.length,
            provider,
        };
    }

    /**
     * Reset rotation to first key
     */
    resetRotation(provider: ProviderId): void {
        rotationState[provider] = 0;
    }

    // ============ VALIDATION ============

    /**
     * Validate a key before storage
     * Enhanced version of multiProvider.validateKey()
     */
    async validateKey(provider: ProviderId, apiKey: string): Promise<ValidationResult> {
        // Quick format check first
        if (!isValidApiKeyFormat(apiKey)) {
            return {
                valid: false,
                provider,
                error: 'Invalid key format (too short or contains whitespace)',
            };
        }

        const start = Date.now();

        try {
            // Use the existing API endpoint that multiProvider.ts uses
            const response = await fetch('/api/ai-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'validate',
                    provider,
                    apiKey,
                }),
            });

            const data = await response.json();
            const responseTime = Date.now() - start;

            return {
                valid: data.valid === true,
                provider,
                models: data.models?.map((m: { id: string }) => m.id) || [],
                error: data.error,
                responseTime,
            };
        } catch (error) {
            return {
                valid: false,
                provider,
                error: error instanceof Error ? error.message : 'Network error',
                responseTime: Date.now() - start,
            };
        }
    }

    /**
     * Add a key with optional validation
     * Wrapper around settingsStore.addProviderKey with enhanced validation
     */
    async addKey(
        provider: ProviderId,
        key: string,
        label?: string,
        skipValidation = false
    ): Promise<{ success: boolean; error?: string; validationResult?: ValidationResult }> {
        // Validate if configured and not skipped
        if (this.config.validateOnAdd && !skipValidation) {
            const validation = await this.validateKey(provider, key);

            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error || 'Key validation failed',
                    validationResult: validation,
                };
            }
        }

        // Add to store
        const state = useSettingsStore.getState();

        state.addProviderKey(provider, {
            key,
            label,
            validated: !skipValidation,
            validatedAt: skipValidation ? undefined : Date.now(),
        });

        return { success: true };
    }

    /**
     * Remove a key from storage
     */
    removeKey(provider: ProviderId, key: string): void {
        const state = useSettingsStore.getState();
        state.removeProviderKey(provider, key);
    }

    // ============ HEALTH MONITORING ============

    /**
     * Check health of a specific provider
     * Uses healthMonitor.ts checkProviderHealth
     */
    async checkHealth(provider: ProviderId): Promise<ServiceHealth> {
        const key = this.getKey(provider);

        if (!key) {
            return {
                status: 'unconfigured',
                lastCheck: Date.now(),
                message: 'No API key configured',
            };
        }

        return checkProviderHealth(provider, key.key);
    }

    /**
     * Check health of all enabled providers
     */
    async checkAllHealth(): Promise<Record<ProviderId, ServiceHealth>> {
        const state = useSettingsStore.getState();
        const results: Partial<Record<ProviderId, ServiceHealth>> = {};

        for (const provider of state.enabledProviders) {
            results[provider] = await this.checkHealth(provider);
        }

        // Fill in unconfigured for disabled providers
        const allProviders: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
        for (const provider of allProviders) {
            if (!results[provider]) {
                results[provider] = {
                    status: 'unconfigured',
                    lastCheck: Date.now(),
                    message: 'Provider not enabled',
                };
            }
        }

        return results as Record<ProviderId, ServiceHealth>;
    }

    // ============ UTILITY ============

    /**
     * Check if any keys are available for generation
     */
    hasAnyKeys(): boolean {
        const state = useSettingsStore.getState();

        for (const provider of state.enabledProviders) {
            const keys = state.providerKeys[provider] || [];
            if (keys.length > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get summary of key configuration
     */
    getSummary(): Record<ProviderId, { enabled: boolean; keyCount: number; validated: number }> {
        const state = useSettingsStore.getState();
        const allProviders: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];

        const result: Record<ProviderId, { enabled: boolean; keyCount: number; validated: number }> = {} as any;

        for (const provider of allProviders) {
            const keys = state.providerKeys[provider] || [];
            result[provider] = {
                enabled: state.enabledProviders.includes(provider),
                keyCount: keys.length,
                validated: keys.filter(k => k.validated).length,
            };
        }

        return result;
    }
}

// ============ SINGLETON INSTANCE ============

/**
 * Default KeyManager instance
 * Use this in components for consistent behavior
 */
export const keyManager = new KeyManager();

// ============ HOOK FOR REACT COMPONENTS ============

/**
 * Hook to get KeyManager with React state updates
 * Re-renders when providerKeys or enabledProviders change
 */
export function useKeyManager() {
    // Subscribe to relevant store state
    const providerKeys = useSettingsStore(state => state.providerKeys);
    const enabledProviders = useSettingsStore(state => state.enabledProviders);

    // Return the singleton with current state available
    return {
        keyManager,
        providerKeys,
        enabledProviders,
        // Convenience methods that use current state
        getKey: (provider: ProviderId) => keyManager.getKey(provider),
        getAllKeys: (provider: ProviderId) => keyManager.getAllKeys(provider),
        rotateKey: (provider: ProviderId) => keyManager.rotateKey(provider),
        hasAnyKeys: () => keyManager.hasAnyKeys(),
        getSummary: () => keyManager.getSummary(),
    };
}

// ============ EXPORT TYPES ============

export type { ProviderId, StoredKey };
