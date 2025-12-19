import { NextRequest, NextResponse } from 'next/server';
import { validateGitHubToken, createGitHubRepo, pushTemplateFiles } from '@/lib/integrations/github';
import { SiteConfig } from '@/templates/niche-authority-blog/generator';

interface GitHubSetupRequest {
    action: 'validate' | 'create-repo' | 'push-template';
    token: string;
    repoName?: string;
    domain?: string;
    siteConfig?: Partial<SiteConfig>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: GitHubSetupRequest = await request.json();
        const { action, token } = body;

        if (!token) {
            return NextResponse.json({ success: false, error: 'GitHub token is required' }, { status: 400 });
        }

        switch (action) {
            case 'validate':
                const valRes = await validateGitHubToken(token);
                return NextResponse.json(valRes, { status: valRes.success ? 200 : 401 });

            case 'create-repo':
                const createRes = await createGitHubRepo(token, body.repoName || '', body.domain || '');
                return NextResponse.json(createRes, { status: createRes.success ? 200 : 400 });

            case 'push-template':
                const pushRes = await pushTemplateFiles(token, body.repoName || '', body.siteConfig);
                return NextResponse.json(pushRes, { status: pushRes.success ? 200 : 400 });

            default:
                return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

