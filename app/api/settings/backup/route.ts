/**
 * Settings Backup API
 * 
 * Provides server-side persistence for user settings.
 * Settings are backed up to a JSON file on the server.
 * This ensures data survives browser localStorage clearing.
 * 
 * POST /api/settings/backup - Save settings to server
 * GET /api/settings/backup - Load settings from server
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(BACKUP_DIR, 'user-settings-backup.json');

interface SettingsBackup {
    version: string;
    timestamp: number;
    settings: {
        aiProviders: Record<string, {
            keys: Array<{ key: string; label?: string; validated?: boolean }>;
            enabled: boolean;
        }>;
        integrations: {
            githubToken?: string;
            githubUser?: string;
            vercelToken?: string;
            vercelUser?: string;
        };
        blog: {
            url?: string;
        };
        adsense: {
            publisherId?: string;
            leaderboardSlot?: string;
            articleSlot?: string;
            multiplexSlot?: string;
        };
    };
}

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { settings } = body;

        if (!settings) {
            return NextResponse.json(
                { success: false, error: 'Settings required' },
                { status: 400 }
            );
        }

        ensureBackupDir();

        const backup: SettingsBackup = {
            version: '1.0.0',
            timestamp: Date.now(),
            settings
        };

        fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), 'utf-8');

        return NextResponse.json({
            success: true,
            message: 'Settings backed up successfully',
            timestamp: backup.timestamp
        });

    } catch (error) {
        console.error('Error saving backup:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save backup' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(BACKUP_FILE)) {
            return NextResponse.json({
                success: true,
                hasBackup: false,
                settings: null
            });
        }

        const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const backup: SettingsBackup = JSON.parse(content);

        return NextResponse.json({
            success: true,
            hasBackup: true,
            backup
        });

    } catch (error) {
        console.error('Error loading backup:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load backup' },
            { status: 500 }
        );
    }
}
