/**
 * Multi-Provider AI System with Key Rotation
 * 
 * Supported Providers:
 * - Gemini (Google AI Studio) - Primary
 * - DeepSeek - Backup (very cheap, no strict rate limits)
 * - OpenRouter - Aggregator (many free models, unified API)
 * - Vercel AI Gateway - Aggregator (unified billing, auto-failover)
 * - Perplexity - Backup (requires Pro subscription)
 * 
 * Features:
 * - Automatic key rotation
 * - Failover to backup providers
 * - Rate limit tracking
 * - Usage statistics
 * - Key validation/testing
 */

export type AIProvider = 'gemini' | 'deepseek' | 'openrouter' | 'vercel' | 'perplexity';

export interface ProviderKey {
    key: string;
    provider: AIProvider;
    label?: string;
    usageCount: number;
    lastUsed: number;
    failureCount: number;
    disabled: boolean;
    validated: boolean;
    validatedAt?: number;
    rateLimit?: {
        requestsPerMinute: number;
        requestsPerDay: number;
    };
}

export interface ProviderInfo {
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

// Provider configurations with rate limits based on research
export const PROVIDERS: Record<AIProvider, ProviderInfo> = {
    gemini: {
        name: 'Google Gemini',
        description: 'Google AI Studio - Primary free tier',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        models: ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'],
        defaultModel: 'gemini-2.5-flash',
        rateLimit: {
            requestsPerMinute: 15,
            requestsPerDay: 1500,
            cooldownMs: 4000,
        },
        features: ['Free tier', 'High quality', 'Multi-modal'],
        signupUrl: 'https://aistudio.google.com/',
        pricing: 'Free: 15 RPM, 1500/day'
    },
    deepseek: {
        name: 'DeepSeek',
        description: 'Chinese AI lab - Very cheap, good quality',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
        defaultModel: 'deepseek-chat',
        rateLimit: {
            requestsPerMinute: 60,
            requestsPerDay: 10000,
            cooldownMs: 1000,
        },
        features: ['Very cheap', 'No strict limits', 'Good for coding'],
        signupUrl: 'https://platform.deepseek.com/',
        pricing: '$0.28/1M input, $0.42/1M output'
    },
    openrouter: {
        name: 'OpenRouter',
        description: 'AI model aggregator - Access 100+ models',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: [
            'deepseek/deepseek-chat:free',
            'google/gemma-7b-it:free',
            'meta-llama/llama-3-8b-instruct:free',
            'mistralai/mistral-7b-instruct:free',
            'openai/gpt-4o-mini',
            'anthropic/claude-3-haiku'
        ],
        defaultModel: 'deepseek/deepseek-chat:free',
        rateLimit: {
            requestsPerMinute: 20,
            requestsPerDay: 50, // 1000 if purchased $10+ credits
            cooldownMs: 3000,
        },
        features: ['100+ models', 'Free tier', 'Unified API', 'Model comparison'],
        signupUrl: 'https://openrouter.ai/',
        pricing: 'Free: 50/day (1000 with $10 credit)'
    },
    vercel: {
        name: 'Vercel AI Gateway',
        description: 'Unified AI proxy with auto-failover',
        baseUrl: 'https://api.vercel.ai/v1',
        models: [
            'anthropic/claude-sonnet-4',
            'openai/gpt-5.2',
            'google/gemini-2.5-flash',
            'anthropic/claude-haiku-4.5'
        ],
        defaultModel: 'anthropic/claude-sonnet-4',
        rateLimit: {
            requestsPerMinute: 60,
            requestsPerDay: 1000,
            cooldownMs: 1000,
        },
        features: ['Auto-failover', 'Unified billing', 'Sub-20ms latency', 'Caching'],
        signupUrl: 'https://vercel.com/docs/ai-gateway',
        pricing: '$5 free credits/month'
    },
    perplexity: {
        name: 'Perplexity AI',
        description: 'Search-augmented AI - Requires Pro',
        baseUrl: 'https://api.perplexity.ai',
        models: ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro'],
        defaultModel: 'sonar',
        rateLimit: {
            requestsPerMinute: 3,
            requestsPerDay: 5000,
            cooldownMs: 350,
        },
        features: ['Web search', 'Citations', 'Real-time info'],
        signupUrl: 'https://www.perplexity.ai/',
        pricing: 'Requires Pro ($20/month)'
    }
};

/**
 * Key Manager - Handles key rotation and tracking
 */
export class AIKeyManager {
    private keys: Map<AIProvider, ProviderKey[]> = new Map();
    private usageLog: Map<string, number[]> = new Map();

