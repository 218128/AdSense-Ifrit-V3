/**
 * Handlers Helpers
 * 
 * React hooks for accessing registered capability handlers.
 * Used by Settings UI to show available handlers per capability.
 */

import { useState, useEffect } from 'react';
import type { CapabilityHandler } from '@/lib/ai/services/types';

// ============================================================================
// Types
// ============================================================================

export interface HandlerInfo {
    id: string;
    name: string;
    providerId?: string;
    source: 'ai-provider' | 'mcp' | 'local' | 'integration';
    priority: number;
    isAvailable: boolean;
    capabilities: string[];
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get all registered handlers from the Engine
 */
export function useHandlers(): HandlerInfo[] {
    const [handlers, setHandlers] = useState<HandlerInfo[]>([]);

    useEffect(() => {
        async function loadHandlers() {
            try {
                // Dynamic import to avoid SSR issues
                const { engine } = await import('@/lib/core');
                await engine.initialize();

                const registeredHandlers = engine.getHandlers();
                setHandlers(registeredHandlers.map(h => ({
                    id: h.id,
                    name: h.name,
                    providerId: h.providerId,
                    source: h.source,
                    priority: h.priority,
                    isAvailable: h.isAvailable,
                    capabilities: h.capabilities,
                })));
            } catch (e) {
                console.warn('[useHandlers] Failed to load handlers:', e);
            }
        }
        loadHandlers();
    }, []);

    return handlers;
}

/**
 * Get handlers that support a specific capability
 * Returns only available handlers, sorted by priority
 */
export function useHandlersForCapability(capabilityId: string): HandlerInfo[] {
    const allHandlers = useHandlers();

    return allHandlers
        .filter(h => h.capabilities.includes(capabilityId) && h.isAvailable)
        .sort((a, b) => b.priority - a.priority); // Highest priority first
}

/**
 * Get handler by ID
 */
export function useHandler(handlerId: string): HandlerInfo | undefined {
    const allHandlers = useHandlers();
    return allHandlers.find(h => h.id === handlerId);
}

/**
 * Get all unique capabilities covered by registered handlers
 */
export function useCoveredCapabilities(): string[] {
    const handlers = useHandlers();
    const capabilities = new Set<string>();

    for (const handler of handlers) {
        handler.capabilities.forEach(cap => capabilities.add(cap));
    }

    return Array.from(capabilities).sort();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Group handlers by their provider
 */
export function groupHandlersByProvider(handlers: HandlerInfo[]): Record<string, HandlerInfo[]> {
    const groups: Record<string, HandlerInfo[]> = {};

    for (const handler of handlers) {
        const key = handler.providerId || handler.source;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(handler);
    }

    return groups;
}

/**
 * Get display name for a handler source
 */
export function getSourceDisplayName(source: HandlerInfo['source']): string {
    switch (source) {
        case 'ai-provider': return 'AI Provider';
        case 'mcp': return 'MCP Tool';
        case 'local': return 'Local';
        case 'integration': return 'Integration';
        default: return source;
    }
}
