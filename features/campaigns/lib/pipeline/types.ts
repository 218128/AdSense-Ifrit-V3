/**
 * Pipeline Types
 * FSD: features/campaigns/lib/pipeline/types.ts
 * 
 * Type definitions for the unified campaign pipeline.
 */

import type { Campaign, PipelineContext, RunItem } from '../../model/types';
import type { WPSite } from '@/features/wordpress';

// ============================================================================
// Stage Types
// ============================================================================

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface StageResult {
    success: boolean;
    duration: number;
    error?: string;
    data?: unknown;
}

export interface PipelineStage {
    id: string;
    name: string;
    optional: boolean;
    condition?: (ctx: PipelineContext, campaign: Campaign) => boolean;
    execute: (ctx: PipelineContext, campaign: Campaign, wpSite: WPSite) => Promise<void>;
}

export interface StageGroup {
    id: string;
    name: string;
    parallel: boolean;
    runItemStatus: RunItem['status'];
    stages: PipelineStage[];
}

// ============================================================================
// Checkpoint Types
// ============================================================================

export interface Checkpoint {
    runId: string;
    campaignId: string;
    itemId: string;
    completedStages: string[];
    stageData: Record<string, StageResult>;
    context: Partial<PipelineContext>;
    createdAt: number;
    updatedAt: number;
}

// ============================================================================
// Progress Types
// ============================================================================

export interface PipelineProgress {
    phase: string;
    currentStage?: string;
    completedStages: string[];
    totalStages: number;
    percentage: number;
    status: RunItem['status'];
}

export type ProgressCallback = (progress: PipelineProgress) => void;

// ============================================================================
// Pipeline Options
// ============================================================================

export interface PipelineOptions {
    onProgress?: ProgressCallback;
    onStatusChange?: (status: RunItem['status']) => void;
    resumeFromCheckpoint?: boolean;
}
