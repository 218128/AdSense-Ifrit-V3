import { NextRequest, NextResponse } from 'next/server';
import { validateVercelToken, createVercelProject, addVercelDomain } from '@/lib/integrations/vercel';

interface VercelSetupRequest {
    action: 'validate' | 'create-project' | 'add-domain';
    token: string;
    projectName?: string;
    repoFullName?: string;
    domain?: string;
    projectId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: VercelSetupRequest = await request.json();
        const { action, token } = body;

        if (!token) {
            return NextResponse.json({ success: false, error: 'Vercel token is required' }, { status: 400 });
        }

        switch (action) {
            case 'validate':
                const valRes = await validateVercelToken(token);
                return NextResponse.json(valRes, { status: valRes.success ? 200 : 401 });

            case 'create-project':
                const createRes = await createVercelProject(token, body.projectName || '', body.repoFullName || '');
                return NextResponse.json(createRes, { status: createRes.success ? 200 : 400 });

            case 'add-domain':
                const domRes = await addVercelDomain(token, body.projectId || '', body.domain || '');
                return NextResponse.json(domRes, { status: domRes.success ? 200 : 400 });

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

