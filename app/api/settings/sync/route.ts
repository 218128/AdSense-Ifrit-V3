/**
 * Settings Sync API
 * 
 * POST /api/settings/sync
 * Syncs client-side settings to server-side SQLite database.
 * 
 * GET /api/settings/sync
 * Gets all server-side settings for client hydration.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    syncFromClient,
    getAllCapabilitySettings,
    getAllHandlerModels,
    getAllProviderKeys,
    type SyncPayload
} from '@/lib/db/settingsDb';

export async function POST(request: NextRequest) {
    try {
        const payload: SyncPayload = await request.json();

        if (!payload.capabilitySettings && !payload.handlerModels && !payload.providerKeys) {
            return NextResponse.json(
                { success: false, error: 'No settings to sync' },
                { status: 400 }
            );
        }

        syncFromClient(payload);

        return NextResponse.json({
            success: true,
            message: 'Settings synced to server',
            synced: {
                capabilitySettings: Object.keys(payload.capabilitySettings || {}).length,
                handlerModels: Object.keys(payload.handlerModels || {}).length,
                providerKeys: Object.keys(payload.providerKeys || {}).length,
            }
        });
    } catch (error) {
        console.error('[Settings Sync] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Sync failed'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const { getAllCapabilitySettings, getAllHandlerModels, getAllProviderKeys, getAllSelectedModels } = await import('@/lib/db/settingsDb');
        const capabilitySettings = getAllCapabilitySettings();
        const handlerModels = getAllHandlerModels();
        const providerKeys = getAllProviderKeys();
        const selectedModels = getAllSelectedModels();

        return NextResponse.json({
            success: true,
            data: {
                capabilitySettings,
                handlerModels,
                providerKeys,
                selectedModels,
            }
        });
    } catch (error) {
        console.error('[Settings Sync] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get settings'
            },
            { status: 500 }
        );
    }
}
