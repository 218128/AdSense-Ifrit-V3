/**
 * Batch Operations API
 * 
 * Perform bulk operations on multiple articles.
 * 
 * Actions:
 * - clean: Apply cleanContent() to remove AI artifacts
 * - delete: Remove selected articles
 * - updateStatus: Change status (draft/ready/published)
 * - updateCategory: Assign category to selected
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    getArticle,
    updateArticle,
    deleteArticle as deleteArticleStore,
    saveArticleVersion,
    listArticles
} from '@/lib/websiteStore';
import { cleanContent } from '@/lib/siteBuilder/contentValidator';

// ============================================
// POST - Execute batch operation
// ============================================

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const { action, articleIds, options } = await request.json();

        if (!action || !articleIds || !Array.isArray(articleIds)) {
            return NextResponse.json(
                { success: false, error: 'action and articleIds array required' },
                { status: 400 }
            );
        }

        const results: { articleId: string; success: boolean; error?: string }[] = [];

        switch (action) {
            case 'clean':
                // Apply cleanContent to remove AI artifacts
                for (const articleId of articleIds) {
                    try {
                        const article = getArticle(domain, articleId);
                        if (!article) {
                            results.push({ articleId, success: false, error: 'Article not found' });
                            continue;
                        }

                        // Save version before cleaning
                        saveArticleVersion(domain, articleId, 'before-edit');

                        // Clean content
                        const cleanResult = cleanContent(article.content);

                        if (cleanResult.wasModified) {
                            updateArticle(domain, articleId, {
                                content: cleanResult.content,
                                wordCount: cleanResult.content.split(/\s+/).filter(Boolean).length
                            });
                            results.push({ articleId, success: true });
                        } else {
                            results.push({ articleId, success: true, error: 'No changes needed' });
                        }
                    } catch (error) {
                        results.push({ articleId, success: false, error: String(error) });
                    }
                }
                break;

            case 'delete':
                // Delete selected articles
                for (const articleId of articleIds) {
                    try {
                        const deleted = deleteArticleStore(domain, articleId);
                        results.push({ articleId, success: deleted, error: deleted ? undefined : 'Article not found' });
                    } catch (error) {
                        results.push({ articleId, success: false, error: String(error) });
                    }
                }
                break;

            case 'updateStatus':
                // Update status of selected articles
                const newStatus = options?.status;
                if (!newStatus || !['draft', 'ready', 'published'].includes(newStatus)) {
                    return NextResponse.json(
                        { success: false, error: 'Valid status required (draft/ready/published)' },
                        { status: 400 }
                    );
                }

                for (const articleId of articleIds) {
                    try {
                        const updated = updateArticle(domain, articleId, {
                            status: newStatus,
                            publishedAt: newStatus === 'published' ? Date.now() : undefined
                        });
                        results.push({ articleId, success: !!updated, error: updated ? undefined : 'Article not found' });
                    } catch (error) {
                        results.push({ articleId, success: false, error: String(error) });
                    }
                }
                break;

            case 'updateCategory':
                // Assign category to selected articles
                const newCategory = options?.category;
                if (!newCategory) {
                    return NextResponse.json(
                        { success: false, error: 'category required in options' },
                        { status: 400 }
                    );
                }

                for (const articleId of articleIds) {
                    try {
                        const updated = updateArticle(domain, articleId, { category: newCategory });
                        results.push({ articleId, success: !!updated, error: updated ? undefined : 'Article not found' });
                    } catch (error) {
                        results.push({ articleId, success: false, error: String(error) });
                    }
                }
                break;

            case 'addTags':
                // Add tags to selected articles
                const tagsToAdd = options?.tags;
                if (!tagsToAdd || !Array.isArray(tagsToAdd)) {
                    return NextResponse.json(
                        { success: false, error: 'tags array required in options' },
                        { status: 400 }
                    );
                }

                for (const articleId of articleIds) {
                    try {
                        const article = getArticle(domain, articleId);
                        if (!article) {
                            results.push({ articleId, success: false, error: 'Article not found' });
                            continue;
                        }
                        const existingTags = article.tags || [];
                        const newTags = [...new Set([...existingTags, ...tagsToAdd])];
                        const updated = updateArticle(domain, articleId, { tags: newTags });
                        results.push({ articleId, success: !!updated });
                    } catch (error) {
                        results.push({ articleId, success: false, error: String(error) });
                    }
                }
                break;

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            action,
            total: articleIds.length,
            successful,
            failed,
            results
        });
    } catch (error) {
        console.error('Batch operation error:', error);
        return NextResponse.json(
            { success: false, error: 'Batch operation failed' },
            { status: 500 }
        );
    }
}

// ============================================
// GET - Get batch operation preview
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        // Get stats for potential batch operations
        const articles = listArticles(domain);

        // Count articles that would be affected by cleanContent
        let dirtyCount = 0;
        for (const article of articles) {
            const result = cleanContent(article.content);
            if (result.wasModified) dirtyCount++;
        }

        // Count by status
        const byStatus = {
            draft: articles.filter(a => a.status === 'draft').length,
            ready: articles.filter(a => a.status === 'ready').length,
            published: articles.filter(a => a.status === 'published').length
        };

        // Count unique categories
        const categories = [...new Set(articles.map(a => a.category))];

        return NextResponse.json({
            success: true,
            stats: {
                total: articles.length,
                needsCleaning: dirtyCount,
                byStatus,
                categories
            }
        });
    } catch (error) {
        console.error('Error getting batch stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get batch stats' },
            { status: 500 }
        );
    }
}
