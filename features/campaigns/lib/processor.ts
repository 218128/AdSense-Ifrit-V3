/**
 * Content Pipeline Processor (DEPRECATED)
 * FSD: features/campaigns/lib/processor.ts
 * 
 * @deprecated Use pipeline/orchestrator.ts instead.
 * This file is maintained for backward compatibility only.
 * All imports from this file are re-exported from the new unified pipeline.
 */

// Re-export everything from the new unified pipeline
export { runPipeline, createRun, hasCheckpoint, getCheckpointInfo } from './pipeline';
export type { PipelineOptions, PipelineProgress, ProgressCallback } from './pipeline';

// Re-export generators for backward compatibility
export { performResearch } from './researchService';
export { generateContent } from './contentGenerator';
export { generateImages } from './imageGenerator';
export { publishToWordPress } from './wpPublisher';

