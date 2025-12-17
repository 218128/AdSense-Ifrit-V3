/**
 * Drafts Folder API
 * 
 * Scan and import markdown articles from the drafts folder.
 * 
 * Endpoints:
 * GET    /api/websites/[domain]/drafts - Scan drafts folder for pending files
 * POST   /api/websites/[domain]/drafts - Import file(s) from drafts
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
    getWebsite,
    importExternalContent,
} from '@/lib/websiteStore';

// ============================================
// TYPES
// ============================================

interface PendingFile {
    filename: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    wordCount: number;
    createdAt: number;
    error?: string;
}

interface ImportRecord {
    filename: string;
    status: 'success' | 'failed' | 'retrying';
    error?: string;
    articleId?: string;
    importedAt: number;
    retryCount: number;
}

// ============================================
// HELPERS
// ============================================

function getDraftsPath(domain: string): string {
    return path.join(process.cwd(), 'websites', domain, 'drafts');
}

function getHistoryPath(domain: string): string {
    return path.join(process.cwd(), 'websites', domain, '.ifrit', 'import-history.json');
}

function ensureDraftsFolder(domain: string): void {
    const draftsPath = getDraftsPath(domain);
    const ifritPath = path.join(process.cwd(), 'websites', domain, '.ifrit');

    if (!fs.existsSync(draftsPath)) {
        fs.mkdirSync(draftsPath, { recursive: true });
    }
    if (!fs.existsSync(ifritPath)) {
        fs.mkdirSync(ifritPath, { recursive: true });
    }
}

function getImportHistory(domain: string): ImportRecord[] {
    const historyPath = getHistoryPath(domain);
    if (!fs.existsSync(historyPath)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    } catch {
        return [];
    }
}

function saveImportHistory(domain: string, history: ImportRecord[]): void {
    const historyPath = getHistoryPath(domain);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

function addToHistory(domain: string, record: ImportRecord): void {
    const history = getImportHistory(domain);
    // Keep last 100 records
    const updated = [record, ...history].slice(0, 100);
    saveImportHistory(domain, updated);
}

/**
 * Parse markdown file with YAML frontmatter
 */
function parseMarkdownFile(content: string): {
    title: string;
    description: string;
    category: string;
    tags: string[];
    body: string;
} | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
        // No frontmatter, try to extract title from first heading
        const headingMatch = content.match(/^#\s+(.+)$/m);
        return {
            title: headingMatch ? headingMatch[1] : 'Untitled',
            description: content.substring(0, 160),
            category: 'general',
            tags: [],
            body: content
        };
    }

    const [, frontmatter, body] = frontmatterMatch;

    const getValue = (key: string): string => {
        const match = frontmatter.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'));
        return match ? match[1].trim() : '';
    };

    const getTags = (): string[] => {
        const tagsMatch = frontmatter.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
        if (tagsMatch) {
            return tagsMatch[1].split('\n')
                .map(line => line.replace(/^\s+-\s+/, '').trim())
                .filter(Boolean);
        }
        // Try inline format
        const inlineMatch = frontmatter.match(/tags:\s*\[(.+)\]/);
        if (inlineMatch) {
            return inlineMatch[1].split(',').map(t => t.trim().replace(/["']/g, ''));
        }
        return [];
    };

    return {
        title: getValue('title') || 'Untitled',
        description: getValue('description') || body.substring(0, 160),
        category: getValue('category') || 'general',
        tags: getTags(),
        body: body.trim()
    };
}

// ============================================
// GET - Scan drafts folder
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

        // Ensure drafts folder exists
        ensureDraftsFolder(domain);
        const draftsPath = getDraftsPath(domain);

        // Scan for .md files
        const files = fs.readdirSync(draftsPath)
            .filter(f => f.endsWith('.md'));

        const pendingFiles: PendingFile[] = [];

        for (const filename of files) {
            const filePath = path.join(draftsPath, filename);
            const stats = fs.statSync(filePath);

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const parsed = parseMarkdownFile(content);

                if (parsed) {
                    pendingFiles.push({
                        filename,
                        title: parsed.title,
                        description: parsed.description,
                        category: parsed.category,
                        tags: parsed.tags,
                        wordCount: parsed.body.split(/\s+/).length,
                        createdAt: stats.mtimeMs
                    });
                } else {
                    pendingFiles.push({
                        filename,
                        title: filename.replace('.md', ''),
                        description: '',
                        category: 'general',
                        tags: [],
                        wordCount: 0,
                        createdAt: stats.mtimeMs,
                        error: 'Could not parse file'
                    });
                }
            } catch (err) {
                pendingFiles.push({
                    filename,
                    title: filename.replace('.md', ''),
                    description: '',
                    category: 'general',
                    tags: [],
                    wordCount: 0,
                    createdAt: stats.mtimeMs,
                    error: `Read error: ${err instanceof Error ? err.message : 'Unknown'}`
                });
            }
        }

        // Get import history
        const history = getImportHistory(domain);

        // Get folder path for display
        const folderPath = path.relative(process.cwd(), draftsPath);

        return NextResponse.json({
            success: true,
            draftsFolder: folderPath,
            pendingFiles,
            history: history.slice(0, 20), // Last 20 imports
            count: pendingFiles.length
        });
    } catch (error) {
        console.error('Error scanning drafts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to scan drafts folder' },
            { status: 500 }
        );
    }
}

