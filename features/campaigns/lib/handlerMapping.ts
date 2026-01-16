/**
 * Campaign Handler Mapping
 * FSD: features/campaigns/lib/handlerMapping.ts
 * 
 * Maps Campaign aiConfig.provider to capability handler IDs.
 */

import type { Campaign } from '../model/types';

// ============================================================================
// Handler Mapping
// ============================================================================

type CapabilityType = 'generate' | 'research' | 'images' | 'analyze';
// Define Provider directly since AIConfig.provider is now optional
type Provider = 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';

/**
 * Map provider to preferred handler ID for a capability
 */
const HANDLER_MAPPING: Record<Provider, Partial<Record<CapabilityType, string>>> = {
    perplexity: {
        generate: 'perplexity-chat',
        research: 'perplexity-chat',
        analyze: 'perplexity-reason',
    },
    gemini: {
        generate: 'gemini',
        research: 'gemini',
        images: 'gemini',
        analyze: 'gemini',
    },
    deepseek: {
        generate: 'deepseek',
        research: 'deepseek',
        analyze: 'deepseek',
    },
    openrouter: {
        generate: 'openrouter',
        research: 'openrouter',
        analyze: 'openrouter',
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
 * IMPORTANT: Only return a preferredHandler for EXPLICIT overrides.
 * Otherwise return undefined to use the Settings capability chain.
 * 
 * - For pillar articles with researchProvider === 'perplexity': use perplexity-deep-research
 * - For explicit researchProvider === 'perplexity': use perplexity-chat
 * - Otherwise: undefined (respect Settings capability priority chain)
 */
export function getResearchHandler(aiConfig: Campaign['aiConfig']): string | undefined {
    // Only override for explicit Perplexity research preference
    if (aiConfig.researchProvider === 'perplexity') {
        // Pillar articles get deep research
        if (aiConfig.articleType === 'pillar') {
            return 'perplexity-deep-research';
        }
        return 'perplexity-chat';
    }

    // Return undefined to use Settings capability chain (Gemini first, etc.)
    return undefined;
}

/**
 * Get content generation handler based on aiConfig
 * 
 * IMPORTANT: Don't override based on aiConfig.provider - that's a general preference.
 * Let the Settings capability chain handle handler selection.
 * Only return preferredHandler for special cases (none currently).
 */
export function getGenerateHandler(aiConfig: Campaign['aiConfig']): string | undefined {
    // Don't override - let Settings capability chain determine handler order
    // The aiConfig.provider is just metadata, not a forced override
    void aiConfig; // eslint-disable-line
    return undefined;
}
