/**
 * DeepSeek Handler (Stub)
 * FSD: lib/handlers/providers/deepseek.ts
 * 
 * NOTE: This is a stub referencing the actual implementation in lib/ai/providers/deepseek/
 * The real handlers are registered via lib/ai/providers/deepseek/capabilities.ts
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const deepseekHandler: CapabilityHandler = {
    id: 'deepseek-stub',
    name: 'DeepSeek AI (Stub)',
    source: 'ai-provider',
    providerId: 'deepseek',
    capabilities: ['generate', 'code', 'reasoning'],
    priority: 0, // Low priority - actual handlers in lib/ai/providers/deepseek/ take precedence
    isAvailable: false, // Use the real handlers instead
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Use actual DeepSeek handlers from lib/ai/providers/deepseek/capabilities.ts',
            handlerUsed: 'deepseek-stub',
            source: 'ai-provider',
            latencyMs: 0,
        };
    },
};
