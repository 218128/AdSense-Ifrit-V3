/**
 * Translation Pipeline
 * FSD: features/campaigns/lib/translationPipeline.ts
 * 
 * Orchestrates the translation workflow:
 * 1. Fetch posts from source site
 * 2. Check BI history to avoid duplicates
 * 3. Translate via capability system
 * 4. Apply post-processing (humanize, readability)
 * 5. Publish to target sites
 */

import type { WPSite, WPPostResult } from '@/features/wordpress/model/types';
import type { LanguageMapping, TranslationSourceConfig } from '../model/types';
import type { TranslationRecord } from '../model/translationHistory';
import {
    isAlreadyTranslated,
    createTranslationRecord,
    updateTranslationStatus
} from '../model/translationHistory';

// ============================================================================
// Types
// ============================================================================

export interface TranslationPipelineOptions {
    sourceSite: WPSite;
    sourceConfig: TranslationSourceConfig;
    targetSites: Map<string, WPSite>;  // siteId -> WPSite
    existingTranslations: TranslationRecord[];
    campaignId: string;
    runId?: string;
    onProgress?: (status: TranslationProgress) => void;
}

export interface TranslationProgress {
    phase: 'fetching' | 'translating' | 'processing' | 'publishing' | 'complete';
    message: string;
    currentPost?: number;
    totalPosts?: number;
    currentLanguage?: string;
}

export interface TranslationPipelineResult {
    success: boolean;
    summary: {
        totalPosts: number;
        totalTranslations: number;
        successCount: number;
        failedCount: number;
        skippedCount: number;
    };
    records: TranslationRecord[];
    errors: string[];
}

// ============================================================================
// Pipeline Execution
// ============================================================================

