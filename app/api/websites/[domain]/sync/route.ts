/**
 * Website Sync API
 * 
 * Sync website data with external sources (GitHub, Vercel).
 * Used to populate real deployment data for existing sites.
 * 
 * POST /api/websites/[domain]/sync - Sync with real data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsite, saveWebsite, listArticles } from '@/lib/websiteStore';

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
            githubToken,
            vercelToken,
            manualData // Allow manual override for missing API access
        } = body;

        let updated = false;

        // Option 1: Manual data sync (no API calls needed)
        if (manualData) {
            if (manualData.githubRepo) {
                website.deployment.githubRepo = manualData.githubRepo;
                updated = true;
            }
            if (manualData.githubOwner) {
                website.deployment.githubOwner = manualData.githubOwner;
                updated = true;
            }
            if (manualData.vercelProject) {
                website.deployment.vercelProject = manualData.vercelProject;
                updated = true;
            }
            if (manualData.lastDeployAt) {
                website.deployment.lastDeployAt = manualData.lastDeployAt;
                updated = true;
            }
            if (manualData.aiProviders) {
                website.fingerprint.providers = manualData.aiProviders;
                updated = true;
            }
            if (manualData.articlesCount !== undefined) {
                website.stats.articlesCount = manualData.articlesCount;
                updated = true;
            }
            if (manualData.totalWords !== undefined) {
                website.stats.totalWords = manualData.totalWords;
                updated = true;
            }
        }

        // Option 2: Fetch from GitHub API
        if (githubToken && website.deployment.githubOwner && website.deployment.githubRepo) {
            try {
                // Get repo info
                const repoRes = await fetch(
                    `https://api.github.com/repos/${website.deployment.githubOwner}/${website.deployment.githubRepo}`,
                    { headers: { Authorization: `token ${githubToken}` } }
                );

                if (repoRes.ok) {
                    const repoData = await repoRes.json();
                    website.deployment.lastDeployAt = new Date(repoData.pushed_at).getTime();
                    updated = true;
                }

                // Get latest commit
                const commitsRes = await fetch(
                    `https://api.github.com/repos/${website.deployment.githubOwner}/${website.deployment.githubRepo}/commits?per_page=1`,
                    { headers: { Authorization: `token ${githubToken}` } }
                );

                if (commitsRes.ok) {
                    const commits = await commitsRes.json();
                    if (commits.length > 0) {
                        website.deployment.lastDeployCommit = commits[0].sha;
                        updated = true;
                    }
                }

                // Count articles (mdx files in app folder)
                const contentsRes = await fetch(
                    `https://api.github.com/repos/${website.deployment.githubOwner}/${website.deployment.githubRepo}/contents/app`,
                    { headers: { Authorization: `token ${githubToken}` } }
                );

                if (contentsRes.ok) {
                    const contents = await contentsRes.json();
                    // Count directories that look like article slugs (not special Next.js folders)
                    const articleDirs = contents.filter((item: any) =>
                        item.type === 'directory' &&
                        !item.name.startsWith('_') &&
                        !item.name.startsWith('api') &&
                        !item.name.startsWith('[')
                    );
                    website.stats.articlesCount = articleDirs.length;
                    updated = true;
                }
            } catch (error) {
                console.error('GitHub sync error:', error);
            }
        }

        if (updated) {
            website.updatedAt = Date.now();
            saveWebsite(website);
        }

        return NextResponse.json({
            success: true,
            website,
            synced: updated
        });
    } catch (error) {
        console.error('Error syncing website:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync website' },
            { status: 500 }
        );
    }
}
