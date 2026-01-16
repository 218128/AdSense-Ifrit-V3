/**
 * Image Proxy API Route
 * Fetches external images server-side to bypass CORS restrictions
 * 
 * Used by wpPublisher to download stock images before uploading to WordPress
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid URL' },
                { status: 400 }
            );
        }

        // Validate URL format
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Fetch the image server-side (no CORS restrictions)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; IfritBot/1.0)',
                'Accept': 'image/*',
            },
            // Follow redirects
            redirect: 'follow',
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        // Get content type
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Validate it's actually an image
        if (!contentType.startsWith('image/')) {
            return NextResponse.json(
                { error: `Not an image: ${contentType}` },
                { status: 400 }
            );
        }

        // Get image data as ArrayBuffer and convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        return NextResponse.json({
            success: true,
            data: base64,
            mimeType: contentType,
            size: arrayBuffer.byteLength,
        });

    } catch (error) {
        console.error('[ImageProxy] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Also support GET for simple testing
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json(
            { error: 'Missing URL parameter' },
            { status: 400 }
        );
    }

    // Redirect to POST logic
    const fakeRequest = new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' },
    });

    return POST(fakeRequest);
}
