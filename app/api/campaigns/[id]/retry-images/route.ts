/**
 * Retry Images API Route
 * POST /api/campaigns/[id]/retry-images
 * 
 * Regenerates images for posts missing featured images
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: campaignId } = await params;
        const body = await req.json();
        const { wpSiteId, aiConfig } = body;

        if (!wpSiteId) {
            return NextResponse.json(
                { success: false, error: 'wpSiteId is required' },
                { status: 400 }
            );
        }

        // Import server-safe functions directly (not from barrel to avoid client hooks)
        const { getWPSiteById } = await import('@/features/wordpress/model/wpSiteStore');
        const wpSite = getWPSiteById(wpSiteId);

        if (!wpSite) {
            return NextResponse.json(
                { success: false, error: 'WordPress site not found' },
                { status: 404 }
            );
        }

        // Fetch posts from WordPress that are missing featured images
        const { fetchPosts } = await import('@/features/wordpress/api/wpApi');
        const postsResult = await fetchPosts(wpSite, { per_page: 20, status: 'publish,draft' });

        if (!postsResult.success || !postsResult.data) {
            return NextResponse.json(
                { success: false, error: 'Failed to fetch posts from WordPress' },
                { status: 500 }
            );
        }

        // Filter posts without featured images
        const postsWithoutImages = postsResult.data.filter(
            (post: { featured_media?: number }) => !post.featured_media || post.featured_media === 0
        );

        if (postsWithoutImages.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All posts already have featured images',
                updatedCount: 0,
            });
        }

        // Retry images for each post
        const { retryImagesForPost } = await import('@/features/campaigns');
        let updatedCount = 0;
        const errors: string[] = [];

        for (const post of postsWithoutImages) {
            const result = await retryImagesForPost(
                wpSite,
                post.id,
                post.title?.rendered || post.title || 'Untitled',
                aiConfig || { articleType: 'blog-post', imagePlacements: ['cover'] }
            );

            if (result.success) {
                updatedCount++;
            } else {
                errors.push(`Post ${post.id}: ${result.error}`);
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            totalWithoutImages: postsWithoutImages.length,
            errors: errors.length > 0 ? errors : undefined,
            campaignId,
        });

    } catch (error) {
        console.error('[Retry Images] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal error' },
            { status: 500 }
        );
    }
}
