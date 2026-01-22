/**
 * Multi-Provider AI System
 * 
 * @deprecated This file is no longer used. All capability execution goes through:
 * - lib/core/Engine.ts for capability execution
 * - lib/ai/providers/registry.ts for provider management
 * - lib/ai/providers/{provider}/capabilities.ts for handlers
 * 
 * Scheduled for deletion in next major version.
 * Verified: grep found ZERO imports of this file on 2026-01-18.
 * 
 * Slim orchestrator that uses modular provider classes.
 * Provides backward-compatible API while delegating to new provider system.
 * 
 * @see lib/ai/providers/ for individual provider implementations
 */

import {
    ProviderId,
    GenerateOptions,
    GenerateResult,
    ModelInfo,
    KeyTestResult,
    getProviderRegistry,
    PROVIDER_ADAPTERS,
    PROVIDER_STORAGE_KEYS
} from './providers';
// Archived: usageStats (usage tracking disabled)

// Re-export types for backward compatibility
export type AIProvider = ProviderId;
export type { ProviderId, ModelInfo, GenerateResult, KeyTestResult };

// ============================================
// LEGACY PROVIDERS OBJECT (backward compat)
// ============================================

export interface LegacyProviderInfo {
    name: string;
    description: string;
    baseUrl: string;
    models: string[];
    defaultModel: string;
    rateLimit: {
        requestsPerMinute: number;
        requestsPerDay: number;
        cooldownMs: number;
    };
    features: string[];
    signupUrl: string;
    pricing: string;
}

/**
 * PROVIDERS object for backward compatibility
 * Maps provider IDs to their info
 */
export const PROVIDERS: Record<ProviderId, LegacyProviderInfo> = {
    gemini: {
        name: 'Google Gemini',
        description: 'Google AI Studio - Advanced multimodal AI models',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro'],
        defaultModel: 'gemini-2.5-flash',
        rateLimit: { requestsPerMinute: 15, requestsPerDay: 1500, cooldownMs: 4000 },
        features: ['Free tier', 'High quality', 'Multi-modal'],
        signupUrl: 'https://aistudio.google.com/',
        pricing: 'Free: 15 RPM, 1500/day'
    },
    deepseek: {
        name: 'DeepSeek',
        description: 'High-quality AI models with reasoning capabilities',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
        defaultModel: 'deepseek-chat',
        rateLimit: { requestsPerMinute: 60, requestsPerDay: 10000, cooldownMs: 1000 },
        features: ['Very cheap', 'Reasoning', 'Code generation'],
        signupUrl: 'https://platform.deepseek.com/',
        pricing: '$0.28/1M input, $0.42/1M output'
    },
    openrouter: {
        name: 'OpenRouter',
        description: 'Access 300+ AI models through unified API',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: ['deepseek/deepseek-chat:free', 'google/gemma-7b-it:free'],
        defaultModel: 'deepseek/deepseek-chat:free',
        rateLimit: { requestsPerMinute: 20, requestsPerDay: 50, cooldownMs: 3000 },
        features: ['300+ models', 'Free tier', 'Unified API'],
        signupUrl: 'https://openrouter.ai/',
        pricing: 'Free: 50/day (1000 with $10 credit)'
    },
    perplexity: {
        name: 'Perplexity AI',
        description: 'Web-grounded search AI with citations',
        baseUrl: 'https://api.perplexity.ai',
        models: ['sonar', 'sonar-pro', 'sonar-reasoning-pro'],
        defaultModel: 'sonar',
        rateLimit: { requestsPerMinute: 3, requestsPerDay: 5000, cooldownMs: 20000 },
        features: ['Web search', 'Citations', 'Real-time info'],
        signupUrl: 'https://www.perplexity.ai/',
        pricing: 'Requires Pro ($20/month)'
    },
    vercel: {
        name: 'Vercel AI Gateway',
        description: 'Unified AI gateway with caching and auto-failover',
        baseUrl: 'https://ai-gateway.vercel.sh/v1',
        models: ['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
        defaultModel: 'anthropic/claude-3-haiku',
        rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000, cooldownMs: 1000 },
        features: ['Auto-failover', 'Caching', 'Analytics'],
        signupUrl: 'https://vercel.com/',
        pricing: '$5 free credits/month'
    }
};

// ============================================
// LEGACY AIKeyManager (backward compat)
// ============================================

interface ProviderKey {
    key: string;
    provider: ProviderId;
    label?: string;
    usageCount: number;
    lastUsed: number;
    failureCount: number;
    disabled: boolean;
    validated: boolean;
}

