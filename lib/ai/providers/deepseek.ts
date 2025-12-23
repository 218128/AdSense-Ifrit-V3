/**
 * DeepSeek Provider
 * 
 * OpenAI-compatible API
 * Models: deepseek-chat (V3.2), deepseek-reasoner (R1), deepseek-coder
 * 
 * @see https://platform.deepseek.com/api-docs
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

const BASE_URL = 'https://api.deepseek.com/v1';

/**
 * DeepSeek Provider Implementation
 */
export class DeepSeekProvider implements ProviderAdapter {
    readonly meta: ProviderMeta = {
        id: 'deepseek',
        name: 'DeepSeek',
        description: 'High-quality AI models with reasoning capabilities',
        signupUrl: 'https://platform.deepseek.com/',
        docsUrl: 'https://platform.deepseek.com/api-docs'
    };

    /**
     * Test API key by fetching real models from DeepSeek API
     */
    async testKey(apiKey: string): Promise<KeyTestResult> {
        const startTime = Date.now();

        try {
            const response = await fetch(`${BASE_URL}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                const error = await response.text();
                return {
                    valid: false,
                    models: [],
                    error: `DeepSeek: ${response.status} - ${error.substring(0, 150)}`
                };
            }

            const data = await response.json();

            // Parse real models from API response
            const models: ModelInfo[] = (data.data || []).map((m: {
                id: string;
                object?: string;
                owned_by?: string;
            }) => {
                // Determine modes based on model ID
                const modes: ('chat' | 'stream' | 'reason' | 'code')[] = ['chat', 'stream'];
                if (m.id.includes('reasoner') || m.id.includes('r1')) {
                    modes.push('reason');
                }
                if (m.id.includes('coder')) {
                    modes.push('code');
                }

                return {
                    id: m.id,
                    name: m.id.replace('deepseek-', 'DeepSeek ').replace('-', ' '),
                    modes,
                    contextLength: 128000 // V3.2 supports 128k
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
     * Generate content using DeepSeek chat completion
     */
    async chat(apiKey: string, options: GenerateOptions): Promise<GenerateResult> {
        const model = options.model || 'deepseek-chat';
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
                return errorResult(`DeepSeek: ${response.status} - ${error.substring(0, 200)}`, model);
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
     * Reasoning mode for DeepSeek R1 models
     * Returns chain-of-thought in reasoning field
     */
    async reason(apiKey: string, options: GenerateOptions): Promise<GenerateResult> {
        const model = options.model || 'deepseek-reasoner';
        const url = `${BASE_URL}/chat/completions`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: options.prompt }],
                    max_tokens: options.maxTokens || 8000,
                    temperature: options.temperature ?? 0.7,
                })
            });

            if (!response.ok) {
                const error = await response.text();
                return errorResult(`DeepSeek: ${response.status} - ${error.substring(0, 200)}`, model);
            }

            const data = await response.json();
            const message = data.choices?.[0]?.message;
            const content = message?.content;
            const reasoning = message?.reasoning_content; // R1 specific field

            if (!content) {
                return errorResult('No content in response', model);
            }

            return {
                success: true,
                content,
                reasoning, // Chain-of-thought
                model,
                usage: data.usage ? {
                    inputTokens: data.usage.prompt_tokens || 0,
                    outputTokens: data.usage.completion_tokens || 0
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
export const deepseekProvider = new DeepSeekProvider();
