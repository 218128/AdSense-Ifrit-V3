/**
 * Gemini Capability Handlers
 * 
 * Maps Gemini SDK methods to AIServices capabilities.
 * Each handler exposes one Gemini feature as a capability.
 * 
 * Handler IDs follow pattern: {provider}-{action}
 * 
 * @see GEMINI_GUIDELINES.md for SDK usage patterns
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../../services/types';
import { geminiProvider } from '../gemini';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get API key from options context
 * Follows same pattern as perplexity/capabilities.ts
 */
async function getApiKey(options: ExecuteOptions): Promise<string | undefined> {
    // Try from new providerKeys format first (passed from client to server)
    const providerKeys = options.context?.providerKeys as Record<string, string> | undefined;
    if (providerKeys?.gemini) {
        return providerKeys.gemini;
    }

    // Try from old single apiKey format (backward compatibility)
    const contextKey = options.context?.apiKey;
    if (typeof contextKey === 'string') {
        return contextKey;
    }

    // Try from settings store (client-side only)
    if (typeof window !== 'undefined') {
        try {
            const { useSettingsStore } = await import('@/stores/settingsStore');
            const keys = useSettingsStore.getState().providerKeys.gemini;
            if (keys?.length) {
                const firstKey = keys[0];
                return typeof firstKey === 'string' ? firstKey : (firstKey as { key: string })?.key;
            }
        } catch {
            // Settings not available
        }
    }

    return undefined;
}

/**
 * Get user-selected model from settings
 * Reads from selectedModels store field, falls back to PROVIDER_CONFIGS.defaultModel
 */
async function getUserSelectedModel(options: ExecuteOptions): Promise<string | undefined> {
    // First check if passed in options
    if (options.model) {
        return options.model;
    }

    // Try from settings store (client-side only)
    if (typeof window !== 'undefined') {
        try {
            const { useSettingsStore, PROVIDER_CONFIGS } = await import('@/stores/settingsStore');
            const state = useSettingsStore.getState();

            // User's selected model from selectedModels record
            const selectedModel = state.selectedModels?.gemini;
            if (selectedModel) {
                return selectedModel;
            }

            // Fallback to config default (for initial setup before user selects)
            return PROVIDER_CONFIGS.gemini?.defaultModel;
        } catch {
            // Settings not available
        }
    }

    return undefined;
}

/**
 * Create error result with required fields
 */
function errorResult(error: string, handlerId: string, startTime: number): ExecuteResult {
    return {
        success: false,
        error,
        handlerUsed: handlerId,
        source: 'ai-provider',
        latencyMs: Date.now() - startTime
    };
}

// ============================================
// CAPABILITY HANDLERS
// ============================================

/**
 * gemini-generate: Text generation, summarization, translation, code
 */
