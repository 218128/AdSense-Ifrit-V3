/**
 * Unified Log Store
 * 
 * Persistent log store for historical action review.
 * Uses Zustand with IndexedDB persistence for large log storage.
 * 
 * Features:
 * - Session-based log grouping
 * - Filter by campaign, site, level, date
 * - JSON/CSV export
 * - Automatic cleanup of old logs
 * 
 * @module stores/unifiedLogStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ActionCategory, ErrorDetails, ActionId } from '@/lib/shared/types/globalActionStatus';

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    /** Unique log ID */
    id: string;
    /** Timestamp when logged */
    timestamp: number;
    /** Session ID for grouping */
    sessionId: string;
    /** Link to original action ID */
    actionId?: ActionId;
    /** Log level */
    level: LogLevel;
    /** Action category */
    category: ActionCategory;
    /** Component/service that logged */
    source: string;
    /** Log message */
    message: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Error details if error log */
    errorDetails?: ErrorDetails;
    /** Associated campaign ID */
    campaignId?: string;
    /** Associated site ID */
    siteId?: string;
}

export interface LogFilter {
    /** Filter by session */
    sessionId?: string;
    /** Filter by campaign */
    campaignId?: string;
    /** Filter by site */
    siteId?: string;
    /** Filter by levels */
    levels?: LogLevel[];
    /** Filter by categories */
    categories?: ActionCategory[];
    /** From timestamp */
    fromTimestamp?: number;
    /** To timestamp */
    toTimestamp?: number;
    /** Search text */
    searchText?: string;
}

export interface LogStats {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    oldestLog: number | null;
    newestLog: number | null;
    sessionCount: number;
}

// ============================================================================
// Store Interface
// ============================================================================

interface UnifiedLogState {
    /** All log entries */
    logs: LogEntry[];
    /** Current session ID */
    currentSessionId: string;
    /** Max logs to retain */
    maxLogs: number;
    /** Log retention days */
    retentionDays: number;
}

interface UnifiedLogActions {
    // === Logging ===
    /** Add a log entry */
    addLog: (entry: Omit<LogEntry, 'id' | 'timestamp' | 'sessionId'>) => string;
    /** Add multiple log entries */
    addLogs: (entries: Omit<LogEntry, 'id' | 'timestamp' | 'sessionId'>[]) => void;
    /** Log from an action (helper) */
    logFromAction: (actionId: ActionId, level: LogLevel, message: string, metadata?: Record<string, unknown>) => void;

    // === Querying ===
    /** Get logs by filter */
    getLogs: (filter?: LogFilter) => LogEntry[];
    /** Get session logs */
    getSessionLogs: (sessionId: string) => LogEntry[];
    /** Get campaign logs */
    getCampaignLogs: (campaignId: string) => LogEntry[];
    /** Get statistics */
    getStats: () => LogStats;

    // === Session Management ===
    /** Start a new session */
    startNewSession: () => string;

    // === Maintenance ===
    /** Clear old logs */
    clearOldLogs: (olderThanDays?: number) => number;
    /** Clear all logs */
    clearAllLogs: () => void;
    /** Export logs to JSON string */
    exportLogs: (filter?: LogFilter) => string;

    // === Config ===
    /** Set max logs */
    setMaxLogs: (max: number) => void;
    /** Set retention days */
    setRetentionDays: (days: number) => void;
}

export type UnifiedLogStore = UnifiedLogState & UnifiedLogActions;

// ============================================================================
// Helpers
// ============================================================================

function generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function matchesFilter(log: LogEntry, filter: LogFilter): boolean {
    if (filter.sessionId && log.sessionId !== filter.sessionId) return false;
    if (filter.campaignId && log.campaignId !== filter.campaignId) return false;
    if (filter.siteId && log.siteId !== filter.siteId) return false;
    if (filter.levels && filter.levels.length > 0 && !filter.levels.includes(log.level)) return false;
    if (filter.categories && filter.categories.length > 0 && !filter.categories.includes(log.category)) return false;
    if (filter.fromTimestamp && log.timestamp < filter.fromTimestamp) return false;
    if (filter.toTimestamp && log.timestamp > filter.toTimestamp) return false;
    if (filter.searchText) {
        const search = filter.searchText.toLowerCase();
        const inMessage = log.message.toLowerCase().includes(search);
        const inSource = log.source.toLowerCase().includes(search);
        if (!inMessage && !inSource) return false;
    }
    return true;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUnifiedLogStore = create<UnifiedLogStore>()(
    persist(
        (set, get) => ({
            // === State ===
            logs: [],
            currentSessionId: generateSessionId(),
            maxLogs: 10000,
            retentionDays: 30,

            // === Logging ===
            addLog: (entry) => {
                const id = generateLogId();
                const newLog: LogEntry = {
                    ...entry,
                    id,
                    timestamp: Date.now(),
                    sessionId: get().currentSessionId,
                };

                set((state) => {
                    let logs = [...state.logs, newLog];
                    // Trim if exceeds max
                    if (logs.length > state.maxLogs) {
                        logs = logs.slice(-state.maxLogs);
                    }
                    return { logs };
                });

                return id;
            },

            addLogs: (entries) => {
                const sessionId = get().currentSessionId;
                const newLogs = entries.map((entry) => ({
                    ...entry,
                    id: generateLogId(),
                    timestamp: Date.now(),
                    sessionId,
                }));

                set((state) => {
                    let logs = [...state.logs, ...newLogs];
                    if (logs.length > state.maxLogs) {
                        logs = logs.slice(-state.maxLogs);
                    }
                    return { logs };
                });
            },

            logFromAction: (actionId, level, message, metadata) => {
                get().addLog({
                    actionId,
                    level,
                    message,
                    category: 'system',
                    source: 'action',
                    metadata,
                });
            },

            // === Querying ===
            getLogs: (filter) => {
                const { logs } = get();
                if (!filter) return logs;
                return logs.filter((log) => matchesFilter(log, filter));
            },

            getSessionLogs: (sessionId) => {
                return get().logs.filter((log) => log.sessionId === sessionId);
            },

            getCampaignLogs: (campaignId) => {
                return get().logs.filter((log) => log.campaignId === campaignId);
            },

            getStats: () => {
                const { logs } = get();
                const sessions = new Set(logs.map((l) => l.sessionId));
                return {
                    totalLogs: logs.length,
                    errorCount: logs.filter((l) => l.level === 'error').length,
                    warnCount: logs.filter((l) => l.level === 'warn').length,
                    oldestLog: logs.length > 0 ? logs[0].timestamp : null,
                    newestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
                    sessionCount: sessions.size,
                };
            },

            // === Session Management ===
            startNewSession: () => {
                const newSessionId = generateSessionId();
                set({ currentSessionId: newSessionId });
                console.log(`[UnifiedLogStore] Started new session: ${newSessionId}`);
                return newSessionId;
            },

            // === Maintenance ===
            clearOldLogs: (olderThanDays) => {
                const days = olderThanDays ?? get().retentionDays;
                const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
                const { logs } = get();
                const remaining = logs.filter((log) => log.timestamp >= cutoff);
                const removed = logs.length - remaining.length;
                set({ logs: remaining });
                console.log(`[UnifiedLogStore] Cleared ${removed} logs older than ${days} days`);
                return removed;
            },

            clearAllLogs: () => {
                set({ logs: [] });
                console.log('[UnifiedLogStore] Cleared all logs');
            },

            exportLogs: (filter) => {
                const logs = filter ? get().getLogs(filter) : get().logs;
                return JSON.stringify(logs, null, 2);
            },

            // === Config ===
            setMaxLogs: (max) => set({ maxLogs: max }),
            setRetentionDays: (days) => set({ retentionDays: days }),
        }),
        {
            name: 'ifrit_unified_logs',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                logs: state.logs.slice(-1000), // Only persist last 1000 logs
                currentSessionId: state.currentSessionId,
                maxLogs: state.maxLogs,
                retentionDays: state.retentionDays,
            }),
        }
    )
);

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick log helper for use across the app
 */
export function log(
    level: LogLevel,
    category: ActionCategory,
    source: string,
    message: string,
    options?: {
        actionId?: ActionId;
        campaignId?: string;
        siteId?: string;
        metadata?: Record<string, unknown>;
        errorDetails?: ErrorDetails;
    }
): void {
    useUnifiedLogStore.getState().addLog({
        level,
        category,
        source,
        message,
        ...options,
    });
}

/**
 * Log an error with full details
 */
export function logError(
    source: string,
    message: string,
    errorDetails: ErrorDetails,
    options?: {
        category?: ActionCategory;
        actionId?: ActionId;
        campaignId?: string;
    }
): void {
    log('error', options?.category ?? 'system', source, message, {
        errorDetails,
        ...options,
    });
}
