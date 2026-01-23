/**
 * Perplexity Handler (Stub)
 * FSD: lib/handlers/providers/perplexity.ts
 * 
 * NOTE: This is a stub referencing the actual implementation in lib/ai/providers/perplexity/
 * The real handlers are registered via lib/ai/providers/perplexity/capabilities.ts
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const perplexityHandler: CapabilityHandler = {
    id: 'perplexity-stub',
    name: 'Perplexity AI (Stub)',
    source: 'ai-provider',
    providerId: 'perplexity',
    capabilities: ['research'],
    priority: 0, // Low priority - actual handlers in lib/ai/providers/perplexity/ take precedence
    isAvailable: false, // Use the real handlers instead
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Use actual Perplexity handlers from lib/ai/providers/perplexity/capabilities.ts',
            handlerUsed: 'perplexity-stub',
            source: 'ai-provider',
            latencyMs: 0,
        };
    },
};
