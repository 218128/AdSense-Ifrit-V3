/**
 * Pipeline Orchestrator
 * FSD: features/campaigns/lib/pipeline/orchestrator.ts
 * 
 * Unified pipeline orchestration replacing both processor.ts and PipelineRunner.ts.
 * Features:
 * - Stage groups with parallel execution
 * - Checkpointing for resume capability
 * - Progress callbacks for UI integration
 * - Graceful fallback on optional stage failures
 * - **Automatic GlobalActionStatus integration**
 */

import type { Campaign, PipelineContext, SourceItem, CampaignRun } from '../../model/types';
import type { WPSite } from '@/features/wordpress';
import type { PipelineOptions, StageResult, PipelineProgress } from './types';
import { allStages, getTotalStageCount } from './stages';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from './checkpoints';
import { useGlobalActionStatusStore } from '@/stores/globalActionStatusStore';
import { log, logError } from '@/stores/unifiedLogStore';

// ============================================================================
// Main Pipeline Execution
// ============================================================================

/**
 * Run the unified content pipeline for a single source item.
 * 
 * This replaces both the old processor.ts runPipeline() and PipelineRunner.run().
 * Automatically integrates with GlobalActionStatus for visibility.
 */
export async function runPipeline(
    campaign: Campaign,
    sourceItem: SourceItem,
    wpSite: WPSite,
    options?: PipelineOptions & { parentActionId?: string }
): Promise<PipelineContext> {
    // Initialize context
    const ctx: PipelineContext = {
        campaign,
        sourceItem,
        status: 'pending',
    };

    // Get global status store for visibility
    const statusStore = useGlobalActionStatusStore.getState();

    // Start pipeline action (nested under parent if provided)
    const pipelineActionId = statusStore.startAction(
        `Pipeline: ${sourceItem.topic.substring(0, 40)}...`,
        'campaign',
        {
            source: 'orchestrator',
            parentActionId: options?.parentActionId,
            origin: 'pipeline/orchestrator',
            retryable: true,
        }
    );

    // Log pipeline start
    log('info', 'campaign', 'orchestrator', `Pipeline started for: ${sourceItem.topic}`, {
        campaignId: campaign.id,
        metadata: { topic: sourceItem.topic, siteId: wpSite.id },
    });

    // Load checkpoint if resuming
    const checkpoint = options?.resumeFromCheckpoint
        ? loadCheckpoint(campaign.id, sourceItem.topic)
        : null;

    if (checkpoint) {
        console.log(`[Pipeline] Resuming from checkpoint: ${checkpoint.completedStages.length} stages done`);
        // Restore context from checkpoint
        Object.assign(ctx, checkpoint.context);
        statusStore.addStep(pipelineActionId, `Resuming from checkpoint (${checkpoint.completedStages.length} stages complete)`, 'success');
    }

    const completedStages = new Set<string>(checkpoint?.completedStages || []);
    const stageResults = new Map<string, StageResult>(
        checkpoint?.stageData ? Object.entries(checkpoint.stageData) : []
    );

    const totalStages = getTotalStageCount();
    let processedStages = completedStages.size;

    // Helper to calculate progress percentage
    const getPercentage = () => Math.round((processedStages / totalStages) * 100);

    // Helper to emit progress
    const emitProgress = (phase: string, status: PipelineContext['status']) => {
        options?.onProgress?.({
            phase,
            completedStages: Array.from(completedStages),
            totalStages,
            percentage: getPercentage(),
            status: status as PipelineProgress['status'],
        });
        options?.onStatusChange?.(status as PipelineProgress['status']);
    };

    try {
        // Update status with total stages
        statusStore.setProgress(pipelineActionId, processedStages, totalStages);

        // Execute stage groups in order
        for (const group of allStages) {
            // Filter to pending stages in this group
            const pendingStages = group.stages.filter(s => !completedStages.has(s.id));
            if (pendingStages.length === 0) continue;

            // Emit progress for this group
            emitProgress(group.name, group.runItemStatus);

            if (group.parallel) {
                // Run applicable stages in parallel
                const parallelPromises = pendingStages
                    .filter(stage => !stage.condition || stage.condition(ctx, campaign))
                    .map(async (stage) => {
                        const stepId = statusStore.addStep(pipelineActionId, `⏳ ${stage.name}...`, 'running');
                        const startTime = Date.now();
                        try {
                            await stage.execute(ctx, campaign, wpSite);
                            completedStages.add(stage.id);
                            stageResults.set(stage.id, {
                                success: true,
                                duration: Date.now() - startTime,
                            });
                            processedStages++;
                            statusStore.updateStep(pipelineActionId, stepId, `✅ ${stage.name}`, 'success');
                            statusStore.setProgress(pipelineActionId, processedStages, totalStages);
                        } catch (err) {
                            const error = err instanceof Error ? err.message : 'Stage failed';
                            stageResults.set(stage.id, {
                                success: false,
                                duration: Date.now() - startTime,
                                error,
                            });
                            if (!stage.optional) {
                                statusStore.updateStep(pipelineActionId, stepId, `❌ ${stage.name}: ${error}`, 'error');
                                throw err;
                            }
                            statusStore.updateStep(pipelineActionId, stepId, `⚠️ ${stage.name} (skipped)`, 'success');
                            console.warn(`[Pipeline] Optional stage ${stage.id} failed:`, error);
                        }
                    });

                await Promise.all(parallelPromises);
            } else {
                // Run stages sequentially
                for (const stage of pendingStages) {
                    // Check condition
                    if (stage.condition && !stage.condition(ctx, campaign)) {
                        completedStages.add(stage.id);
                        stageResults.set(stage.id, {
                            success: true,
                            duration: 0,
                            data: 'skipped',
                        });
                        statusStore.addStep(pipelineActionId, `⏭️ ${stage.name} (condition not met)`, 'success');
                        continue;
                    }

                    const stepId = statusStore.addStep(pipelineActionId, `⏳ ${stage.name}...`, 'running');
                    const startTime = Date.now();
                    try {
                        await stage.execute(ctx, campaign, wpSite);
                        completedStages.add(stage.id);
                        stageResults.set(stage.id, {
                            success: true,
                            duration: Date.now() - startTime,
                        });
                        processedStages++;
                        statusStore.updateStep(pipelineActionId, stepId, `✅ ${stage.name}`, 'success');
                        statusStore.setProgress(pipelineActionId, processedStages, totalStages);

                        // Save checkpoint after each sequential stage
                        saveCheckpoint(campaign.id, sourceItem.topic, completedStages, stageResults, ctx);
                    } catch (err) {
                        const error = err instanceof Error ? err.message : 'Stage failed';
                        stageResults.set(stage.id, {
                            success: false,
                            duration: Date.now() - startTime,
                            error,
                        });

                        if (!stage.optional) {
                            ctx.status = 'failed';
                            ctx.error = `${stage.name}: ${error}`;
                            statusStore.updateStep(pipelineActionId, stepId, `❌ ${stage.name}: ${error}`, 'error');
                            throw err;
                        }
                        statusStore.updateStep(pipelineActionId, stepId, `⚠️ ${stage.name} (optional, failed)`, 'success');
                        console.warn(`[Pipeline] Optional stage ${stage.id} failed:`, error);
                    }
                }
            }

            // Save checkpoint after each group
            saveCheckpoint(campaign.id, sourceItem.topic, completedStages, stageResults, ctx);
        }

        // Pipeline complete
        ctx.status = 'done';
        emitProgress('Complete', 'done');

        // Clear checkpoint on success
        clearCheckpoint(campaign.id, sourceItem.topic);

        // Complete the pipeline action
        statusStore.completeAction(pipelineActionId, `✅ Pipeline complete for "${sourceItem.topic.substring(0, 30)}..."`);

        // Log pipeline success
        log('info', 'campaign', 'orchestrator', `Pipeline completed successfully for: ${sourceItem.topic}`, {
            campaignId: campaign.id,
            metadata: { topic: sourceItem.topic, stagesCompleted: completedStages.size },
        });

        return ctx;

    } catch (error) {
        ctx.status = 'failed';
        if (!ctx.error) {
            ctx.error = error instanceof Error ? error.message : 'Pipeline failed';
        }
        emitProgress('Failed', 'failed');

        // Fail the pipeline action
        statusStore.failAction(pipelineActionId, ctx.error || 'Pipeline failed');

        // Log pipeline failure
        logError('orchestrator', `Pipeline failed for: ${sourceItem.topic}`, {
            source: 'orchestrator',
            rawMessage: ctx.error || 'Unknown error',
            httpStatus: undefined,
            timestamp: Date.now(),
        }, {
            category: 'campaign',
            campaignId: campaign.id,
        });

        throw error;
    }
}

// ============================================================================
// Run Factory (backward compatibility with processor.ts)
// ============================================================================

/**
 * Create a new run record.
 */
export function createRun(campaignId: string): CampaignRun {
    return {
        id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        campaignId,
        startedAt: Date.now(),
        status: 'running',
        postsGenerated: 0,
        postsPublished: 0,
        errors: [],
        items: [],
    };
}

// ============================================================================
// Resume Helpers
// ============================================================================

/**
 * Check if a checkpoint exists for resuming.
 */
export function hasCheckpoint(campaignId: string, itemId: string): boolean {
    return loadCheckpoint(campaignId, itemId) !== null;
}

/**
 * Get checkpoint info without loading full context.
 */
export function getCheckpointInfo(campaignId: string, itemId: string) {
    const checkpoint = loadCheckpoint(campaignId, itemId);
    if (!checkpoint) return null;

    return {
        completedStages: checkpoint.completedStages,
        updatedAt: checkpoint.updatedAt,
        canResume: true,
    };
}