/**
 * AIKeyManager - Legacy class for backward compatibility
 * New code should use the provider registry directly
 */
export class AIKeyManager {
    private keys: Map<ProviderId, ProviderKey[]> = new Map();

    constructor() {
        for (const provider of Object.keys(PROVIDERS) as ProviderId[]) {
            this.keys.set(provider, []);
        }
    }

    addKey(provider: ProviderId, key: string, label?: string): void {
        const providerKeys = this.keys.get(provider) || [];
        if (providerKeys.some(k => k.key === key)) return;

        providerKeys.push({
            key, provider, label,
            usageCount: 0, lastUsed: 0, failureCount: 0,
            disabled: false, validated: false
        });
        this.keys.set(provider, providerKeys);

        // Also register with the new provider system
        const registry = getProviderRegistry();
        registry.setApiKey(provider, key);
    }

    getNextKey(provider: ProviderId): ProviderKey | null {
        const providerKeys = this.keys.get(provider) || [];
        const enabledKeys = providerKeys.filter(k => !k.disabled);
        if (enabledKeys.length === 0) return null;
        enabledKeys.sort((a, b) => a.lastUsed - b.lastUsed);
        return enabledKeys[0];
    }

    markKeyUsed(provider: ProviderId, key: string): void {
        const providerKeys = this.keys.get(provider) || [];
        const keyObj = providerKeys.find(k => k.key === key);
        if (keyObj) {
            keyObj.usageCount++;
            keyObj.lastUsed = Date.now();
        }
    }

    getStats(): { provider: ProviderId; totalKeys: number; activeKeys: number; totalUsage: number }[] {
        const stats: { provider: ProviderId; totalKeys: number; activeKeys: number; totalUsage: number }[] = [];
        for (const [provider, keys] of Array.from(this.keys.entries())) {
            stats.push({
                provider,
                totalKeys: keys.length,
                activeKeys: keys.filter(k => !k.disabled).length,
                totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0)
            });
        }
        return stats;
    }

    getKeys(provider: ProviderId): ProviderKey[] {
        return this.keys.get(provider) || [];
    }
}

// ============================================
// PROVIDER INFO HELPERS
// ============================================

export interface ProviderInfo {
    name: string;
    description: string;
    signupUrl: string;
    docsUrl: string;
    keyPrefix?: string;
}

export function getProvidersList(): LegacyProviderInfo[] {
    return Object.values(PROVIDERS);
}

export function getProviderInfo(providerId: ProviderId): LegacyProviderInfo {
    return PROVIDERS[providerId];
}

// ============================================
// MULTI-PROVIDER AI CLASS
// ============================================

/**
 * Multi-Provider AI - Orchestrates content generation across providers
 */
export class MultiProviderAI {
    private registry = getProviderRegistry();
    private legacyKeyManager?: AIKeyManager;

    constructor(keyManager?: AIKeyManager) {
        this.legacyKeyManager = keyManager;
    }

    async validateKey(providerId: ProviderId, apiKey: string): Promise<{
        valid: boolean;
        provider: ProviderId;
        models?: string[];
        error?: string;
        responseTime?: number;
    }> {
        const result = await this.registry.testKey(providerId, apiKey);
        return {
            valid: result.valid,
            provider: providerId,
            models: result.models.map(m => m.id),
            error: result.error,
            responseTime: result.responseTimeMs
        };
    }

    getModels(providerId: ProviderId): ModelInfo[] {
        const state = this.registry.getState(providerId);
        return state?.availableModels || [];
    }

    selectModel(providerId: ProviderId, modelId: string): void {
        this.registry.selectModel(providerId, modelId);
    }

    setEnabled(providerId: ProviderId, enabled: boolean): boolean {
        return this.registry.setEnabled(providerId, enabled);
    }

    getProviderStates() {
        return this.registry.getAllStates();
    }

