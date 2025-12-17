/**
 * Structural Pages API
 * 
 * CRUD for structural pages (About, Contact, Privacy, Terms, etc.)
 * 
 * Endpoints:
 * GET    /api/websites/[domain]/pages - List all structural pages
 * POST   /api/websites/[domain]/pages - Create/update a structural page
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    listPages,
    getPage,
    savePage,
    updatePage,
    createDefaultPages,
    Article,
    StructuralPageType
} from '@/lib/websiteStore';

// Valid structural page types
const VALID_PAGE_TYPES: StructuralPageType[] = ['about', 'contact', 'privacy', 'terms', 'disclaimer'];

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

        const pages = listPages(domain);

        return NextResponse.json({
            success: true,
            pages,
            count: pages.length,
            availableTypes: VALID_PAGE_TYPES
        });
    } catch (error) {
        console.error('Error listing pages:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list pages' },
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
        const { action, pageType, title, content, description } = body;

        // Handle createDefaults action
        if (action === 'createDefaults') {
            createDefaultPages(domain, website.name, website.author);
            const pages = listPages(domain);
            return NextResponse.json({
                success: true,
                message: 'Default pages created',
                pages
            });
        }

        // Validate pageType
        if (!pageType || !VALID_PAGE_TYPES.includes(pageType)) {
            return NextResponse.json(
                { success: false, error: `Invalid pageType. Must be one of: ${VALID_PAGE_TYPES.join(', ')}` },
                { status: 400 }
            );
        }

        // Check if page exists
        const existingPage = getPage(domain, pageType);

        if (existingPage) {
            // Update existing page
            const updated = updatePage(domain, pageType, {
                title: title || existingPage.title,
                content: content || existingPage.content,
                description: description || existingPage.description,
                wordCount: content ? content.split(/\s+/).length : existingPage.wordCount,
            });

            return NextResponse.json({
                success: true,
                page: updated,
                message: 'Page updated'
            });
        } else {
            // Create new page
            if (!title || !content) {
                return NextResponse.json(
                    { success: false, error: 'Title and content are required for new pages' },
                    { status: 400 }
                );
            }

            const now = Date.now();
            const page: Article = {
                id: `page_${pageType}_${now}`,
                slug: pageType,
                title,
                description: description || title,
                content,
                category: 'Pages',
                tags: [],
                contentType: 'structural',
                pageType: 'structural',
                structuralType: pageType,
                wordCount: content.split(/\s+/).length,
                readingTime: Math.ceil(content.split(/\s+/).length / 200),
                eeatSignals: [],
                aiOverviewBlocks: [],
                isExternal: false,
                source: 'manual',
                status: 'published',
                lastModifiedAt: now,
                publishedAt: now,
            };

            savePage(domain, page);

            return NextResponse.json({
                success: true,
                page,
                message: 'Page created'
            });
        }
    } catch (error) {
        console.error('Error saving page:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save page' },
            { status: 500 }
        );
    }
}
