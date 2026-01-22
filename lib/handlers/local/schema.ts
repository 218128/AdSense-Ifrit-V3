/**
 * Schema Generator Handler (Stub)
 * FSD: lib/handlers/local/schema.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const schemaGeneratorHandler: CapabilityHandler = {
    capability: 'schema:generate',
    name: 'Schema Generator',
    provider: 'local',
    execute: async (params) => {
        const { generateAllSchemas } = await import('@/features/campaigns');
        return generateAllSchemas(params.html || '', params.title || '', params.faq || []);
    },
};
