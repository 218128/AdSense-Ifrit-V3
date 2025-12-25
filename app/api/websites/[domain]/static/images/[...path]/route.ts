/**
 * Static Images Route
 * 
 * Serves static images from the local filesystem for a website.
 * 
 * URL Pattern: /api/websites/[domain]/static/images/[articleSlug]/[type]/[filename]
 * Example: /api/websites/example.com/static/images/my-article/cover/cover.png
 * 
 * U7 FIX: This route was missing, causing all image 404 errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getWebsite } from '@/lib/websiteStore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; path: string[] }> }
) {
    try {
        const { domain, path: pathSegments } = await params;

        // Validate website exists
        const website = getWebsite(domain);
        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        // Path should be: [articleSlug]/[type]/[filename]
        // e.g., ["my-article", "cover", "cover.png"]
        // or:    ["my-article", "images", "img-001.png"]
        if (!pathSegments || pathSegments.length < 3) {
            return NextResponse.json(
                { success: false, error: 'Invalid image path' },
                { status: 400 }
            );
        }

        const articleSlug = pathSegments[0];
        const imageType = pathSegments[1]; // "cover" or "images"
        const filename = pathSegments.slice(2).join('/'); // Handle nested paths

        // Construct file path
        const imagesDir = path.join(
            process.cwd(),
            'websites',
            domain,
            'content',
            'images',
            articleSlug,
            imageType,
            filename
        );

        // Check if file exists
        if (!fs.existsSync(imagesDir)) {
            console.warn(`[Static Images] File not found: ${imagesDir}`);
            return NextResponse.json(
                { success: false, error: 'Image not found' },
                { status: 404 }
            );
        }

        // Read file
        const fileBuffer = fs.readFileSync(imagesDir);

        // Determine content type
        const ext = path.extname(filename).toLowerCase();
        const contentTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';

        // Return image with proper headers
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': String(fileBuffer.length),
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (error) {
        console.error('[Static Images] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to serve image' },
            { status: 500 }
        );
    }
}
