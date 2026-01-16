/**
 * Global Action Status Store
 * 
 * Zustand store for tracking all user-triggered actions across the application.
 * Follows enterprise-grade patterns with persistent visibility until new user action.
 * 
 * Features:
 * - Track every action with unique ID
 * - Multi-step breakdown with sub-actions
 * - Persist until user triggers new action
 * - Error handling with retry capability
 * 
 * @module stores/globalActionStatusStore
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
    type GlobalActionStatusStore,
    type GlobalActionEntry,
    type ActionCategory,
    type ActionId,
    type ActionStep,
    type StartActionOptions,
    type ErrorDetails,
    type ActionSource,
    DEFAULT_ACTION_DISPLAY_CONFIG,
    createActionId,
    createStepId,
} from '@/lib/shared/types/globalActionStatus';

/**
 * Global Action Status Store
 * 
 * Persisted to localStorage for session continuity.
 * Wrapped with devtools for debugging.
 */
export const useGlobalActionStatusStore = create<GlobalActionStatusStore>()(
    devtools(
        persist(
            (set, get) => ({
                // === State ===
                actions: [],
                config: DEFAULT_ACTION_DISPLAY_CONFIG,
                isMinimized: false,
                lastUserActionAt: Date.now(),

                // === Action Lifecycle ===

                /**
                 * Start a new action
                 * @param name - Human-readable action name
                 * @param category - Action category for filtering
                 * @param options - StartActionOptions or boolean (legacy retryable)
                 * @returns Action ID for tracking
                 */
                startAction: (name: string, category: ActionCategory, options?: StartActionOptions | boolean): ActionId => {
                    const id = createActionId();
                    const now = Date.now();

                    // Handle legacy boolean retryable parameter
                    const opts: StartActionOptions = typeof options === 'boolean'
                        ? { retryable: options }
                        : options || {};

                    // Calculate depth from parent
                    let depth = 0;
                    if (opts.parentActionId) {
                        const parent = get().actions.find(a => a.id === opts.parentActionId);
                        depth = parent ? parent.depth + 1 : 0;
                    }

                    const newAction: GlobalActionEntry = {
                        id,
                        name,
                        message: `Starting ${name}...`,
                        category,
                        phase: 'running',
                        startedAt: now,
                        steps: [],
                        retryable: opts.retryable ?? false,
                        source: opts.source ?? 'user',
                        parentActionId: opts.parentActionId,
                        depth,
                        origin: opts.origin,
                    };

                    set((state) => {
                        let actions = [...state.actions, newAction];

                        // Update parent's childActionIds if nested
                        if (opts.parentActionId) {
                            actions = actions.map(a =>
                                a.id === opts.parentActionId
                                    ? { ...a, childActionIds: [...(a.childActionIds || []), id] }
                                    : a
                            );
                        }

                        return { actions };
                    });

                    console.log(`[GlobalActionStatus] Started: ${name} (${id})${opts.parentActionId ? ` [child of ${opts.parentActionId}]` : ''}`);
                    return id;
                },

                /**
                 * Update action message
                 * @param id - Action ID
                 * @param message - New status message
                 */
                updateAction: (id: ActionId, message: string): void => {
                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? { ...action, message }
                                : action
                        ),
                    }));

                    console.log(`[GlobalActionStatus] Update ${id}: ${message}`);
                },

                /**
                 * Add a sub-step to an action
                 * @param id - Action ID
                 * @param stepMessage - Step description
                 * @returns Step ID
                 */
                addStep: (id: ActionId, stepMessage: string, phase: 'running' | 'success' | 'error' = 'running'): string => {
                    const stepId = createStepId();
                    const now = Date.now();

                    const newStep: ActionStep = {
                        id: stepId,
                        message: stepMessage,
                        phase: phase,
                        startedAt: now,
                        completedAt: phase !== 'running' ? now : undefined,
                    };

                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? {
                                    ...action,
                                    message: stepMessage,
                                    steps: [...action.steps, newStep],
                                }
                                : action
                        ),
                    }));

                    console.log(`[GlobalActionStatus] Step ${id}: ${stepMessage}`);
                    return stepId;
                },

                /**
                 * Complete a sub-step
                 * @param id - Action ID
                 * @param stepId - Step ID
                 * @param success - Whether step succeeded
                 */
                completeStep: (id: ActionId, stepId: string, success = true): void => {
                    const now = Date.now();

                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? {
                                    ...action,
                                    steps: action.steps.map((step) =>
                                        step.id === stepId
                                            ? {
                                                ...step,
                                                phase: success ? 'success' : 'error',
                                                completedAt: now,
                                                durationMs: now - step.startedAt,
                                            }
                                            : step
                                    ),
                                }
                                : action
                        ),
                    }));
                },

                /**
                 * Update a sub-step message and optionally phase
                 * @param id - Action ID
                 * @param stepId - Step ID
                 * @param message - New message
                 * @param phase - Optional new phase
                 */
                updateStep: (id: ActionId, stepId: string, message: string, phase?: 'running' | 'success' | 'error'): void => {
                    const now = Date.now();

                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? {
                                    ...action,
                                    message, // Update main action message too
                                    steps: action.steps.map((step) =>
                                        step.id === stepId
                                            ? {
                                                ...step,
                                                message,
                                                ...(phase && {
                                                    phase,
                                                    completedAt: phase !== 'running' ? now : step.completedAt,
                                                    durationMs: phase !== 'running' ? now - step.startedAt : undefined,
                                                }),
                                            }
                                            : step
                                    ),
                                }
                                : action
                        ),
                    }));

                    console.log(`[GlobalActionStatus] UpdateStep ${id}/${stepId}: ${message}`);
                },

                /**
                 * Set progress for determinate actions
                 * @param id - Action ID
                 * @param current - Current step number
                 * @param total - Total steps
                 */
                setProgress: (id: ActionId, current: number, total: number): void => {
                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? {
                                    ...action,
                                    progress: { current, total },
                                    message: `Step ${current} of ${total}`,
                                }
                                : action
                        ),
                    }));
                },

                /**
                 * Complete action successfully
                 * @param id - Action ID
                 * @param message - Optional completion message
                 */
                completeAction: (id: ActionId, message?: string): void => {
                    const now = Date.now();

                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? {
                                    ...action,
                                    phase: 'success',
                                    message: message || `${action.name} completed`,
                                    completedAt: now,
                                    durationMs: now - action.startedAt,
                                }
                                : action
                        ),
                    }));

                    const action = get().actions.find((a) => a.id === id);
                    console.log(`[GlobalActionStatus] Completed: ${action?.name} (${action?.durationMs}ms)`);
                },

                /**
                 * Fail action with error
                 * @param id - Action ID
                 * @param error - Error message
                 */
                failAction: (id: ActionId, error: string): void => {
                    const now = Date.now();

                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? {
                                    ...action,
                                    phase: 'error',
                                    message: 'Action failed',
                                    error,
                                    completedAt: now,
                                    durationMs: now - action.startedAt,
                                }
                                : action
                        ),
                    }));

                    const action = get().actions.find((a) => a.id === id);
                    console.error(`[GlobalActionStatus] Failed: ${action?.name} - ${error}`);
                },

                /**
                 * Fail action with detailed error from external service
                 * @param id - Action ID
                 * @param errorDetails - Full error details from external service
                 */
                failActionWithDetails: (id: ActionId, errorDetails: ErrorDetails): void => {
                    const now = Date.now();

                    set((state) => ({
                        actions: state.actions.map((action) =>
                            action.id === id
                                ? {
                                    ...action,
                                    phase: 'error',
                                    message: `Failed: ${errorDetails.rawMessage}`,
                                    error: errorDetails.rawMessage,
                                    errorDetails,
                                    completedAt: now,
                                    durationMs: now - action.startedAt,
                                }
                                : action
                        ),
                    }));

                    const action = get().actions.find((a) => a.id === id);
                    console.error(`[GlobalActionStatus] Failed: ${action?.name} - [${errorDetails.source}] ${errorDetails.code || ''}: ${errorDetails.rawMessage}`);
                },

                // === Hierarchy Management ===

                /**
                 * Get all child actions of a parent
                 */
                getChildActions: (parentId: ActionId): GlobalActionEntry[] => {
                    return get().actions.filter(a => a.parentActionId === parentId);
                },

                /**
                 * Get root actions only (no parent)
                 */
                getRootActions: (): GlobalActionEntry[] => {
                    return get().actions.filter(a => !a.parentActionId);
                },

                // === Panel Controls ===

                /**
                 * Clear all actions
                 */
                clearActions: (): void => {
                    set({ actions: [] });
                    console.log('[GlobalActionStatus] Cleared all actions');
                },

                /**
                 * Mark new user action (clears previous actions)
                 */
                markUserAction: (): void => {
                    set({
                        actions: [],
                        lastUserActionAt: Date.now(),
                    });
                    console.log('[GlobalActionStatus] New user action - cleared');
                },

                /**
                 * Toggle minimize state
                 */
                toggleMinimize: (): void => {
                    set((state) => ({
                        isMinimized: !state.isMinimized,
                    }));
                },

                /**
                 * Update display configuration
                 * @param config - Partial config to merge
                 */
                setConfig: (config): void => {
                    set((state) => ({
                        config: { ...state.config, ...config },
                    }));
                },

                /**
                 * Archive completed actions (returns archived and removes from state)
                 */
                archiveCompleted: (): GlobalActionEntry[] => {
                    const { actions } = get();
                    const completed = actions.filter(a => a.phase === 'success' || a.phase === 'error');
                    const running = actions.filter(a => a.phase === 'running');
                    set({ actions: running });
                    console.log(`[GlobalActionStatus] Archived ${completed.length} completed actions`);
                    return completed;
                },
            }),
            {
                name: 'ifrit_global_action_status',
                partialize: (state) => ({
                    // Only persist config, not actions
                    config: state.config,
                    isMinimized: state.isMinimized,
                }),
            }
        ),
        { name: 'GlobalActionStatusStore' }
    )
);

/**
 * Selector: Get all running actions
 */
export const selectRunningActions = (state: GlobalActionStatusStore): GlobalActionEntry[] =>
    state.actions.filter((a) => a.phase === 'running');

/**
 * Selector: Get all completed actions
 */
export const selectCompletedActions = (state: GlobalActionStatusStore): GlobalActionEntry[] =>
    state.actions.filter((a) => a.phase === 'success' || a.phase === 'error');

/**
 * Selector: Check if any action is running
 */
export const selectHasRunningActions = (state: GlobalActionStatusStore): boolean =>
    state.actions.some((a) => a.phase === 'running');

/**
 * Selector: Get action by ID
 */
export const selectActionById = (id: ActionId) => (state: GlobalActionStatusStore): GlobalActionEntry | undefined =>
    state.actions.find((a) => a.id === id);
