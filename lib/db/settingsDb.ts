/**
 * Server-Side Settings Database
 * 
 * SQLite-based storage for user settings that need to be accessible
 * from both client and server-side API routes.
 * 
 * This solves the wiring issue where client settings (localStorage)
 * weren't accessible from server API routes.
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database instance (singleton)
let db: Database.Database | null = null;

/**
 * Get or create the database instance
 */
function getDb(): Database.Database {
    if (db) return db;

    // Store in .data directory at project root
    const dbPath = path.join(process.cwd(), '.data', 'settings.db');

    // Ensure directory exists
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);

    // Create tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER DEFAULT (unixepoch())
        );
        
        CREATE TABLE IF NOT EXISTS capability_settings (
            capability_id TEXT PRIMARY KEY,
            default_handler_id TEXT,
            fallback_handler_ids TEXT,
            is_enabled INTEGER DEFAULT 1,
            updated_at INTEGER DEFAULT (unixepoch())
        );
        
        CREATE TABLE IF NOT EXISTS handler_models (
            handler_id TEXT PRIMARY KEY,
            model TEXT NOT NULL,
            updated_at INTEGER DEFAULT (unixepoch())
        );
        
        CREATE TABLE IF NOT EXISTS provider_keys (
            provider_id TEXT PRIMARY KEY,
            api_key TEXT NOT NULL,
            updated_at INTEGER DEFAULT (unixepoch())
        );
        
        CREATE TABLE IF NOT EXISTS selected_models (
            provider_id TEXT PRIMARY KEY,
            model TEXT NOT NULL,
            updated_at INTEGER DEFAULT (unixepoch())
        );
    `);

    console.log('[SettingsDB] Initialized at:', dbPath);
    return db;
}

// ============ Capability Settings ============

export interface CapabilitySettingsRow {
    capability_id: string;
    default_handler_id: string | null;
    fallback_handler_ids: string | null;  // JSON array
    is_enabled: number;
}

export function getCapabilitySettings(capabilityId: string): CapabilitySettingsRow | undefined {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM capability_settings WHERE capability_id = ?
    `).get(capabilityId) as CapabilitySettingsRow | undefined;
}

export function getAllCapabilitySettings(): Record<string, {
    defaultHandlerId?: string;
    fallbackHandlerIds?: string[];
    isEnabled?: boolean;
}> {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM capability_settings`).all() as CapabilitySettingsRow[];

    const result: Record<string, {
        defaultHandlerId?: string;
        fallbackHandlerIds?: string[];
        isEnabled?: boolean;
    }> = {};

    for (const row of rows) {
        result[row.capability_id] = {
            defaultHandlerId: row.default_handler_id || undefined,
            fallbackHandlerIds: row.fallback_handler_ids
                ? JSON.parse(row.fallback_handler_ids)
                : undefined,
            isEnabled: row.is_enabled === 1,
        };
    }

    return result;
}

export function setCapabilitySettings(
    capabilityId: string,
    settings: {
        defaultHandlerId?: string;
        fallbackHandlerIds?: string[];
        isEnabled?: boolean;
    }
): void {
    const db = getDb();

    db.prepare(`
        INSERT INTO capability_settings (capability_id, default_handler_id, fallback_handler_ids, is_enabled, updated_at)
        VALUES (?, ?, ?, ?, unixepoch())
        ON CONFLICT(capability_id) DO UPDATE SET
            default_handler_id = excluded.default_handler_id,
            fallback_handler_ids = excluded.fallback_handler_ids,
            is_enabled = excluded.is_enabled,
            updated_at = unixepoch()
    `).run(
        capabilityId,
        settings.defaultHandlerId || null,
        settings.fallbackHandlerIds ? JSON.stringify(settings.fallbackHandlerIds) : null,
        settings.isEnabled !== false ? 1 : 0
    );
}

// ============ Handler Models ============

export function getHandlerModel(handlerId: string): string | undefined {
    const db = getDb();
    const row = db.prepare(`
        SELECT model FROM handler_models WHERE handler_id = ?
    `).get(handlerId) as { model: string } | undefined;
    return row?.model;
}

export function getAllHandlerModels(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare(`SELECT handler_id, model FROM handler_models`).all() as { handler_id: string; model: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.handler_id] = row.model;
    }
    return result;
}

export function setHandlerModel(handlerId: string, model: string): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO handler_models (handler_id, model, updated_at)
        VALUES (?, ?, unixepoch())
        ON CONFLICT(handler_id) DO UPDATE SET
            model = excluded.model,
            updated_at = unixepoch()
    `).run(handlerId, model);
}

