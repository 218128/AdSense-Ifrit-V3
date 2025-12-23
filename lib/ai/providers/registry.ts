/**
 * Provider Registry
 * 
 * Manages state for all AI providers:
 * - API keys (validated or not)
 * - Selected models
 * - Enabled/disabled status
 * 
 * Only providers with valid key + selected model can be enabled.
 */

import {
    ProviderId,
    ProviderState,
    ModelInfo,
    ProviderAdapter
} from './base';

import { geminiProvider } from './gemini';
import { deepseekProvider } from './deepseek';
import { openrouterProvider } from './openrouter';
import { perplexityProvider } from './perplexity';
import { vercelGatewayProvider } from './vercel';

// ============================================
// PROVIDER INSTANCES
// ============================================

/**
 * All available provider adapters
 */
export const PROVIDER_ADAPTERS: Record<ProviderId, ProviderAdapter> = {
    gemini: geminiProvider,
    deepseek: deepseekProvider,
    openrouter: openrouterProvider,
    perplexity: perplexityProvider,
    vercel: vercelGatewayProvider
};

// ============================================
// REGISTRY CLASS
// ============================================

/**
 * Provider Registry - manages state for all providers
 */
export class ProviderRegistry {
    private states: Map<ProviderId, ProviderState> = new Map();
    private providerOrder: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];

    constructor() {
        // Initialize states for all providers
        for (const id of Object.keys(PROVIDER_ADAPTERS) as ProviderId[]) {
            this.states.set(id, {
                providerId: id,
                enabled: false,
                keyValidated: false,
                availableModels: []
            });
        }
    }

    /**
     * Get provider adapter
     */
    getAdapter(providerId: ProviderId): ProviderAdapter {
        return PROVIDER_ADAPTERS[providerId];
    }

    /**
     * Get state for a provider
     */
    getState(providerId: ProviderId): ProviderState | undefined {
        return this.states.get(providerId);
    }

    /**
     * Get all provider states
     */
    getAllStates(): ProviderState[] {
        return Array.from(this.states.values());
    }

    /**
     * Set API key for a provider (does not validate)
     */
    setApiKey(providerId: ProviderId, apiKey: string): void {
        const state = this.states.get(providerId);
        if (state) {
            state.apiKey = apiKey;
            state.keyValidated = false; // Key changed, needs re-validation
            state.availableModels = [];
            state.selectedModel = undefined;
        }
    }

    /**
     * Test and validate API key for a provider
     * Returns real models from API
     */
    async testKey(providerId: ProviderId, apiKey: string): Promise<{
        valid: boolean;
        models: ModelInfo[];
        error?: string;
        responseTimeMs?: number;
    }> {
        const adapter = this.getAdapter(providerId);
        const result = await adapter.testKey(apiKey);

        const state = this.states.get(providerId);
        if (state) {
            state.apiKey = apiKey;
            state.keyValidated = result.valid;
            state.availableModels = result.models;
            state.lastValidated = Date.now();

            // Auto-select first model if none selected
            if (result.valid && result.models.length > 0 && !state.selectedModel) {
                state.selectedModel = result.models[0].id;
            }
        }

        return result;
    }

    /**
     * Select default model for a provider
     */
    selectModel(providerId: ProviderId, modelId: string): void {
        const state = this.states.get(providerId);
        if (state && state.availableModels.some(m => m.id === modelId)) {
            state.selectedModel = modelId;
        }
    }

    /**
     * Enable/disable a provider
     * Can only enable if key is validated and model is selected
     */
    setEnabled(providerId: ProviderId, enabled: boolean): boolean {
        const state = this.states.get(providerId);
        if (!state) return false;

        if (enabled) {
            // Check requirements
            if (!state.keyValidated) {
                console.warn(`Cannot enable ${providerId}: key not validated`);
                return false;
            }
            if (!state.selectedModel) {
                console.warn(`Cannot enable ${providerId}: no model selected`);
                return false;
            }
            state.enabled = true;
            return true;
        } else {
            state.enabled = false;
            return true;
        }
    }

    /**
     * Get enabled providers in priority order
     */
    getEnabledProviders(): { providerId: ProviderId; apiKey: string; model: string }[] {
        const enabled: { providerId: ProviderId; apiKey: string; model: string }[] = [];

        for (const id of this.providerOrder) {
            const state = this.states.get(id);
            if (state?.enabled && state.apiKey && state.selectedModel) {
                enabled.push({
                    providerId: id,
                    apiKey: state.apiKey,
                    model: state.selectedModel
                });
            }
        }

        return enabled;
    }

    /**
     * Set provider priority order
     */
    setProviderOrder(order: ProviderId[]): void {
        this.providerOrder = order;
    }

    /**
     * Get provider order
     */
    getProviderOrder(): ProviderId[] {
        return this.providerOrder;
    }

    /**
     * Export registry state for storage
     */
    export(): Record<ProviderId, {
        apiKey?: string;
        selectedModel?: string;
        enabled: boolean;
    }> {
        const result: Record<ProviderId, {
            apiKey?: string;
            selectedModel?: string;
            enabled: boolean;
        }> = {} as Record<ProviderId, { apiKey?: string; selectedModel?: string; enabled: boolean }>;

        for (const [id, state] of Array.from(this.states.entries())) {
            result[id] = {
                apiKey: state.apiKey,
                selectedModel: state.selectedModel,
                enabled: state.enabled
            };
        }

        return result;
    }

    /**
     * Import registry state from storage
     */
    import(data: Partial<Record<ProviderId, {
        apiKey?: string;
        selectedModel?: string;
        enabled?: boolean;
    }>>): void {
        for (const id of Object.keys(PROVIDER_ADAPTERS) as ProviderId[]) {
            const saved = data[id];
            if (saved) {
                const state = this.states.get(id);
                if (state) {
                    if (saved.apiKey) state.apiKey = saved.apiKey;
                    if (saved.selectedModel) state.selectedModel = saved.selectedModel;
                    // Don't restore enabled - user needs to re-validate
                }
            }
        }
    }
}

// ============================================
// SINGLETON
// ============================================

let registryInstance: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
    if (!registryInstance) {
        registryInstance = new ProviderRegistry();
    }
    return registryInstance;
}

// ============================================
// STORAGE KEYS
// ============================================

export const PROVIDER_STORAGE_KEYS = {
    registry: 'ifrit_provider_registry',
    providerOrder: 'ifrit_provider_order'
};
