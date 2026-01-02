/**
 * ActionStatus - Real-time status for async actions
 * 
 * Provides user-friendly feedback about what an action is doing,
 * its progress, and any errors.
 * 
 * @module shared/types
 */

/**
 * Current phase of an action
 */
export type ActionPhase = 'idle' | 'running' | 'success' | 'error';

/**
 * Progress information for multi-step actions
 */
export interface ActionProgress {
    /** Current step number (1-indexed) */
    current: number;
    /** Total number of steps */
    total: number;
}

/**
 * Status of a single source in a multi-source action
 */
export interface SourceActionStatus {
    sourceId: string;
    sourceName: string;
    phase: ActionPhase;
    message: string;
    count?: number;
    error?: string;
}

/**
 * Complete status of an async action
 */
export interface ActionStatus {
    /** Current phase */
    phase: ActionPhase;
    /** User-friendly message describing current activity */
    message: string;
    /** Source this action relates to (for multi-source actions) */
    source?: string;
    /** Progress for multi-step actions */
    progress?: ActionProgress;
    /** Results count on success */
    count?: number;
    /** Error message on failure */
    error?: string;
    /** Individual source statuses for aggregate actions */
    sources?: SourceActionStatus[];
    /** Timestamp when status was updated */
    updatedAt?: number;
}

/**
 * Factory functions for creating ActionStatus objects
 */
export const ActionStatusFactory = {
    /** Create idle status */
    idle: (): ActionStatus => ({
        phase: 'idle',
        message: 'Ready',
        updatedAt: Date.now(),
    }),

    /** Create running status */
    running: (message: string, progress?: ActionProgress): ActionStatus => ({
        phase: 'running',
        message,
        progress,
        updatedAt: Date.now(),
    }),

    /** Create success status */
    success: (message: string, count?: number): ActionStatus => ({
        phase: 'success',
        message,
        count,
        updatedAt: Date.now(),
    }),

    /** Create error status */
    error: (message: string, error: string): ActionStatus => ({
        phase: 'error',
        message,
        error,
        updatedAt: Date.now(),
    }),

    /** Create status for fetching from a specific source */
    fetchingSource: (sourceName: string, current: number, total: number): ActionStatus => ({
        phase: 'running',
        message: `Fetching from ${sourceName}...`,
        source: sourceName,
        progress: { current, total },
        updatedAt: Date.now(),
    }),

    /** Create status for completed source */
    sourceComplete: (sourceName: string, count: number): SourceActionStatus => ({
        sourceId: sourceName.toLowerCase().replace(/\s+/g, '-'),
        sourceName,
        phase: 'success',
        message: `${count} items`,
        count,
    }),

    /** Create status for failed source */
    sourceFailed: (sourceName: string, error: string): SourceActionStatus => ({
        sourceId: sourceName.toLowerCase().replace(/\s+/g, '-'),
        sourceName,
        phase: 'error',
        message: 'Failed',
        error,
    }),
};

/**
 * Hook return type for action status management
 */
export interface UseActionStatusReturn {
    status: ActionStatus;
    setStatus: (status: ActionStatus) => void;
    setRunning: (message: string, progress?: ActionProgress) => void;
    setSuccess: (message: string, count?: number) => void;
    setError: (message: string, error: string) => void;
    reset: () => void;
}
