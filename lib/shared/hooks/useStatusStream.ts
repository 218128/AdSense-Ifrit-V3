/**
 * useStatusStream - Client-side SSE consumer hook
 * 
 * Connects to /api/status/stream and receives real-time status events.
 * Updates globalActionStatusStore on each event.
 * 
 * @example
 * ```tsx
 * const { sessionId, isConnected, error } = useStatusStream();
 * // Pass sessionId to API calls that need status tracking
 * ```
 * 
 * @module shared/hooks/useStatusStream
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGlobalActionStatusStore } from '@/stores/globalActionStatusStore';

// ============================================
// Types
// ============================================

interface StatusEvent {
    actionId: string;
    stepId?: string;
    type: 'start' | 'step' | 'progress' | 'complete' | 'error';
    name: string;
    message: string;
    status: 'running' | 'success' | 'fail' | 'warning' | 'skipped';
    reason?: string;
    details?: string[];
    progress?: { current: number; total: number };
    timestamp: number;
    category?: string;
}

interface UseStatusStreamReturn {
    /** Session ID to pass to API calls */
    sessionId: string | null;
    /** Whether connected to stream */
    isConnected: boolean;
    /** Connection error if any */
    error: string | null;
    /** Manually reconnect */
    reconnect: () => void;
    /** Disconnect stream */
    disconnect: () => void;
}

// ============================================
// Generate session ID
// ============================================

function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Hook
// ============================================

export function useStatusStream(): UseStatusStreamReturn {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Store actions
    const {
        startAction,
        updateAction,
        addStep,
        completeStep,
        setProgress,
        completeAction,
        failAction,
    } = useGlobalActionStatusStore();

    // Map server action IDs to store action IDs
    const actionIdMapRef = useRef<Map<string, string>>(new Map());

    /**
     * Handle incoming status event
     */
    const handleStatusEvent = useCallback((event: StatusEvent) => {
        const { actionId, type, name, message, status, reason, progress, category } = event;

        switch (type) {
            case 'start': {
                // Create new action in store
                const storeActionId = startAction(name, (category as 'domain') || 'system');
                actionIdMapRef.current.set(actionId, storeActionId);
                break;
            }

            case 'step': {
                const storeActionId = actionIdMapRef.current.get(actionId);
                if (storeActionId) {
                    // Add step with status indicator
                    const statusIcon = status === 'success' ? '✅' :
                        status === 'fail' ? '❌' :
                            status === 'warning' ? '⚠️' :
                                status === 'skipped' ? '⏭️' : '🔄';
                    const fullMessage = reason ? `${statusIcon} ${message}: ${reason}` : `${statusIcon} ${message}`;

                    // Map status to phase for correct icon display
                    const phase: 'running' | 'success' | 'error' =
                        status === 'success' || status === 'skipped' || status === 'warning' ? 'success' :
                            status === 'fail' ? 'error' : 'running';

                    addStep(storeActionId, fullMessage, phase);
                }
                break;
            }

            case 'progress': {
                const storeActionId = actionIdMapRef.current.get(actionId);
                if (storeActionId && progress) {
                    setProgress(storeActionId, progress.current, progress.total);
                }
                break;
            }

            case 'complete': {
                const storeActionId = actionIdMapRef.current.get(actionId);
                if (storeActionId) {
                    completeAction(storeActionId, `✅ ${message}`);
                    actionIdMapRef.current.delete(actionId);
                }
                break;
            }

            case 'error': {
                const storeActionId = actionIdMapRef.current.get(actionId);
                if (storeActionId) {
                    failAction(storeActionId, reason || message);
                    actionIdMapRef.current.delete(actionId);
                }
                break;
            }
        }
    }, [startAction, addStep, setProgress, completeAction, failAction]);

    /**
     * Connect to SSE stream
     */
    const connect = useCallback(() => {
        // Generate new session ID
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        setError(null);

        // Create EventSource
        const eventSource = new EventSource(`/api/status/stream?sessionId=${newSessionId}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('[StatusStream] Connected');
            setIsConnected(true);
            setError(null);
        };

        eventSource.addEventListener('connected', (e) => {
            console.log('[StatusStream] Session confirmed:', (e as MessageEvent).data);
        });

        eventSource.addEventListener('status', (e) => {
            try {
                const event: StatusEvent = JSON.parse((e as MessageEvent).data);
                console.log('[StatusStream] Received event:', event.type, event.name, event.message);
                handleStatusEvent(event);
            } catch (err) {
                console.error('[StatusStream] Failed to parse event:', err);
            }
        });

        eventSource.onerror = (e) => {
            console.error('[StatusStream] Error:', e);
            setIsConnected(false);
            setError('Connection lost');

            // Auto-reconnect after 5s
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('[StatusStream] Reconnecting...');
                connect();
            }, 5000);
        };
    }, [handleStatusEvent]);

    /**
     * Disconnect from stream
     */
    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsConnected(false);
        setSessionId(null);
    }, []);

    /**
     * Reconnect to stream
     */
    const reconnect = useCallback(() => {
        disconnect();
        connect();
    }, [disconnect, connect]);

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        sessionId,
        isConnected,
        error,
        reconnect,
        disconnect,
    };
}

export default useStatusStream;
