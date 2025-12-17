/**
 * Website Content API
 * 
 * Full CRUD for articles within a website.
 * 
 * Endpoints:
 * GET    /api/websites/[domain]/content - List articles
 * POST   /api/websites/[domain]/content - Create article
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    listArticles,
    saveArticle,
    importExternalContent,
    generateArticleId,
    Article
} from '@/lib/websiteStore';

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

        const articles = listArticles(domain);

        // Get filter params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const contentType = searchParams.get('contentType');
        const category = searchParams.get('category');

        let filtered = articles;

        if (status) {
            filtered = filtered.filter(a => a.status === status);
        }
        if (contentType) {
            filtered = filtered.filter(a => a.contentType === contentType);
        }
        if (category) {
            filtered = filtered.filter(a => a.category === category);
        }

        return NextResponse.json({
            success: true,
            articles: filtered,
            total: articles.length,
            filtered: filtered.length
        });
    } catch (error) {
        console.error('Error listing content:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list content' },
            { status: 500 }
        );
    }
}

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

        const body = await request.json();
        const {
            title,
            slug,
            content,
            description,
            category,
            tags,
            contentType,
            isExternal = false,
            generatedBy,
            eeatSignals = [],
            aiOverviewBlocks = [],
            status = 'draft'
        } = body;

        if (!title || !content) {
            return NextResponse.json(
                { success: false, error: 'Title and content are required' },
                { status: 400 }
            );
        }

        // If external, use import function
        if (isExternal) {
            const article = importExternalContent(domain, {
                title,
                slug,
                content,
                category,
                tags
            });

            return NextResponse.json({
                success: true,
                article,
                message: 'External content imported successfully'
            });
        }

        // Create new article
        const wordCount = content.split(/\s+/).length;
        const generatedSlug = slug || title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 60);

        const article: Article = {
            id: generateArticleId(),
            slug: generatedSlug,
            title,
            description: description || content.substring(0, 160) + '...',
            content,
            category: category || 'general',
            tags: tags || [],
            contentType: contentType || 'general',
            pageType: 'article',
            wordCount,
            readingTime: Math.ceil(wordCount / 200),
            eeatSignals,
            aiOverviewBlocks,
            generatedBy,
            generatedAt: generatedBy ? Date.now() : undefined,
            isExternal: false,
            source: generatedBy ? 'ai-generated' : 'manual',
            status,
            lastModifiedAt: Date.now()
        };

        saveArticle(domain, article);

        return NextResponse.json({
            success: true,
            article
        });
    } catch (error) {
        console.error('Error creating content:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create content' },
            { status: 500 }
        );
    }
}
