/**
 * Content Quality API Endpoint
 * POST /api/content-quality
 * 
 * Analyzes content quality for AdSense readiness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scoreContent, scoreMultiplePosts } from '@/lib/quality/contentQualityScorer';

export const dynamic = 'force-dynamic';

interface ScoreRequest {
    content: string;
    metaDescription?: string;
}

interface BatchScoreRequest {
    posts: Array<{ content: string; metaDescription?: string }>;
}

/**
 * POST /api/content-quality
 * Score single post or batch of posts
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Check if batch request
        if (body.posts && Array.isArray(body.posts)) {
            const batchBody = body as BatchScoreRequest;

            if (batchBody.posts.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Posts array is empty' },
                    { status: 400 }
                );
            }

            const aggregate = scoreMultiplePosts(batchBody.posts);
            const details = batchBody.posts.map((post, index) => ({
                index,
                ...scoreContent(post.content, post.metaDescription),
            }));

            return NextResponse.json({
                success: true,
                type: 'batch',
                aggregate,
                details,
            });
        }

        // Single post request
        const singleBody = body as ScoreRequest;

        if (!singleBody.content) {
            return NextResponse.json(
                { success: false, error: 'Content is required' },
                { status: 400 }
            );
        }

        const result = scoreContent(singleBody.content, singleBody.metaDescription);

        return NextResponse.json({
            success: true,
            type: 'single',
            ...result,
        });

    } catch (error) {
        console.error('Content quality API error:', error);
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
