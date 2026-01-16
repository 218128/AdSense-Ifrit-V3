/**
 * Global Action Status Types
 * 
 * Types for tracking and displaying all user-triggered actions
 * across the entire application with persistent visibility.
 * 
 * Enterprise-grade status tracking following best practices:
 * - Every action visible until new user action
 * - Multi-step breakdown with sub-actions
 * - Color-coded phases (running/success/error)
 * - Error details and retry capability
 * 
 * @module shared/types/globalActionStatus
 */

import type { ActionPhase, ActionProgress } from './actionStatus';

// Re-export for convenience
export type { ActionPhase, ActionProgress };

/**
 * Unique identifier for tracking actions
 */
export type ActionId = string;

/**
 * Category of action for grouping and filtering
 */
export type ActionCategory =
    | 'domain'      // Domain analysis, scoring, profile
    | 'keyword'     // Keyword research, analysis
    | 'content'     // Article generation, editing
    | 'campaign'    // Campaign execution, content pipeline
    | 'hosting'     // Site provisioning, DNS
    | 'wordpress'   // WP site operations
    | 'translation' // Translation workflows
    | 'ai'          // AI capability calls
    | 'network'     // API calls, fetches
    | 'file'        // File operations
    | 'system';     // System operations

/**
 * Source of the action (how it was triggered/tracked)
 */
export type ActionSource =
    | 'user'        // Directly triggered by user click
    | 'pipeline'    // Part of a pipeline execution
    | 'orchestrator'// Campaign orchestrator stage
    | 'capability'  // AI capability handler
    | 'fetch'       // Auto-intercepted fetch call
    | 'background'; // Background/scheduled task

/**
 * Detailed error information from external services
 * Captures REAL errors, not hardcoded messages
 */
export interface ErrorDetails {
    /** External service name (OpenAI, Hostinger, WordPress) */
    source: string;
    /** Error code from the service */
    code?: string;
    /** ACTUAL error message from the API - NOT hardcoded */
    rawMessage: string;
    /** HTTP status code if applicable */
    httpStatus?: number;
    /** Stack trace for debugging (dev mode only) */
    stackTrace?: string;
    /** Timestamp when error occurred */
    timestamp: number;
}

/**
 * Single sub-step within an action
 */
export interface ActionStep {
    /** Step identifier */
    id: string;
    /** Step description */
    message: string;
    /** Step phase */
    phase: ActionPhase;
    /** Timestamp when step started */
    startedAt: number;
    /** Timestamp when step completed/failed */
    completedAt?: number;
    /** Duration in ms (calculated) */
    durationMs?: number;
    /** Error details if step failed */
    errorDetails?: ErrorDetails;
}

/**
 * Complete action entry for global tracking
 */
export interface GlobalActionEntry {
    /** Unique action identifier */
    id: ActionId;
    /** Human-readable action name */
    name: string;
    /** Current status message */
    message: string;
    /** Action category for filtering */
    category: ActionCategory;
    /** Current phase */
    phase: ActionPhase;
    /** Timestamp when action started */
    startedAt: number;
    /** Timestamp when action completed/failed */
    completedAt?: number;
    /** Total duration in ms (calculated on complete) */
    durationMs?: number;
    /** Progress for determinate actions */
    progress?: ActionProgress;
    /** Sub-steps for multi-step actions */
    steps: ActionStep[];
    /** Error message if failed (legacy support) */
    error?: string;
    /** Whether action can be retried */
    retryable?: boolean;
    /** Retry callback identifier */
    retryCallback?: string;

    // === NEW: Enhanced tracking fields ===

    /** Source of the action (how it was triggered) */
    source: ActionSource;
    /** Detailed error info from external services */
    errorDetails?: ErrorDetails;
    /** Parent action ID for nested/hierarchical actions */
    parentActionId?: ActionId;
    /** Depth in action hierarchy (0=root) */
    depth: number;
    /** Child action IDs for tree view */
    childActionIds?: ActionId[];
    /** Feature/component that triggered the action */
    origin?: string;
}

/**
 * Configuration for action display
 */
export interface ActionDisplayConfig {
    /** Show timestamps */
    showTimestamps: boolean;
    /** Show duration */
    showDuration: boolean;
    /** Expand steps by default */
    expandSteps: boolean;
    /** Maximum visible actions */
    maxVisible: number;
    /** Auto-collapse after seconds (0 = never) */
    autoCollapseSeconds: number;
}

/**
 * Default display configuration
 */
export const DEFAULT_ACTION_DISPLAY_CONFIG: ActionDisplayConfig = {
    showTimestamps: true,
    showDuration: true,
    expandSteps: true,  // Always show steps by default
    maxVisible: 10,
    autoCollapseSeconds: 0, // Never auto-collapse
};

/**
 * Store state interface
 */
export interface GlobalActionStatusState {
    /** All tracked actions */
    actions: GlobalActionEntry[];
    /** Display configuration */
    config: ActionDisplayConfig;
    /** Whether panel is minimized */
    isMinimized: boolean;
    /** Last user action timestamp (for clear tracking) */
    lastUserActionAt: number;
}

/**
 * Options for starting an action with enhanced tracking
 */
export interface StartActionOptions {
    /** Source of the action */
    source?: ActionSource;
    /** Parent action ID for nested actions */
    parentActionId?: ActionId;
    /** Feature/component origin */
    origin?: string;
    /** Whether action can be retried */
    retryable?: boolean;
}

/**
 * Store actions interface
 */
export interface GlobalActionStatusActions {
    // === Action Lifecycle ===
    /** Start a new action, returns action ID */
    startAction: (name: string, category: ActionCategory, options?: StartActionOptions | boolean) => ActionId;
    /** Update action message */
    updateAction: (id: ActionId, message: string) => void;
    /** Add a step to an action */
    addStep: (id: ActionId, stepMessage: string, phase?: 'running' | 'success' | 'error') => string;
    /** Update a step message and optionally phase */
    updateStep: (id: ActionId, stepId: string, message: string, phase?: 'running' | 'success' | 'error') => void;
    /** Complete a step */
    completeStep: (id: ActionId, stepId: string, success?: boolean) => void;
    /** Set progress for determinate actions */
    setProgress: (id: ActionId, current: number, total: number) => void;
    /** Complete action successfully */
    completeAction: (id: ActionId, message?: string) => void;
    /** Fail action with error (legacy) */
    failAction: (id: ActionId, error: string) => void;
    /** Fail action with detailed error info from external service */
    failActionWithDetails: (id: ActionId, errorDetails: ErrorDetails) => void;

    // === Hierarchy Management ===
    /** Get all child actions of a parent */
    getChildActions: (parentId: ActionId) => GlobalActionEntry[];
    /** Get root actions only (no parent) */
    getRootActions: () => GlobalActionEntry[];

    // === Panel Controls ===
    /** Clear all actions (called on new user action) */
    clearActions: () => void;
    /** Mark new user action (triggers clear if configured) */
    markUserAction: () => void;
    /** Toggle minimize */
    toggleMinimize: () => void;
    /** Update display config */
    setConfig: (config: Partial<ActionDisplayConfig>) => void;
    /** Archive completed actions (for log persistence) */
    archiveCompleted: () => GlobalActionEntry[];
}

/**
 * Complete store interface
 */
export type GlobalActionStatusStore = GlobalActionStatusState & GlobalActionStatusActions;

/**
 * Factory for creating action IDs
 */
export function createActionId(): ActionId {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Factory for creating step IDs
 */
export function createStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
}
