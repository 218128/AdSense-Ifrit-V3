/**
 * Pipeline Runner
 * FSD: features/campaigns/lib/PipelineRunner.ts
 * 
 * SoC: Enhanced pipeline orchestration extracted from processor.ts
 * Features:
 * - Stage-based execution with dependencies
 * - Checkpointing for resume capability
 * - Parallel stage execution where possible
 * - Progress tracking
 */

import type {
    Campaign,
    PipelineContext,
    SourceItem,
    RunItem,
} from '../model/types';
import type { WPSite } from '@/features/wordpress';

// ============================================================================
// Types
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
    dependsOn: string[];
    optional: boolean;
    canRetry: boolean;
    condition?: (ctx: PipelineContext, campaign: Campaign) => boolean;
    execute: (ctx: PipelineContext, campaign: Campaign, wpSite: WPSite) => Promise<void>;
}

export interface Checkpoint {
    runId: string;
    campaignId: string;
    itemId: string;
    completedStages: string[];
    stageData: Record<string, unknown>;
    context: Partial<PipelineContext>;
    createdAt: number;
    updatedAt: number;
}

export interface PipelineProgress {
    currentStage: string;
    completedStages: string[];
    totalStages: number;
    percentage: number;
    status: RunItem['status'];
}

export type ProgressCallback = (progress: PipelineProgress) => void;

// ============================================================================
// Stage Definitions
// ============================================================================

