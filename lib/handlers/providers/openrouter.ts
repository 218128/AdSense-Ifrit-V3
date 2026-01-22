/**
 * OpenRouter Handler (Stub)
 * FSD: lib/handlers/providers/openrouter.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const openrouterHandler: CapabilityHandler = {
    capability: 'llm:openrouter',
    name: 'OpenRouter',
    provider: 'openrouter',
    execute: async (params) => {
        const { AIServices } = await import('@/lib/ai/services/AIServices');
        const services = AIServices.getInstance();
        return services.generateText(params.prompt, { provider: 'openrouter', ...params.options });
    },
};
