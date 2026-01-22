/**
 * Gemini Handler (Stub)
 * FSD: lib/handlers/providers/gemini.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const geminiHandler: CapabilityHandler = {
    capability: 'llm:gemini',
    name: 'Gemini AI',
    provider: 'google',
    execute: async (params) => {
        // Defer to existing AI services
        const { AIServices } = await import('@/lib/ai/services/AIServices');
        const services = AIServices.getInstance();
        return services.generateText(params.prompt, { provider: 'gemini', ...params.options });
    },
};
