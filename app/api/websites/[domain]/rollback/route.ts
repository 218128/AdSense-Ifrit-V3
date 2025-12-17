/**
 * Template Rollback API
 * 
 * Rollback to a previous template version (content stays).
 * 
 * Endpoints:
 * GET  /api/websites/[domain]/rollback - Get rollback options
 * POST /api/websites/[domain]/rollback - Execute rollback
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    getVersionHistory,
    rollbackToVersion,
    checkContentCompatibility
} from '@/lib/websiteStore';

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

        const versions = getVersionHistory(domain);
        const rollbackOptions = versions
            .filter(v => v.canRollback)
            .map(v => ({
                version: v.version,
                templateVersion: v.templateVersion,
                deployedAt: v.deployedAt,
                changes: v.changes,
                warnings: checkContentCompatibility(domain, v.version)
            }));

        return NextResponse.json({
            success: true,
            currentVersion: website.template.version,
            rollbackOptions
        });
    } catch (error) {
        console.error('Error getting rollback options:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get rollback options' },
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

        if (!targetVersion) {
            return NextResponse.json(
                { success: false, error: 'Target version is required' },
                { status: 400 }
            );
        }

        // Check compatibility warnings
        const warnings = checkContentCompatibility(domain, targetVersion);

        if (warnings.length > 0 && !acknowledgeWarnings) {
            return NextResponse.json({
                success: false,
                error: 'Rollback has content compatibility warnings',
                warnings,
                requiresAcknowledgement: true
            }, { status: 400 });
        }

        // Execute rollback
        const result = rollbackToVersion(domain, targetVersion);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                warnings: result.warnings
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            previousVersion: website.template.version,
            newVersion: targetVersion,
            warnings: result.warnings,
            message: 'Template rolled back. Deploy to apply changes.'
        });
    } catch (error) {
        console.error('Error executing rollback:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to rollback' },
            { status: 500 }
        );
    }
}