    async generateContent(
        prompt: string,
        options: {
            maxTokens?: number;
            temperature?: number;
            preferredProvider?: ProviderId;
            model?: string;
            systemPrompt?: string;
            useMCPTools?: boolean;  // NEW: Optional MCP enhancement
        } = {}
    ): Promise<{
        success: boolean;
        content?: string;
        provider?: ProviderId;
        model?: string;
        error?: string;
    }> {
        // If legacy key manager is provided, use its keys
        if (this.legacyKeyManager) {
            for (const provider of (Object.keys(PROVIDERS) as ProviderId[])) {
                const key = this.legacyKeyManager.getNextKey(provider);
                if (key) {
                    try {
                        const adapter = PROVIDER_ADAPTERS[provider];
                        const result = await adapter.chat(key.key, {
                            prompt,
                            model: options.model || PROVIDERS[provider].defaultModel,
                            maxTokens: options.maxTokens,
                            temperature: options.temperature,
                            systemPrompt: options.systemPrompt
                        });

                        if (result.success) {
                            this.legacyKeyManager.markKeyUsed(provider, key.key);
                            return {
                                success: true,
                                content: result.content,
                                provider,
                                model: result.model
                            };
                        }
                    } catch (error) {
                        console.error(`Provider ${provider} error:`, error);
                    }
                }
            }
            return { success: false, error: 'All providers failed or no keys available' };
        }

        // Otherwise use the new registry-based approach
        const enabledProviders = this.registry.getEnabledProviders();
        if (enabledProviders.length === 0) {
            return { success: false, error: 'No providers enabled' };
        }

        const providers = options.preferredProvider
            ? [
                ...enabledProviders.filter(p => p.providerId === options.preferredProvider),
                ...enabledProviders.filter(p => p.providerId !== options.preferredProvider)
            ]
            : enabledProviders;

        for (const { providerId, apiKey, model } of providers) {
            const startTime = Date.now();
            const usedModel = options.model || model;

            try {
                const adapter = PROVIDER_ADAPTERS[providerId];

                // Use MCP-enhanced generation if requested and Gemini provider
                let result;
                if (options.useMCPTools && providerId === 'gemini' && 'chatWithTools' in adapter) {
                    // Dynamic import to avoid issues if MCP not configured
                    try {
                        const { mcpManager } = await import('../mcp/mcpManager');
                        const mcpClients = mcpManager.getConnectedClients();
                        result = await (adapter as typeof adapter & { chatWithTools: Function }).chatWithTools(apiKey, {
                            prompt,
                            model: usedModel,
                            maxTokens: options.maxTokens,
                            temperature: options.temperature,
                            systemPrompt: options.systemPrompt,
                            mcpClients
                        });
                    } catch {
                        // MCP not available, fall back to regular chat
                        result = await adapter.chat(apiKey, {
                            prompt,
                            model: usedModel,
                            maxTokens: options.maxTokens,
                            temperature: options.temperature,
                            systemPrompt: options.systemPrompt
                        });
                    }
                } else {
                    // Legacy generation (default)
                    result = await adapter.chat(apiKey, {
                        prompt,
                        model: usedModel,
                        maxTokens: options.maxTokens,
                        temperature: options.temperature,
                        systemPrompt: options.systemPrompt
                    });
                }

                // Usage tracking disabled - use external provider dashboards

                if (result.success) {
                    return {
                        success: true,
                        content: result.content,
                        provider: providerId,
                        model: result.model
                    };
                }
                console.warn(`Provider ${providerId} failed:`, result.error);
            } catch (error) {
                // Usage tracking disabled - use external provider dashboards
                console.error(`Provider ${providerId} error:`, error);
            }
        }

        return { success: false, error: 'All providers failed' };
    }

    setProviderOrder(order: ProviderId[]): void {
        this.registry.setProviderOrder(order);
    }

    getProviderOrder(): ProviderId[] {
        return this.registry.getProviderOrder();
    }

    exportState() {
        return {
            providers: this.registry.export(),
            order: this.registry.getProviderOrder()
        };
    }

    importState(data: {
        providers?: Partial<Record<ProviderId, {
            apiKey?: string;
            selectedModel?: string;
            enabled?: boolean;
        }>>;
        order?: ProviderId[];
    }): void {
        if (data.providers) this.registry.import(data.providers);
        if (data.order) this.registry.setProviderOrder(data.order);
    }
}

// ============================================
// SINGLETON
// ============================================

let instance: MultiProviderAI | null = null;

export function getMultiProviderAI(): MultiProviderAI {
    if (!instance) {
        instance = new MultiProviderAI();
    }
    return instance;
}

// ============================================
// STORAGE KEYS
// ============================================

export const AI_STORAGE_KEYS = {
    ...PROVIDER_STORAGE_KEYS,
    geminiKeys: 'ifrit_gemini_keys',
    deepseekKeys: 'ifrit_deepseek_keys',
    openrouterKeys: 'ifrit_openrouter_keys',
    vercelKeys: 'ifrit_vercel_keys',
    perplexityKeys: 'ifrit_perplexity_keys',
    providerOrder: 'ifrit_provider_order'
};

