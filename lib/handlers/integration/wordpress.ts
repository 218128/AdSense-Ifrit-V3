/**
 * WordPress Publish Handler (Stub)
 * FSD: lib/handlers/integration/wordpress.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const wpPublishHandler: CapabilityHandler = {
    capability: 'wp:publish',
    name: 'WordPress Publisher',
    provider: 'wordpress',
    execute: async (params) => {
        const { publishToWordPress } = await import('@/features/wordpress');
        return publishToWordPress(params.siteId, params.post);
    },
};
