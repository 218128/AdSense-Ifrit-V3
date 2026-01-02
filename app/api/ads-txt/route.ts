/**
 * ads.txt API Endpoint
 * GET /api/ads-txt
 * 
 * Generates ads.txt content for a given Publisher ID.
 * Also provides validation for existing ads.txt files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAdsTxt, validateAdsTxt } from '@/lib/generators/adsTxtGenerator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ads-txt?publisherId=pub-1234567890123456
 * Returns generated ads.txt content
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const publisherId = searchParams.get('publisherId');

    if (!publisherId) {
        return NextResponse.json(
            { success: false, error: 'Publisher ID is required' },
            { status: 400 }
        );
    }

    const result = generateAdsTxt(publisherId);

    if (!result.valid) {
        return NextResponse.json({
            success: false,
            errors: result.errors,
        }, { status: 400 });
    }

    // If format=raw, return plain text
    const format = searchParams.get('format');
    if (format === 'raw') {
        return new NextResponse(result.content, {
            headers: {
                'Content-Type': 'text/plain',
                'Content-Disposition': 'attachment; filename="ads.txt"',
            },
        });
    }

    return NextResponse.json({
        success: true,
        content: result.content,
        lines: result.lines,
    });
}

/**
 * POST /api/ads-txt
 * Validates provided ads.txt content
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json(
                { success: false, error: 'Content is required' },
                { status: 400 }
            );
        }

        const validation = validateAdsTxt(content);

        return NextResponse.json({
            success: validation.valid,
            ...validation,
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Invalid request body' },
            { status: 400 }
        );
    }
}
