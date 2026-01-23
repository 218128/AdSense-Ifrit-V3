/**
 * Author Matcher Handler (Stub)
 * FSD: lib/handlers/local/authors.ts
 * 
 * NOTE: This is a placeholder. Author matching is handled through the
 * campaigns feature module directly.
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const authorMatcherHandler: CapabilityHandler = {
    id: 'author-matcher',
    name: 'Author Matcher',
    source: 'local',
    capabilities: ['author-match'],
    priority: 50,
    isAvailable: false, // Stub - use features/campaigns directly
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Author matching should use features/campaigns directly',
            handlerUsed: 'author-matcher',
            source: 'local',
            latencyMs: 0,
        };
    },
};
