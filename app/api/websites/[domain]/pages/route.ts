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

        // Handle syncFromGitHub action
        if (action === 'syncFromGitHub') {
            const { githubToken } = body;

            if (!githubToken) {
                return NextResponse.json(
                    { success: false, error: 'GitHub token required' },
                    { status: 400 }
                );
            }

            const { githubRepo, githubOwner } = website.deployment;
            if (!githubRepo || !githubOwner) {
                return NextResponse.json(
                    { success: false, error: 'GitHub repo not configured' },
                    { status: 400 }
                );
            }

            const syncedPages: Article[] = [];
            const errors: string[] = [];

            // Page types to sync (maps to app/[slug]/page.tsx files)
            const pageTypesToSync: { type: StructuralPageType; possiblePaths: string[] }[] = [
                { type: 'about', possiblePaths: ['app/about/page.tsx', 'content/pages/about.md'] },
                { type: 'contact', possiblePaths: ['app/contact/page.tsx', 'content/pages/contact.md'] },
                { type: 'privacy', possiblePaths: ['app/privacy/page.tsx', 'content/pages/privacy.md'] },
                { type: 'terms', possiblePaths: ['app/terms/page.tsx', 'content/pages/terms.md'] },
            ];

            for (const { type, possiblePaths } of pageTypesToSync) {
                let content: string | null = null;
                let foundPath: string | null = null;

                // Try each possible path
                for (const filePath of possiblePaths) {
                    try {
                        const fileRes = await fetch(
                            `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${githubToken}`,
                                    'Accept': 'application/vnd.github.v3+json',
                                    'User-Agent': 'AdSense-Ifrit'
                                }
                            }
                        );

                        if (fileRes.ok) {
                            const fileData = await fileRes.json();
                            content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                            foundPath = filePath;
                            break;
                        }
                    } catch {
                        // Continue to next path
                    }
                }

                if (content && foundPath) {
                    // Extract content from TSX or MD file
                    let extractedContent = '';
                    let title = type.charAt(0).toUpperCase() + type.slice(1);

                    if (foundPath.endsWith('.tsx')) {
                        // Try multiple extraction patterns for TSX content

                        // Pattern 1: Content in template literal {`...`}
                        const templateLiteral = content.match(/\{`([\s\S]+?)`\}/);
                        if (templateLiteral) {
                            extractedContent = templateLiteral[1].trim();
                        }

                        // Pattern 2: Content in <article> or <main> tags
                        if (!extractedContent) {
                            const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                                content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
                            if (articleMatch) {
                                extractedContent = articleMatch[1]
                                    .replace(/<[^>]+>/g, '\n')
                                    .replace(/\{[^}]+\}/g, '')
                                    .trim();
                            }
                        }

                        // Pattern 3: Extract visible text from JSX (fallback)
                        if (!extractedContent) {
                            // Remove imports and exports
                            const cleanContent = content
                                .replace(/import[\s\S]*?from\s*['"][^'"]+['"];?\n?/g, '')
                                .replace(/export\s+default\s+function[\s\S]*?\{/g, '')
                                .replace(/export\s+function[\s\S]*?\{/g, '');

                            // Extract text between > and < (JSX content)
                            const textMatches = cleanContent.match(/>([^<{>\n][^<{]*)</g);
                            if (textMatches) {
                                extractedContent = textMatches
                                    .map(m => m.slice(1, -1).trim())
                                    .filter(t => t.length > 2)
                                    .join('\n\n');
                            }
                        }

                        // Try to extract title from h1 or metadata
                        const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                            content.match(/title[=:]\s*["']([^"']+)["']/i) ||
                            content.match(/#\s+([^\n]+)/);
                        if (titleMatch) {
                            title = titleMatch[1].trim();
                        }
                    } else if (foundPath.endsWith('.md')) {
                        extractedContent = content;
                        const titleMatch = content.match(/^#\s+(.+)$/m);
                        if (titleMatch) {
                            title = titleMatch[1];
                        }
                    }

                    if (extractedContent) {
                        const now = Date.now();
                        const page: Article = {
                            id: `page_${type}_${now}`,
                            slug: type,
                            title,
                            description: `${title} page for ${website.name}`,
                            content: extractedContent,
                            category: 'Pages',
                            tags: [],
                            contentType: 'structural',
                            pageType: 'structural',
                            structuralType: type,
                            wordCount: extractedContent.split(/\s+/).length,
                            readingTime: Math.ceil(extractedContent.split(/\s+/).length / 200),
                            eeatSignals: [],
                            aiOverviewBlocks: [],
                            isExternal: false,
                            source: 'github-sync',
                            status: 'published',
                            lastModifiedAt: now,
                            publishedAt: now,
                        };

                        savePage(domain, page);
                        syncedPages.push(page);
                    }
                } else {
                    errors.push(`${type}: not found in repo`);
                }
            }

            const pages = listPages(domain);
            return NextResponse.json({
                success: true,
                message: `Synced ${syncedPages.length} pages from GitHub`,
                syncedCount: syncedPages.length,
                errors: errors.length > 0 ? errors : undefined,
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
