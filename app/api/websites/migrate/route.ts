/**
 * Legacy Migration API
 * 
 * Migrate websites from old storage systems.
 * 
 * Endpoints:
 * POST /api/websites/migrate - Run migration
 */

import { NextResponse } from 'next/server';
import { migrateFromLegacy, listWebsites } from '@/lib/websiteStore';

export async function POST() {
    try {
        const result = migrateFromLegacy();
        const websites = listWebsites();

        return NextResponse.json({
            success: true,
            migrated: result.migrated,
            errors: result.errors,
            totalWebsites: websites.length
        });
    } catch (error) {
        console.error('Error during migration:', error);
        return NextResponse.json(
            { success: false, error: 'Migration failed' },
            { status: 500 }
        );
    }
}