const PIPELINE_STAGES: PipelineStage[] = [
    {
        id: 'dedup',
        name: 'Deduplication Check',
        dependsOn: [],
        optional: false,
        canRetry: false,
        execute: async (ctx, campaign) => {
            const { shouldSkipTopic } = await import('./deduplication');
            const result = shouldSkipTopic(
                ctx.sourceItem.topic,
                campaign.id,
                campaign.targetSiteId
            );
            if (result.skip) {
                throw new Error(result.reason || 'Duplicate content detected');
            }
        },
    },
    {
        id: 'research',
        name: 'Topic Research',
        dependsOn: ['dedup'],
        optional: true,
        canRetry: true,
        condition: (_, campaign) => campaign.aiConfig.useResearch,
        execute: async (ctx, campaign) => {
            const { performResearch } = await import('./researchService');
            ctx.research = await performResearch(ctx.sourceItem.topic, campaign.aiConfig);
        },
    },
    // Phase 2: Author Matching
    {
        id: 'author_match',
        name: 'Author Matching',
        dependsOn: ['dedup'],
        optional: true,
        canRetry: false,
        condition: (_, campaign) => !!(campaign.authorId || campaign.aiConfig.authorHealthRequired),
        execute: async (ctx, campaign) => {
            const { matchAuthorForPipeline, applyAuthorToContext } = await import('./authorMatcher');
            const result = matchAuthorForPipeline(campaign, ctx.sourceItem.topic, {
                fallbackToGeneric: !campaign.aiConfig.authorHealthRequired,
            });

            if (!result.canPublish && campaign.aiConfig.authorHealthRequired) {
                throw new Error(result.reason || 'No suitable author available');
            }

            applyAuthorToContext(ctx, result);
            console.log(`[Pipeline] Author matched: ${result.author?.name || 'generic'} (health: ${result.healthScore?.score || 'N/A'})`);
        },
    },
    {
        id: 'content',
        name: 'Content Generation',
        dependsOn: ['dedup', 'research'],
        optional: false,
        canRetry: true,
        execute: async (ctx, campaign) => {
            const { generateContent } = await import('./contentGenerator');
            ctx.content = await generateContent(
                ctx.sourceItem,
                campaign,
                { research: ctx.research }
            );
        },
    },
    // Phase 2: E-E-A-T Signal Injection
    {
        id: 'eeat_inject',
        name: 'E-E-A-T Enhancement',
        dependsOn: ['content', 'author_match'],
        optional: true,
        canRetry: true,
        condition: (ctx, campaign) => campaign.aiConfig.injectEEATSignals && !!ctx.matchedAuthor && !!ctx.content,
        execute: async (ctx) => {
            const { injectEEATSignals } = await import('./eeatInjector');
            const { useAuthorStore } = await import('@/features/authors');

            const author = useAuthorStore.getState().getAuthor(ctx.matchedAuthor!.id);
            if (author) {
                const result = injectEEATSignals(ctx, author, {
                    injectByline: true,
                    injectBioBox: true,
                    injectExperienceIntro: true,
                    injectSchema: false, // Schema stage handles this
                });
                ctx.content!.body = result.modifiedContent;
                console.log(`[Pipeline] E-E-A-T injected: ${result.injections.join(', ')}`);
            }
        },
    },
    {
        id: 'images',
        name: 'Image Generation',
        dependsOn: ['content'],
        optional: true,
        canRetry: true,
        condition: (ctx, campaign) => campaign.aiConfig.includeImages && !!ctx.content,
        execute: async (ctx, campaign) => {
            const { generateImages } = await import('./imageGenerator');
            ctx.images = await generateImages(ctx.content!.title, campaign.aiConfig);
        },
    },
    {
        id: 'linking',
        name: 'Internal Linking',
        dependsOn: ['content'],
        optional: true,
        canRetry: true,
        condition: (ctx, campaign) => campaign.aiConfig.optimizeForSEO && !!ctx.content,
        execute: async (ctx, _, wpSite) => {
            const { fetchExistingPosts, findLinkOpportunities, injectInternalLinks } =
                await import('./internalLinking');
            const existingPosts = await fetchExistingPosts(wpSite);
            if (existingPosts.length > 0) {
                const suggestions = findLinkOpportunities(ctx.content!.body, existingPosts, 5);
                if (suggestions.length > 0) {
                    const result = injectInternalLinks(ctx.content!.body, suggestions, 3);
                    ctx.content!.body = result.content;
                }
            }
        },
    },
    {
        id: 'schema',
        name: 'Schema Markup',
        dependsOn: ['content'],
        optional: true,
        canRetry: true,
        condition: (ctx, campaign) => campaign.aiConfig.includeSchema && !!ctx.content,
        execute: async (ctx) => {
            const { generateAllSchemas } = await import('./schemaMarkup');

            // Use matched author name if available
            const authorName = ctx.matchedAuthor?.name || 'Content Team';

            const schemas = generateAllSchemas(
                ctx.content!.title,
                ctx.content!.excerpt || ctx.content!.body.substring(0, 160),
                ctx.content!.body,
                { authorName, articleType: 'BlogPosting' }
            );
            ctx.content!.body = ctx.content!.body + '\n\n' + schemas;
        },
    },
    // Phase 2: Quality Scoring
    {
        id: 'quality_score',
        name: 'Quality Scoring',
        dependsOn: ['content', 'schema', 'linking'],
        optional: true,
        canRetry: false,
        condition: (ctx, campaign) => campaign.aiConfig.qualityGateEnabled && !!ctx.content,
        execute: async (ctx) => {
            const { scoreContentQuality, applyQualityScoreToContext } = await import('./qualityScoreStage');

            const score = scoreContentQuality(
                ctx.content!.body,
                ctx.sourceItem.topic,
                ctx.matchedAuthor?.id
            );

            applyQualityScoreToContext(ctx, score);
            console.log(`[Pipeline] Quality score: ${score.combined} (${score.grade}) - E-E-A-T: ${score.eeat.overall}, Fact: ${score.factCheck.score}`);
        },
    },
    // Phase 2: Smart Review Gate
    {
        id: 'smart_review',
        name: 'Smart Review Gate',
        dependsOn: ['quality_score'],
        optional: true,
        canRetry: true,  // Can retry if regeneration is needed
        condition: (ctx, campaign) => campaign.aiConfig.qualityGateEnabled && !!ctx.qualityScore,
        execute: async (ctx, campaign) => {
            const { processSmartReview } = await import('./qualityScoreStage');

            const decision = await processSmartReview(ctx, campaign);

            console.log(`[Pipeline] Review decision: ${decision.action} (${decision.confidence}% confidence)`);
            console.log(`[Pipeline] Reasons: ${decision.reasons.join(', ')}`);

            if (decision.action === 'approve') {
                console.log('[Pipeline] Content auto-approved');
            } else if (decision.action === 'flag') {
                console.log('[Pipeline] Content flagged for learning - will publish normally');
            } else if (decision.action === 'retry') {
                // Very low quality - trigger regeneration
                console.log('[Pipeline] Content quality very low - triggering regeneration');
                throw new Error(`Quality too low (retry triggered): ${decision.reasons.join(', ')}`);
            }
        },
    },
    {
        id: 'spinner',
        name: 'Content Spinning',
        dependsOn: ['content', 'linking', 'schema'],
        optional: true,
        canRetry: true,
        condition: (ctx, campaign) => campaign.aiConfig.enableSpinner && !!ctx.content,
        execute: async (ctx, campaign) => {
            const { spinContent } = await import('./contentSpinner');
            const result = await spinContent(
                ctx.content!.body,
                { mode: campaign.aiConfig.spinnerMode || 'moderate' },
                campaign.aiConfig
            );
            if (result.success) {
                ctx.content!.body = result.content;
            }
        },
    },
    {
        id: 'publish',
        name: 'WordPress Publishing',
        dependsOn: ['content', 'images', 'spinner', 'smart_review'],
        optional: false,
        canRetry: true,
        execute: async (ctx, campaign, wpSite) => {
            const { publishToWordPress } = await import('./wpPublisher');

            // Adjust post status based on review decision
            const effectiveCampaign = ctx.needsManualReview
                ? { ...campaign, postStatus: 'draft' as const }
                : campaign;

            ctx.wpResult = await publishToWordPress(wpSite, effectiveCampaign, ctx);

            if (ctx.needsManualReview) {
                console.log(`[Pipeline] Published as DRAFT for manual review (reviewId: ${ctx.reviewItemId})`);
            }
        },
    },
    {
        id: 'record',
        name: 'Record for Deduplication',
        dependsOn: ['publish'],
        optional: false,
        canRetry: false,
        execute: async (ctx, campaign) => {
            const { recordGeneratedPost } = await import('./deduplication');
            if (ctx.content && ctx.wpResult) {
                recordGeneratedPost(
                    campaign.id,
                    campaign.targetSiteId,
                    ctx.sourceItem.topic,
                    ctx.content.title,
                    ctx.content.slug,
                    ctx.wpResult.postId,
                    ctx.wpResult.postUrl
                );
            }
        },
    },
];

