/**
 * Status Stream API - Server-Sent Events for Real-time Action Status
 * 
 * Enterprise-grade server-side status streaming system.
 * Routes can emit status events, clients subscribe to receive them.
 * 
 * Usage:
 * 1. Client opens EventSource to /api/status/stream?sessionId=xxx
 * 2. API routes emit status via statusEmitter.emit(sessionId, event)
 * 3. Client receives events in real-time
 * 
 * @module api/status/stream
 */

import { NextRequest } from 'next/server';

// ============================================
// Types
// ============================================

export interface StatusEvent {
    /** Unique action ID */
    actionId: string;
    /** Step within action */
    stepId?: string;
    /** Event type */
    type: 'start' | 'step' | 'progress' | 'complete' | 'error';
    /** Action/step name */
    name: string;
    /** Current message */
    message: string;
    /** Status: success, fail, warning, running */
    status: 'running' | 'success' | 'fail' | 'warning' | 'skipped';
    /** Detailed reason for status */
    reason?: string;
    /** Additional details */
    details?: string[];
    /** Progress if applicable */
    progress?: { current: number; total: number };
    /** Timestamp */
    timestamp: number;
    /** Category */
    category?: string;
}

// ============================================
// In-Memory Event Store (per session)
// ============================================

type EventCallback = (event: StatusEvent) => void;

class StatusEventEmitter {
    private listeners: Map<string, Set<EventCallback>> = new Map();
    private eventHistory: Map<string, StatusEvent[]> = new Map();

    /**
     * Subscribe to events for a session
     */
    subscribe(sessionId: string, callback: EventCallback): () => void {
        if (!this.listeners.has(sessionId)) {
            this.listeners.set(sessionId, new Set());
        }
        this.listeners.get(sessionId)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(sessionId)?.delete(callback);
        };
    }

    /**
     * Emit event to all subscribers for a session
     */
    emit(sessionId: string, event: StatusEvent): void {
        // Store in history
        if (!this.eventHistory.has(sessionId)) {
            this.eventHistory.set(sessionId, []);
        }
        this.eventHistory.get(sessionId)!.push(event);

        // Notify subscribers
        const callbacks = this.listeners.get(sessionId);
        if (callbacks) {
            callbacks.forEach(cb => cb(event));
        }

        // Log for debugging
        console.log(`[StatusStream] ${sessionId}: ${event.type} - ${event.name} - ${event.status}`);
    }

    /**
     * Get event history for a session
     */
    getHistory(sessionId: string): StatusEvent[] {
        return this.eventHistory.get(sessionId) || [];
    }

    /**
     * Clear session history
     */
    clearSession(sessionId: string): void {
        this.eventHistory.delete(sessionId);
        this.listeners.delete(sessionId);
    }

    /**
     * Create a status tracker for an action
     */
    createTracker(sessionId: string, actionId: string, name: string, category?: string) {
        const emit = (event: Partial<StatusEvent>) => {
            this.emit(sessionId, {
                actionId,
                name,
                category,
                timestamp: Date.now(),
                type: 'step',
                status: 'running',
                message: '',
                ...event,
            });
        };

        // Emit start event
        emit({
            type: 'start',
            status: 'running',
            message: `Starting ${name}...`,
        });

        return {
            /** Update current message */
            update: (message: string) => {
                emit({ type: 'step', message, status: 'running' });
            },

            /** Add a step with status */
            step: (stepName: string, status: 'running' | 'success' | 'fail' | 'warning' | 'skipped', reason?: string) => {
                const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                emit({
                    type: 'step',
                    stepId,
                    message: stepName,
                    status,
                    reason,
                });
                return stepId;
            },

            /** Report progress */
            progress: (current: number, total: number, message?: string) => {
                emit({
                    type: 'progress',
                    progress: { current, total },
                    message: message || `Step ${current} of ${total}`,
                    status: 'running',
                });
            },

            /** Complete action successfully */
            complete: (message: string, details?: string[]) => {
                emit({
                    type: 'complete',
                    status: 'success',
                    message,
                    details,
                });
            },

            /** Fail action with error */
            fail: (message: string, reason?: string) => {
                emit({
                    type: 'error',
                    status: 'fail',
                    message,
                    reason,
                });
            },
        };
    }
}

// ============================================
// Global Singleton (persists across module contexts in Next.js)
// ============================================

// Declare global type
declare global {
    // eslint-disable-next-line no-var
    var __statusEmitter: StatusEventEmitter | undefined;
}

// Create or reuse global instance
if (!globalThis.__statusEmitter) {
    globalThis.__statusEmitter = new StatusEventEmitter();
    console.log('[StatusStream] Created new global StatusEventEmitter');
}

export const statusEmitter = globalThis.__statusEmitter;

// ============================================
// SSE Stream Handler
// ============================================

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return new Response('sessionId required', { status: 400 });
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            // Send initial connection event
            controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`));

            // Subscribe to events
            const unsubscribe = statusEmitter.subscribe(sessionId, (event) => {
                const data = JSON.stringify(event);
                controller.enqueue(encoder.encode(`event: status\ndata: ${data}\n\n`));
            });

            // Keep-alive ping every 30s
            const pingInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: ping\n\n`));
                } catch {
                    clearInterval(pingInterval);
                }
            }, 30000);

            // Cleanup on close
            request.signal.addEventListener('abort', () => {
                unsubscribe();
                clearInterval(pingInterval);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}

// ============================================
// Helper: Generate session ID
// ============================================

export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
