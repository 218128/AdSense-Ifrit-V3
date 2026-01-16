/**
 * AIServices Server Integration
 *
 * Server-side utilities for using AIServices in API routes and modules.
 * This provides optional AIServices integration with fallback to direct API calls.
 * 
 * MIGRATION: Uses aiServices. Engine accessible via @/lib/core.
 */

import { aiServices as aiServicesInstance } from './services';
import type { Capability, CapabilityHandler } from './services/types';

/**
 * Execute a research task using AIServices if available, with fallback
 *
 * @param prompt The research prompt
 * @param context Additional context for capability matching
 * @returns Research results or null if AIServices not available
 */
export async function executeResearchWithAIServices(
    prompt: string,
    context?: Record<string, unknown>
): Promise<string | null> {
    try {
        const result = await aiServicesInstance.execute({
            capability: 'research',
            prompt,
            context,
        });

        if (result.success && result.text) {
            return result.text;
        }
        return null;
    } catch {
        // AIServices not available or failed
        return null;
    }
}

/**
 * Execute content generation using AIServices
 */
export async function executeGenerationWithAIServices(
    prompt: string,
    options?: {
        systemPrompt?: string;
        maxTokens?: number;
        temperature?: number;
    }
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const result = await aiServicesInstance.execute({
            capability: 'generate',
            prompt,
            systemPrompt: options?.systemPrompt,
            maxTokens: options?.maxTokens,
            temperature: options?.temperature,
        });

        return {
            success: result.success,
            text: result.text,
            error: result.error,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'AIServices failed',
        };
    }
}

/**
 * Check if AIServices has handlers for a capability
 */
export function hasCapabilityHandlers(capability: string): boolean {
    const capabilities: Capability[] = aiServicesInstance.getCapabilities();
    const cap = capabilities.find((c: Capability) => c.id === capability);
    if (!cap || !cap.isEnabled) return false;

    const handlers: CapabilityHandler[] = aiServicesInstance.getHandlers();
    const matchingHandlers = handlers.filter((h: CapabilityHandler) =>
        h.capabilities.includes(capability) && h.isAvailable
    );
    return matchingHandlers.length > 0;
}

/**
 * Get available capabilities from AIServices
 */
export function getAvailableCapabilities(): string[] {
    const capabilities: Capability[] = aiServicesInstance.getCapabilities();
    return capabilities
        .filter((c: Capability) => c.isEnabled)
        .map((c: Capability) => c.id);
}
