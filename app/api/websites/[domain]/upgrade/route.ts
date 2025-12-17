/**
 * Template Upgrade API
 * 
 * Check for and apply template upgrades.
 * 
 * Endpoints:
 * GET  /api/websites/[domain]/upgrade - Check upgrade availability
 * POST /api/websites/[domain]/upgrade - Apply upgrade
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    saveWebsite,
    addVersion
} from '@/lib/websiteStore';
import {
    checkUpgradeAvailable,
    checkVersionCompatibility,
    getUpgradePath,
    getCurrentVersion
} from '@/lib/templateVersions';

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

        const upgradeInfo = checkUpgradeAvailable(
            website.template.id,
            website.template.version
        );

        const compatibility = upgradeInfo.available
            ? checkVersionCompatibility(
                website.template.id,
                website.template.version,
                upgradeInfo.latestVersion
            )
            : { compatible: true, warnings: [], requiresMigration: false };

        const upgradePath = upgradeInfo.available
            ? getUpgradePath(
                website.template.id,
                website.template.version,
                upgradeInfo.latestVersion
            )
            : [];

        return NextResponse.json({
            success: true,
            currentVersion: website.template.version,
            ...upgradeInfo,
            compatibility,
            upgradePath: upgradePath.map(v => ({
                version: v.version,
                changelog: v.changelog,
                breaking: v.breaking
            }))
        });
    } catch (error) {
        console.error('Error checking upgrade:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check upgrade' },
            { status: 500 }
        );
    }
}

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

        const body = await request.json();
        const { targetVersion, acknowledgeWarnings = false } = body;

        const latestVersion = targetVersion || getCurrentVersion(website.template.id);

        // Check if already at latest
        if (website.template.version === latestVersion) {
            return NextResponse.json({
                success: false,
                error: 'Already at the latest version'
            }, { status: 400 });
        }

        // Check compatibility
        const compatibility = checkVersionCompatibility(
            website.template.id,
            website.template.version,
            latestVersion
        );

        if (compatibility.warnings.length > 0 && !acknowledgeWarnings) {
            return NextResponse.json({
                success: false,
                error: 'Upgrade has warnings that must be acknowledged',
                warnings: compatibility.warnings,
                requiresAcknowledgement: true
            }, { status: 400 });
        }

        // Apply upgrade (template only - content stays)
        const previousVersion = website.template.version;
        website.template.version = latestVersion;
        website.template.installedAt = Date.now();
        website.template.upgradeAvailable = undefined;
        website.status = 'pending-deploy';
        website.updatedAt = Date.now();

        // Save website
        saveWebsite(website);

        // Add version to history
        const versionRecord = addVersion(
            domain,
            latestVersion,
            '', // Will be set after deploy
            [`Upgraded from v${previousVersion} to v${latestVersion}`]
        );

        return NextResponse.json({
            success: true,
            previousVersion,
            newVersion: latestVersion,
            versionRecord,
            compatibility,
            message: 'Template upgraded. Deploy to apply changes.'
        });
    } catch (error) {
        console.error('Error applying upgrade:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to apply upgrade' },
            { status: 500 }
        );
    }
}
