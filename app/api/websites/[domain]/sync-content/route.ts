/**
 * GitHub Content Sync API
 * 
 * POST /api/websites/[domain]/sync-content
 * 
 * Fetches articles from GitHub content/ folder and imports to local store.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    saveArticle,
    generateArticleId,
    Article,
    listArticles as getLocalArticles
} from '@/lib/websiteStore';

interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    download_url: string;
    type: string;
}

interface SyncResult {
    imported: string[];
    updated: string[];
    skipped: string[];
    errors: string[];
}

// Parse frontmatter from markdown
type FrontmatterValue = string | number | boolean;

function parseFrontmatter(content: string): { frontmatter: Record<string, FrontmatterValue>; body: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
        return { frontmatter: {}, body: content };
    }

    const frontmatterStr = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    // Simple YAML parsing
    const frontmatter: Record<string, FrontmatterValue> = {};
    const lines = frontmatterStr.split('\n');

    for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
            let value: FrontmatterValue = match[2].trim();
            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            // Parse numbers
            if (!isNaN(Number(value))) {
                value = Number(value);
            }
            // Parse booleans
            if (value === 'true') value = true;
            if (value === 'false') value = false;

            frontmatter[match[1]] = value;
        }
    }

    return { frontmatter, body };
}

// Generate slug from filename
function fileToSlug(filename: string): string {
    return filename.replace(/\.md$/, '').toLowerCase();
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

        // Get GitHub token from request or use stored settings
        const body = await request.json().catch(() => ({}));
        const { githubToken } = body;

        if (!githubToken) {
            return NextResponse.json(
                { success: false, error: 'GitHub token required' },
                { status: 400 }
            );
        }

        const { githubOwner, githubRepo } = website.deployment;

        if (!githubOwner || !githubRepo) {
            return NextResponse.json(
                { success: false, error: 'GitHub repo not configured for this website' },
                { status: 400 }
            );
        }

        const result: SyncResult = {
            imported: [],
            updated: [],
            skipped: [],
            errors: []
        };

        // Fetch content directory from GitHub
        const contentsUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/content`;
        const contentsRes = await fetch(contentsUrl, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AdSense-Ifrit'
            }
        });

        if (!contentsRes.ok) {
            return NextResponse.json(
                { success: false, error: 'Failed to fetch content from GitHub' },
                { status: 500 }
            );
        }

        const files: GitHubFile[] = await contentsRes.json();
        const mdFiles = files.filter(f => f.name.endsWith('.md') && f.type === 'file');

        // Get existing local articles for comparison
        const localArticles = getLocalArticles(domain);
        const localSlugs = new Set(localArticles.map(a => a.slug));

        // Process each markdown file
        for (const file of mdFiles) {
            try {
                // Skip non-article files
                if (['about.md', 'privacy.md', 'terms.md', 'contact.md'].includes(file.name)) {
                    result.skipped.push(file.name);
                    continue;
                }

                // Fetch file content
                const fileRes = await fetch(file.download_url);
                if (!fileRes.ok) {
                    result.errors.push(`Failed to fetch ${file.name}`);
                    continue;
                }

                const rawContent = await fileRes.text();
                const { frontmatter, body } = parseFrontmatter(rawContent);
                const slug = fileToSlug(file.name);
                const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;

                // Check if article already exists locally
                const existingArticle = localArticles.find(a => a.slug === slug);

                const article: Article = {
                    id: existingArticle?.id || generateArticleId(),
                    slug,
                    title: String(frontmatter.title || slug.replace(/-/g, ' ')),
                    description: String(frontmatter.description || body.substring(0, 160) + '...'),
                    content: body,
                    category: String(frontmatter.category || 'general'),
                    tags: frontmatter.tags ? String(frontmatter.tags).split(',').map(t => t.trim()) : [],
                    contentType: String(frontmatter.contentType || 'article'),
                    pageType: 'article',
                    wordCount,
                    readingTime: Math.ceil(wordCount / 200),
                    eeatSignals: [],
                    aiOverviewBlocks: [],
                    // AI Generation - unknown from GitHub sync
                    aiGeneration: existingArticle?.aiGeneration || undefined,
                    generatedBy: existingArticle?.generatedBy,
                    generatedAt: existingArticle?.generatedAt,
                    isExternal: false,
                    source: 'github-sync',
                    // Publishing
                    status: 'published',
                    publishedAt: frontmatter.date ? new Date(String(frontmatter.date)).getTime() : Date.now(),
                    lastModifiedAt: Date.now(),
                    // SEO
                    metaTitle: frontmatter.metaTitle ? String(frontmatter.metaTitle) : undefined,
                    metaDescription: frontmatter.metaDescription ? String(frontmatter.metaDescription) : undefined
                };

                saveArticle(domain, article);

                if (localSlugs.has(slug)) {
                    result.updated.push(slug);
                } else {
                    result.imported.push(slug);
                }

            } catch (error) {
                result.errors.push(`Error processing ${file.name}: ${error}`);
            }
        }

        // Update website stats
        const updatedArticles = getLocalArticles(domain);
        const totalWords = updatedArticles.reduce((sum, a) => sum + a.wordCount, 0);

        return NextResponse.json({
            success: true,
            result,
            stats: {
                totalArticles: updatedArticles.length,
                totalWords,
                newlyImported: result.imported.length,
                updated: result.updated.length
            }
        });

    } catch (error) {
        console.error('Error syncing content:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync content' },
            { status: 500 }
        );
    }
}