    constructor() {
        for (const provider of Object.keys(PROVIDERS) as AIProvider[]) {
            this.keys.set(provider, []);
        }
    }

    /**
     * Add a key for a provider
     */
    addKey(provider: AIProvider, key: string, label?: string): void {
        const providerKeys = this.keys.get(provider) || [];

        if (providerKeys.some(k => k.key === key)) {
            return;
        }

        const limits = PROVIDERS[provider].rateLimit;
        providerKeys.push({
            key,
            provider,
            label,
            usageCount: 0,
            lastUsed: 0,
            failureCount: 0,
            disabled: false,
            validated: false,
            rateLimit: {
                requestsPerMinute: limits.requestsPerMinute,
                requestsPerDay: limits.requestsPerDay,
            }
        });

        this.keys.set(provider, providerKeys);
    }

    /**
     * Get the next available key for a provider (round-robin with rate limiting)
     */
    getNextKey(provider: AIProvider): ProviderKey | null {
        const providerKeys = this.keys.get(provider) || [];
        const enabledKeys = providerKeys.filter(k => !k.disabled);

        if (enabledKeys.length === 0) {
            return null;
        }

        const now = Date.now();
        const limits = PROVIDERS[provider].rateLimit;

        const availableKeys = enabledKeys.filter(k => {
            const timeSinceLastUse = now - k.lastUsed;
            return timeSinceLastUse >= limits.cooldownMs;
        });

        if (availableKeys.length === 0) {
            enabledKeys.sort((a, b) => a.lastUsed - b.lastUsed);
            return enabledKeys[0];
        }

        availableKeys.sort((a, b) => a.lastUsed - b.lastUsed);
        return availableKeys[0];
    }

    /**
     * Mark a key as used
     */
    markKeyUsed(provider: AIProvider, key: string): void {
        const providerKeys = this.keys.get(provider) || [];
        const keyObj = providerKeys.find(k => k.key === key);

        if (keyObj) {
            keyObj.usageCount++;
            keyObj.lastUsed = Date.now();

            const usageKey = `${provider}:${key}`;
            const timestamps = this.usageLog.get(usageKey) || [];
            timestamps.push(Date.now());

            const oneHourAgo = Date.now() - 3600000;
            this.usageLog.set(usageKey, timestamps.filter(t => t > oneHourAgo));
        }
    }

    /**
     * Mark a key as failed
     * Rate limit errors (429) should not permanently disable keys
     */
    markKeyFailed(provider: AIProvider, key: string, disable: boolean = false, isRateLimit: boolean = false): void {
        const providerKeys = this.keys.get(provider) || [];
        const keyObj = providerKeys.find(k => k.key === key);

        if (keyObj) {
            // Rate limit errors are temporary - just increase lastUsed time
            if (isRateLimit) {
                keyObj.lastUsed = Date.now() + 60000; // Add 1 minute cooldown
                return; // Don't increment failure count for rate limits
            }

            keyObj.failureCount++;
            // Only disable after 10 consecutive failures (not rate limits)
            if (keyObj.failureCount >= 10 || disable) {
                keyObj.disabled = true;
            }
        }
    }

    /**
     * Reset failure count for a key
     */
    resetKeyFailures(provider: AIProvider, key: string): void {
        const providerKeys = this.keys.get(provider) || [];
        const keyObj = providerKeys.find(k => k.key === key);

        if (keyObj) {
            keyObj.failureCount = 0;
        }
    }

    /**
     * Mark key as validated
     */
    markKeyValidated(provider: AIProvider, key: string): void {
        const providerKeys = this.keys.get(provider) || [];
        const keyObj = providerKeys.find(k => k.key === key);

        if (keyObj) {
            keyObj.validated = true;
            keyObj.validatedAt = Date.now();
        }
    }

    /**
     * Get usage statistics
     */
    getStats(): { provider: AIProvider; totalKeys: number; activeKeys: number; totalUsage: number; validated: number }[] {
        const stats: { provider: AIProvider; totalKeys: number; activeKeys: number; totalUsage: number; validated: number }[] = [];

        for (const [provider, keys] of this.keys.entries()) {
            stats.push({
                provider,
                totalKeys: keys.length,
                activeKeys: keys.filter(k => !k.disabled).length,
                totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0),
                validated: keys.filter(k => k.validated).length
            });
        }

        return stats;
    }

    /**
     * Get all keys for a provider
     */
    getKeys(provider: AIProvider): ProviderKey[] {
        return this.keys.get(provider) || [];
    }

