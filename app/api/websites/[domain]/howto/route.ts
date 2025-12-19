/**
 * HOWTO.md Generation API
 * 
 * Regenerates the HOWTO.md in the drafts folder with profile data.
 * 
 * POST /api/websites/[domain]/howto - Regenerate HOWTO.md
 * GET  /api/websites/[domain]/howto - Get current HOWTO.md content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsite } from '@/lib/websiteStore';
import {
    generateHowToContent,
    ensureHowToGuide,
    loadProfileForDomain
} from '@/lib/howToGenerator';
import fs from 'fs';
import path from 'path';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        // Load profile for this domain
        const profile = loadProfileForDomain(domain);

        // Generate HOWTO.md
        ensureHowToGuide(domain, profile, website.author);

        return NextResponse.json({
            success: true,
            message: 'HOWTO.md regenerated with profile data',
            profile: profile ? {
                niche: profile.niche,
                keywords: profile.primaryKeywords?.slice(0, 5),
                topics: profile.suggestedTopics?.slice(0, 5)
            } : null
        });
    } catch (error) {
        console.error('Error generating HOWTO.md:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate HOWTO.md' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const howtoPath = path.join(process.cwd(), 'websites', domain, 'drafts', 'HOWTO.md');

        if (fs.existsSync(howtoPath)) {
            const content = fs.readFileSync(howtoPath, 'utf-8');
            return NextResponse.json({
                success: true,
                content,
                exists: true
            });
        }

        // Generate on-the-fly if doesn't exist
        const profile = loadProfileForDomain(domain);
        const content = generateHowToContent(domain, profile, website.author);

        return NextResponse.json({
            success: true,
            content,
            exists: false,
            preview: true
        });
    } catch (error) {
        console.error('Error reading HOWTO.md:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to read HOWTO.md' },
            { status: 500 }
        );
    }
}