export async function runTranslationPipeline(
    options: TranslationPipelineOptions
): Promise<TranslationPipelineResult> {
    const {
        sourceSite,
        sourceConfig,
        targetSites,
        existingTranslations,
        campaignId,
        runId,
        onProgress
    } = options;

    const records: TranslationRecord[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
        // 1. Fetch posts from source site
        onProgress?.({ phase: 'fetching', message: 'Fetching posts from source site...' });

        const { getPosts } = await import('@/features/wordpress/api/wordpressApi');
        const postsResult = await getPosts(sourceSite, {
            status: sourceConfig.postFilters?.onlyPublished !== false ? 'publish' : 'any',
            categories: sourceConfig.postFilters?.categories,
            after: sourceConfig.postFilters?.afterDate,
            perPage: 50,
        });

        if (!postsResult.success || !postsResult.data) {
            return {
                success: false,
                summary: { totalPosts: 0, totalTranslations: 0, successCount: 0, failedCount: 0, skippedCount: 0 },
                records: [],
                errors: [`Failed to fetch posts: ${postsResult.error}`],
            };
        }

        const posts = postsResult.data;

        // 2. Process each post for each target language
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];

            for (const langMapping of sourceConfig.targetLanguages) {
                const targetSite = targetSites.get(langMapping.targetSiteId);

                if (!targetSite) {
                    errors.push(`Target site not found for language ${langMapping.language}`);
                    failedCount++;
                    continue;
                }

                // Check if already translated (BI duplicate prevention)
                if (isAlreadyTranslated(
                    existingTranslations,
                    post.id,
                    langMapping.language,
                    langMapping.targetSiteId
                )) {
                    skippedCount++;
                    continue;
                }

                // Create translation record
                const record = createTranslationRecord(
                    { id: post.id, url: post.link, title: post.title.rendered },
                    sourceSite.id,
                    langMapping.language,
                    langMapping.targetSiteId,
                    campaignId,
                    post.content.rendered.length
                );
                record.runId = runId;

                try {
                    // 3. Translate
                    onProgress?.({
                        phase: 'translating',
                        message: `Translating "${post.title.rendered}" to ${langMapping.languageName || langMapping.language}...`,
                        currentPost: i + 1,
                        totalPosts: posts.length,
                        currentLanguage: langMapping.language,
                    });

                    const { translatePost } = await import('./translatePost');
                    const translateResult = await translatePost(post, {
                        targetLanguage: langMapping.language,
                        preserveFormatting: true,
                        onProgress: (status) => onProgress?.({
                            phase: 'translating',
                            message: status.message,
                            currentPost: i + 1,
                            totalPosts: posts.length,
                            currentLanguage: langMapping.language,
                        }),
                    });

                    if (!translateResult.success || !translateResult.content) {
                        updateTranslationStatus(record, 'failed', {
                            error: translateResult.error,
                            errorStage: 'translate',
                        });
                        records.push(record);
                        errors.push(`Translation failed for post ${post.id}: ${translateResult.error}`);
                        failedCount++;
                        continue;
                    }

                    record.translatedAt = Date.now();
                    let finalContent = translateResult.content.content;

                    // 4. Apply post-processing (SoC: separate from translation)
                    if (sourceConfig.postProcessing?.humanize) {
                        onProgress?.({
                            phase: 'processing',
                            message: 'Humanizing content...',
                            currentPost: i + 1,
                            totalPosts: posts.length,
                            currentLanguage: langMapping.language,
                        });

                        const { humanizeContent } = await import('./humanizer');
                        const humanized = await humanizeContent(finalContent);
                        finalContent = humanized.content;
                        record.postProcessingApplied = { humanized: true };
                    }

                    if (sourceConfig.postProcessing?.optimizeReadability) {
                        onProgress?.({
                            phase: 'processing',
                            message: 'Optimizing readability...',
                            currentPost: i + 1,
                            totalPosts: posts.length,
                            currentLanguage: langMapping.language,
                        });

                        const { optimizeReadability } = await import('./readability');
                        const optimized = await optimizeReadability(finalContent);
                        finalContent = optimized.content;
                        record.postProcessingApplied = {
                            ...record.postProcessingApplied,
                            readabilityOptimized: true
                        };
                    }

                    // 5. Publish to target site
                    onProgress?.({
                        phase: 'publishing',
                        message: `Publishing to ${targetSite.name}...`,
                        currentPost: i + 1,
                        totalPosts: posts.length,
                        currentLanguage: langMapping.language,
                    });

                    const { createPost } = await import('@/features/wordpress/api/wordpressApi');
                    const publishResult = await createPost(targetSite, {
                        title: translateResult.content.title,
                        content: finalContent,
                        excerpt: translateResult.content.excerpt,
                        status: 'publish',
                        categories: langMapping.targetCategoryId ? [langMapping.targetCategoryId] : undefined,
                        author: langMapping.targetAuthorId,
                    });

                    if (!publishResult.success || !publishResult.data) {
                        updateTranslationStatus(record, 'failed', {
                            error: publishResult.error,
                            errorStage: 'publish',
                        });
                        records.push(record);
                        errors.push(`Publish failed for post ${post.id}: ${publishResult.error}`);
                        failedCount++;
                        continue;
                    }

                    // Success!
                    updateTranslationStatus(record, 'published', {
                        targetPostId: publishResult.data.id,
                        targetPostUrl: publishResult.data.link,
                        processingTimeMs: Date.now() - record.createdAt,
                    });
                    records.push(record);
                    successCount++;

                } catch (error) {
                    updateTranslationStatus(record, 'failed', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        errorStage: 'translate',
                    });
                    records.push(record);
                    errors.push(`Error processing post ${post.id}: ${error}`);
                    failedCount++;
                }
            }
        }

        onProgress?.({ phase: 'complete', message: 'Translation pipeline complete' });

        return {
            success: failedCount === 0,
            summary: {
                totalPosts: posts.length,
                totalTranslations: successCount + failedCount + skippedCount,
                successCount,
                failedCount,
                skippedCount,
            },
            records,
            errors,
        };

    } catch (error) {
        return {
            success: false,
            summary: { totalPosts: 0, totalTranslations: 0, successCount: 0, failedCount: 1, skippedCount: 0 },
            records,
            errors: [error instanceof Error ? error.message : 'Pipeline failed'],
        };
    }
}
