/**
 * Translation Action Runner
 * FSD: features/campaigns/lib/translationActionRunner.ts
 * 
 * Integrates translation pipeline with GlobalActionStatus for real-time
 * progress updates in the status panel.
 * 
 * Uses the GlobalActionStatus store directly (not hooks) for lib-level code.
 */

import type { WPSite } from '@/features/wordpress/model/types';
import type { TranslationSourceConfig } from '../model/types';
import type { TranslationRecord } from '../model/translationHistory';
import type { TranslationPipelineResult } from './translationPipeline';

// ============================================================================
// Types
// ============================================================================

export interface RunTranslationCampaignOptions {
    campaignId: string;
    campaignName: string;
    sourceSite: WPSite;
    sourceConfig: TranslationSourceConfig;
    targetSites: Map<string, WPSite>;
    existingTranslations: TranslationRecord[];
    runId?: string;
}

// ============================================================================
// Translation Action Runner
// ============================================================================

/**
 * Run translation campaign with GlobalActionStatus integration
 * Provides real-time updates to the status panel via SSE
 */
export async function runTranslationCampaignWithStatus(
    options: RunTranslationCampaignOptions
): Promise<TranslationPipelineResult> {
    // Import store lazily to avoid SSR issues
    const { useGlobalActionStatusStore } = await import('@/stores/globalActionStatusStore');
    const { runTranslationPipeline } = await import('./translationPipeline');

    const store = useGlobalActionStatusStore.getState();

    // Start action in global status
    const actionId = store.startAction(
        `Translating: ${options.campaignName}`,
        'campaign',
        true // retryable
    );

    // Track steps for each language
    const languageStepIds = new Map<string, string>();

    try {
        // Initial step
        const fetchStepId = store.addStep(actionId, 'Fetching posts from source site...');

        const result = await runTranslationPipeline({
            sourceSite: options.sourceSite,
            sourceConfig: options.sourceConfig,
            targetSites: options.targetSites,
            existingTranslations: options.existingTranslations,
            campaignId: options.campaignId,
            runId: options.runId,
            onProgress: (progress) => {
                // Update global status based on pipeline progress
                switch (progress.phase) {
                    case 'fetching':
                        store.updateStep(actionId, fetchStepId, progress.message, 'running');
                        break;

                    case 'translating':
                        // Complete fetch step on first translate
                        if (!languageStepIds.size) {
                            store.completeStep(actionId, fetchStepId, true);
                        }

                        // Create/update language step
                        if (progress.currentLanguage) {
                            let stepId = languageStepIds.get(progress.currentLanguage);
                            if (!stepId) {
                                stepId = store.addStep(
                                    actionId,
                                    `${progress.currentLanguage}: ${progress.message}`
                                );
                                languageStepIds.set(progress.currentLanguage, stepId);
                            } else {
                                store.updateStep(actionId, stepId, `${progress.currentLanguage}: ${progress.message}`);
                            }
                        }

                        // Update progress bar
                        if (progress.currentPost && progress.totalPosts) {
                            store.setProgress(actionId, progress.currentPost, progress.totalPosts);
                        }

                        store.updateAction(actionId, progress.message);
                        break;

                    case 'processing':
                        store.updateAction(actionId, progress.message);
                        break;

                    case 'publishing':
                        if (progress.currentLanguage) {
                            const stepId = languageStepIds.get(progress.currentLanguage);
                            if (stepId) {
                                store.updateStep(actionId, stepId, `${progress.currentLanguage}: ${progress.message}`);
                            }
                        }
                        store.updateAction(actionId, progress.message);
                        break;

                    case 'complete':
                        // Complete all language steps
                        languageStepIds.forEach((stepId, lang) => {
                            store.completeStep(actionId, stepId, true);
                        });
                        break;
                }
            },
        });

        // Complete action
        if (result.success) {
            const summary = `Translated ${result.summary.successCount}/${result.summary.totalTranslations} posts`;
            store.completeAction(actionId, summary);
        } else {
            store.completeAction(actionId, `Completed with ${result.summary.failedCount} errors`);
        }

        return result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Translation failed';
        store.failAction(actionId, errorMessage);
        throw error;
    }
}

/**
 * Translate a single post with status updates
 */
export async function translateSinglePostWithStatus(
    postId: number,
    postTitle: string,
    sourceSite: WPSite,
    targetLanguage: string,
    targetSite: WPSite
): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    const { useGlobalActionStatusStore } = await import('@/stores/globalActionStatusStore');
    const { getPost } = await import('@/features/wordpress/api/wordpressApi');
    const { translatePost } = await import('./translatePost');
    const { createPost } = await import('@/features/wordpress/api/wordpressApi');

    const store = useGlobalActionStatusStore.getState();

    const actionId = store.startAction(
        `Translate: ${postTitle} → ${targetLanguage.toUpperCase()}`,
        'campaign',
        true
    );

    try {
        // Fetch post
        store.updateAction(actionId, 'Fetching post content...');
        const postResult = await getPost(sourceSite, postId);
        if (!postResult.success || !postResult.data) {
            store.failAction(actionId, 'Failed to fetch post');
            return { success: false, error: 'Failed to fetch post' };
        }

        // Translate
        store.updateAction(actionId, `Translating to ${targetLanguage}...`);
        const translateResult = await translatePost(postResult.data, {
            targetLanguage,
            preserveFormatting: true,
        });

        if (!translateResult.success || !translateResult.content) {
            store.failAction(actionId, translateResult.error || 'Translation failed');
            return { success: false, error: translateResult.error };
        }

        // Publish
        store.updateAction(actionId, 'Publishing translated post...');
        const publishResult = await createPost(targetSite, {
            title: translateResult.content.title,
            content: translateResult.content.content,
            excerpt: translateResult.content.excerpt,
            status: 'publish',
        });

        if (!publishResult.success || !publishResult.data) {
            store.failAction(actionId, 'Failed to publish');
            return { success: false, error: 'Failed to publish' };
        }

        store.completeAction(actionId, `Published: ${publishResult.data.link}`);
        return { success: true, postUrl: publishResult.data.link };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        store.failAction(actionId, errorMessage);
        return { success: false, error: errorMessage };
    }
}
