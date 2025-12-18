/**
 * Deploy API
 * 
 * Handles verified deployment workflow:
 * 1. Push template files to GitHub repository
 * 2. Wait for Vercel auto-deploy
 * 3. Verify deployment success before updating status
 * 
 * POST /api/websites/[domain]/deploy
 * - Requires: githubToken in body
 * - Returns: deployment status and verification result
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsite, saveWebsite, updateVersionCommit } from '@/lib/websiteStore';
import { pushTemplateFiles } from '@/lib/integrations/github';

interface DeployResult {
    success: boolean;
    commitSha?: string;
    deploymentUrl?: string;
    filesUpdated?: number;
    error?: string;
    verified: boolean;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
): Promise<NextResponse> {
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
        const { githubToken, adsensePublisherId, umamiId } = body;

        if (!githubToken) {
            return NextResponse.json(
                { success: false, error: 'GitHub token required' },
                { status: 400 }
            );
        }

        const { githubOwner, githubRepo } = website.deployment;

        if (!githubOwner || !githubRepo) {
            return NextResponse.json(
                { success: false, error: 'GitHub repository not configured' },
                { status: 400 }
            );
        }

        console.log(`[Deploy] Starting deployment for ${domain}...`);

        // Step 1: Push updated template files to GitHub
        // This regenerates template files with current config and pushes to repo
        console.log(`[Deploy] Pushing template files to ${githubOwner}/${githubRepo}...`);

        // Map template ID to the format expected by pushTemplateFiles
        const templateMap: Record<string, 'niche' | 'magazine' | 'expert'> = {
            'niche-authority': 'niche',
            'topical-magazine': 'magazine',
            'expert-hub': 'expert'
        };
        const templateType = templateMap[website.template.id] || 'niche';

        const pushResult = await pushTemplateFiles(
            githubToken,
            githubRepo,
            {
                template: templateType,
                siteName: website.name,
                author: {
                    name: website.author.name,
                    role: website.author.role,
                    bio: website.author.bio || ''
                },
                // Optional: AdSense and analytics config from client settings
                ...(adsensePublisherId && { adsensePublisherId }),
                ...(umamiId && { umamiId })
            },
            undefined,  // No extra files
            { preserveContent: true }  // Don't overwrite content/ folder (articles, images)
        );

        if (!pushResult.success) {
            return NextResponse.json({
                success: false,
                error: `Failed to push files: ${pushResult.error}`,
                verified: false
            });
        }

        const filesUpdated = pushResult.files?.filter(f => f.success).length || 0;
        console.log(`[Deploy] Pushed ${filesUpdated} files to GitHub`);

        // Step 2: Get the new commit SHA
        const commitResult = await getLatestCommit(githubOwner, githubRepo, githubToken);

        if (!commitResult.success) {
            console.log(`[Deploy] Warning: Could not get commit SHA: ${commitResult.error}`);
        }

        // Step 3: Wait a moment for Vercel to pick up the push
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 4: Verify deployment by checking the live site
        const verificationResult = await verifyDeployment(website.deployment.liveUrl);

        // Step 5: Update website status based on verification
        website.status = verificationResult.success ? 'live' : 'pending-deploy';
        website.deployment.lastDeployAt = Date.now();
        website.deployment.lastDeployCommit = commitResult.sha || '';
        website.deployment.pendingChanges = 0;
        website.updatedAt = Date.now();

        saveWebsite(website);

        // Update version record with commit SHA
        if (website.versions.length > 0 && commitResult.sha) {
            updateVersionCommit(domain, website.versions[0].version, commitResult.sha);
        }

        const result: DeployResult = {
            success: true,
            commitSha: commitResult.sha,
            deploymentUrl: website.deployment.liveUrl,
            filesUpdated,
            verified: verificationResult.success
        };

        console.log(`[Deploy] Completed for ${domain}. Files: ${filesUpdated}, Verified: ${verificationResult.success}`);

        return NextResponse.json({
            ...result,
            message: verificationResult.success
                ? `Deployed ${filesUpdated} files and verified!`
                : `Deployed ${filesUpdated} files - Vercel building...`,
            status: website.status
        });

    } catch (error) {
        console.error('Deploy error:', error);
        return NextResponse.json(
            { success: false, error: 'Deployment failed', verified: false },
            { status: 500 }
        );
    }
}

/**
 * Get latest commit SHA from GitHub
 */
async function getLatestCommit(
    owner: string,
    repo: string,
    token: string
): Promise<{ success: boolean; sha?: string; error?: string }> {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Ifrit-App'
                }
            }
        );

        if (!response.ok) {
            return { success: false, error: `GitHub API error: ${response.status}` };
        }

        const commits = await response.json();
        if (commits.length > 0) {
            return { success: true, sha: commits[0].sha };
        }

        return { success: false, error: 'No commits found' };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Verify deployment by checking if live URL is accessible
 */
async function verifyDeployment(
    liveUrl: string
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(liveUrl, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Ifrit-Verification' }
        });

        if (response.ok) {
            return { success: true, message: 'Site is accessible' };
        }

        return {
            success: false,
            message: `Site returned ${response.status}`
        };
    } catch {
        return {
            success: false,
            message: 'Site not accessible - may still be deploying'
        };
    }
}
