/**
 * AI Providers - Unified Interface for Multiple AI Services
 * 
 * Supports rotation across providers for load balancing and fallback.
 * Used for auto-mode in AI-assisted website configuration.
 */

// ============================================
// TYPES
// ============================================

export interface AIProvider {
    id: string;
    name: string;
    apiKeyName: string; // localStorage key name
    endpoint: string;
    model: string;
    maxTokens: number;
    supportsJson: boolean;
}

export interface AIProviderConfig {
    provider: AIProvider;
    apiKey: string;
}

export interface AIRequestOptions {
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
}

export interface AIResponse {
    success: boolean;
    content?: string;
    provider: string;
    tokensUsed?: number;
    error?: string;
}

// ============================================
// PROVIDER DEFINITIONS
// ============================================

export const AI_PROVIDERS: Record<string, AIProvider> = {
    openai: {
        id: 'openai',
        name: 'OpenAI (GPT-4)',
        apiKeyName: 'openai_api_key',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4-turbo-preview',
        maxTokens: 4096,
        supportsJson: true,
    },
    claude: {
        id: 'claude',
        name: 'Anthropic (Claude)',
        apiKeyName: 'claude_api_key',
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        supportsJson: true,
    },
    gemini: {
        id: 'gemini',
        name: 'Google (Gemini)',
        apiKeyName: 'gemini_api_key',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-1.5-flash',
        maxTokens: 4096,
        supportsJson: true,
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        apiKeyName: 'deepseek_api_key',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        maxTokens: 4096,
        supportsJson: true,
    },
    groq: {
        id: 'groq',
        name: 'Groq (Llama)',
        apiKeyName: 'groq_api_key',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.1-70b-versatile',
        maxTokens: 4096,
        supportsJson: true,
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral AI',
        apiKeyName: 'mistral_api_key',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-large-latest',
        maxTokens: 4096,
        supportsJson: true,
    },
};

// ============================================
// PROVIDER ROTATION
// ============================================

let lastUsedProviderIndex = -1;

/**
 * Get available providers (those with API keys set)
 */
export function getAvailableProviders(apiKeys: Record<string, string>): AIProviderConfig[] {
    const available: AIProviderConfig[] = [];

    for (const provider of Object.values(AI_PROVIDERS)) {
        const key = apiKeys[provider.apiKeyName];
        if (key && key.trim()) {
            available.push({ provider, apiKey: key });
        }
    }

    return available;
}

/**
 * Get next provider in rotation
 */
export function getNextProvider(availableProviders: AIProviderConfig[]): AIProviderConfig | null {
    if (availableProviders.length === 0) return null;

    lastUsedProviderIndex = (lastUsedProviderIndex + 1) % availableProviders.length;
    return availableProviders[lastUsedProviderIndex];
}

/**
 * Get random provider
 */
export function getRandomProvider(availableProviders: AIProviderConfig[]): AIProviderConfig | null {
    if (availableProviders.length === 0) return null;

    const index = Math.floor(Math.random() * availableProviders.length);
    return availableProviders[index];
}

// ============================================
// API CALL FUNCTIONS
// ============================================

/**
 * Call OpenAI-compatible API (OpenAI, DeepSeek, Groq, Mistral)
 */
async function callOpenAICompatible(
    config: AIProviderConfig,
    options: AIRequestOptions
): Promise<AIResponse> {
    try {
        const response = await fetch(config.provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.provider.model,
                messages: [
                    ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                    { role: 'user', content: options.prompt },
                ],
                max_tokens: options.maxTokens || config.provider.maxTokens,
                temperature: options.temperature || 0.7,
                ...(options.jsonMode && config.provider.supportsJson ? { response_format: { type: 'json_object' } } : {}),
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, provider: config.provider.id, error };
        }

        const data = await response.json();
        return {
            success: true,
            content: data.choices[0].message.content,
            provider: config.provider.id,
            tokensUsed: data.usage?.total_tokens,
        };
    } catch (error) {
        return {
            success: false,
            provider: config.provider.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Call Claude API
 */
async function callClaude(
    config: AIProviderConfig,
    options: AIRequestOptions
): Promise<AIResponse> {
    try {
        const response = await fetch(config.provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: config.provider.model,
                max_tokens: options.maxTokens || config.provider.maxTokens,
                system: options.systemPrompt || 'You are a helpful assistant.',
                messages: [
                    { role: 'user', content: options.prompt },
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, provider: config.provider.id, error };
        }

        const data = await response.json();
        return {
            success: true,
            content: data.content[0].text,
            provider: config.provider.id,
            tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
        };
    } catch (error) {
        return {
            success: false,
            provider: config.provider.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Call Gemini API
 */
async function callGemini(
    config: AIProviderConfig,
    options: AIRequestOptions
): Promise<AIResponse> {
    try {
        const url = `${config.provider.endpoint}/${config.provider.model}:generateContent?key=${config.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: options.systemPrompt ? `${options.systemPrompt}\n\n${options.prompt}` : options.prompt },
                        ],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: options.maxTokens || config.provider.maxTokens,
                    temperature: options.temperature || 0.7,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, provider: config.provider.id, error };
        }

        const data = await response.json();
        return {
            success: true,
            content: data.candidates[0].content.parts[0].text,
            provider: config.provider.id,
            tokensUsed: data.usageMetadata?.totalTokenCount,
        };
    } catch (error) {
        return {
            success: false,
            provider: config.provider.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Call AI provider with automatic selection
 */
export async function callAI(
    config: AIProviderConfig,
    options: AIRequestOptions
): Promise<AIResponse> {
    switch (config.provider.id) {
        case 'claude':
            return callClaude(config, options);
        case 'gemini':
            return callGemini(config, options);
        case 'openai':
        case 'deepseek':
        case 'groq':
        case 'mistral':
        default:
            return callOpenAICompatible(config, options);
    }
}

/**
 * Call AI with rotation and fallback
 */
export async function callAIWithRotation(
    apiKeys: Record<string, string>,
    options: AIRequestOptions,
    strategy: 'rotate' | 'random' = 'rotate'
): Promise<AIResponse> {
    const availableProviders = getAvailableProviders(apiKeys);

    if (availableProviders.length === 0) {
        return {
            success: false,
            provider: 'none',
            error: 'No AI providers configured. Add API keys in Settings.',
        };
    }

    // Try providers until one succeeds
    const triedProviders: string[] = [];

    for (let i = 0; i < availableProviders.length; i++) {
        const config = strategy === 'rotate'
            ? getNextProvider(availableProviders)
            : getRandomProvider(availableProviders);

        if (!config || triedProviders.includes(config.provider.id)) continue;

        triedProviders.push(config.provider.id);

        const response = await callAI(config, options);

        if (response.success) {
            return response;
        }

        console.warn(`AI provider ${config.provider.id} failed:`, response.error);
    }

    return {
        success: false,
        provider: 'all',
        error: `All providers failed. Tried: ${triedProviders.join(', ')}`,
    };
}
