/**
 * HandlerRegistry - Central Handler Management
 * 
 * Manages the registration and retrieval of capability handlers.
 * This is the "brain" that knows which handlers can fulfill which capabilities.
 * 
 * @module core/HandlerRegistry
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '@/lib/ai/services/types';

// ============================================
// TYPES
// ============================================

export interface HandlerRegistration {
    handler: CapabilityHandler;
    registeredAt: number;
}

export interface HandlerQuery {
    capabilityId: string;
    preferredHandlerId?: string;
    fallbackHandlerIds?: string[];
    excludeHandlerIds?: string[];
}

// ============================================
// HANDLER REGISTRY
// ============================================

/**
 * Central registry for all capability handlers.
 * 
 * Handlers are registered with:
 * - ID: Unique identifier
 * - Capabilities: List of capability IDs they can handle
 * - Priority: Higher = preferred
 * - Availability: Whether the handler can currently execute
 */
export class HandlerRegistry {
    private handlers: Map<string, HandlerRegistration> = new Map();
    private static instance: HandlerRegistry | null = null;

    /**
     * Get singleton instance (for browser compatibility).
     * On server, create new instances per request.
     */
    static getInstance(): HandlerRegistry {
        if (!HandlerRegistry.instance) {
            HandlerRegistry.instance = new HandlerRegistry();
        }
        return HandlerRegistry.instance;
    }

    /**
     * Create a fresh registry (for server-side isolation).
     */
    static create(): HandlerRegistry {
        return new HandlerRegistry();
    }

    /**
     * Register a handler.
     */
    register(handler: CapabilityHandler): void {
        this.handlers.set(handler.id, {
            handler,
            registeredAt: Date.now()
        });
        console.log(`[HandlerRegistry] Registered: ${handler.id} for [${handler.capabilities.join(', ')}]`);
    }

    /**
     * Unregister a handler.
     */
    unregister(handlerId: string): boolean {
        return this.handlers.delete(handlerId);
    }

    /**
     * Get a handler by ID.
     */
    get(handlerId: string): CapabilityHandler | undefined {
        return this.handlers.get(handlerId)?.handler;
    }

    /**
     * Get all registered handlers.
     */
    getAll(): CapabilityHandler[] {
        return Array.from(this.handlers.values()).map(r => r.handler);
    }

    /**
     * Get handlers that can fulfill a capability.
     * Returns in priority order (highest first).
     */
    getHandlersFor(capabilityId: string): CapabilityHandler[] {
        return Array.from(this.handlers.values())
            .map(r => r.handler)
            .filter(h => h.capabilities.includes(capabilityId) && h.isAvailable)
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get the best handler chain for execution.
     * Respects user preferences (defaultHandlerId, fallbackHandlerIds).
     */
    getHandlerChain(query: HandlerQuery): CapabilityHandler[] {
        const { capabilityId, preferredHandlerId, fallbackHandlerIds, excludeHandlerIds } = query;

        // Get all available handlers for this capability
        let handlers = this.getHandlersFor(capabilityId);

        // Exclude blacklisted handlers
        if (excludeHandlerIds?.length) {
            handlers = handlers.filter(h => !excludeHandlerIds.includes(h.id));
        }

        // Build chain: preferred first, then explicit fallbacks, then rest by priority
        const chain: CapabilityHandler[] = [];
        const used = new Set<string>();

        // 1. Add preferred handler if specified
        if (preferredHandlerId) {
            const preferred = handlers.find(h => h.id === preferredHandlerId);
            if (preferred) {
                chain.push(preferred);
                used.add(preferred.id);
            }
        }

        // 2. Add explicit fallbacks
        if (fallbackHandlerIds?.length) {
            for (const fallbackId of fallbackHandlerIds) {
                const fallback = handlers.find(h => h.id === fallbackId && !used.has(h.id));
                if (fallback) {
                    chain.push(fallback);
                    used.add(fallback.id);
                }
            }
        }

        // 3. Add remaining handlers by priority
        for (const handler of handlers) {
            if (!used.has(handler.id)) {
                chain.push(handler);
            }
        }

        return chain;
    }

    /**
     * Update handler availability.
     */
    setAvailable(handlerId: string, available: boolean): void {
        const reg = this.handlers.get(handlerId);
        if (reg) {
            reg.handler.isAvailable = available;
        }
    }

    /**
     * Check if any handler can fulfill a capability.
     */
    canFulfill(capabilityId: string): boolean {
        return this.getHandlersFor(capabilityId).length > 0;
    }

    /**
     * Get count of registered handlers.
     */
    get size(): number {
        return this.handlers.size;
    }

    /**
     * Clear all handlers (for testing or reset).
     */
    clear(): void {
        this.handlers.clear();
    }
}

// ============================================
// EXPORTS
// ============================================

export const handlerRegistry = HandlerRegistry.getInstance();
