/**
 * Settings Backup Module
 * FSD: lib/backup/settingsBackup.ts
 * 
 * Standalone backup utilities for settings.
 * Separated from settingsStore to maintain clean data/feature separation.
 */

import { useSettingsStore, type ExportedSettings } from '@/stores/settingsStore';

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export settings to JSON object
 * Reads from Data Storage, returns portable format
 */
export function exportSettingsToJson(): ExportedSettings {
    return useSettingsStore.getState().exportSettings();
}

/**
 * Export settings and trigger browser download
 */
export function downloadSettingsBackup(): void {
    const exportData = exportSettingsToJson();

    if (!exportData.profile) {
        throw new Error('No settings to export');
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ifrit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Import settings from JSON object
 * Writes to Data Storage
 */
export function importSettingsFromJson(data: ExportedSettings): { success: boolean; restored: number } {
    return useSettingsStore.getState().importSettings(data);
}

/**
 * Import settings from a File object (for upload handlers)
 */
export async function importSettingsFromFile(file: File): Promise<{ success: boolean; restored: number }> {
    const text = await file.text();
    const data = JSON.parse(text) as ExportedSettings;
    return importSettingsFromJson(data);
}

// ============================================================================
// Server Backup Functions
// ============================================================================

/**
 * Sync current settings to server backup
 * Reads Data Storage, writes to /api/settings/backup
 */
export async function syncToServer(): Promise<boolean> {
    try {
        const exportData = exportSettingsToJson();
        const res = await fetch('/api/settings/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: exportData.profile }),
        });
        return res.ok;
    } catch (error) {
        console.error('[Backup] Failed to sync to server:', error);
        return false;
    }
}

/**
 * Restore settings from server backup
 * Reads /api/settings/backup, writes to Data Storage
 */
export async function restoreFromServer(): Promise<boolean> {
    try {
        const res = await fetch('/api/settings/backup');
        const data = await res.json();

        if (data.success && data.hasBackup && data.backup?.profile) {
            importSettingsFromJson({
                version: '4.0.0',
                exportedAt: new Date().toISOString(),
                app: 'AdSense Ifrit V3',
                profile: data.backup.profile,
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('[Backup] Failed to restore from server:', error);
        return false;
    }
}