// ============================================================================
// Pipeline Runner Class
// ============================================================================

export class PipelineRunner {
    private stages: PipelineStage[];
    private stageResults: Map<string, StageResult> = new Map();
    private checkpoint: Checkpoint | null = null;

    constructor(stages: PipelineStage[] = PIPELINE_STAGES) {
        this.stages = stages;
    }

    /**
     * Run the pipeline with optional checkpointing
     */
    async run(
        campaign: Campaign,
        sourceItem: SourceItem,
        wpSite: WPSite,
        options?: {
            onProgress?: ProgressCallback;
            checkpoint?: Checkpoint;
        }
    ): Promise<PipelineContext> {
        const ctx: PipelineContext = options?.checkpoint?.context as PipelineContext || {
            campaign,
            sourceItem,
            status: 'pending',
        };

        // Load checkpoint if resuming
        const completedStages = new Set(options?.checkpoint?.completedStages || []);

        const applicableStages = this.stages.filter(stage => {
            // Skip if condition not met
            if (stage.condition && !stage.condition(ctx, campaign)) {
                return false;
            }
            // Skip if already completed in checkpoint
            if (completedStages.has(stage.id)) {
                return false;
            }
            return true;
        });

        const totalStages = applicableStages.length;
        let completedCount = 0;

        for (const stage of applicableStages) {
            // Check dependencies
            const depsSatisfied = stage.dependsOn.every(dep =>
                completedStages.has(dep) ||
                !this.stages.find(s => s.id === dep) || // Dep doesn't exist
                (this.stages.find(s => s.id === dep)?.condition?.(ctx, campaign) === false) // Dep skipped
            );

            if (!depsSatisfied) {
                console.warn(`[PipelineRunner] Skipping ${stage.id} - dependencies not satisfied`);
                continue;
            }

            // Update progress
            options?.onProgress?.({
                currentStage: stage.id,
                completedStages: Array.from(completedStages),
                totalStages,
                percentage: Math.round((completedCount / totalStages) * 100),
                status: this.getRunItemStatus(stage.id),
            });

            const startTime = Date.now();
            try {
                await stage.execute(ctx, campaign, wpSite);

                completedStages.add(stage.id);
                this.stageResults.set(stage.id, {
                    success: true,
                    duration: Date.now() - startTime,
                });
                completedCount++;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Stage failed';

                this.stageResults.set(stage.id, {
                    success: false,
                    duration: Date.now() - startTime,
                    error: errorMessage,
                });

                if (!stage.optional) {
                    ctx.status = 'failed';
                    ctx.error = `${stage.name}: ${errorMessage}`;
                    throw error;
                }

                console.warn(`[PipelineRunner] Optional stage ${stage.id} failed:`, errorMessage);
            }

            // Save checkpoint after each stage
            this.saveCheckpoint(campaign.id, sourceItem.topic, completedStages, ctx);
        }

        ctx.status = 'done';

        options?.onProgress?.({
            currentStage: 'complete',
            completedStages: Array.from(completedStages),
            totalStages,
            percentage: 100,
            status: 'done',
        });

        return ctx;
    }

