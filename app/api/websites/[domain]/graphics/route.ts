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
 * Supports granular regeneration with action types:
 * - 'regenerate' - Regenerate all graphics
 * - 'regenerate-logo' - Regenerate only the logo
 * - 'regenerate-og' - Regenerate only the OG image
 * - 'regenerate-favicon' - Regenerate only the favicon
 */
export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
        }

        const body = await request.json();
        const { action, customTagline } = body;

        const validActions = ['regenerate', 'regenerate-logo', 'regenerate-og', 'regenerate-favicon'];
        if (!validActions.includes(action)) {
            return NextResponse.json({
                success: false,
                error: `Invalid action. Must be one of: ${validActions.join(', ')}`
            }, { status: 400 });
        }

        // Generate theme from website niche
        const niche = website.niche || 'general';
        const themeSeed = createThemeSeed(niche, `${domain}-${Date.now()}`);
        const theme = generateTheme(themeSeed);

        const siteName = website.name || domain.split('.')[0];
        const tagline = customTagline || 'Your trusted source for quality content';

        // Load existing graphics if doing partial regeneration
        const websiteDir = path.join(process.cwd(), 'websites', domain);
        const graphicsPath = path.join(websiteDir, 'graphics.json');
        let existingGraphics: Record<string, unknown> = {};

        if (fs.existsSync(graphicsPath)) {
            existingGraphics = JSON.parse(fs.readFileSync(graphicsPath, 'utf-8'));
        }

        // Create directory if needed
        if (!fs.existsSync(websiteDir)) {
            fs.mkdirSync(websiteDir, { recursive: true });
        }

        let graphicsData: Record<string, unknown>;

        if (action === 'regenerate') {
            // Full regeneration
            const graphics = generateSiteGraphics(siteName, tagline, theme);
            graphicsData = {
                generatedAt: Date.now(),
                themeColors: graphics.themeColors,
                logo: graphics.logo.dataUrl,
                favicon: graphics.favicon.ico48,
                ogImage: graphics.ogImage.dataUrl,
                seed: themeSeed.seed,
                mood: themeSeed.mood
            };
        } else {
            // Partial regeneration - start with existing
            graphicsData = { ...existingGraphics, generatedAt: Date.now() };

            if (action === 'regenerate-logo') {
                const logoSvg = generateTextLogo(siteName, theme.colors.primary, theme.colors.secondary);
                graphicsData.logo = svgToDataUrl(logoSvg);
            } else if (action === 'regenerate-og') {
                const ogSvg = generateOgImage(siteName, tagline, theme.colors.primary, theme.colors.secondary);
                graphicsData.ogImage = svgToDataUrl(ogSvg);
            } else if (action === 'regenerate-favicon') {
                const iconSvg = generateIconLogo(siteName, theme.colors.primary, theme.colors.secondary);
                graphicsData.favicon = svgToDataUrl(iconSvg);
            }
        }

        fs.writeFileSync(graphicsPath, JSON.stringify(graphicsData, null, 2));

        const actionMap: Record<string, string> = {
            'regenerate': 'All graphics regenerated',
            'regenerate-logo': 'Logo regenerated',
            'regenerate-og': 'OG image regenerated',
            'regenerate-favicon': 'Favicon regenerated'
        };

        return NextResponse.json({
            success: true,
            message: actionMap[action] || 'Graphics updated',
            graphics: graphicsData
        });
    } catch (error) {
        console.error('Regenerate graphics error:', error);
        return NextResponse.json({ success: false, error: 'Failed to regenerate graphics' }, { status: 500 });
    }
}
