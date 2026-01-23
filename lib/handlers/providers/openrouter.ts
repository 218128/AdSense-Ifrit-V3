/**
 * OpenRouter Handler (Stub)
 * FSD: lib/handlers/providers/openrouter.ts
 * 
 * NOTE: This is a stub referencing the actual implementation in lib/ai/providers/openrouter/
 * The real handlers are registered via lib/ai/providers/openrouter/capabilities.ts
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const openrouterHandler: CapabilityHandler = {
    id: 'openrouter-stub',
    name: 'OpenRouter AI (Stub)',
    source: 'ai-provider',
    providerId: 'openrouter',
    capabilities: ['generate', 'research', 'reasoning'],
    priority: 0, // Low priority - actual handlers in lib/ai/providers/openrouter/ take precedence
    isAvailable: false, // Use the real handlers instead
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Use actual OpenRouter handlers from lib/ai/providers/openrouter/capabilities.ts',
            handlerUsed: 'openrouter-stub',
            source: 'ai-provider',
            latencyMs: 0,
        };
    },
};
