/**
 * Theme API
 * 
 * Manage website theme (CSS) independently from template.
 * 
 * Endpoints:
 * GET  /api/websites/[domain]/theme - Get current theme
 * POST /api/websites/[domain]/theme - Save theme changes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getWebsite,
    getTheme,
    saveTheme,
    saveThemeVersion,
    listThemeVersions,
    restoreThemeVersion,
    ThemeConfig
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

        const theme = getTheme(domain);
        const versions = listThemeVersions(domain);

        return NextResponse.json({
            success: true,
            theme: theme || {
                globals: '',
                variables: {
                    primaryColor: '#2563eb',
                    secondaryColor: '#10b981',
                    bgColor: '#ffffff',
                    textColor: '#1f2937',
                    fontFamily: 'Inter, sans-serif'
                },
                lastModifiedAt: null
            },
            versions: versions.slice(0, 5), // Return last 5 versions
            hasLocalTheme: theme !== null
        });
    } catch (error) {
        console.error('Error getting theme:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get theme' },
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
        const { globals, variables, custom, createVersion = true, versionReason = 'manual' } = body;

        // Validate input
        if (!globals && !variables && !custom) {
            return NextResponse.json(
                { success: false, error: 'At least one of globals, variables, or custom is required' },
                { status: 400 }
            );
        }

        // Create backup version before saving (if theme exists)
        const existingTheme = getTheme(domain);
        if (existingTheme && createVersion) {
            saveThemeVersion(domain, 'before-edit');
        }

        // Build theme update
        const themeUpdate: Partial<ThemeConfig> = {};
        if (globals !== undefined) themeUpdate.globals = globals;
        if (variables !== undefined) themeUpdate.variables = variables;
        if (custom !== undefined) themeUpdate.custom = custom;

        // Save theme
        saveTheme(domain, themeUpdate);

        // Create version after save
        let savedVersion = null;
        if (createVersion) {
            savedVersion = saveThemeVersion(domain, versionReason as 'auto' | 'manual' | 'before-edit' | 'before-deploy');
        }

        return NextResponse.json({
            success: true,
            message: 'Theme saved successfully',
            theme: getTheme(domain),
            version: savedVersion
        });
    } catch (error) {
        console.error('Error saving theme:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save theme' },
            { status: 500 }
        );
    }
}

/**
 * Restore theme to a previous version
 */
export async function PUT(
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
        const { versionId } = body;

        if (!versionId) {
            return NextResponse.json(
                { success: false, error: 'versionId is required' },
                { status: 400 }
            );
        }

        const success = restoreThemeVersion(domain, versionId);

        if (!success) {
            return NextResponse.json(
                { success: false, error: 'Version not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Theme restored successfully',
            theme: getTheme(domain)
        });
    } catch (error) {
        console.error('Error restoring theme:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to restore theme' },
            { status: 500 }
        );
    }
}
