import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface PublishRequest {
    articleIds: string[];
    githubToken: string;
}

/**
 * Publish Articles to Website
 * 
 * Reads articles from local storage, converts to markdown with frontmatter,
 * pushes to GitHub repo, and updates local status to 'published'.
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

        const results: { id: string; slug: string; success: boolean; error?: string; imagesPushed?: number }[] = [];

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
description: "${(article.description || '').replace(/"/g, '\\"').slice(0, 160)}"
author: "${article.author || 'Editorial Team'}"
category: "${article.category || 'guides'}"
tags: ${JSON.stringify(article.tags || [])}
---

`;
                const markdown = frontmatter + article.content;
                const filePath = `content/${article.slug}.md`;

                // Check if file exists in repo
                const checkUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
                const checkResponse = await fetch(checkUrl, {
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'AdSense-Ifrit'
                    }
                });

                let sha: string | undefined;
                if (checkResponse.ok) {
                    const existing = await checkResponse.json();
                    sha = existing.sha;
                }

                // Create/update file in GitHub
                const putResponse = await fetch(checkUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'AdSense-Ifrit'
                    },
                    body: JSON.stringify({
                        message: sha
                            ? `Update: ${article.title}`
                            : `Publish: ${article.title}`,
                        content: Buffer.from(markdown).toString('base64'),
                        branch: 'main',
                        ...(sha ? { sha } : {})
                    })
                });

                if (!putResponse.ok) {
                    const errorData = await putResponse.json();
                    results.push({
                        id: articleId,
                        slug: article.slug,
                        success: false,
                        error: errorData.message || 'GitHub API error'
                    });
                    continue;
                }

                // Push images to GitHub
                const imagesDir = path.join(websiteDir, 'content', 'images', article.slug);
                let imagesPushed = 0;

                // Push cover image (flat structure: public/images/{slug}.png)
                const coverDir = path.join(imagesDir, 'cover');
                if (fs.existsSync(coverDir)) {
                    const coverFiles = fs.readdirSync(coverDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
                    if (coverFiles.length > 0) {
                        const coverFile = coverFiles[0];
                        const coverPath = path.join(coverDir, coverFile);
                        const coverExt = path.extname(coverFile);
                        const coverContent = fs.readFileSync(coverPath);
                        const coverGitPath = `public/images/${article.slug}${coverExt}`;

                        // Check if cover exists
                        const coverCheckUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${coverGitPath}`;
                        const coverCheckRes = await fetch(coverCheckUrl, {
                            headers: {
                                'Authorization': `Bearer ${githubToken}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'User-Agent': 'AdSense-Ifrit'
                            }
                        });
                        let coverSha: string | undefined;
                        if (coverCheckRes.ok) {
                            const existing = await coverCheckRes.json();
                            coverSha = existing.sha;
                        }

                        // Push cover
                        await fetch(coverCheckUrl, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${githubToken}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'Content-Type': 'application/json',
                                'User-Agent': 'AdSense-Ifrit'
                            },
                            body: JSON.stringify({
                                message: `Add cover image: ${article.slug}`,
                                content: coverContent.toString('base64'),
                                branch: 'main',
                                ...(coverSha ? { sha: coverSha } : {})
                            })
                        });
                        imagesPushed++;
                    }
                }

                // Push content images (nested: public/images/{slug}/images/img-001.png)
                const contentImagesDir = path.join(imagesDir, 'images');
                if (fs.existsSync(contentImagesDir)) {
                    const contentImageFiles = fs.readdirSync(contentImagesDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

                    for (const imgFile of contentImageFiles) {
                        const imgPath = path.join(contentImagesDir, imgFile);
                        const imgContent = fs.readFileSync(imgPath);
                        const imgGitPath = `public/images/${article.slug}/images/${imgFile}`;

                        // Check if image exists
                        const imgCheckUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${imgGitPath}`;
                        const imgCheckRes = await fetch(imgCheckUrl, {
                            headers: {
                                'Authorization': `Bearer ${githubToken}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'User-Agent': 'AdSense-Ifrit'
                            }
                        });
                        let imgSha: string | undefined;
                        if (imgCheckRes.ok) {
                            const existing = await imgCheckRes.json();
                            imgSha = existing.sha;
                        }

                        // Push image
                        await fetch(imgCheckUrl, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${githubToken}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'Content-Type': 'application/json',
                                'User-Agent': 'AdSense-Ifrit'
                            },
                            body: JSON.stringify({
                                message: `Add image: ${article.slug}/${imgFile}`,
                                content: imgContent.toString('base64'),
                                branch: 'main',
                                ...(imgSha ? { sha: imgSha } : {})
                            })
                        });
                        imagesPushed++;
                    }
                }

                // Update local article status
                article.status = 'published';
                article.publishedAt = Date.now();
                fs.writeFileSync(articlePath, JSON.stringify(article, null, 2));

                results.push({ id: articleId, slug: article.slug, success: true, imagesPushed });
                console.log(`✅ Published: ${article.title} to ${domain} (${imagesPushed} images)`);

            } catch (err) {
                results.push({
                    id: articleId,
                    slug: '',
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: failCount === 0,
            message: `Published ${successCount} article(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
            results,
            deployUrl: `https://${domain}`
        });

    } catch (error) {
        console.error('Publish error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
