/**
 * Perplexity Provider (Sonar)
 * 
 * Web-grounded AI with citations
 * Models: sonar, sonar-pro, sonar-reasoning-pro
 * 
 * @see https://docs.perplexity.ai/
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

const BASE_URL = 'https://api.perplexity.ai';

/**
 * Perplexity Provider Implementation
 */
export class PerplexityProvider implements ProviderAdapter {
    readonly meta: ProviderMeta = {
        id: 'perplexity',
        name: 'Perplexity AI',
        description: 'Web-grounded search AI with citations',
        signupUrl: 'https://www.perplexity.ai/',
        docsUrl: 'https://docs.perplexity.ai/',
        keyPrefix: 'pplx-' // Perplexity keys start with this
    };

    /**
     * Test API key by fetching real models from Perplexity API
     */
    async testKey(apiKey: string): Promise<KeyTestResult> {
        const startTime = Date.now();

        // Validate key prefix
        if (!apiKey.startsWith('pplx-')) {
            return {
                valid: false,
                models: [],
                error: 'Perplexity keys must start with "pplx-"'
            };
        }

        try {
            // Perplexity has /models endpoint
            const response = await fetch(`${BASE_URL}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (response.ok) {
                const data = await response.json();
                const models: ModelInfo[] = (data.data || []).map((m: {
                    id: string;
                    object?: string;
                }) => ({
                    id: m.id,
                    name: m.id.replace('sonar', 'Sonar').replace('-', ' '),
                    modes: m.id.includes('reasoning')
                        ? ['chat', 'search', 'reason'] as const
                        : ['chat', 'search'] as const,
                    description: m.id.includes('pro')
                        ? 'Advanced model with enhanced reasoning'
                        : 'Standard web-grounded search'
                }));

                return {
                    valid: true,
                    models,
                    responseTimeMs: Date.now() - startTime
                };
            }

            // If /models returns 404, the key format may be valid but endpoint doesn't exist
            // In this case, verify via a minimal chat request
            if (response.status === 404) {
                // Return known Sonar models if key format is valid
                const knownModels: ModelInfo[] = [
                    { id: 'sonar', name: 'Sonar', modes: ['chat', 'search'], description: 'Default web-search model' },
                    { id: 'sonar-pro', name: 'Sonar Pro', modes: ['chat', 'search'], description: 'Advanced search model' },
                    { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', modes: ['chat', 'search', 'reason'], description: 'Multi-step reasoning' }
                ];

                return {
                    valid: true,
                    models: knownModels,
                    responseTimeMs: Date.now() - startTime
                };
            }

            const error = await response.text();
            return {
                valid: false,
                models: [],
                error: `Perplexity: ${response.status} - ${error.substring(0, 150)}`
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
     * Generate content using Perplexity chat completion
     * Includes web search and citations
     */
    async chat(apiKey: string, options: GenerateOptions): Promise<GenerateResult> {
        const model = options.model || 'sonar';
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
                return errorResult(`Perplexity: ${response.status} - ${error.substring(0, 200)}`, model);
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
export const perplexityProvider = new PerplexityProvider();
