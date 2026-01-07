/**
 * Checkpoint Management
 * FSD: features/campaigns/lib/pipeline/checkpoints.ts
 * 
 * Save and load pipeline checkpoints for resume capability.
 */

import type { Checkpoint, StageResult } from './types';
import type { PipelineContext } from '../../model/types';

const CHECKPOINT_PREFIX = 'ifrit_pipeline_checkpoint_';

// ============================================================================
// Save Checkpoint
// ============================================================================

export function saveCheckpoint(
    campaignId: string,
    itemId: string,
    completedStages: Set<string>,
    stageResults: Map<string, StageResult>,
    ctx: PipelineContext
): Checkpoint {
    const checkpoint: Checkpoint = {
        runId: `ckpt_${Date.now()}`,
        campaignId,
        itemId,
        completedStages: Array.from(completedStages),
        stageData: Object.fromEntries(stageResults),
        context: {
            research: ctx.research,
            content: ctx.content,
            images: ctx.images,
            matchedAuthor: ctx.matchedAuthor,
            qualityScore: ctx.qualityScore,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    // Store in localStorage for client-side persistence
    if (typeof window !== 'undefined') {
        try {
            const key = `${CHECKPOINT_PREFIX}${campaignId}_${itemId}`;
            localStorage.setItem(key, JSON.stringify(checkpoint));
        } catch {
            console.warn('[Checkpoint] Failed to save to localStorage');
        }
    }

    return checkpoint;
}

// ============================================================================
// Load Checkpoint
// ============================================================================

export function loadCheckpoint(campaignId: string, itemId: string): Checkpoint | null {
    if (typeof window === 'undefined') return null;

    try {
        const key = `${CHECKPOINT_PREFIX}${campaignId}_${itemId}`;
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const checkpoint = JSON.parse(stored) as Checkpoint;

        // Validate checkpoint is recent (less than 24 hours old)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - checkpoint.updatedAt > maxAge) {
            clearCheckpoint(campaignId, itemId);
            return null;
        }

        return checkpoint;
    } catch {
        return null;
    }
}

// ============================================================================
// Clear Checkpoint
// ============================================================================

export function clearCheckpoint(campaignId: string, itemId: string): void {
    if (typeof window === 'undefined') return;

    try {
        const key = `${CHECKPOINT_PREFIX}${campaignId}_${itemId}`;
        localStorage.removeItem(key);
    } catch {
        // Ignore errors
    }
}

// ============================================================================
// List All Checkpoints
// ============================================================================

export function listCheckpoints(): Checkpoint[] {
    if (typeof window === 'undefined') return [];

    const checkpoints: Checkpoint[] = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CHECKPOINT_PREFIX)) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    checkpoints.push(JSON.parse(stored));
                }
            }
        }
    } catch {
        // Ignore errors
    }

    return checkpoints;
}

// ============================================================================
// Clear Expired Checkpoints
// ============================================================================

export function clearExpiredCheckpoints(): number {
    if (typeof window === 'undefined') return 0;

    let cleared = 0;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    try {
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CHECKPOINT_PREFIX)) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const checkpoint = JSON.parse(stored) as Checkpoint;
                    if (Date.now() - checkpoint.updatedAt > maxAge) {
                        keysToRemove.push(key);
                    }
                }
            }
        }

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
            cleared++;
        }
    } catch {
        // Ignore errors
    }

    return cleared;
}
