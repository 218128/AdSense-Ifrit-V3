/**
 * WordPress Publish Handler (Stub)
 * FSD: lib/handlers/integration/wordpress.ts
 * 
 * NOTE: This is a placeholder. WordPress publishing is handled through
 * features/wordpress/lib/ directly.
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const wpPublishHandler: CapabilityHandler = {
    id: 'wp-publish',
    name: 'WordPress Publisher',
    source: 'integration',
    capabilities: ['wp-publish'],
    priority: 50,
    isAvailable: false, // Not available - use wordpress feature directly
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'WordPress publishing should use features/wordpress directly, not the capability system',
            handlerUsed: 'wp-publish',
            source: 'integration',
            latencyMs: 0,
        };
    },
};
