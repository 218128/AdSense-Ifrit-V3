/**
 * Gemini Handler (Stub)
 * FSD: lib/handlers/providers/gemini.ts
 * 
 * NOTE: This is a stub referencing the actual implementation in lib/ai/providers/gemini/
 * The real handlers are registered via lib/ai/providers/gemini/capabilities.ts
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const geminiHandler: CapabilityHandler = {
    id: 'gemini-stub',
    name: 'Gemini AI (Stub)',
    source: 'ai-provider',
    providerId: 'gemini',
    capabilities: ['generate'],
    priority: 0, // Low priority - actual handlers in lib/ai/providers/gemini/ take precedence
    isAvailable: false, // Use the real handlers instead
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Use actual Gemini handlers from lib/ai/providers/gemini/capabilities.ts',
            handlerUsed: 'gemini-stub',
            source: 'ai-provider',
            latencyMs: 0,
        };
    },
};
