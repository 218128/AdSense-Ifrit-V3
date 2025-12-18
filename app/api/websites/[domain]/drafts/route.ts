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
    ensureArticleImageDirs,
    CoverImage,
    ContentImage,
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
    // Image support
    isFolder: boolean;           // true if folder-per-article structure
    hasCover: boolean;           // cover/ folder exists with images
    contentImageCount: number;   // number of images in images/ folder
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
 * Check if a draft entry is a folder-per-article structure
 */
function getDraftFolderInfo(draftsPath: string, name: string): {
    isFolder: boolean;
    hasCover: boolean;
    contentImageCount: number;
    mdFile: string | null;
} {
    const entryPath = path.join(draftsPath, name);
    const stats = fs.statSync(entryPath);

    if (!stats.isDirectory()) {
        return { isFolder: false, hasCover: false, contentImageCount: 0, mdFile: null };
    }

    // Look for article.md or [name].md in folder
    const files = fs.readdirSync(entryPath);
    let mdFile: string | null = null;

    if (files.includes('article.md')) {
        mdFile = 'article.md';
    } else {
        const mdFiles = files.filter(f => f.endsWith('.md'));
        if (mdFiles.length > 0) {
            mdFile = mdFiles[0];
        }
    }

    // Check for cover
    const coverPath = path.join(entryPath, 'cover');
    const hasCover = fs.existsSync(coverPath) &&
        fs.readdirSync(coverPath).some(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

    // Count content images
    const imagesPath = path.join(entryPath, 'images');
    let contentImageCount = 0;
    if (fs.existsSync(imagesPath)) {
        contentImageCount = fs.readdirSync(imagesPath)
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).length;
    }

    return { isFolder: true, hasCover, contentImageCount, mdFile };
}

/**
 * Copy images from draft folder to content images folder
 */
