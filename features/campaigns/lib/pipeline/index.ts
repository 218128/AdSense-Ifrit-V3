/**
 * Pipeline Module
 * FSD: features/campaigns/lib/pipeline/index.ts
 * 
 * Barrel export for the unified campaign pipeline.
 */

// Main orchestrator
export {
    runPipeline,
    createRun,
    hasCheckpoint,
    getCheckpointInfo,
} from './orchestrator';

// Types
export type {
    StageStatus,
    StageResult,
    PipelineStage,
    StageGroup,
    Checkpoint,
    PipelineProgress,
    ProgressCallback,
    PipelineOptions,
} from './types';

// Checkpoints (for advanced use)
export {
    saveCheckpoint,
    loadCheckpoint,
    clearCheckpoint,
    listCheckpoints,
    clearExpiredCheckpoints,
} from './checkpoints';

// Stages (for testing/customization)
export {
    allStages,
    getTotalStageCount,
    getStageById,
    validationStages,
    enrichmentStages,
    generationStages,
    enhancementStages,
    qualityStages,
    optimizationStages,
    publishStages,
} from './stages';
