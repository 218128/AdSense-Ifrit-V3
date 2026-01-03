/**
 * useGlobalActionStatus Hook
 * 
 * Hook for features to report actions to the GLOBAL status system.
 * Different from useActionStatus which manages local component state.
 * 
 * This hook integrates with globalActionStatusStore for app-wide
 * action tracking and visibility.
 * 
 * @example
 * ```tsx
 * const { trackAction, clearOnNewAction } = useGlobalActionStatus();
 * 
 * const handleAnalyze = async () => {
 *   clearOnNewAction(); // Clear previous actions on new user interaction
 *   
 *   await trackAction('Analyze Domain', 'domain', async (tracker) => {
 *     tracker.step('Fetching WHOIS data...');
 *     await fetchWhois();
 *     tracker.step('Calculating score...');
 *     await calculateScore();
 *     tracker.complete('Domain analyzed successfully');
 *   });
 * };
 * ```
 * 
 * @module shared/hooks/useGlobalActionStatus
 */

import { useCallback } from 'react';
import { useGlobalActionStatusStore } from '@/stores/globalActionStatusStore';
import type { ActionCategory, ActionId } from '@/lib/shared/types/globalActionStatus';

/**
 * Action tracker interface passed to trackAction callback
 */
export interface GlobalActionTracker {
    /** Action ID for reference */
    id: ActionId;
    /** Update action message */
    update: (message: string) => void;
    /** Add and start a new step */
    step: (message: string) => string;
    /** Complete a step */
    completeStep: (stepId: string, success?: boolean) => void;
    /** Set progress for determinate actions */
    progress: (current: number, total: number) => void;
    /** Complete action with optional message */
    complete: (message?: string) => void;
    /** Fail action with error */
    fail: (error: string) => void;
}

/**
 * Return type for useGlobalActionStatus hook
 */
export interface UseGlobalActionStatusReturn {
    /**
     * Track an async action with automatic start/complete/fail handling
     * @param name - Action name
     * @param category - Action category
     * @param callback - Async function that receives GlobalActionTracker
     * @returns Result of the callback
     */
    trackAction: <T>(
        name: string,
        category: ActionCategory,
        callback: (tracker: GlobalActionTracker) => Promise<T>
    ) => Promise<T>;

    /**
     * Manually start an action (for cases where trackAction isn't suitable)
     * @param name - Action name
     * @param category - Action category
     * @returns GlobalActionTracker for manual control
     */
    startAction: (name: string, category: ActionCategory) => GlobalActionTracker;

    /**
     * Mark new user action (clears previous actions)
     */
    clearOnNewAction: () => void;

    /**
     * Check if there are running actions
     */
    hasRunningActions: boolean;

    /**
     * Get current action count
     */
    actionCount: number;
}

/**
 * Hook for features to report actions to global status system
 */
export function useGlobalActionStatus(): UseGlobalActionStatusReturn {
    const {
        actions,
        startAction: storeStartAction,
        updateAction,
        addStep,
        completeStep,
        setProgress,
        completeAction,
        failAction,
        markUserAction,
    } = useGlobalActionStatusStore();

    /**
     * Create a GlobalActionTracker for a given action ID
     */
    const createTracker = useCallback((id: ActionId): GlobalActionTracker => ({
        id,
        update: (message: string) => updateAction(id, message),
        step: (message: string) => addStep(id, message),
        completeStep: (stepId: string, success?: boolean) => completeStep(id, stepId, success),
        progress: (current: number, total: number) => setProgress(id, current, total),
        complete: (message?: string) => completeAction(id, message),
        fail: (error: string) => failAction(id, error),
    }), [updateAction, addStep, completeStep, setProgress, completeAction, failAction]);

    /**
     * Track an async action with automatic lifecycle management
     */
    const trackAction = useCallback(async <T>(
        name: string,
        category: ActionCategory,
        callback: (tracker: GlobalActionTracker) => Promise<T>
    ): Promise<T> => {
        const id = storeStartAction(name, category, true);
        const tracker = createTracker(id);

        try {
            const result = await callback(tracker);
            // Only complete if not already completed/failed by callback
            const action = actions.find(a => a.id === id);
            if (action?.phase === 'running') {
                tracker.complete();
            }
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            tracker.fail(errorMessage);
            throw error;
        }
    }, [storeStartAction, createTracker, actions]);

    /**
     * Manually start an action for fine-grained control
     */
    const startAction = useCallback((name: string, category: ActionCategory): GlobalActionTracker => {
        const id = storeStartAction(name, category, true);
        return createTracker(id);
    }, [storeStartAction, createTracker]);

    /**
     * Clear actions on new user interaction
     */
    const clearOnNewAction = useCallback(() => {
        markUserAction();
    }, [markUserAction]);

    return {
        trackAction,
        startAction,
        clearOnNewAction,
        hasRunningActions: actions.some(a => a.phase === 'running'),
        actionCount: actions.length,
    };
}

export default useGlobalActionStatus;
