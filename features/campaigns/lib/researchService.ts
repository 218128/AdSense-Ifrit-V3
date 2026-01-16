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
    // Rich data from Perplexity SDK
    citations?: string[];
    relatedQuestions?: string[];
    images?: string[];
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
    options?.onProgress?.('Fetching API keys...');

    // Get ALL provider keys from client-side key manager (server can't access Zustand)
    let providerKeys: Record<string, string> = {};
    try {
        const { getAllProviderKeys } = await import('@/lib/ai/utils/getCapabilityKey');
        providerKeys = await getAllProviderKeys();
    } catch {
        console.warn('[Research] Could not get provider keys from KeyManager');
    }

    // Get preferred handler based on aiConfig (respects researchProvider + articleType)
    const { getResearchHandler } = await import('./handlerMapping');
    const preferredHandler = getResearchHandler(aiConfig);

    options?.onProgress?.(`Researching topic with AI${preferredHandler ? ` (${preferredHandler})` : ''}...`);

    const response = await fetch('/api/capabilities/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: buildResearchPrompt(topic),
            maxTokens: options?.maxTokens ?? 2000,
            topic,
            itemType: 'research',
            preferredHandler,  // ← Now passed to API
            // Pass ALL provider keys so each handler can use its own key
            context: Object.keys(providerKeys).length > 0 ? { providerKeys } : undefined,
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

/**
 * Perform research and return rich result with citations and related questions
 * Use this for pipeline contexts that need full Perplexity SDK data
 */
export async function performResearchRich(
    topic: string,
    aiConfig: Campaign['aiConfig'],
    options?: ResearchOptions
): Promise<ResearchResult> {
    options?.onProgress?.('Fetching API keys...');

    // Get ALL provider keys from client-side (server can't access Zustand)
    let providerKeys: Record<string, string> = {};
    try {
        const { getAllProviderKeys } = await import('@/lib/ai/utils/getCapabilityKey');
        providerKeys = await getAllProviderKeys();
    } catch {
        console.warn('[Research] Could not get provider keys from KeyManager');
    }

    const { getResearchHandler } = await import('./handlerMapping');
    const preferredHandler = getResearchHandler(aiConfig);

    options?.onProgress?.(`Researching topic with AI${preferredHandler ? ` (${preferredHandler})` : ''}...`);

    try {
        const response = await fetch('/api/capabilities/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: buildResearchPrompt(topic),
                maxTokens: options?.maxTokens ?? 2000,
                topic,
                itemType: 'research',
                preferredHandler,
                // Pass ALL provider keys so each handler can use its own key
                context: Object.keys(providerKeys).length > 0 ? { providerKeys } : undefined,
            }),
        });

        if (!response.ok) {
            throw new Error(`Research HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            return {
                success: false,
                text: '',
                error: data.error || 'Research failed',
                handlerUsed: data.handlerUsed,
            };
        }

        console.log(`[Research] Rich result via ${data.handlerUsed} in ${data.latencyMs}ms`);

        return {
            success: true,
            text: data.text || '',
            handlerUsed: data.handlerUsed,
            latencyMs: data.latencyMs,
            citations: data.data?.citations,
            relatedQuestions: data.data?.relatedQuestions,
            images: data.data?.images,
        };
    } catch (error) {
        return {
            success: false,
            text: '',
            error: error instanceof Error ? error.message : 'Research failed',
        };
    }
}
