/**
 * Stage Registry
 * FSD: features/campaigns/lib/pipeline/stages/index.ts
 * 
 * Barrel export for all pipeline stages in execution order.
 */

import type { StageGroup } from '../types';
import { validationStages } from './01-validation';
import { enrichmentStages } from './02-enrichment';
import { generationStages } from './03-generation';
import { enhancementStages } from './04-enhancement';
import { qualityStages } from './05-quality';
import { optimizationStages } from './06-optimization';
import { publishStages } from './07-publish';

/**
 * All pipeline stages in execution order.
 * Groups are executed sequentially, but stages within parallel groups run concurrently.
 */
export const allStages: StageGroup[] = [
    validationStages,     // 01: Dedup check
    enrichmentStages,     // 02: Research + Author (parallel)
    generationStages,     // 03: Content generation
    enhancementStages,    // 04: E-E-A-T + Images + Linking + Schema (parallel)
    qualityStages,        // 05: Quality scoring + Smart review
    optimizationStages,   // 06: Spinner + Humanizer + Readability
    publishStages,        // 07: Publish + Record + Multi-site
];

/**
 * Get total stage count for progress calculation.
 */
export function getTotalStageCount(): number {
    return allStages.reduce((sum, group) => sum + group.stages.length, 0);
}

/**
 * Get stage by ID across all groups.
 */
export function getStageById(id: string) {
    for (const group of allStages) {
        const stage = group.stages.find(s => s.id === id);
        if (stage) return { group, stage };
    }
    return null;
}

// Re-export individual stage groups for testing/customization
export {
    validationStages,
    enrichmentStages,
    generationStages,
    enhancementStages,
    qualityStages,
    optimizationStages,
    publishStages,
};
