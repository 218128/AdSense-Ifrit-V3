/**
 * Perplexity Handler (Stub)
 * FSD: lib/handlers/providers/perplexity.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const perplexityHandler: CapabilityHandler = {
    capability: 'llm:perplexity',
    name: 'Perplexity AI',
    provider: 'perplexity',
    execute: async (params) => {
        const { AIServices } = await import('@/lib/ai/services/AIServices');
        const services = AIServices.getInstance();
        return services.generateText(params.prompt, { provider: 'perplexity', ...params.options });
    },
};