    /**
     * Remove a key
     */
    removeKey(provider: AIProvider, key: string): void {
        const providerKeys = this.keys.get(provider) || [];
        this.keys.set(provider, providerKeys.filter(k => k.key !== key));
    }

    /**
     * Enable a disabled key
     */
    enableKey(provider: AIProvider, key: string): void {
        const providerKeys = this.keys.get(provider) || [];
        const keyObj = providerKeys.find(k => k.key === key);
        if (keyObj) {
            keyObj.disabled = false;
            keyObj.failureCount = 0;
        }
    }

    /**
     * Export keys for storage
     */
    exportKeys(): Record<AIProvider, { key: string; label?: string }[]> {
        const result: Record<AIProvider, { key: string; label?: string }[]> = {
            gemini: [],
            deepseek: [],
            openrouter: [],
            vercel: [],
            perplexity: []
        };

        for (const [provider, keys] of this.keys.entries()) {
            result[provider] = keys.map(k => ({ key: k.key, label: k.label }));
        }

        return result;
    }

    /**
     * Import keys from storage
     */
    importKeys(data: Partial<Record<AIProvider, { key: string; label?: string }[]>>): void {
        for (const provider of Object.keys(PROVIDERS) as AIProvider[]) {
            if (data[provider]) {
                for (const { key, label } of data[provider]!) {
                    this.addKey(provider, key, label);
                }
            }
        }
    }
}

/**
 * Multi-Provider AI Client
 */
export class MultiProviderAI {
    private keyManager: AIKeyManager;
    private providerOrder: AIProvider[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];

    constructor(keyManager: AIKeyManager) {
        this.keyManager = keyManager;
    }

    /**
     * Set provider priority order
     */
    setProviderOrder(order: AIProvider[]): void {
        this.providerOrder = order;
    }

