/**
 * Article Versions API
 * 
 * Manage version history for articles.
 * 
 * Endpoints:
 * GET    /api/websites/[domain]/content/[articleId]/versions - List versions
 * POST   /api/websites/[domain]/content/[articleId]/versions - Save version
 * PATCH  /api/websites/[domain]/content/[articleId]/versions - Restore version
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    getArticle,
    listArticleVersions,
    saveArticleVersion,
    restoreArticleVersion,
    getArticleVersion
} from '@/lib/websiteStore';

// ============================================
// GET - List all versions of an article
// ============================================

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

        const versions = listArticleVersions(domain, articleId);

        // Include version previews (first 200 chars of content)
        const versionsWithPreview = versions.map(v => ({
            ...v,
            contentPreview: v.content.substring(0, 200) + (v.content.length > 200 ? '...' : ''),
            content: undefined // Don't send full content in list
        }));

        return NextResponse.json({
            success: true,
            articleId,
            articleTitle: article.title,
            versions: versionsWithPreview,
            total: versions.length
        });
    } catch (error) {
        console.error('Error listing versions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list versions' },
            { status: 500 }
        );
    }
}

// ============================================
// POST - Save a new version snapshot
// ============================================

export async function POST(
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

        const body = await request.json().catch(() => ({}));
        const reason = body.reason || 'manual';

        const version = saveArticleVersion(domain, articleId, reason);

        if (!version) {
            return NextResponse.json(
                { success: false, error: 'Failed to save version' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            version: {
                ...version,
                contentPreview: version.content.substring(0, 200),
                content: undefined
            },
            message: 'Version saved'
        });
    } catch (error) {
        console.error('Error saving version:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save version' },
            { status: 500 }
        );
    }
}

// ============================================
// PATCH - Restore to a specific version
// ============================================

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

        const { versionId, getFullContent } = await request.json();

        // If just getting full content of a version
        if (getFullContent && versionId) {
            const version = getArticleVersion(domain, articleId, versionId);
            if (!version) {
                return NextResponse.json(
                    { success: false, error: 'Version not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json({
                success: true,
                version
            });
        }

        // Restore to version
        if (!versionId) {
            return NextResponse.json(
                { success: false, error: 'versionId is required' },
                { status: 400 }
            );
        }

        const restored = restoreArticleVersion(domain, articleId, versionId);

        if (!restored) {
            return NextResponse.json(
                { success: false, error: 'Failed to restore version' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            article: {
                id: restored.id,
                title: restored.title,
                wordCount: restored.wordCount
            },
            message: 'Article restored to previous version'
        });
    } catch (error) {
        console.error('Error restoring version:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to restore version' },
            { status: 500 }
        );
    }
}
