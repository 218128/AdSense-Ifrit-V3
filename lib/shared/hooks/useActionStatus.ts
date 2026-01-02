/**
 * useActionStatus - Hook for managing action status
 * 
 * Provides convenient methods for updating action status
 * during async operations.
 * 
 * @module shared/hooks
 */

import { useState, useCallback } from 'react';
import {
    ActionStatus,
    ActionProgress,
    ActionStatusFactory,
    UseActionStatusReturn,
} from '../types/actionStatus';

/**
 * Hook for managing action status with convenient methods
 * 
 * @returns Status and methods to update it
 * 
 * @example
 * const { status, setRunning, setSuccess, setError } = useActionStatus();
 * 
 * const handleFetch = async () => {
 *   setRunning('Fetching data...');
 *   try {
 *     const data = await fetchData();
 *     setSuccess(`Fetched ${data.length} items`, data.length);
 *   } catch (e) {
 *     setError('Fetch failed', e.message);
 *   }
 * };
 */
export function useActionStatus(): UseActionStatusReturn {
    const [status, setStatus] = useState<ActionStatus>(ActionStatusFactory.idle());

    const setRunning = useCallback((message: string, progress?: ActionProgress) => {
        setStatus(ActionStatusFactory.running(message, progress));
    }, []);

    const setSuccess = useCallback((message: string, count?: number) => {
        setStatus(ActionStatusFactory.success(message, count));
    }, []);

    const setError = useCallback((message: string, error: string) => {
        setStatus(ActionStatusFactory.error(message, error));
    }, []);

    const reset = useCallback(() => {
        setStatus(ActionStatusFactory.idle());
    }, []);

    return {
        status,
        setStatus,
        setRunning,
        setSuccess,
        setError,
        reset,
    };
}
