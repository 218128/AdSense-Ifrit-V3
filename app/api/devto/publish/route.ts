import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface DevToArticle {
    title: string;
    body_markdown: string;
    published?: boolean;
    tags?: string[];
    canonical_url?: string;
    description?: string;
}

interface PublishRequest {
    apiKey: string;
    article: DevToArticle;
}

interface DevToPublishedArticle {
    id: number;
    title: string;
    url: string;
    slug: string;
    published: boolean;
}

/**
 * Dev.to Publish API
 * 
 * Publishes an article to Dev.to using the provided API key.
 */
export async function POST(request: NextRequest) {
    try {
        const body: PublishRequest = await request.json();
        const { apiKey, article } = body;

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Dev.to API key required' },
                { status: 400 }
            );
        }

        if (!article?.title || !article?.body_markdown) {
            return NextResponse.json(
                { success: false, error: 'Article title and body are required' },
                { status: 400 }
            );
        }

        // Publish to Dev.to
        const response = await fetch('https://dev.to/api/articles', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ article })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { success: false, error: errorData.error || `HTTP ${response.status}` },
                { status: response.status }
            );
        }

        const published: DevToPublishedArticle = await response.json();

        return NextResponse.json({
            success: true,
            article: {
                id: published.id,
                title: published.title,
                url: published.url,
                slug: published.slug,
                published: published.published
            }
        });

    } catch (error) {
        console.error('Dev.to publish error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Publish failed' },
            { status: 500 }
        );
    }
}
