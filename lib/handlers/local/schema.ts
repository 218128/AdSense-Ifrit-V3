/**
 * Schema Generator Handler (Stub)
 * FSD: lib/handlers/local/schema.ts
 * 
 * NOTE: This is a placeholder. Schema generation is handled through the
 * campaigns feature module directly.
 */

import type { CapabilityHandler, ExecuteResult } from '@/lib/ai/services/types';

export const schemaGeneratorHandler: CapabilityHandler = {
    id: 'schema-generator',
    name: 'Schema Generator',
    source: 'local',
    capabilities: ['schema-generate'],
    priority: 50,
    isAvailable: false, // Stub - use features/campaigns directly
    execute: async (): Promise<ExecuteResult> => {
        return {
            success: false,
            error: 'Schema generation should use features/campaigns directly',
            handlerUsed: 'schema-generator',
            source: 'local',
            latencyMs: 0,
        };
    },
};
