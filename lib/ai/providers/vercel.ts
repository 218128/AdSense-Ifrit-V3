/**
 * Vercel AI Gateway Provider
 * 
 * Unified gateway to multiple AI providers
 * Features: caching, rate limiting, auto-failover, analytics
 * 
 * @see https://vercel.com/docs/ai
 */

import {
    ProviderAdapter,
    ProviderMeta,
    ModelInfo,
    KeyTestResult,
    GenerateOptions,
    GenerateResult,
    errorResult
} from './base';

const BASE_URL = 'https://ai-gateway.vercel.sh/v1';

/**
 * Vercel AI Gateway Provider Implementation
 */
export class VercelGatewayProvider implements ProviderAdapter {
    readonly meta: ProviderMeta = {
        id: 'vercel',
        name: 'Vercel AI Gateway',
        description: 'Unified AI gateway with caching and auto-failover',
        signupUrl: 'https://vercel.com/',
        docsUrl: 'https://vercel.com/docs/ai'
    };

    /**
     * Test API key by fetching available models from Vercel AI Gateway
     */
    async testKey(apiKey: string): Promise<KeyTestResult> {
        const startTime = Date.now();

        try {
            // Vercel AI Gateway uses OpenAI-compatible /models endpoint
            const response = await fetch(`${BASE_URL}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (response.ok) {
                const data = await response.json();
                const models: ModelInfo[] = (data.data || []).map((m: {
                    id: string;
                    object?: string;
                    owned_by?: string;
                }) => ({
                    id: m.id,
                    name: m.id.split('/').pop() || m.id,
                    modes: ['chat', 'stream'] as const,
                    description: `Via ${m.owned_by || 'Vercel Gateway'}`
                }));

                return {
                    valid: true,
                    models,
                    responseTimeMs: Date.now() - startTime
                };
            }

            // If direct /models fails, try alternative endpoint
            const altResponse = await fetch('https://api.vercel.ai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (altResponse.ok) {
                const data = await altResponse.json();
                const models: ModelInfo[] = (data.data || []).map((m: { id: string }) => ({
                    id: m.id,
                    name: m.id,
                    modes: ['chat', 'stream'] as const
                }));

                return {
                    valid: true,
                    models,
                    responseTimeMs: Date.now() - startTime
                };
            }

            const error = await response.text();
            return {
                valid: false,
                models: [],
                error: `Vercel: ${response.status} - ${error.substring(0, 150)}`
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
     * Generate content via Vercel AI Gateway
     */
    async chat(apiKey: string, options: GenerateOptions): Promise<GenerateResult> {
        const model = options.model || 'anthropic/claude-3-haiku';
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
                    'Authorization': `Bearer ${apiKey}`
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
                return errorResult(`Vercel: ${response.status} - ${error.substring(0, 200)}`, model);
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
}

// Export singleton instance
export const vercelGatewayProvider = new VercelGatewayProvider();
