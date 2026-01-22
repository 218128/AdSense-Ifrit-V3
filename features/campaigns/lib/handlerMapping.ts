/**
 * Campaign Handler Mapping
 * FSD: features/campaigns/lib/handlerMapping.ts
 * 
 * Maps Campaign aiConfig.provider to capability handler IDs.
 * 
 * IMPORTANT: Handler IDs must match exactly the IDs registered in:
 * - lib/ai/providers/gemini/capabilities.ts
 * - lib/ai/providers/deepseek/capabilities.ts  
 * - lib/ai/providers/openrouter/capabilities.ts
 * - lib/ai/providers/perplexity/capabilities.ts
 */

import type { Campaign } from '../model/types';

// ============================================================================
// Handler Mapping
// ============================================================================

type CapabilityType = 'generate' | 'research' | 'images' | 'analyze';
// Define Provider directly since AIConfig.provider is now optional
type Provider = 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';

/**
 * Map provider to preferred handler ID for a capability.
 * 
 * These MUST match the handler.id values from capabilities.ts files:
 * - gemini-generate, gemini-research, gemini-reason, gemini-image
 * - deepseek-generate, deepseek-reason, deepseek-code
 * - openrouter-generate, openrouter-research, openrouter-reason
 * - perplexity-chat, perplexity-reason, perplexity-search
 */
const HANDLER_MAPPING: Record<Provider, Partial<Record<CapabilityType, string>>> = {
    perplexity: {
        generate: 'perplexity-chat',
        research: 'perplexity-chat',
        analyze: 'perplexity-reason',
    },
    gemini: {
        generate: 'gemini-generate',   // FIXED: was 'gemini'
        research: 'gemini-research',   // FIXED: was 'gemini'
        images: 'gemini-image',        // FIXED: was 'gemini'
        analyze: 'gemini-reason',      // FIXED: was 'gemini'
    },
    deepseek: {
        generate: 'deepseek-generate', // FIXED: was 'deepseek'
        research: 'deepseek-generate', // DeepSeek chat can do research
        analyze: 'deepseek-reason',    // FIXED: was 'deepseek'
    },
    openrouter: {
        generate: 'openrouter-generate',   // FIXED: was 'openrouter'
        research: 'openrouter-research',   // FIXED: was 'openrouter'
        analyze: 'openrouter-reason',      // FIXED: was 'openrouter'
    },
};

/**
 * Get preferred handler for a provider and capability
 */
export function getPreferredHandler(
    provider: Provider,
    capability: CapabilityType
): string | undefined {
    return HANDLER_MAPPING[provider]?.[capability];
}

/**
 * Get research handler based on aiConfig
 * 
 * - For pillar articles with researchProvider === 'perplexity': use perplexity-deep-research
 * - For explicit researchProvider === 'perplexity': use perplexity-chat
 * - For explicit aiConfig.provider: use that provider's research handler
 * - Otherwise: undefined (respect Settings capability priority chain)
 */
export function getResearchHandler(aiConfig: Campaign['aiConfig']): string | undefined {
    // Priority 1: Explicit Perplexity research preference
    if (aiConfig.researchProvider === 'perplexity') {
        if (aiConfig.articleType === 'pillar') {
            return 'perplexity-deep-research';
        }
        return 'perplexity-chat';
    }

    // Priority 2: Campaign-level provider preference
    if (aiConfig.provider && aiConfig.provider in HANDLER_MAPPING) {
        return HANDLER_MAPPING[aiConfig.provider]?.research;
    }

    // Return undefined to use Settings capability chain
    return undefined;
}

/**
 * Get content generation handler based on aiConfig
 * 
 * - If campaign has explicit provider preference, use matching handler
 * - Otherwise: undefined (let Settings capability chain decide)
 */
export function getGenerateHandler(aiConfig: Campaign['aiConfig']): string | undefined {
    // Use campaign provider preference if set
    if (aiConfig.provider && aiConfig.provider in HANDLER_MAPPING) {
        return HANDLER_MAPPING[aiConfig.provider]?.generate;
    }

    // Return undefined to let Settings capability chain decide
    return undefined;
}

/**
 * Get image generation handler based on aiConfig.imageProvider
 */
export function getImageHandler(aiConfig: Campaign['aiConfig']): string | undefined {
    // Map image providers to their handler IDs
    const imageProviderMapping: Record<string, string> = {
        'gemini': 'gemini-image',
        'dalle': 'openrouter-generate', // DALL-E via OpenRouter
    };

    if (aiConfig.imageProvider && aiConfig.imageProvider in imageProviderMapping) {
        return imageProviderMapping[aiConfig.imageProvider];
    }

    // Return undefined to use Settings capability chain
    return undefined;
}

/**
 * Get analysis/reasoning handler based on aiConfig
 */
export function getAnalyzeHandler(aiConfig: Campaign['aiConfig']): string | undefined {
    if (aiConfig.provider && aiConfig.provider in HANDLER_MAPPING) {
        return HANDLER_MAPPING[aiConfig.provider]?.analyze;
    }
    return undefined;
}

