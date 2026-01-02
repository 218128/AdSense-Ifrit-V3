/**
 * Content Pipeline Processor
 * FSD: features/campaigns/lib/processor.ts
 * 
 * Orchestrates the content generation pipeline.
 * Delegates to generators.ts for actual work.
 */

import type {
    Campaign,
    PipelineContext,
    SourceItem,
    CampaignRun,
    RunItem,
} from '../model/types';
import type { WPSite } from '@/features/wordpress';
import { shouldSkipTopic, recordGeneratedPost } from './deduplication';
import {
    performResearch,
    generateContent,
    generateImages,
    publishToWordPress,
} from './generators';
import { generateAllSchemas } from './schemaMarkup';
import { fetchExistingPosts, findLinkOpportunities, injectInternalLinks } from './internalLinking';

// ============================================================================
// Pipeline Execution
// ============================================================================

/**
 * Run the full content pipeline for a single source item
 */
export async function runPipeline(
    campaign: Campaign,
    sourceItem: SourceItem,
    wpSite: WPSite,
    options?: {
        onStatusChange?: (status: RunItem['status']) => void;
    }
): Promise<PipelineContext> {
    const ctx: PipelineContext = {
        campaign,
        sourceItem,
        status: 'pending',
    };

    const updateStatus = (status: RunItem['status']) => {
        ctx.status = status;
        options?.onStatusChange?.(status);
    };

    try {
        // Step 0: Deduplication check
        const dupCheck = shouldSkipTopic(
            sourceItem.topic,
            campaign.id,
            campaign.targetSiteId
        );
        if (dupCheck.skip) {
            ctx.status = 'failed';
            ctx.error = dupCheck.reason || 'Duplicate content detected';
            throw new Error(ctx.error);
        }

        // Step 1: Research (optional)
        if (campaign.aiConfig.useResearch) {
            updateStatus('researching');
            ctx.research = await performResearch(sourceItem.topic, campaign.aiConfig);
        }

        // Step 2: Generate content
        updateStatus('generating');
        ctx.content = await generateContent(sourceItem, campaign, ctx.research);

        // Step 3: Generate images (optional)
        if (campaign.aiConfig.includeImages && ctx.content) {
            updateStatus('imaging');
            ctx.images = await generateImages(ctx.content.title, campaign.aiConfig);
        }

        // Step 3.5a: Internal Linking (if SEO optimization enabled)
        if (campaign.aiConfig.optimizeForSEO && ctx.content && wpSite.status === 'connected') {
            try {
                updateStatus('linking');
                const existingPosts = await fetchExistingPosts(wpSite);
                if (existingPosts.length > 0) {
                    const suggestions = findLinkOpportunities(ctx.content.body, existingPosts, 5);
                    if (suggestions.length > 0) {
                        const linkResult = injectInternalLinks(ctx.content.body, suggestions, 3);
                        ctx.content.body = linkResult.content;
                        console.log(`[Pipeline] Added ${linkResult.linksAdded} internal links`);
                    }
                }
            } catch (linkError) {
                console.warn('[Pipeline] Internal linking failed:', linkError);
                // Non-fatal, continue with publishing
            }
        }

        // Step 3.5b: Schema Markup (if enabled)
        if (campaign.aiConfig.includeSchema && ctx.content) {
            try {
                const schemas = generateAllSchemas(
                    ctx.content.title,
                    ctx.content.excerpt || ctx.content.body.substring(0, 160),
                    ctx.content.body,
                    {
                        authorName: 'Content Team',
                        articleType: 'BlogPosting',
                    }
                );
                // Append schema to end of content
                ctx.content.body = ctx.content.body + '\n\n' + schemas;
                console.log('[Pipeline] Added schema markup');
            } catch (schemaError) {
                console.warn('[Pipeline] Schema generation failed:', schemaError);
                // Non-fatal, continue with publishing
            }
        }

        // Step 3.5c: Content Spinner (if enabled)
        if (campaign.aiConfig.enableSpinner && ctx.content) {
            try {
                const { spinContent } = await import('./contentSpinner');
                const spinResult = await spinContent(
                    ctx.content.body,
                    { mode: campaign.aiConfig.spinnerMode || 'moderate' },
                    campaign.aiConfig
                );
                if (spinResult.success) {
                    ctx.content.body = spinResult.content;
                    console.log('[Pipeline] Content spun for uniqueness');
                }
            } catch (spinError) {
                console.warn('[Pipeline] Content spinning failed:', spinError);
                // Non-fatal, continue with original content
            }
        }

        // Step 4: Publish to WordPress
        updateStatus('publishing');
        ctx.wpResult = await publishToWordPress(wpSite, campaign, ctx);

        // Step 5: Record for deduplication
        if (ctx.content && ctx.wpResult) {
            recordGeneratedPost(
                campaign.id,
                campaign.targetSiteId,
                sourceItem.topic,
                ctx.content.title,
                ctx.content.slug,
                ctx.wpResult.postId,
                ctx.wpResult.postUrl
            );
        }

        updateStatus('done');
        return ctx;

    } catch (error) {
        ctx.status = 'failed';
        ctx.error = error instanceof Error ? error.message : 'Pipeline failed';
        throw error;
    }
}

// ============================================================================
// Run Factory
// ============================================================================

/**
 * Create a new run record
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

// Re-export generators for convenience
export { performResearch, generateContent, generateImages, publishToWordPress };
