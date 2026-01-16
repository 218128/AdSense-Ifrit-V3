/**
 * Pipeline Runner (DEPRECATED)
 * FSD: features/campaigns/lib/PipelineRunner.ts
 * 
 * @deprecated Use './pipeline/orchestrator.ts' instead.
 * This file is maintained for backward compatibility only.
 * All exports redirect to the new unified pipeline.
 * 
 * Migration guide:
 * - PipelineRunner class    → Use runPipeline() function
 * - runPipelineWithCheckpointing() → Use runPipeline({ resumeFromCheckpoint: true })
 * - PipelineRunner.loadCheckpoint() → Use loadCheckpoint() from './pipeline/checkpoints'
 * 
 * The new pipeline system (pipeline/orchestrator.ts) includes all features from
 * this class plus:
 * - Parallel execution within stage groups
 * - GlobalActionStatus integration for visibility
 * - Additional stages (humanizer, readability, affiliate_disclosure, etc.)
 * - Better logging via unifiedLogStore
 */

import type { Campaign, PipelineContext, SourceItem } from '../model/types';
import type { WPSite } from '@/features/wordpress';

// Re-export from unified pipeline
export {
    runPipeline,
    createRun,
    hasCheckpoint,
    getCheckpointInfo,
} from './pipeline';

export {
    loadCheckpoint,
    clearCheckpoint,
    saveCheckpoint,
} from './pipeline/checkpoints';

export type {
    StageStatus,
    StageResult,
    PipelineStage,
    StageGroup,
    Checkpoint,
    PipelineProgress,
    ProgressCallback,
    PipelineOptions,
} from './pipeline/types';

// ============================================================================
// Legacy Aliases
// ============================================================================

/**
 * @deprecated Use runPipeline() with { resumeFromCheckpoint: true } instead.
 */
export async function runPipelineWithCheckpointing(
    campaign: Campaign,
    sourceItem: SourceItem,
    wpSite: WPSite,
    onProgress?: (progress: import('./pipeline/types').PipelineProgress) => void
): Promise<PipelineContext> {
    console.warn('[PipelineRunner] DEPRECATED: Use runPipeline() from "./pipeline" instead');

    const { runPipeline, loadCheckpoint } = await import('./pipeline');

    // Check for existing checkpoint
    const existingCheckpoint = loadCheckpoint(campaign.id, sourceItem.topic);
    if (existingCheckpoint) {
        console.log('[PipelineRunner] Resuming from checkpoint:', existingCheckpoint.completedStages);
    }

    return runPipeline(campaign, sourceItem, wpSite, {
        onProgress,
        resumeFromCheckpoint: true,
    });
}

// ============================================================================
// Deprecated Class (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use runPipeline() function instead.
 * 
 * This class is provided for backward compatibility with code that instantiates
 * PipelineRunner directly. New code should use the functional API from './pipeline'.
 */
export class PipelineRunner {
    constructor() {
        console.warn(
            '[PipelineRunner] DEPRECATED: Use runPipeline() from "./pipeline" instead.\n' +
            'This class is maintained for backward compatibility only.'
        );
    }

    /**
     * Run the pipeline
     * @deprecated Use runPipeline() function instead
     */
    async run(
        campaign: Campaign,
        sourceItem: SourceItem,
        wpSite: WPSite,
        options?: {
            onProgress?: (progress: import('./pipeline/types').PipelineProgress) => void;
            checkpoint?: import('./pipeline/types').Checkpoint;
        }
    ): Promise<PipelineContext> {
        const { runPipeline } = await import('./pipeline');
        return runPipeline(campaign, sourceItem, wpSite, {
            onProgress: options?.onProgress,
            resumeFromCheckpoint: !!options?.checkpoint,
        });
    }

    /**
     * Load checkpoint from storage
     * @deprecated Use loadCheckpoint() from './pipeline/checkpoints' instead
     */
    static loadCheckpoint(campaignId: string, itemId: string) {
        console.warn('[PipelineRunner.loadCheckpoint] DEPRECATED: Use loadCheckpoint() from "./pipeline/checkpoints"');
        // Dynamic import to avoid circular dependencies
        return import('./pipeline/checkpoints').then(m => m.loadCheckpoint(campaignId, itemId));
    }

    /**
     * Clear checkpoint after successful completion
     * @deprecated Use clearCheckpoint() from './pipeline/checkpoints' instead
     */
    static clearCheckpoint(campaignId: string, itemId: string): void {
        console.warn('[PipelineRunner.clearCheckpoint] DEPRECATED: Use clearCheckpoint() from "./pipeline/checkpoints"');
        import('./pipeline/checkpoints').then(m => m.clearCheckpoint(campaignId, itemId));
    }

    /**
     * Get results - not available in new pipeline (use ctx directly)
     * @deprecated Pipeline context contains all results
     */
    getResults(): Map<string, import('./pipeline/types').StageResult> {
        console.warn('[PipelineRunner.getResults] DEPRECATED: Access results from PipelineContext directly');
        return new Map();
    }

    /**
     * Get checkpoint - not available in new pipeline
     * @deprecated Use loadCheckpoint() to retrieve checkpoints
     */
    getCheckpoint(): import('./pipeline/types').Checkpoint | null {
        console.warn('[PipelineRunner.getCheckpoint] DEPRECATED: Use loadCheckpoint() from "./pipeline/checkpoints"');
        return null;
    }
}

/**
 * @deprecated Use runPipeline() function instead
 */
export const defaultPipelineRunner = new PipelineRunner();