// ============================================
// POST - Import file(s) from drafts
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

        const body = await request.json();
        const { filename, importAll = false } = body;

        ensureDraftsFolder(domain);
        const draftsPath = getDraftsPath(domain);

        // Get files to import
        let filesToImport: string[] = [];

        if (importAll) {
            filesToImport = fs.readdirSync(draftsPath).filter(f => f.endsWith('.md'));
        } else if (filename) {
            filesToImport = [filename];
        } else {
            return NextResponse.json(
                { success: false, error: 'Specify filename or set importAll: true' },
                { status: 400 }
            );
        }

        const results: { filename: string; success: boolean; articleId?: string; error?: string }[] = [];

        for (const file of filesToImport) {
            const filePath = path.join(draftsPath, file);

            if (!fs.existsSync(filePath)) {
                results.push({ filename: file, success: false, error: 'File not found' });
                addToHistory(domain, {
                    filename: file,
                    status: 'failed',
                    error: 'File not found',
                    importedAt: Date.now(),
                    retryCount: 0
                });
                continue;
            }

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const parsed = parseMarkdownFile(content);

                if (!parsed) {
                    results.push({ filename: file, success: false, error: 'Invalid markdown format' });
                    addToHistory(domain, {
                        filename: file,
                        status: 'failed',
                        error: 'Invalid markdown format',
                        importedAt: Date.now(),
                        retryCount: 0
                    });
                    continue;
                }

                // Generate slug from filename or title
                const slug = file.replace('.md', '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');

                // Import as external content
                const article = importExternalContent(domain, {
                    title: parsed.title,
                    slug,
                    content: parsed.body,
                    category: parsed.category,
                    tags: parsed.tags
                });

                // Success - delete the draft file
                fs.unlinkSync(filePath);

                results.push({ filename: file, success: true, articleId: article.id });
                addToHistory(domain, {
                    filename: file,
                    status: 'success',
                    articleId: article.id,
                    importedAt: Date.now(),
                    retryCount: 0
                });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                results.push({ filename: file, success: false, error: errorMsg });
                addToHistory(domain, {
                    filename: file,
                    status: 'failed',
                    error: errorMsg,
                    importedAt: Date.now(),
                    retryCount: 0
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            results,
            summary: {
                imported: successCount,
                failed: failCount,
                total: results.length
            }
        });
    } catch (error) {
        console.error('Error importing from drafts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to import from drafts' },
            { status: 500 }
        );
    }
}
