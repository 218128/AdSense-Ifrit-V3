/**
 * Website Domain API
 * 
 * Endpoints:
 * GET    /api/websites/[domain] - Get website details
 * PATCH  /api/websites/[domain] - Update website
 * DELETE /api/websites/[domain] - Delete website
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    saveWebsite,
    deleteWebsite,
    listArticles
} from '@/lib/websiteStore';
import { checkUpgradeAvailable } from '@/lib/templateVersions';

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

        // Check for upgrade availability
        const upgradeInfo = checkUpgradeAvailable(
            website.template.id,
            website.template.version
        );

        if (upgradeInfo.available) {
            website.template.upgradeAvailable = upgradeInfo.latestVersion;
        }

        // Get articles for this website
        const articles = listArticles(domain);

        return NextResponse.json({
            success: true,
            website,
            articles,
            upgradeInfo
        });
    } catch (error) {
        console.error('Error getting website:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get website' },
            { status: 500 }
        );
    }
}

export async function PATCH(
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

        const updates = await request.json();

        // Apply updates
        const updatedWebsite = {
            ...website,
            ...updates,
            updatedAt: Date.now()
        };

        saveWebsite(updatedWebsite);

        return NextResponse.json({
            success: true,
            website: updatedWebsite
        });
    } catch (error) {
        console.error('Error updating website:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update website' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const deleted = deleteWebsite(domain);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Website ${domain} deleted`
        });
    } catch (error) {
        console.error('Error deleting website:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete website' },
            { status: 500 }
        );
    }
}
