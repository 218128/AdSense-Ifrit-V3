/**
 * Google Gemini Provider
 * 
 * Uses the @google/genai SDK (Dec 2025)
 * Supports: gemini-3-*, gemini-2.5-* models
 * 
 * @see https://ai.google.dev/gemini-api/docs
 */

import { GoogleGenAI } from '@google/genai';
import {
    ProviderAdapter,
    ProviderMeta,
    ModelInfo,
    KeyTestResult,
    GenerateOptions,
    GenerateResult,
    parseModelModes,
    errorResult
} from './base';

// Fallback URL for model listing (SDK model list may not include all fields)
const API_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Google Gemini Provider Implementation
 * Uses official @google/genai SDK with fetch fallback for model listing
 */
export class GeminiProvider implements ProviderAdapter {
    readonly meta: ProviderMeta = {
        id: 'gemini',
        name: 'Google Gemini',
        description: 'Google AI Studio - Advanced multimodal AI models',
        signupUrl: 'https://aistudio.google.com/',
        docsUrl: 'https://ai.google.dev/gemini-api/docs'
    };

    /**
     * Test API key by fetching real models
     * Uses direct API call since SDK model type doesn't expose all fields
     */
    async testKey(apiKey: string): Promise<KeyTestResult> {
        const startTime = Date.now();

        try {
            // Use direct API for model listing (more complete type info)
            const response = await fetch(`${API_URL}/models?key=${apiKey}`);

            if (!response.ok) {
                const error = await response.text();
                return {
                    valid: false,
                    models: [],
                    error: `Gemini: ${response.status} - ${error.substring(0, 150)}`
                };
            }

            const data = await response.json();

            // Parse real models from API response
            const models: ModelInfo[] = (data.models || [])
                .filter((m: { name: string }) =>
                    m.name.includes('gemini') &&
                    !m.name.includes('embedding') &&
                    !m.name.includes('aqa')
                )
                .map((m: {
                    name: string;
                    displayName?: string;
                    description?: string;
                    inputTokenLimit?: number;
                    supportedGenerationMethods?: string[];
                }) => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName || m.name.replace('models/', ''),
                    description: m.description,
                    contextLength: m.inputTokenLimit,
                    modes: parseModelModes(m.supportedGenerationMethods)
                }));

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
     * Generate content using Gemini SDK
     */
    async chat(apiKey: string, options: GenerateOptions): Promise<GenerateResult> {
        const modelId = options.model || 'gemini-2.5-flash';

        try {
            const genai = new GoogleGenAI({ apiKey });

            // Build the prompt with optional system prompt
            const fullPrompt = options.systemPrompt
                ? `${options.systemPrompt}\n\n${options.prompt}`
                : options.prompt;

            const response = await genai.models.generateContent({
                model: modelId,
                contents: fullPrompt,
                config: {
                    maxOutputTokens: options.maxTokens || 4000,
                    temperature: options.temperature ?? 0.7,
                }
            });

            const content = response.text;

            if (!content) {
                return errorResult('No content in response', modelId);
            }

            return {
                success: true,
                content,
                model: modelId,
                usage: response.usageMetadata ? {
                    inputTokens: response.usageMetadata.promptTokenCount || 0,
                    outputTokens: response.usageMetadata.candidatesTokenCount || 0
                } : undefined
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Gemini generation failed',
                modelId
            );
        }
    }

    /**
     * Stream content generation using Gemini SDK
     */
    async *stream(apiKey: string, options: GenerateOptions): AsyncGenerator<string, void, unknown> {
        const modelId = options.model || 'gemini-2.5-flash';

        try {
            const genai = new GoogleGenAI({ apiKey });

            const fullPrompt = options.systemPrompt
                ? `${options.systemPrompt}\n\n${options.prompt}`
                : options.prompt;

            const response = await genai.models.generateContentStream({
                model: modelId,
                contents: fullPrompt,
                config: {
                    maxOutputTokens: options.maxTokens || 4000,
                    temperature: options.temperature ?? 0.7,
                }
            });

            for await (const chunk of response) {
                const text = chunk.text;
                if (text) {
                    yield text;
                }
            }
        } catch (error) {
            throw new Error(
                error instanceof Error ? error.message : 'Gemini streaming failed'
            );
        }
    }

    /**
     * Generate content with MCP tools (NEW - Optional Enhancement)
     * 
     * Uses mcpToTool() to allow Gemini to call external tools.
     * Falls back to regular chat() if no tools provided.
     */
    async chatWithTools(
        apiKey: string,
        options: GenerateOptions & { mcpClients?: unknown[] }
    ): Promise<GenerateResult> {
        // If no MCP clients, fall back to regular chat
        if (!options.mcpClients || options.mcpClients.length === 0) {
            return this.chat(apiKey, options);
        }

        const modelId = options.model || 'gemini-2.5-flash';

        try {
            // Dynamic import to avoid breaking if MCP not used
            const { mcpToTool } = await import('@google/genai');
            const genai = new GoogleGenAI({ apiKey });

            const fullPrompt = options.systemPrompt
                ? `${options.systemPrompt}\n\n${options.prompt}`
                : options.prompt;

            // Convert MCP clients to Gemini tools
            const tools = options.mcpClients.map(client => mcpToTool(client as Parameters<typeof mcpToTool>[0]));

            const response = await genai.models.generateContent({
                model: modelId,
                contents: fullPrompt,
                config: {
                    maxOutputTokens: options.maxTokens || 4000,
                    temperature: options.temperature ?? 0.7,
                    tools
                }
            });

            const content = response.text;

            if (!content) {
                return errorResult('No content in response', modelId);
            }

            return {
                success: true,
                content,
                model: modelId,
                usage: response.usageMetadata ? {
                    inputTokens: response.usageMetadata.promptTokenCount || 0,
                    outputTokens: response.usageMetadata.candidatesTokenCount || 0
                } : undefined
            };
        } catch (error) {
            // If MCP fails, fall back to regular generation
            console.warn('MCP tools failed, falling back to standard generation:', error);
            return this.chat(apiKey, options);
        }
    }
}

// Export singleton instance
export const geminiProvider = new GeminiProvider();