export const geminiGenerateHandler: CapabilityHandler = {
    id: 'gemini-generate',
    name: 'Gemini Text Generation',
    source: 'ai-provider',
    providerId: 'gemini',
    capabilities: ['generate', 'summarize', 'translate', 'code'],
    priority: 90,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'gemini-generate';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Gemini API key not configured', handlerId, startTime);
        }

        const model = await getUserSelectedModel(opts);
        if (!model) {
            return errorResult('No Gemini model selected in Settings', handlerId, startTime);
        }

        try {
            const result = await geminiProvider.chat(apiKey, {
                prompt: opts.prompt,
                model,
                maxTokens: opts.maxTokens,
                temperature: opts.temperature,
                systemPrompt: opts.systemPrompt,
            });

            if (!result.success) {
                return errorResult(result.error || 'Generation failed', handlerId, startTime);
            }

            return {
                success: true,
                text: result.content,
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime,
                model: result.model,
                usage: result.usage,
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Generation failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * gemini-research: Web-grounded research with Google Search
 * Uses googleSearch tool for real-time information with citations
 */
export const geminiResearchHandler: CapabilityHandler = {
    id: 'gemini-research',
    name: 'Gemini Web Research',
    source: 'ai-provider',
    providerId: 'gemini',
    capabilities: ['research'],
    priority: 85,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'gemini-research';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Gemini API key not configured', handlerId, startTime);
        }

        const model = await getUserSelectedModel(opts);
        if (!model) {
            return errorResult('No Gemini model selected in Settings', handlerId, startTime);
        }

        try {
            // Dynamic import to use GoogleGenAI with grounding
            const { GoogleGenAI } = await import('@google/genai');
            const genai = new GoogleGenAI({ apiKey });

            const response = await genai.models.generateContent({
                model,
                contents: opts.prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: opts.systemPrompt || 'You are a research assistant. Provide comprehensive information with citations where available.',
                }
            });

            const content = response.text;
            if (!content) {
                return errorResult('No research content generated', handlerId, startTime);
            }

            // Extract grounding metadata for citations
            const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
            const citations = groundingMetadata?.groundingChunks?.map(chunk => ({
                title: chunk.web?.title,
                url: chunk.web?.uri,
            })).filter(c => c.url) || [];

            return {
                success: true,
                text: content,
                data: {
                    citations,
                    searchQueries: groundingMetadata?.webSearchQueries,
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime,
                model,
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Research failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * gemini-reason: Deep thinking for complex analysis
 * Uses thinkingConfig for Gemini 2.5/3 reasoning
 */
export const geminiReasonHandler: CapabilityHandler = {
    id: 'gemini-reason',
    name: 'Gemini Deep Reasoning',
    source: 'ai-provider',
    providerId: 'gemini',
    capabilities: ['reasoning', 'analyze'],
    priority: 88,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'gemini-reason';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Gemini API key not configured', handlerId, startTime);
        }

        const model = await getUserSelectedModel(opts);
        if (!model) {
            return errorResult('No Gemini model selected in Settings', handlerId, startTime);
        }

        try {
            const { GoogleGenAI } = await import('@google/genai');
            const genai = new GoogleGenAI({ apiKey });

            // Get thinking level from context or default to HIGH
            const thinkingLevel = (opts.context?.thinkingLevel as 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') || 'HIGH';

            const response = await genai.models.generateContent({
                model,
                contents: opts.prompt,
                config: {
                    thinkingConfig: {
                        thinkingLevel,
                        includeThoughts: false, // Don't include internal reasoning in output
                    },
                    systemInstruction: opts.systemPrompt,
                }
            });

            const content = response.text;
            if (!content) {
                return errorResult('No reasoning output generated', handlerId, startTime);
            }

            return {
                success: true,
                text: content,
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime,
                model,
                usage: response.usageMetadata ? {
                    inputTokens: response.usageMetadata.promptTokenCount || 0,
                    outputTokens: response.usageMetadata.candidatesTokenCount || 0,
                } : undefined,
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Reasoning failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * gemini-structured: JSON structured output
 * Uses responseSchema for validated JSON responses
 */
export const geminiStructuredHandler: CapabilityHandler = {
    id: 'gemini-structured',
    name: 'Gemini Structured Output',
    source: 'ai-provider',
    providerId: 'gemini',
    capabilities: ['keywords', 'extract'],
    priority: 85,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'gemini-structured';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Gemini API key not configured', handlerId, startTime);
        }

        const model = await getUserSelectedModel(opts);
        if (!model) {
            return errorResult('No Gemini model selected in Settings', handlerId, startTime);
        }

        // Schema must be provided in context
        const schema = opts.schema || opts.context?.schema;
        if (!schema) {
            return errorResult('No schema provided for structured output', handlerId, startTime);
        }

        try {
            const { GoogleGenAI } = await import('@google/genai');
            const genai = new GoogleGenAI({ apiKey });

            const response = await genai.models.generateContent({
                model,
                contents: opts.prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema as object,
                    systemInstruction: opts.systemPrompt,
                }
            });

            const jsonText = response.text;
            if (!jsonText) {
                return errorResult('No structured output generated', handlerId, startTime);
            }

            // Parse and return as data
            try {
                const data = JSON.parse(jsonText);
                return {
                    success: true,
                    text: jsonText,
                    data,
                    handlerUsed: handlerId,
                    source: 'ai-provider',
                    latencyMs: Date.now() - startTime,
                    model,
                };
            } catch {
                return errorResult('Failed to parse structured output as JSON', handlerId, startTime);
            }
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Structured generation failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * gemini-image: Image generation
 * Uses responseModalities: ['IMAGE'] for Gemini image models
 */
export const geminiImageHandler: CapabilityHandler = {
    id: 'gemini-image',
    name: 'Gemini Image Generation',
    source: 'ai-provider',
    providerId: 'gemini',
    capabilities: ['images'],
    priority: 90,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'gemini-image';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Gemini API key not configured', handlerId, startTime);
        }

        // For image generation, use image-specific model
        // User can select from image models in Settings
        const model = opts.model || await getUserSelectedModel(opts);

        try {
            const result = await geminiProvider.generateImage(apiKey, {
                prompt: opts.prompt,
                model: model || 'gemini-2.5-flash-image', // Fallback for image generation
            });

            if (!result.success) {
                return errorResult(result.error || 'Image generation failed', handlerId, startTime);
            }

            return {
                success: true,
                text: result.content, // data URL
                data: {
                    url: result.content,
                    model: result.model,
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime,
                model: result.model,
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Image generation failed',
                handlerId,
                startTime
            );
        }
    }
};

// ============================================
// ALL HANDLERS
// ============================================

export const geminiHandlers: CapabilityHandler[] = [
    geminiGenerateHandler,
    geminiResearchHandler,
    geminiReasonHandler,
    geminiStructuredHandler,
    geminiImageHandler,
];
