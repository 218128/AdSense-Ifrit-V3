import { NextRequest, NextResponse } from 'next/server';
import { getWebsite } from '@/lib/websiteStore';
import {
    generateSiteGraphics,
    generateTextLogo,
    generateIconLogo,
    generateOgImage,
    svgToDataUrl
} from '@/templates/shared/graphics';
import { createThemeSeed, generateTheme } from '@/templates/shared';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

interface Params {
    params: Promise<{ domain: string }>;
}

/**
 * GET - Retrieve current graphics for a website
 */
export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
        }

        // Try to read graphics.json from website directory
        const graphicsPath = path.join(process.cwd(), 'websites', domain, 'graphics.json');

        let graphics = null;
        if (fs.existsSync(graphicsPath)) {
            const content = fs.readFileSync(graphicsPath, 'utf-8');
            graphics = JSON.parse(content);
        }

        return NextResponse.json({
            success: true,
            domain,
            graphics,
            hasGraphics: !!graphics
        });
    } catch (error) {
        console.error('Get graphics error:', error);
        return NextResponse.json({ success: false, error: 'Failed to get graphics' }, { status: 500 });
    }
}

/**
 * POST - Regenerate graphics for a website
 */
export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
        }

        const body = await request.json();
        const { action } = body;

        if (action !== 'regenerate') {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }

        // Generate theme from website niche
        const niche = website.niche || 'general';
        const themeSeed = createThemeSeed(niche, `${domain}-${Date.now()}`);
        const theme = generateTheme(themeSeed);

        // Generate graphics
        const graphics = generateSiteGraphics(
            website.name || domain.split('.')[0],
            'Your trusted source for quality content',
            theme
        );

        // Store graphics metadata
        const websiteDir = path.join(process.cwd(), 'websites', domain);
        if (!fs.existsSync(websiteDir)) {
            fs.mkdirSync(websiteDir, { recursive: true });
        }

        const graphicsData = {
            generatedAt: Date.now(),
            themeColors: graphics.themeColors,
            logo: graphics.logo.dataUrl,
            favicon: graphics.favicon.ico48,
            ogImage: graphics.ogImage.dataUrl,
            seed: themeSeed.seed,
            mood: themeSeed.mood
        };

        fs.writeFileSync(
            path.join(websiteDir, 'graphics.json'),
            JSON.stringify(graphicsData, null, 2)
        );

        return NextResponse.json({
            success: true,
            message: 'Graphics regenerated successfully',
            graphics: graphicsData
        });
    } catch (error) {
        console.error('Regenerate graphics error:', error);
        return NextResponse.json({ success: false, error: 'Failed to regenerate graphics' }, { status: 500 });
    }
}
