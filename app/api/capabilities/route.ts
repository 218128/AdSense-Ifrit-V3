/**
 * Capabilities List API Route
 * 
 * GET /api/capabilities - List all available capabilities and their handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiServices } from '@/lib/ai/services';

// Ensure initialization (server-side doesn't auto-initialize)
let initialized = false;
async function ensureInitialized() {
    if (!initialized) {
        await aiServices.initialize();
        initialized = true;
    }
}

export async function GET(_request: NextRequest) {
    await ensureInitialized();

    const capabilities = aiServices.getCapabilities();
    const handlers = aiServices.getHandlers();

    // Group handlers by capability
    const capabilityDetails = capabilities.map(cap => {
        const capHandlers = handlers
            .filter(h => h.capabilities.includes(cap.id))
            .map(h => ({
                id: h.id,
                name: h.name,
                source: h.source,
                isAvailable: h.isAvailable,
            }));

        return {
            id: cap.id,
            name: cap.name,
            description: cap.description,
            icon: cap.icon,
            isEnabled: cap.isEnabled,
            handlers: capHandlers,
            handlerCount: capHandlers.length,
            availableHandlers: capHandlers.filter(h => h.isAvailable).length,
        };
    });

    return NextResponse.json({
        capabilities: capabilityDetails,
        totalCapabilities: capabilities.length,
        enabledCapabilities: capabilities.filter(c => c.isEnabled).length,
        totalHandlers: handlers.length,
        availableHandlers: handlers.filter(h => h.isAvailable).length,
    });
}
