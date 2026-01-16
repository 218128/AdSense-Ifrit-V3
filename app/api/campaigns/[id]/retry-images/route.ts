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
        const { wpSiteId, wpSite: wpSiteCredentials, aiConfig } = body;

        // Validate required credentials (passed from client since server can't access client Zustand store)
        if (!wpSiteCredentials?.url || !wpSiteCredentials?.username || !wpSiteCredentials?.appPassword) {
            return NextResponse.json(
                { success: false, error: 'WordPress site credentials are required (url, username, appPassword)' },
                { status: 400 }
            );
        }

        // Build WPSite object from passed credentials
        // Type assertion since we only need credentials for WP API calls
        const wpSite = {
            id: wpSiteId || 'retry-images-temp',
            name: 'Retry Images',
            url: wpSiteCredentials.url,
            username: wpSiteCredentials.username,
            appPassword: wpSiteCredentials.appPassword,
            status: 'connected' as const,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // Fetch posts from WordPress that are missing featured images
        const { getPosts } = await import('@/features/wordpress/api/wordpressApi');
        const postsResult = await getPosts(wpSite, { perPage: 20, status: 'any' });

        if (!postsResult.success || !postsResult.data) {
            return NextResponse.json(
                { success: false, error: 'Failed to fetch posts from WordPress' },
                { status: 500 }
            );
        }

        // Filter posts without featured images
        const postsWithoutImages = postsResult.data.filter(
            (post) => !post.featured_media || post.featured_media === 0
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
                post.title?.rendered || 'Untitled',
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
