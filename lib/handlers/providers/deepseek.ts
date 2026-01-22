/**
 * DeepSeek Handler (Stub)
 * FSD: lib/handlers/providers/deepseek.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const deepseekHandler: CapabilityHandler = {
    capability: 'llm:deepseek',
    name: 'DeepSeek AI',
    provider: 'deepseek',
    execute: async (params) => {
        const { AIServices } = await import('@/lib/ai/services/AIServices');
        const services = AIServices.getInstance();
        return services.generateText(params.prompt, { provider: 'deepseek', ...params.options });
    },
};
