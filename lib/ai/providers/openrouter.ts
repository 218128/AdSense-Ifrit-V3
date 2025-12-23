/**
 * OpenRouter Provider
 * 
 * Aggregator with 300+ models from multiple providers
 * OpenAI-compatible API
 * 
 * @see https://openrouter.ai/docs
 */

import {
    ProviderAdapter,
    ProviderMeta,
    ModelInfo,
    KeyTestResult,
    GenerateOptions,
    GenerateResult,
    ModelMode,
    errorResult
} from './base';

const BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * OpenRouter Provider Implementation
 */
export class OpenRouterProvider implements ProviderAdapter {
    readonly meta: ProviderMeta = {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access 300+ AI models through unified API',
        signupUrl: 'https://openrouter.ai/',
        docsUrl: 'https://openrouter.ai/docs'
    };

    /**
     * Test API key by fetching real models from OpenRouter API
     * Returns comprehensive model metadata including pricing and capabilities
     */
    async testKey(apiKey: string): Promise<KeyTestResult> {
        const startTime = Date.now();

        try {
            const response = await fetch(`${BASE_URL}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://adsense-ifrit.vercel.app'
                }
            });

            if (!response.ok) {
                const error = await response.text();
                return {
                    valid: false,
                    models: [],
                    error: `OpenRouter: ${response.status} - ${error.substring(0, 150)}`
                };
            }

            const data = await response.json();

            // Parse real models from API response
            const models: ModelInfo[] = (data.data || []).map((m: {
                id: string;
                name?: string;
                description?: string;
                context_length?: number;
                pricing?: { prompt: string; completion: string };
                supported_parameters?: string[];
            }) => {
                // Parse modes from supported_parameters
                const modes: ModelMode[] = ['chat'];
                if (m.supported_parameters?.includes('stream')) modes.push('stream');
                if (m.id.includes('reason') || m.id.includes('r1')) modes.push('reason');
                if (m.id.includes('coder') || m.id.includes('code')) modes.push('code');
                if (m.id.includes('vision') || m.supported_parameters?.includes('images')) modes.push('image');

                return {
                    id: m.id,
                    name: m.name || m.id,
                    description: m.description,
                    contextLength: m.context_length,
                    modes,
                    pricing: m.pricing ? {
                        input: parseFloat(m.pricing.prompt) * 1000000,
                        output: parseFloat(m.pricing.completion) * 1000000
                    } : undefined
                };
            });

            return {
                valid: true,
                models,
                responseTimeMs: Date.now() - startTime
            };
        } catch (error) {
            return {
                valid: false,
                models: [],
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * Generate content using OpenRouter chat completion
     */
    async chat(apiKey: string, options: GenerateOptions): Promise<GenerateResult> {
        const model = options.model || 'deepseek/deepseek-chat:free';
        const url = `${BASE_URL}/chat/completions`;

        try {
            const messages = [];

            if (options.systemPrompt) {
                messages.push({ role: 'system', content: options.systemPrompt });
            }
            messages.push({ role: 'user', content: options.prompt });

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
                    messages,
                    max_tokens: options.maxTokens || 4000,
                    temperature: options.temperature ?? 0.7,
                })
            });

            if (!response.ok) {
                const error = await response.text();
                return errorResult(`OpenRouter: ${response.status} - ${error.substring(0, 200)}`, model);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            const usage = data.usage;

            if (!content) {
                return errorResult('No content in response', model);
            }

            return {
                success: true,
                content,
                model,
                usage: usage ? {
                    inputTokens: usage.prompt_tokens || 0,
                    outputTokens: usage.completion_tokens || 0
                } : undefined
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Network error',
                model
            );
        }
    }

    /**
     * Stream content generation
     */
    async *stream(apiKey: string, options: GenerateOptions): AsyncGenerator<string, void, unknown> {
        const model = options.model || 'deepseek/deepseek-chat:free';
        const url = `${BASE_URL}/chat/completions`;

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
                messages: [{ role: 'user', content: options.prompt }],
                max_tokens: options.maxTokens || 4000,
                temperature: options.temperature ?? 0.7,
                stream: true
            })
        });

        if (!response.ok || !response.body) {
            throw new Error(`OpenRouter stream error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const text = data.choices?.[0]?.delta?.content;
                        if (text) yield text;
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }
}

// Export singleton instance
export const openrouterProvider = new OpenRouterProvider();
