/**
 * Internal Linker Handler (Stub)
 * FSD: lib/handlers/local/internalLinks.ts
 * 
 * NOTE: This is a placeholder. Internal linking is handled through the
 * campaigns feature module directly.
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const internalLinkerHandler: CapabilityHandler = {
    id: 'internal-linker',
    name: 'Internal Linker',
    source: 'local',
    capabilities: ['internal-link'],
    priority: 50,
    isAvailable: false, // Stub - use features/campaigns directly
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Internal linking should use features/campaigns directly',
            handlerUsed: 'internal-linker',
            source: 'local',
            latencyMs: 0,
        };
    },
};
