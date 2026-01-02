/**
 * Capabilities API Route
 * 
 * Unified endpoint for all AI capabilities.
 * 
 * POST /api/capabilities/[capability]
 * 
 * Supports: generate, research, keywords, analyze, images, summarize,
 *           translate, scrape, reasoning, code
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCapabilityExecutor } from '@/lib/ai/services/CapabilityExecutor';
import { aiServices } from '@/lib/ai/services';
import { logUsageServer } from '@/stores/usageStore';

// Estimate token count (approx 4 chars per token for English)
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ capability: string }> }
) {
    try {
        const { capability } = await params;
        const body = await request.json();
        const {
            prompt,
            model,
            maxTokens,
            temperature,
            systemPrompt,
            preferredHandler,
            context,
            // Tracking metadata
            jobId,
            itemType,
            topic,
        } = body;

        if (!prompt) {
            return NextResponse.json(
                { success: false, error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // Ensure aiServices is fully initialized (handlers registered)
        await aiServices.initialize();

        // Validate capability exists
        const capabilities = aiServices.getCapabilities();
        const cap = capabilities.find(c => c.id === capability);
        if (!cap) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Unknown capability: ${capability}. Available: ${capabilities.map(c => c.id).join(', ')}`
                },
                { status: 400 }
            );
        }

        // Execute via CapabilityExecutor
        const executor = getCapabilityExecutor();
        const handlers = aiServices.getHandlers();
        const config = aiServices.getConfig();

        const result = await executor.execute(
            {
                capability,
                prompt,
                model,
                maxTokens,
                temperature,
                systemPrompt,
                preferredHandler,
                context,
            },
            handlers,
            config
        );

        // Log usage for cost tracking
        if (result.success && result.text) {
            const inputTokens = estimateTokens(prompt + (systemPrompt || ''));
            const outputTokens = estimateTokens(result.text);

            logUsageServer(
                result.handlerUsed || 'unknown',
                inputTokens,
                outputTokens,
                {
                    model: result.model,
                    jobId,
                    itemType,
                    topic,
                }
            );
        }

        return NextResponse.json({
            success: result.success,
            text: result.text,
            data: result.data,
            error: result.error,
            handlerUsed: result.handlerUsed,
            source: result.source,
            latencyMs: result.latencyMs,
            fallbacksAttempted: result.fallbacksAttempted,
            model: result.model,
            usage: result.usage,
        });

    } catch (error) {
        console.error('Capability execution error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Capability execution failed'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/capabilities/[capability]
 * 
 * Get info about a specific capability
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ capability: string }> }
) {
    const { capability } = await params;

    // Ensure aiServices is fully initialized
    await aiServices.initialize();

    const capabilities = aiServices.getCapabilities();
    const cap = capabilities.find(c => c.id === capability);

    if (!cap) {
        return NextResponse.json(
            { error: `Unknown capability: ${capability}` },
            { status: 404 }
        );
    }

    // Get handlers for this capability
    const handlers = aiServices.getHandlers()
        .filter(h => h.capabilities.includes(capability))
        .map(h => ({
            id: h.id,
            name: h.name,
            source: h.source,
            isAvailable: h.isAvailable,
            priority: h.priority,
        }));

    return NextResponse.json({
        capability: cap,
        handlers,
    });
}
