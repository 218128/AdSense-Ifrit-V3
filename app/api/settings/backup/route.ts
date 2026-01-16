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
import type { UserProfile } from '@/stores/settingsStore';

const BACKUP_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(BACKUP_DIR, 'user-settings-backup.json');

interface SettingsBackup {
    version: string;
    timestamp: number;
    profile: UserProfile;
}

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profile } = body;

        if (!profile) {
            return NextResponse.json(
                { success: false, error: 'Profile required' },
                { status: 400 }
            );
        }

        ensureBackupDir();

        const backup: SettingsBackup = {
            version: '4.0.0',
            timestamp: Date.now(),
            profile
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
                profile: null
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
