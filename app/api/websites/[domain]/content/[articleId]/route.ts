/**
 * Article CRUD API
 * 
 * Full CRUD for individual articles.
 * 
 * Endpoints:
 * GET    /api/websites/[domain]/content/[articleId] - Get article
 * PATCH  /api/websites/[domain]/content/[articleId] - Update article
 * DELETE /api/websites/[domain]/content/[articleId] - Delete article
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    getArticle,
    updateArticle,
    deleteArticle
} from '@/lib/websiteStore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; articleId: string }> }
) {
    try {
        const { domain, articleId } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const article = getArticle(domain, articleId);

        if (!article) {
            return NextResponse.json(
                { success: false, error: 'Article not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            article
        });
    } catch (error) {
        console.error('Error getting article:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get article' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; articleId: string }> }
) {
    try {
        const { domain, articleId } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const updates = await request.json();

        // Recalculate word count if content changed
        if (updates.content) {
            updates.wordCount = updates.content.split(/\s+/).length;
            updates.readingTime = Math.ceil(updates.wordCount / 200);
        }

        const article = updateArticle(domain, articleId, updates);

        if (!article) {
            return NextResponse.json(
                { success: false, error: 'Article not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            article
        });
    } catch (error) {
        console.error('Error updating article:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update article' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; articleId: string }> }
) {
    try {
        const { domain, articleId } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const deleted = deleteArticle(domain, articleId);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Article not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Article deleted'
        });
    } catch (error) {
        console.error('Error deleting article:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete article' },
            { status: 500 }
        );
    }
}
