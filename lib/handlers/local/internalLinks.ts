/**
 * Internal Linker Handler (Stub)
 * FSD: lib/handlers/local/internalLinks.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const internalLinkerHandler: CapabilityHandler = {
    capability: 'linking:internal',
    name: 'Internal Linker',
    provider: 'local',
    execute: async (params) => {
        const { injectInternalLinks } = await import('@/features/campaigns');
        return injectInternalLinks(params.html || '', params.suggestions || []);
    },
};
