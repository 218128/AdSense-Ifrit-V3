import { NextRequest, NextResponse } from 'next/server';

interface PublishRequest {
    articleSlug: string;
    domain: string;
    githubToken: string;
    repoOwner: string;
    repoName: string;
    branch?: string;
}

interface PublishResponse {
    success: boolean;
    message: string;
    commitUrl?: string;
    articleUrl?: string;
    error?: string;
}

/**
 * GitHub-based Publishing API
 * 
 * Pushes article markdown to a blog repository.
 * When connected to Vercel, this triggers automatic deployment.
 */
export async function POST(request: NextRequest): Promise<NextResponse<PublishResponse>> {
    try {
        const body: PublishRequest = await request.json();

        const { articleSlug, domain, githubToken, repoOwner, repoName, branch = 'main' } = body;

        if (!articleSlug || !githubToken || !repoOwner || !repoName) {
            return NextResponse.json({
                success: false,
                message: 'Missing required fields',
                error: 'articleSlug, githubToken, repoOwner, and repoName are required'
            }, { status: 400 });
        }

        // Read the article from local content
        const fs = await import('fs');
        const path = await import('path');
        const contentPath = path.join(process.cwd(), 'content', `${articleSlug}.md`);

        if (!fs.existsSync(contentPath)) {
            return NextResponse.json({
                success: false,
                message: 'Article not found',
                error: `No article found with slug: ${articleSlug}`
            }, { status: 404 });
        }

        const articleContent = fs.readFileSync(contentPath, 'utf-8');

        // Check if file already exists in the repo
        const checkUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/content/${articleSlug}.md?ref=${branch}`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AdSense-Ifrit'
            }
        });

        let sha: string | undefined;
        if (checkResponse.ok) {
            const existingFile = await checkResponse.json();
            sha = existingFile.sha;
        }

        // Create or update the file via GitHub API
        const createUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/content/${articleSlug}.md`;
        const createResponse = await fetch(createUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'AdSense-Ifrit'
            },
            body: JSON.stringify({
                message: sha
                    ? `Update article: ${articleSlug}`
                    : `Add article: ${articleSlug} via AdSense Ifrit`,
                content: Buffer.from(articleContent).toString('base64'),
                branch,
                ...(sha ? { sha } : {})
            })
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.error('GitHub API error:', errorData);
            return NextResponse.json({
                success: false,
                message: 'Failed to publish to GitHub',
                error: errorData.message || 'GitHub API error'
            }, { status: createResponse.status });
        }

        const result = await createResponse.json();

        // Construct URLs
        const commitUrl = result.commit?.html_url;
        const articleUrl = `https://${domain}/${articleSlug}`;

        console.log(`✅ Published "${articleSlug}" to ${repoOwner}/${repoName}`);
        console.log(`   Commit: ${commitUrl}`);
        console.log(`   Article URL: ${articleUrl}`);

        return NextResponse.json({
            success: true,
            message: sha
                ? `Updated article on ${domain}`
                : `Published article to ${domain}`,
            commitUrl,
            articleUrl
        });

    } catch (error) {
        console.error('Publish error:', error);
        return NextResponse.json({
            success: false,
            message: 'Publishing failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
