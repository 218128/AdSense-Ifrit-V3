/**
 * Multi-Site Publishing
 * FSD: features/campaigns/lib/multiSitePublishing.ts
 * 
 * Publish content to multiple WordPress sites with customization.
 */

import type { WPSite } from '@/features/wordpress';
import type { PipelineContext, AIConfig } from '../model/types';

// ============================================================================
// Types
// ============================================================================

export interface MultiSiteConfig {
    sites: MultiSiteTarget[];
    staggerMinutes: number; // Delay between site publications
    spinForEachSite: boolean; // Spin content for each site
    spinMode?: 'light' | 'moderate' | 'heavy';
}

export interface MultiSiteTarget {
    siteId: string;
    customizations?: SiteCustomization;
}

export interface SiteCustomization {
    categoryId?: number;
    authorId?: number;
    tagIds?: number[];
    postStatus?: 'publish' | 'draft' | 'pending';
    titlePrefix?: string;
    titleSuffix?: string;
    addCanonical?: boolean;
    canonicalUrl?: string;
}

export interface MultiSitePublishResult {
    siteId: string;
    siteName: string;
    success: boolean;
    postUrl?: string;
    postId?: number;
    error?: string;
    spinApplied: boolean;
    publishedAt?: number;
}

export interface MultiSitePublishReport {
    totalSites: number;
    successCount: number;
    failedCount: number;
    results: MultiSitePublishResult[];
    originalContent: string;
}

// ============================================================================
// Multi-Site Publisher
// ============================================================================

/**
 * Publish content to multiple sites with staggering and spinning
 */
export async function publishToMultipleSites(
    context: PipelineContext,
    config: MultiSiteConfig,
    sites: WPSite[],
    aiConfig: AIConfig
): Promise<MultiSitePublishReport> {
    const results: MultiSitePublishResult[] = [];
    const originalContent = context.content?.body || '';
    const contextTitle = context.content?.title || '';
    const contextSlug = context.content?.slug;

    // Dynamic imports to avoid circular dependencies
    const { spinContent, quickSpin } = await import('./contentSpinner');
    const { createPost } = await import('@/features/wordpress/api/wordpressApi');

    for (let i = 0; i < config.sites.length; i++) {
        const target = config.sites[i];
        const site = sites.find(s => s.id === target.siteId);

        if (!site) {
            results.push({
                siteId: target.siteId,
                siteName: 'Unknown',
                success: false,
                error: 'Site not found',
                spinApplied: false,
            });
            continue;
        }

        // Stagger publishing (skip for first site)
        if (i > 0 && config.staggerMinutes > 0) {
            await delay(config.staggerMinutes * 60 * 1000);
        }

        try {
            // Spin content for this site if configured
            let siteContent = originalContent;
            let spinApplied = false;

            if (config.spinForEachSite && i > 0) {
                if (config.spinMode) {
                    const spinResult = await spinContent(
                        originalContent,
                        { mode: config.spinMode },
                        aiConfig
                    );
                    if (spinResult.success) {
                        siteContent = spinResult.content;
                        spinApplied = true;
                    }
                } else {
                    // Quick spin fallback
                    siteContent = quickSpin(originalContent, 0.3);
                    spinApplied = true;
                }
            }

            // Apply title customizations
            let postTitle = contextTitle;
            if (target.customizations?.titlePrefix) {
                postTitle = target.customizations.titlePrefix + postTitle;
            }
            if (target.customizations?.titleSuffix) {
                postTitle = postTitle + target.customizations.titleSuffix;
            }

            // Add canonical link if configured
            if (target.customizations?.addCanonical && target.customizations.canonicalUrl) {
                siteContent = `<!-- canonical: ${target.customizations.canonicalUrl} -->\n${siteContent}`;
            }

            // Upload featured image if present
            let featuredMediaId: number | undefined = undefined;
            if (context.images?.cover?.url) {
                try {
                    const imageResponse = await fetch(context.images.cover.url);
                    if (imageResponse.ok) {
                        const imageBlob = await imageResponse.blob();
                        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

                        const { uploadMedia } = await import('@/features/wordpress/api/wordpressApi');
                        const uploadResult = await uploadMedia(site, {
                            file: imageBuffer,
                            filename: `${contextSlug || 'post'}-cover.jpg`,
                            mimeType: 'image/jpeg',
                            alt_text: context.images.cover.alt || contextTitle,
                        });

                        if (uploadResult.success && uploadResult.data) {
                            featuredMediaId = uploadResult.data.id;
                            console.log(`[MultiSite] Featured image uploaded to ${site.name}: ${uploadResult.data.id}`);
                        }
                    }
                } catch (error) {
                    console.warn(`[MultiSite] Featured image upload failed for ${site.name}:`, error);
                    // Continue without featured image - not a critical failure
                }
            }

            // Create post
            const postResult = await createPost(site, {
                title: postTitle,
                content: siteContent,
                slug: contextSlug,
                status: target.customizations?.postStatus || 'draft',
                categories: target.customizations?.categoryId ? [target.customizations.categoryId] : undefined,
                tags: target.customizations?.tagIds,
                featured_media: featuredMediaId,
                author: target.customizations?.authorId,
            });

            results.push({
                siteId: target.siteId,
                siteName: site.name,
                success: postResult.success,
                postUrl: postResult.data?.link,
                postId: postResult.data?.id,
                error: postResult.error,
                spinApplied,
                publishedAt: Date.now(),
            });

        } catch (error) {
            results.push({
                siteId: target.siteId,
                siteName: site.name,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                spinApplied: false,
            });
        }
    }

    return {
        totalSites: config.sites.length,
        successCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
        results,
        originalContent,
    };
}

// ============================================================================
// Staggered Scheduler
// ============================================================================

export interface StaggeredSchedule {
    siteId: string;
    scheduledAt: number;
    executed: boolean;
}

/**
 * Create staggered publishing schedule
 */
export function createStaggeredSchedule(
    siteIds: string[],
    startTime: number,
    staggerMinutes: number
): StaggeredSchedule[] {
    return siteIds.map((siteId, index) => ({
        siteId,
        scheduledAt: startTime + (index * staggerMinutes * 60 * 1000),
        executed: false,
    }));
}

/**
 * Get next site to publish
 */
export function getNextScheduledSite(
    schedule: StaggeredSchedule[]
): StaggeredSchedule | null {
    const now = Date.now();
    return schedule.find(s => !s.executed && s.scheduledAt <= now) || null;
}

// ============================================================================
// Helpers
// ============================================================================

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate multi-site config
 */
export function validateMultiSiteConfig(config: MultiSiteConfig): string[] {
    const errors: string[] = [];

    if (!config.sites || config.sites.length === 0) {
        errors.push('At least one target site is required');
    }

    if (config.staggerMinutes < 0) {
        errors.push('Stagger minutes must be non-negative');
    }

    if (config.spinForEachSite && config.sites.length < 2) {
        errors.push('Content spinning requires multiple sites');
    }

    return errors;
}
