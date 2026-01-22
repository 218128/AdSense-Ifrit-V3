/**
 * OpenRouter Capability Handlers
 * 
 * Maps OpenRouter provider methods to AIServices capabilities.
 * OpenRouter aggregates 300+ AI models through a unified API.
 * 
 * Key features:
 * - Access to models from OpenAI, Anthropic, Google, Meta, etc.
 * - Automatic fallback and load balancing
 * - Pay-per-use pricing with free tiers
 * - OpenAI-compatible API at https://openrouter.ai/api/v1
 * 
 * Handler IDs follow pattern: {provider}-{action}
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../../services/types';
import { openrouterProvider } from '../openrouter';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get API key from options context
 */
async function getApiKey(options: ExecuteOptions): Promise<string | undefined> {
    // Try from new providerKeys format first (passed from client to server)
    const providerKeys = options.context?.providerKeys as Record<string, string> | undefined;
    if (providerKeys?.openrouter) {
        return providerKeys.openrouter;
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
            const keys = useSettingsStore.getState().providerKeys.openrouter;
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
 * OpenRouter has 300+ models - user must select which to use
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
            const selectedModel = state.selectedModels?.openrouter;
            if (selectedModel) {
                return selectedModel;
            }

            // Fallback to config default
            return PROVIDER_CONFIGS.openrouter?.defaultModel;
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
 * openrouter-generate: Text generation using any model via OpenRouter
 * 
 * OpenRouter gives access to 300+ models. The user selects which model
 * to use in Settings. Popular choices include:
 * - anthropic/claude-3.5-sonnet (best quality)
 * - openai/gpt-4o (balanced)
 * - deepseek/deepseek-chat:free (cost-effective)
 * - meta-llama/llama-3.3-70b-instruct (open source)
 */
export const openrouterGenerateHandler: CapabilityHandler = {
    id: 'openrouter-generate',
    name: 'OpenRouter Multi-Model',
    source: 'ai-provider',
    providerId: 'openrouter',
    capabilities: ['generate', 'summarize', 'translate', 'code'],
    priority: 80,  // Lower than dedicated providers (Gemini=90, DeepSeek=85)
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'openrouter-generate';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('OpenRouter API key not configured', handlerId, startTime);
        }

        const model = await getUserSelectedModel(opts);

        try {
            const result = await openrouterProvider.chat(apiKey, {
                prompt: opts.prompt,
                model: model || 'deepseek/deepseek-chat:free', // Free fallback
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
 * openrouter-research: Web-grounded research via compatible models
 * 
 * Uses Perplexity models via OpenRouter for web-grounded research.
 * Alternative to direct Perplexity API with OpenRouter's unified billing.
 */
export const openrouterResearchHandler: CapabilityHandler = {
    id: 'openrouter-research',
    name: 'OpenRouter Research',
    source: 'ai-provider',
    providerId: 'openrouter',
    capabilities: ['research'],
    priority: 70,  // Lower priority than Perplexity direct (85)
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'openrouter-research';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('OpenRouter API key not configured', handlerId, startTime);
        }

        try {
            // Use Perplexity via OpenRouter for research (web-grounded)
            const result = await openrouterProvider.chat(apiKey, {
                prompt: opts.prompt,
                model: 'perplexity/sonar-pro', // Web-grounded model
                maxTokens: opts.maxTokens || 4000,
                temperature: opts.temperature ?? 0.5,
                systemPrompt: opts.systemPrompt ||
                    'You are a research assistant. Provide comprehensive, well-sourced information.',
            });

            if (!result.success) {
                return errorResult(result.error || 'Research failed', handlerId, startTime);
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
                error instanceof Error ? error.message : 'Research failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * openrouter-reason: Deep reasoning via o1 or DeepSeek R1
 * 
 * Access chain-of-thought reasoning models:
 * - openai/o1 (GPT-4 class reasoning)
 * - deepseek/deepseek-reasoner (cost-effective alternative)
 */
export const openrouterReasonHandler: CapabilityHandler = {
    id: 'openrouter-reason',
    name: 'OpenRouter Reasoning',
    source: 'ai-provider',
    providerId: 'openrouter',
    capabilities: ['reasoning', 'analyze'],
    priority: 75,  // Lower than DeepSeek direct (90)
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'openrouter-reason';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('OpenRouter API key not configured', handlerId, startTime);
        }

        try {
            // Use reasoning model via OpenRouter
            const result = await openrouterProvider.chat(apiKey, {
                prompt: opts.prompt,
                model: opts.model || 'deepseek/deepseek-reasoner', // R1 reasoning
                maxTokens: opts.maxTokens || 8000,
                temperature: opts.temperature ?? 0.7,
                systemPrompt: opts.systemPrompt,
            });

            if (!result.success) {
                return errorResult(result.error || 'Reasoning failed', handlerId, startTime);
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
                error instanceof Error ? error.message : 'Reasoning failed',
                handlerId,
                startTime
            );
        }
    }
};

// ============================================
// ALL HANDLERS
// ============================================

export const openrouterHandlers: CapabilityHandler[] = [
    openrouterGenerateHandler,
    openrouterResearchHandler,
    openrouterReasonHandler,
];
