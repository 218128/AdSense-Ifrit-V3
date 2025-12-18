import { NextRequest, NextResponse } from 'next/server';
import { createGitHubRepo, pushTemplateFiles } from '@/lib/integrations/github';
import { createVercelProject, addVercelDomain } from '@/lib/integrations/vercel';
import { SiteConfig } from '@/lib/templates/nicheAuthorityBlog';
import { saveWebsite, Website } from '@/lib/websiteStore';
import { getCurrentVersion } from '@/lib/templateVersions';
import { generateEssentialPages, SiteInfo } from '@/lib/essentialPages';

export const maxDuration = 60; // Allow longer timeout for multiple API calls

interface CreateWebsiteRequest {
    domain: string;
    niche: string;
    siteConfig: Partial<SiteConfig>;
    githubToken: string;
    vercelToken: string;
    generateEssentialPages?: boolean;  // Include Privacy, Terms, About, Contact pages
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateWebsiteRequest = await request.json();
        const { domain, niche, siteConfig, githubToken, vercelToken, generateEssentialPages: includeEssentialPages = true } = body;

        if (!domain || !githubToken || !vercelToken) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const steps = [];
        const repoName = domain.replace(/\./g, '-');
        const projectName = repoName;

        // 1. Create GitHub Repo
        steps.push({ name: 'Creating GitHub Repository', status: 'pending' });
        const repoRes = await createGitHubRepo(githubToken, repoName, domain);
        if (!repoRes.success || !repoRes.repoFullName) {
            throw new Error(repoRes.error || 'Failed to create GitHub repository');
        }

        // Extract owner from repoFullName (format: "owner/repo")
        const [githubOwner] = repoRes.repoFullName.split('/');

        // 2. Push Template
        steps.push({ name: 'Pushing Template Files', status: 'pending' });

        // Generate essential pages if requested
        let essentialPagesContent: Record<string, string> = {};
        if (includeEssentialPages) {
            const siteInfo: SiteInfo = {
                siteName: siteConfig.siteName || domain.split('.')[0],
                domain,
                niche: niche || 'general',
                siteTagline: siteConfig.tagline,
                email: `contact@${domain}`,
                author: {
                    name: siteConfig.author?.name || 'Site Author',
                    role: siteConfig.author?.role || 'Editor',
                    bio: siteConfig.author?.bio || ''
                }
            };

            const pages = generateEssentialPages(siteInfo, niche === 'health' || niche === 'finance');
            essentialPagesContent = {
                'content/pages/about.md': pages.about,
                'content/pages/contact.md': pages.contact,
                'content/pages/privacy.md': pages.privacy,
                'content/pages/terms.md': pages.terms,
                ...(pages.disclaimer ? { 'content/pages/disclaimer.md': pages.disclaimer } : {})
            };
        }

        const pushRes = await pushTemplateFiles(githubToken, repoName, siteConfig, essentialPagesContent);
        if (!pushRes.success) {
            throw new Error(pushRes.error || 'Failed to push template files');
        }

        // 3. Create Vercel Project
        steps.push({ name: 'Creating Vercel Project', status: 'pending' });
        const vercelRes = await createVercelProject(vercelToken, projectName, repoRes.repoFullName);
        if (!vercelRes.success || !vercelRes.projectId) {
            throw new Error(vercelRes.error || 'Failed to create Vercel project');
        }

        // 4. Add Domain to Vercel
        steps.push({ name: 'Configuring Domain', status: 'pending' });
        const domainRes = await addVercelDomain(vercelToken, vercelRes.projectId, domain);

        // 5. Save to Unified Store
        const templateId = (siteConfig.template as string) || 'niche-authority';
        const templateVersion = getCurrentVersion(templateId);

        const website: Website = {
            id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            domain,
            name: siteConfig.siteName || domain.split('.')[0],
            niche: niche || 'general',
            template: {
                id: templateId as 'niche-authority' | 'topical-magazine' | 'expert-hub',
                version: templateVersion,
                installedAt: Date.now()
            },
            fingerprint: {
                providers: [], // Will be populated by site builder when content is generated
                providerHistory: [],
                contentStrategy: '40-40-20',
                eeatEnabled: false, // Set to false until analyzed
                aiOverviewOptimized: false, // Set to false until analyzed  
                generatedAt: Date.now(),
                articleTemplatesUsed: []
            },
            deployment: {
                githubRepo: repoName,
                githubOwner: githubOwner,
                vercelProject: vercelRes.projectId,
                liveUrl: `https://${domain}`,
                lastDeployAt: Date.now(),
                lastDeployCommit: '',
                pendingChanges: 0
            },
            stats: {
                articlesCount: 0, // Will be updated when articles are generated
                totalWords: 0,
                estimatedMonthlyRevenue: 0
            },
            versions: [{
                version: '1.0.1',
                templateVersion,
                deployedAt: Date.now(),
                commitSha: '',
                changes: ['Initial site creation'],
                canRollback: false
            }],
            author: {
                name: siteConfig.author?.name || 'Unknown',
                role: siteConfig.author?.role || 'Author'
            },
            status: 'live',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Persist to unified store
        saveWebsite(website);

        if (!domainRes.success) {
            // Non-fatal, return success with warning
            return NextResponse.json({
                success: true,
                website: {
                    ...website,
                    repoUrl: repoRes.repoUrl,
                    projectUrl: vercelRes.projectUrl,
                    warning: 'Domain setup incomplete: ' + domainRes.error
                }
            });
        }

        return NextResponse.json({
            success: true,
            website: {
                ...website,
                repoUrl: repoRes.repoUrl,
                projectUrl: vercelRes.projectUrl,
                dnsRecords: domainRes.dnsRecords
            }
        });

    } catch (error) {
        console.error('Website creation failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