    /**
     * Map stage ID to RunItem status
     */
    private getRunItemStatus(stageId: string): RunItem['status'] {
        const statusMap: Record<string, RunItem['status']> = {
            'dedup': 'pending',
            'research': 'researching',
            'author_match': 'researching',    // Phase 2
            'content': 'generating',
            'eeat_inject': 'generating',      // Phase 2
            'images': 'imaging',
            'linking': 'linking',
            'schema': 'generating',
            'quality_score': 'generating',    // Phase 2
            'smart_review': 'generating',     // Phase 2
            'spinner': 'generating',
            'publish': 'publishing',
            'record': 'publishing',
        };
        return statusMap[stageId] || 'pending';
    }

    /**
     * Save checkpoint for resume capability
     */
    private saveCheckpoint(
        campaignId: string,
        itemId: string,
        completedStages: Set<string>,
        ctx: PipelineContext
    ): void {
        this.checkpoint = {
            runId: `ckpt_${Date.now()}`,
            campaignId,
            itemId,
            completedStages: Array.from(completedStages),
            stageData: Object.fromEntries(this.stageResults),
            context: {
                research: ctx.research,
                content: ctx.content,
                images: ctx.images,
            },
            createdAt: this.checkpoint?.createdAt || Date.now(),
            updatedAt: Date.now(),
        };

        // Store in localStorage for local testing
        if (typeof window !== 'undefined') {
            try {
                const key = `checkpoint_${campaignId}_${itemId}`;
                localStorage.setItem(key, JSON.stringify(this.checkpoint));
            } catch {
                // Ignore storage errors
            }
        }
    }

    /**
     * Load checkpoint from storage
     */
    static loadCheckpoint(campaignId: string, itemId: string): Checkpoint | null {
        if (typeof window === 'undefined') return null;

        try {
            const key = `checkpoint_${campaignId}_${itemId}`;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }

    /**
     * Clear checkpoint after successful completion
     */
    static clearCheckpoint(campaignId: string, itemId: string): void {
        if (typeof window === 'undefined') return;

        try {
            const key = `checkpoint_${campaignId}_${itemId}`;
            localStorage.removeItem(key);
        } catch {
            // Ignore errors
        }
    }

    /**
     * Get results for all stages
     */
    getResults(): Map<string, StageResult> {
        return this.stageResults;
    }

    /**
     * Get the current checkpoint
     */
    getCheckpoint(): Checkpoint | null {
        return this.checkpoint;
    }
}

// ============================================================================
// Convenience Export
// ============================================================================

export const defaultPipelineRunner = new PipelineRunner();

/**
 * Run pipeline with default stages - convenience function
 */
export async function runPipelineWithCheckpointing(
    campaign: Campaign,
    sourceItem: SourceItem,
    wpSite: WPSite,
    onProgress?: ProgressCallback
): Promise<PipelineContext> {
    // Check for existing checkpoint
    const existingCheckpoint = PipelineRunner.loadCheckpoint(
        campaign.id,
        sourceItem.topic
    );

    if (existingCheckpoint) {
        console.log('[PipelineRunner] Resuming from checkpoint:', existingCheckpoint.completedStages);
    }

    const runner = new PipelineRunner();
    const result = await runner.run(campaign, sourceItem, wpSite, {
        onProgress,
        checkpoint: existingCheckpoint || undefined,
    });

    // Clear checkpoint on success
    if (result.status === 'done') {
        PipelineRunner.clearCheckpoint(campaign.id, sourceItem.topic);
    }

    return result;
}
