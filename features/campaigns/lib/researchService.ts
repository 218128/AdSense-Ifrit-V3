/**
 * Research Service
 * FSD: features/campaigns/lib/researchService.ts
 * 
 * SoC: Separated from generators.ts
 * Responsibility: Research topics using AI capabilities
 */

import type { Campaign } from '../model/types';
import { buildResearchPrompt } from './prompts';

// ============================================================================
// Types
// ============================================================================

export interface ResearchOptions {
    maxTokens?: number;
    onProgress?: (message: string) => void;
}

export interface ResearchResult {
    success: boolean;
    text: string;
    handlerUsed?: string;
    latencyMs?: number;
    error?: string;
}

// ============================================================================
// Research Generator
// ============================================================================

/**
 * Perform topic research using the AI capabilities system
 * 
 * @param topic - The topic to research
 * @param aiConfig - Campaign AI configuration
 * @param options - Optional settings and progress callback
 * @returns Research text or throws on failure
 */
export async function performResearch(
    topic: string,
    aiConfig: Campaign['aiConfig'],
    options?: ResearchOptions
): Promise<string> {
    options?.onProgress?.('Fetching API key...');

    // Get API key from client-side key manager for the preferred provider
    let apiKey: string | undefined;
    try {
        const { getCapabilityKey } = await import('@/lib/ai/utils/getCapabilityKey');
        apiKey = await getCapabilityKey();
    } catch {
        console.warn('[Research] Could not get API key from KeyManager');
    }

    options?.onProgress?.('Researching topic with AI...');

    const response = await fetch('/api/capabilities/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: buildResearchPrompt(topic),
            maxTokens: options?.maxTokens ?? 2000,
            topic,
            itemType: 'research',
            // Pass API key to server via context
            context: apiKey ? { apiKey } : undefined,
        }),
    });

    if (!response.ok) {
        throw new Error('Research failed');
    }

    const data = await response.json();

    if (!data.success) {
        console.warn('[Research] Failed:', data.error, 'Handler:', data.handlerUsed);
        throw new Error(data.error || 'Research failed');
    }

    console.log(`[Research] Success via ${data.handlerUsed} in ${data.latencyMs}ms`);
    return data.text || '';
}

/**
 * Perform research and return detailed result (for advanced use cases)
 */
export async function performResearchWithDetails(
    topic: string,
    aiConfig: Campaign['aiConfig'],
    options?: ResearchOptions
): Promise<ResearchResult> {
    try {
        const text = await performResearch(topic, aiConfig, options);
        return { success: true, text };
    } catch (error) {
        return {
            success: false,
            text: '',
            error: error instanceof Error ? error.message : 'Research failed',
        };
    }
}