// ============ Generic Settings ============

export function getSetting(key: string): string | undefined {
    const db = getDb();
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
    return row?.value;
}

export function setSetting(key: string, value: string): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, unixepoch())
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = unixepoch()
    `).run(key, value);
}

// ============ Provider API Keys ============

export function getProviderKey(providerId: string): string | undefined {
    const db = getDb();
    const row = db.prepare(`SELECT api_key FROM provider_keys WHERE provider_id = ?`).get(providerId) as { api_key: string } | undefined;
    return row?.api_key;
}

export function getAllProviderKeys(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare(`SELECT provider_id, api_key FROM provider_keys`).all() as { provider_id: string; api_key: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.provider_id] = row.api_key;
    }
    return result;
}

export function setProviderKey(providerId: string, apiKey: string): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO provider_keys (provider_id, api_key, updated_at)
        VALUES (?, ?, unixepoch())
        ON CONFLICT(provider_id) DO UPDATE SET
            api_key = excluded.api_key,
            updated_at = unixepoch()
    `).run(providerId, apiKey);
}

// ============ Selected Models ============

export function getSelectedModel(providerId: string): string | undefined {
    const db = getDb();
    const row = db.prepare(`SELECT model FROM selected_models WHERE provider_id = ?`).get(providerId) as { model: string } | undefined;
    return row?.model;
}

export function getAllSelectedModels(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare(`SELECT provider_id, model FROM selected_models`).all() as { provider_id: string; model: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.provider_id] = row.model;
    }
    return result;
}

export function setSelectedModel(providerId: string, model: string): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO selected_models (provider_id, model, updated_at)
        VALUES (?, ?, unixepoch())
        ON CONFLICT(provider_id) DO UPDATE SET
            model = excluded.model,
            updated_at = unixepoch()
    `).run(providerId, model);
}

// ============ Bulk Sync ============

export interface SyncPayload {
    capabilitySettings?: Record<string, {
        defaultHandlerId?: string;
        fallbackHandlerIds?: string[];
        isEnabled?: boolean;
    }>;
    handlerModels?: Record<string, string>;
    providerKeys?: Record<string, string>;
    selectedModels?: Record<string, string>;  // provider_id -> selected model
}

export function syncFromClient(payload: SyncPayload): void {
    const db = getDb();

    const transaction = db.transaction(() => {
        // Sync capability settings
        if (payload.capabilitySettings) {
            for (const [capId, settings] of Object.entries(payload.capabilitySettings)) {
                setCapabilitySettings(capId, settings);
            }
        }

        // Sync handler models
        if (payload.handlerModels) {
            for (const [handlerId, model] of Object.entries(payload.handlerModels)) {
                setHandlerModel(handlerId, model);
            }
        }

        // Sync provider keys
        if (payload.providerKeys) {
            for (const [providerId, apiKey] of Object.entries(payload.providerKeys)) {
                setProviderKey(providerId, apiKey);
            }
        }

        // Sync selected models (per provider)
        if (payload.selectedModels) {
            for (const [providerId, model] of Object.entries(payload.selectedModels)) {
                setSelectedModel(providerId, model);
            }
        }
    });

    transaction();
    console.log('[SettingsDB] Synced from client');
}

/**
 * Close database connection (for cleanup)
 */
export function closeDb(): void {
    if (db) {
        db.close();
        db = null;
    }
}
