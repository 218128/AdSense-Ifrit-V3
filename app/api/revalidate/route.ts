import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// For a localhost app, we use a simple environment-based secret
// This is optional - the revalidation still works without it
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;

interface RevalidateRequest {
    secret?: string;
    path?: string;
    tag?: string;
}

interface RevalidateResponse {
    revalidated: boolean;
    path?: string;
    tag?: string;
    error?: string;
}

/**
 * On-demand revalidation endpoint for localhost development
 * 
 * This is primarily used internally by the generate endpoint.
 * For external use, you can configure REVALIDATION_SECRET in .env.local
 * 
 * Usage:
 * POST /api/revalidate
 * Body: { "path": "/" }
 * or with secret:
 * Body: { "secret": "your-secret", "path": "/" }
 */
export async function POST(req: NextRequest): Promise<NextResponse<RevalidateResponse>> {
    try {
        const body: RevalidateRequest = await req.json();
        const { secret, path, tag } = body;

        // If a secret is configured, verify it
        // If no secret is configured, allow all requests (localhost development mode)
        if (REVALIDATION_SECRET && secret !== REVALIDATION_SECRET) {
            return NextResponse.json(
                { revalidated: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Revalidate by path
        if (path) {
            revalidatePath(path);
            console.log(`✅ Revalidated path: ${path}`);
            return NextResponse.json({ revalidated: true, path });
        }

        // Revalidate by tag (using layout revalidation)
        if (tag) {
            revalidatePath('/', 'layout');
            console.log(`✅ Revalidated for tag: ${tag}`);
            return NextResponse.json({ revalidated: true, tag });
        }

        // Default: revalidate homepage
        revalidatePath('/');
        console.log('✅ Revalidated path: /');
        return NextResponse.json({ revalidated: true, path: '/' });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Revalidation failed:', error);
        return NextResponse.json(
            { revalidated: false, error: errorMessage },
            { status: 500 }
        );
    }
}