function copyDraftImages(
    draftsPath: string,
    folderName: string,
    domain: string,
    articleSlug: string
): { coverImage?: CoverImage; contentImages: ContentImage[] } {
    const sourcePath = path.join(draftsPath, folderName);
    ensureArticleImageDirs(domain, articleSlug);

    const imagesBasePath = path.join(process.cwd(), 'websites', domain, 'content', 'images', articleSlug);

    let coverImage: CoverImage | undefined;
    const contentImages: ContentImage[] = [];

    // Copy cover image
    const sourceCoverPath = path.join(sourcePath, 'cover');
    if (fs.existsSync(sourceCoverPath)) {
        const coverFiles = fs.readdirSync(sourceCoverPath)
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

        if (coverFiles.length > 0) {
            const srcFile = path.join(sourceCoverPath, coverFiles[0]);
            const ext = path.extname(coverFiles[0]);
            const destFile = path.join(imagesBasePath, 'cover', `cover${ext}`);
            fs.copyFileSync(srcFile, destFile);

            coverImage = {
                url: `/images/${articleSlug}/cover/cover${ext}`,
                alt: articleSlug.replace(/-/g, ' '),
                source: 'manual'
            };
        }
    }

    // Copy content images
    const sourceImagesPath = path.join(sourcePath, 'images');
    if (fs.existsSync(sourceImagesPath)) {
        const imageFiles = fs.readdirSync(sourceImagesPath)
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

        imageFiles.forEach((file, index) => {
            const srcFile = path.join(sourceImagesPath, file);
            const ext = path.extname(file);
            const destFile = path.join(imagesBasePath, 'images', `img-${String(index + 1).padStart(3, '0')}${ext}`);
            fs.copyFileSync(srcFile, destFile);

            contentImages.push({
                id: `img_${Date.now()}_${index}`,
                url: `/images/${articleSlug}/images/img-${String(index + 1).padStart(3, '0')}${ext}`,
                alt: file.replace(/\.[^.]+$/, '').replace(/-/g, ' '),
                source: 'manual'
            });
        });
    }

    return { coverImage, contentImages };
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

        // Scan for both .md files and folders
        const entries = fs.readdirSync(draftsPath);
        const pendingFiles: PendingFile[] = [];

        for (const entry of entries) {
            const entryPath = path.join(draftsPath, entry);
            const stats = fs.statSync(entryPath);

            // Check if it's a folder-per-article structure
            if (stats.isDirectory()) {
                const folderInfo = getDraftFolderInfo(draftsPath, entry);
                if (folderInfo.mdFile) {
                    const mdPath = path.join(entryPath, folderInfo.mdFile);
                    try {
                        const content = fs.readFileSync(mdPath, 'utf-8');
                        const parsed = parseMarkdownFile(content);
                        if (parsed) {
                            pendingFiles.push({
                                filename: entry, // folder name
                                title: parsed.title,
                                description: parsed.description,
                                category: parsed.category,
                                tags: parsed.tags,
                                wordCount: parsed.body.split(/\s+/).length,
                                createdAt: stats.mtimeMs,
                                isFolder: true,
                                hasCover: folderInfo.hasCover,
                                contentImageCount: folderInfo.contentImageCount
                            });
                        }
                    } catch {
                        pendingFiles.push({
                            filename: entry,
                            title: entry,
                            description: '',
                            category: 'general',
                            tags: [],
                            wordCount: 0,
                            createdAt: stats.mtimeMs,
                            error: 'Could not read markdown file',
                            isFolder: true,
                            hasCover: false,
                            contentImageCount: 0
                        });
                    }
                }
                continue;
            }

            // Regular .md file
            if (!entry.endsWith('.md')) continue;

            try {
                const content = fs.readFileSync(entryPath, 'utf-8');
                const parsed = parseMarkdownFile(content);

                if (parsed) {
                    pendingFiles.push({
                        filename: entry,
                        title: parsed.title,
                        description: parsed.description,
                        category: parsed.category,
                        tags: parsed.tags,
                        wordCount: parsed.body.split(/\s+/).length,
                        createdAt: stats.mtimeMs,
                        isFolder: false,
                        hasCover: false,
                        contentImageCount: 0
                    });
                } else {
                    pendingFiles.push({
                        filename: entry,
                        title: entry.replace('.md', ''),
                        description: '',
                        category: 'general',
                        tags: [],
                        wordCount: 0,
                        createdAt: stats.mtimeMs,
                        error: 'Could not parse file',
                        isFolder: false,
                        hasCover: false,
                        contentImageCount: 0
                    });
                }
            } catch (err) {
                pendingFiles.push({
                    filename: entry,
                    title: entry.replace('.md', ''),
                    description: '',
                    category: 'general',
                    tags: [],
                    wordCount: 0,
                    createdAt: stats.mtimeMs,
                    error: `Read error: ${err instanceof Error ? err.message : 'Unknown'}`,
                    isFolder: false,
                    hasCover: false,
                    contentImageCount: 0
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

        // Get files/folders to import
        let entriesToImport: string[] = [];

        if (importAll) {
            const allEntries = fs.readdirSync(draftsPath);
            entriesToImport = allEntries.filter(e => {
                const entryPath = path.join(draftsPath, e);
                const stats = fs.statSync(entryPath);
                if (stats.isDirectory()) {
                    // Check if folder has markdown
                    const folderInfo = getDraftFolderInfo(draftsPath, e);
                    return folderInfo.mdFile !== null;
                }
                return e.endsWith('.md');
            });
        } else if (filename) {
            entriesToImport = [filename];
        } else {
            return NextResponse.json(
                { success: false, error: 'Specify filename or set importAll: true' },
                { status: 400 }
            );
        }

        const results: { filename: string; success: boolean; articleId?: string; error?: string; hasImages?: boolean }[] = [];

        for (const entry of entriesToImport) {
            const entryPath = path.join(draftsPath, entry);

            if (!fs.existsSync(entryPath)) {
                results.push({ filename: entry, success: false, error: 'File/folder not found' });
                addToHistory(domain, {
                    filename: entry,
                    status: 'failed',
                    error: 'File/folder not found',
                    importedAt: Date.now(),
                    retryCount: 0
                });
                continue;
            }

            try {
                const stats = fs.statSync(entryPath);
                const isFolder = stats.isDirectory();
                let contentPath = entryPath;
                let folderInfo = { isFolder: false, hasCover: false, contentImageCount: 0, mdFile: null as string | null };

                if (isFolder) {
                    folderInfo = getDraftFolderInfo(draftsPath, entry);
                    if (!folderInfo.mdFile) {
                        results.push({ filename: entry, success: false, error: 'No markdown file in folder' });
                        continue;
                    }
                    contentPath = path.join(entryPath, folderInfo.mdFile);
                }

                const content = fs.readFileSync(contentPath, 'utf-8');
                const parsed = parseMarkdownFile(content);

                if (!parsed) {
                    results.push({ filename: entry, success: false, error: 'Invalid markdown format' });
                    addToHistory(domain, {
                        filename: entry,
                        status: 'failed',
                        error: 'Invalid markdown format',
                        importedAt: Date.now(),
                        retryCount: 0
                    });
                    continue;
                }

                // Generate slug from entry name or title
                const slug = entry.replace('.md', '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');

                // Copy images if folder-based
                let coverImage: CoverImage | undefined;
                let contentImages: ContentImage[] = [];

                if (isFolder && (folderInfo.hasCover || folderInfo.contentImageCount > 0)) {
                    const imageResult = copyDraftImages(draftsPath, entry, domain, slug);
                    coverImage = imageResult.coverImage;
                    contentImages = imageResult.contentImages;
                }

                // Import as external content with images
                const article = importExternalContent(domain, {
                    title: parsed.title,
                    slug,
                    content: parsed.body,
                    category: parsed.category,
                    tags: parsed.tags,
                    coverImage,
                    contentImages: contentImages.length > 0 ? contentImages : undefined
                });

                // Success - delete the draft file/folder
                if (isFolder) {
                    fs.rmSync(entryPath, { recursive: true });
                } else {
                    fs.unlinkSync(entryPath);
                }

                results.push({
                    filename: entry,
                    success: true,
                    articleId: article.id,
                    hasImages: coverImage !== undefined || contentImages.length > 0
                });
                addToHistory(domain, {
                    filename: entry,
                    status: 'success',
                    articleId: article.id,
                    importedAt: Date.now(),
                    retryCount: 0
                });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                results.push({ filename: entry, success: false, error: errorMsg });
                addToHistory(domain, {
                    filename: entry,
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