    /**
     * Validate/test an API key by listing available models
     * This is more reliable than generating content and returns useful information
     */
    async validateKey(provider: AIProvider, apiKey: string): Promise<{
        valid: boolean;
        provider: AIProvider;
        models?: string[];
        error?: string;
        responseTime?: number;
    }> {
        const startTime = Date.now();

        try {
            const result = await this.listModels(provider, apiKey);
            const responseTime = Date.now() - startTime;

            if (result.success && result.models && result.models.length > 0) {
                this.keyManager.markKeyValidated(provider, apiKey);
                return {
                    valid: true,
                    provider,
                    models: result.models.slice(0, 10), // Return up to 10 models
                    responseTime
                };
            }

            return {
                valid: false,
                provider,
                error: result.error || 'No models available'
            };
        } catch (error) {
            return {
                valid: false,
                provider,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * List available models for a provider
     */
    private async listModels(provider: AIProvider, apiKey: string): Promise<{
        success: boolean;
        models?: string[];
        error?: string;
    }> {
        switch (provider) {
            case 'gemini':
                return this.listGeminiModels(apiKey);
            case 'deepseek':
                return this.listDeepSeekModels(apiKey);
            case 'openrouter':
                return this.listOpenRouterModels(apiKey);
            case 'vercel':
                return this.listVercelModels(apiKey);
            case 'perplexity':
                return this.listPerplexityModels(apiKey);
            default:
                return { success: false, error: 'Unknown provider' };
        }
    }

    /**
     * List Gemini models
     */
    private async listGeminiModels(apiKey: string): Promise<{
        success: boolean;
        models?: string[];
        error?: string;
    }> {
        const url = `${PROVIDERS.gemini.baseUrl}/models?key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `Gemini: ${response.status} - ${error.substring(0, 150)}` };
        }

        const data = await response.json();
        const models = data.models?.map((m: { name: string }) => m.name.replace('models/', '')) || [];

        return { success: true, models };
    }

    /**
     * List DeepSeek models
     */
    private async listDeepSeekModels(apiKey: string): Promise<{
        success: boolean;
        models?: string[];
        error?: string;
    }> {
        const url = `${PROVIDERS.deepseek.baseUrl}/models`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `DeepSeek: ${response.status} - ${error.substring(0, 150)}` };
        }

        const data = await response.json();
        const models = data.data?.map((m: { id: string }) => m.id) || [];

        return { success: true, models };
    }

    /**
     * List OpenRouter models (just verify auth works)
     */
    private async listOpenRouterModels(apiKey: string): Promise<{
        success: boolean;
        models?: string[];
        error?: string;
    }> {
        const url = 'https://openrouter.ai/api/v1/models';

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://adsense-ifrit.vercel.app'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `OpenRouter: ${response.status} - ${error.substring(0, 150)}` };
        }

        const data = await response.json();
        // OpenRouter returns many models - just take first few
        const models = data.data?.slice(0, 10).map((m: { id: string }) => m.id) || [];

        return { success: true, models };
    }

    /**
     * List Vercel AI Gateway models
     */
    private async listVercelModels(apiKey: string): Promise<{
        success: boolean;
        models?: string[];
        error?: string;
    }> {
        // Vercel AI Gateway supports OpenAI-compatible /models endpoint
        // Try both the main API URL and the gateway URL
        const urls = [
            'https://ai-gateway.vercel.sh/v1/models',
            `${PROVIDERS.vercel.baseUrl}/models`
        ];

        for (const url of urls) {
            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    const models = data.data?.slice(0, 10).map((m: { id: string }) => m.id) || [];
                    if (models.length > 0) {
                        return { success: true, models };
                    }
                }
            } catch {
                // Try next URL
            }
        }

        return { success: false, error: 'Vercel: Could not retrieve models. Check API key.' };
    }

    /**
     * List Perplexity models
     * Perplexity doesn't have a public /models endpoint, so we check auth via /models path
     * If auth succeeds, we return the known Sonar models
     */
    private async listPerplexityModels(apiKey: string): Promise<{
        success: boolean;
        models?: string[];
        error?: string;
    }> {
        // Perplexity uses OpenAI-compatible API structure
        // Try to access /models endpoint for auth check
        const url = `${PROVIDERS.perplexity.baseUrl}/models`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (response.ok) {
            // If /models works, parse the response
            try {
                const data = await response.json();
                const models = data.data?.map((m: { id: string }) => m.id) || [];
                if (models.length > 0) {
                    return { success: true, models };
                }
            } catch {
                // If parsing fails but auth worked, return known models
            }
            // Auth succeeded - return known Sonar models
            return { success: true, models: PROVIDERS.perplexity.models };
        }

        // If /models fails, check if it's auth error or just unsupported endpoint
        const errorText = await response.text();

        // If 401/403, it's an auth error
        if (response.status === 401 || response.status === 403) {
            return { success: false, error: `Perplexity: Invalid API key (${response.status})` };
        }

        // If 404, endpoint doesn't exist - try a simple OPTIONS or HEAD to verify auth
        if (response.status === 404) {
            // Try a lightweight check - just verify the key format
            if (apiKey.startsWith('pplx-') && apiKey.length > 20) {
                return {
                    success: true,
                    models: PROVIDERS.perplexity.models,
                };
            }
            return { success: false, error: 'Perplexity: Invalid key format. Keys should start with "pplx-"' };
        }

        return { success: false, error: `Perplexity: ${response.status} - ${errorText.substring(0, 100)}` };
    }

    /**
     * Generate content with automatic failover
     */
    async generateContent(
        prompt: string,
        options: {
            maxTokens?: number;
            temperature?: number;
            preferredProvider?: AIProvider;
            model?: string;
        } = {}
    ): Promise<{
        success: boolean;
        content?: string;
        provider?: AIProvider;
        model?: string;
        error?: string;
    }> {
        const { maxTokens = 4000, temperature = 0.7, preferredProvider, model } = options;

        const providerOrder = preferredProvider
            ? [preferredProvider, ...this.providerOrder.filter(p => p !== preferredProvider)]
            : this.providerOrder;

        for (const provider of providerOrder) {
            const key = this.keyManager.getNextKey(provider);

            if (!key) {
                continue;
            }

            try {
                const result = await this.callProvider(provider, key.key, prompt, { maxTokens, temperature, model });

                if (result.success) {
                    this.keyManager.markKeyUsed(provider, key.key);
                    this.keyManager.resetKeyFailures(provider, key.key);

                    return {
                        success: true,
                        content: result.content,
                        provider,
                        model: model || PROVIDERS[provider].defaultModel
                    };
                }

                if (result.error?.includes('rate') || result.error?.includes('quota') || result.error?.includes('429') || result.error?.includes('Resource')) {
                    // Rate limit - temporary cooldown, don't disable
                    this.keyManager.markKeyFailed(provider, key.key, false, true);
                } else {
                    this.keyManager.markKeyFailed(provider, key.key);
                }

            } catch (error) {
                this.keyManager.markKeyFailed(provider, key.key);
                console.error(`Provider ${provider} failed:`, error);
            }
        }

        return {
            success: false,
            error: 'All providers failed or no keys available'
        };
    }

    /**
     * Call a specific provider
     */
    private async callProvider(
        provider: AIProvider,
        apiKey: string,
        prompt: string,
        options: { maxTokens: number; temperature: number; model?: string }
    ): Promise<{ success: boolean; content?: string; error?: string }> {
        switch (provider) {
            case 'gemini':
                return this.callGemini(apiKey, prompt, options);
            case 'deepseek':
                return this.callOpenAICompatible(PROVIDERS.deepseek.baseUrl, apiKey, prompt, options, options.model || PROVIDERS.deepseek.defaultModel);
            case 'openrouter':
                return this.callOpenRouter(apiKey, prompt, options);
            case 'vercel':
                return this.callVercelGateway(apiKey, prompt, options);
            case 'perplexity':
                return this.callOpenAICompatible(PROVIDERS.perplexity.baseUrl, apiKey, prompt, options, options.model || PROVIDERS.perplexity.defaultModel);
            default:
                return { success: false, error: 'Unknown provider' };
        }
    }

    /**
     * Call Gemini API
     */
    private async callGemini(
        apiKey: string,
        prompt: string,
        options: { maxTokens: number; temperature: number; model?: string }
    ): Promise<{ success: boolean; content?: string; error?: string }> {
        const model = options.model || PROVIDERS.gemini.defaultModel;
        const url = `${PROVIDERS.gemini.baseUrl}/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: options.maxTokens,
                    temperature: options.temperature,
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `Gemini: ${response.status} - ${error.substring(0, 200)}` };
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return content
            ? { success: true, content }
            : { success: false, error: 'No content in response' };
    }

    /**
     * Call OpenAI-compatible API (DeepSeek, Perplexity)
     */
    private async callOpenAICompatible(
        baseUrl: string,
        apiKey: string,
        prompt: string,
        options: { maxTokens: number; temperature: number },
        model: string
    ): Promise<{ success: boolean; content?: string; error?: string }> {
        const url = `${baseUrl}/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: options.maxTokens,
                temperature: options.temperature,
            })
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `API: ${response.status} - ${error.substring(0, 200)}` };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        return content
            ? { success: true, content }
            : { success: false, error: 'No content in response' };
    }

    /**
     * Call OpenRouter API
     */
    private async callOpenRouter(
        apiKey: string,
        prompt: string,
        options: { maxTokens: number; temperature: number; model?: string }
    ): Promise<{ success: boolean; content?: string; error?: string }> {
        const model = options.model || PROVIDERS.openrouter.defaultModel;
        const url = `${PROVIDERS.openrouter.baseUrl}/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://adsense-ifrit.vercel.app',
                'X-Title': 'AdSense Ifrit'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: options.maxTokens,
                temperature: options.temperature,
            })
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `OpenRouter: ${response.status} - ${error.substring(0, 200)}` };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        return content
            ? { success: true, content }
            : { success: false, error: 'No content in response' };
    }

    /**
     * Call Vercel AI Gateway
     */
    private async callVercelGateway(
        apiKey: string,
        prompt: string,
        options: { maxTokens: number; temperature: number; model?: string }
    ): Promise<{ success: boolean; content?: string; error?: string }> {
        const model = options.model || PROVIDERS.vercel.defaultModel;
        const url = `${PROVIDERS.vercel.baseUrl}/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: options.maxTokens,
                temperature: options.temperature,
            })
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `Vercel: ${response.status} - ${error.substring(0, 200)}` };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        return content
            ? { success: true, content }
            : { success: false, error: 'No content in response' };
    }

    /**
     * Get key manager
     */
    getKeyManager(): AIKeyManager {
        return this.keyManager;
    }
}

/**
 * Get list of all available providers with their info
 */
export function getProvidersList(): ProviderInfo[] {
    return Object.values(PROVIDERS);
}

/**
 * Get provider info by name
 */
export function getProviderInfo(provider: AIProvider): ProviderInfo {
    return PROVIDERS[provider];
}

/**
 * Storage keys for localStorage
 */
export const AI_STORAGE_KEYS = {
    geminiKeys: 'ifrit_gemini_keys',
    deepseekKeys: 'ifrit_deepseek_keys',
    openrouterKeys: 'ifrit_openrouter_keys',
    vercelKeys: 'ifrit_vercel_keys',
    perplexityKeys: 'ifrit_perplexity_keys',
    providerOrder: 'ifrit_provider_order',
};

/**
 * Create singleton instance
 */
let instance: MultiProviderAI | null = null;

export function getMultiProviderAI(): MultiProviderAI {
    if (!instance) {
        instance = new MultiProviderAI(new AIKeyManager());
    }
    return instance;
}
