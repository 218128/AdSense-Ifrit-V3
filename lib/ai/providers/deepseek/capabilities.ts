/**
 * DeepSeek Capability Handlers
 * 
 * Maps DeepSeek provider methods to AIServices capabilities.
 * Each handler exposes one DeepSeek feature as a capability.
 * 
 * DeepSeek uses OpenAI-compatible API at https://api.deepseek.com
 * Models: deepseek-chat (V3.2), deepseek-reasoner (thinking mode)
 * 
 * Handler IDs follow pattern: {provider}-{action}
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../../services/types';
import { deepseekProvider } from '../deepseek';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get API key from options context
 * Follows same pattern as gemini/capabilities.ts
 */
async function getApiKey(options: ExecuteOptions): Promise<string | undefined> {
    // Try from new providerKeys format first (passed from client to server)
    const providerKeys = options.context?.providerKeys as Record<string, string> | undefined;
    if (providerKeys?.deepseek) {
        return providerKeys.deepseek;
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
            const keys = useSettingsStore.getState().providerKeys.deepseek;
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
            const selectedModel = state.selectedModels?.deepseek;
            if (selectedModel) {
                return selectedModel;
            }

            // Fallback to config default (for initial setup before user selects)
            return PROVIDER_CONFIGS.deepseek?.defaultModel;
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
 * deepseek-generate: Text generation using deepseek-chat model
 * DeepSeek V3.2 is competitive with GPT-4 at lower cost
 */
export const deepseekGenerateHandler: CapabilityHandler = {
    id: 'deepseek-generate',
    name: 'DeepSeek Chat',
    source: 'ai-provider',
    providerId: 'deepseek',
    capabilities: ['generate', 'summarize', 'translate', 'keywords'],
    priority: 85,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'deepseek-generate';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('DeepSeek API key not configured', handlerId, startTime);
        }

        const model = await getUserSelectedModel(opts);

        try {
            const result = await deepseekProvider.chat(apiKey, {
                prompt: opts.prompt,
                model: model || 'deepseek-chat',
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
 * deepseek-reason: Deep reasoning using deepseek-reasoner model
 * Uses chain-of-thought reasoning (like GPT o1)
 */
export const deepseekReasonHandler: CapabilityHandler = {
    id: 'deepseek-reason',
    name: 'DeepSeek Reasoner',
    source: 'ai-provider',
    providerId: 'deepseek',
    capabilities: ['reasoning', 'analyze'],
    priority: 90,  // Higher priority for reasoning tasks
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'deepseek-reason';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('DeepSeek API key not configured', handlerId, startTime);
        }

        try {
            // Always use deepseek-reasoner for reasoning tasks
            const result = await deepseekProvider.reason(apiKey, {
                prompt: opts.prompt,
                model: 'deepseek-reasoner',
                maxTokens: opts.maxTokens || 8000,
                temperature: opts.temperature,
                systemPrompt: opts.systemPrompt,
            });

            if (!result.success) {
                return errorResult(result.error || 'Reasoning failed', handlerId, startTime);
            }

            return {
                success: true,
                text: result.content,
                data: {
                    reasoning: result.reasoning, // Chain-of-thought from R1
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime,
                model: result.model,
                usage: result.usage,
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
 * deepseek-code: Code generation and analysis
 * Uses deepseek-chat which includes coding capabilities in V3.2
 */
export const deepseekCodeHandler: CapabilityHandler = {
    id: 'deepseek-code',
    name: 'DeepSeek Coder',
    source: 'ai-provider',
    providerId: 'deepseek',
    capabilities: ['code'],
    priority: 88,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'deepseek-code';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('DeepSeek API key not configured', handlerId, startTime);
        }

        try {
            // Add coding-specific system prompt
            const systemPrompt = opts.systemPrompt ||
                'You are an expert programmer. Provide clear, well-commented code with explanations.';

            const result = await deepseekProvider.chat(apiKey, {
                prompt: opts.prompt,
                model: 'deepseek-chat',  // V3.2 includes strong coding
                maxTokens: opts.maxTokens || 4000,
                temperature: opts.temperature ?? 0.3, // Lower temp for code
                systemPrompt,
            });

            if (!result.success) {
                return errorResult(result.error || 'Code generation failed', handlerId, startTime);
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
                error instanceof Error ? error.message : 'Code generation failed',
                handlerId,
                startTime
            );
        }
    }
};

// ============================================
// ALL HANDLERS
// ============================================

export const deepseekHandlers: CapabilityHandler[] = [
    deepseekGenerateHandler,
    deepseekReasonHandler,
    deepseekCodeHandler,
];
