/**
 * Author Matcher Handler (Stub)
 * FSD: lib/handlers/local/authors.ts
 */

import type { CapabilityHandler } from '@/lib/core/Engine';

export const authorMatcherHandler: CapabilityHandler = {
    capability: 'author:match',
    name: 'Author Matcher',
    provider: 'local',
    execute: async (params) => {
        const { matchAuthorForPipeline } = await import('@/features/campaigns');
        return matchAuthorForPipeline(params.topic || '', params.niche);
    },
};
