import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface PublishRequest {
    articleIds: string[];
    githubToken: string;
}

interface GitTreeItem {
    path: string;
    mode: '100644';
    type: 'blob';
    content?: string;
    sha?: string;
}

/**
 * Publish Articles to Website - SINGLE COMMIT
 * 
 * Collects all articles + images, creates a single GitHub commit.
 * This triggers only ONE Vercel deployment instead of multiple.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ domain: string }> }
): Promise<NextResponse> {
    try {
        const { domain } = await context.params;
        const body: PublishRequest = await request.json();
        const { articleIds, githubToken } = body;

        if (!articleIds || articleIds.length === 0) {
            return NextResponse.json({ success: false, error: 'No articles specified' }, { status: 400 });
        }

        if (!githubToken) {
            return NextResponse.json({ success: false, error: 'GitHub token required' }, { status: 400 });
        }

        const websiteDir = path.join(process.cwd(), 'websites', domain);
        const articlesDir = path.join(websiteDir, 'content', 'articles');
        const metadataPath = path.join(websiteDir, 'metadata.json');

        if (!fs.existsSync(metadataPath)) {
            return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
        }

        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        const { githubRepo, githubOwner } = metadata.deployment || {};

        if (!githubRepo || !githubOwner) {
            return NextResponse.json({
                success: false,
                error: 'GitHub repo not configured. Deploy website first.'
            }, { status: 400 });
        }

        const headers = {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'AdSense-Ifrit'
        };

        // Get current main branch SHA
        const refRes = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/refs/heads/main`,
            { headers }
        );
        if (!refRes.ok) {
            return NextResponse.json({ success: false, error: 'Failed to get main branch' }, { status: 500 });
        }
        const refData = await refRes.json();
        const baseSha = refData.object.sha;

        // Collect all files to push
        const filesToPush: { path: string; content: string; binary?: boolean }[] = [];
        const results: { id: string; slug: string; success: boolean; error?: string; imagesPushed?: number }[] = [];
        const publishedArticles: { id: string; path: string }[] = [];

        for (const articleId of articleIds) {
            const articlePath = path.join(articlesDir, `${articleId}.json`);

            if (!fs.existsSync(articlePath)) {
                results.push({ id: articleId, slug: '', success: false, error: 'Article not found' });
                continue;
            }

            try {
                const article = JSON.parse(fs.readFileSync(articlePath, 'utf-8'));

                // Generate markdown with frontmatter
                const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
date: "${new Date(article.lastModifiedAt).toISOString().split('T')[0]}"
description: "${(article.description || '').replace(/"/g, '\\"').replace(/\n/g, ' ').slice(0, 160)}"
author: "${article.author || 'Editorial Team'}"
category: "${article.category || 'guides'}"
tags: ${JSON.stringify(article.tags || [])}
---

`;
                const markdown = frontmatter + article.content;
                filesToPush.push({ path: `content/${article.slug}.md`, content: markdown });

                // Collect images
                const imagesDir = path.join(websiteDir, 'content', 'images', article.slug);
                let imagesPushed = 0;

                // Cover image
                const coverDir = path.join(imagesDir, 'cover');
                if (fs.existsSync(coverDir)) {
                    const coverFiles = fs.readdirSync(coverDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
                    if (coverFiles.length > 0) {
                        const coverFile = coverFiles[0];
                        const coverPath = path.join(coverDir, coverFile);
                        const coverExt = path.extname(coverFile);
                        const coverContent = fs.readFileSync(coverPath).toString('base64');
                        filesToPush.push({ 
                            path: `public/images/${article.slug}${coverExt}`, 
                            content: coverContent, 
                            binary: true 
                        });
                        imagesPushed++;
                    }
                }

                // Content images
                const contentImagesDir = path.join(imagesDir, 'images');
                if (fs.existsSync(contentImagesDir)) {
                    const imgFiles = fs.readdirSync(contentImagesDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
                    for (const imgFile of imgFiles) {
                        const imgPath = path.join(contentImagesDir, imgFile);
                        const imgContent = fs.readFileSync(imgPath).toString('base64');
                        filesToPush.push({ 
                            path: `public/images/${article.slug}/images/${imgFile}`, 
                            content: imgContent, 
                            binary: true 
                        });
                        imagesPushed++;
                    }
                }

                results.push({ id: articleId, slug: article.slug, success: true, imagesPushed });
                publishedArticles.push({ id: articleId, path: articlePath });

            } catch (err) {
                results.push({
                    id: articleId,
                    slug: '',
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        if (filesToPush.length === 0) {
            return NextResponse.json({ success: false, error: 'No valid articles to publish', results });
        }

        // Create blobs for binary files, collect tree items
        const treeItems: GitTreeItem[] = [];

        for (const file of filesToPush) {
            if (file.binary) {
                const blobRes = await fetch(
                    `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs`,
                    { method: 'POST', headers, body: JSON.stringify({ content: file.content, encoding: 'base64' }) }
                );
                if (blobRes.ok) {
                    const blobData = await blobRes.json();
                    treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blobData.sha });
                }
            } else {
                treeItems.push({ path: file.path, mode: '100644', type: 'blob', content: file.content });
            }
        }

        // Create tree
        const treeRes = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/trees`,
            { method: 'POST', headers, body: JSON.stringify({ base_tree: baseSha, tree: treeItems }) }
        );
        if (!treeRes.ok) {
            const errData = await treeRes.json();
            return NextResponse.json({ success: false, error: `Tree failed: ${errData.message}`, results }, { status: 500 });
        }
        const treeData = await treeRes.json();

        // Create commit
        const successCount = results.filter(r => r.success).length;
        const commitMessage = `Publish ${successCount} article(s) via Ifrit\n\n${results.filter(r => r.success).map(r => `- ${r.slug}`).join('\n')}`;

        const commitRes = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/commits`,
            { method: 'POST', headers, body: JSON.stringify({ message: commitMessage, tree: treeData.sha, parents: [baseSha] }) }
        );
        if (!commitRes.ok) {
            const errData = await commitRes.json();
            return NextResponse.json({ success: false, error: `Commit failed: ${errData.message}`, results }, { status: 500 });
        }
        const commitData = await commitRes.json();

        // Update ref
        const updateRefRes = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/refs/heads/main`,
            { method: 'PATCH', headers, body: JSON.stringify({ sha: commitData.sha, force: false }) }
        );
        if (!updateRefRes.ok) {
            const errData = await updateRefRes.json();
            return NextResponse.json({ success: false, error: `Ref update failed: ${errData.message}`, results }, { status: 500 });
        }

        // Update local statuses
        const now = Date.now();
        for (const pub of publishedArticles) {
            try {
                const article = JSON.parse(fs.readFileSync(pub.path, 'utf-8'));
                article.status = 'published';
                article.publishedAt = now;
                fs.writeFileSync(pub.path, JSON.stringify(article, null, 2));
            } catch { /* ignore */ }
        }

        const failCount = results.filter(r => !r.success).length;
        const totalImages = results.reduce((acc, r) => acc + (r.imagesPushed || 0), 0);

        console.log(`✅ Published ${successCount} articles + ${totalImages} images in ONE commit to ${domain}`);

        return NextResponse.json({
            success: failCount === 0,
            message: `Published ${successCount} article(s) + ${totalImages} image(s) in single commit${failCount > 0 ? `, ${failCount} failed` : ''}`,
            results,
            commitSha: commitData.sha,
            deployUrl: `https://${domain}`
        });

    } catch (error) {
        console.error('Publish error:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
