/**
 * StatusStreamProvider - App-level provider for status streaming
 * 
 * Wraps the app to provide status stream connection context.
 * Connects to SSE stream and updates GlobalActionStatus.
 * 
 * @example
 * ```tsx
 * // In layout.tsx
 * <StatusStreamProvider>
 *   {children}
 *   <GlobalActionStatus />
 * </StatusStreamProvider>
 * ```
 * 
 * @module components/shared/StatusStreamProvider
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useStatusStream } from '@/lib/shared/hooks';

// ============================================
// Context
// ============================================

interface StatusStreamContextValue {
    /** Session ID to pass to API calls for status tracking */
    sessionId: string | null;
    /** Whether connected to status stream */
    isConnected: boolean;
    /** Connection error if any */
    error: string | null;
    /** Manually reconnect */
    reconnect: () => void;
}

const StatusStreamContext = createContext<StatusStreamContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface StatusStreamProviderProps {
    children: ReactNode;
}

export function StatusStreamProvider({ children }: StatusStreamProviderProps) {
    const { sessionId, isConnected, error, reconnect } = useStatusStream();

    return (
        <StatusStreamContext.Provider value={{ sessionId, isConnected, error, reconnect }}>
            {children}
        </StatusStreamContext.Provider>
    );
}

// ============================================
// Hook to access context
// ============================================

export function useStatusStreamContext(): StatusStreamContextValue {
    const context = useContext(StatusStreamContext);
    if (!context) {
        throw new Error('useStatusStreamContext must be used within StatusStreamProvider');
    }
    return context;
}

export default StatusStreamProvider;
