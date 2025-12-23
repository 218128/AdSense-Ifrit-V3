/**
 * AI Generate API
 * 
 * Server-side endpoint for AI text generation.
 * This keeps Node.js-only dependencies on the server side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiProviderAI, AIKeyManager, ProviderId } from '@/lib/ai/multiProvider';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, provider, model, maxTokens, temperature, systemPrompt } = body;

        if (!prompt) {
            return NextResponse.json(
                { success: false, error: 'Prompt is required' },
                { status: 400 }
            );
        }

        const keyManager = new AIKeyManager();
        const ai = new MultiProviderAI(keyManager);

        const result = await ai.generateContent(prompt, {
            preferredProvider: provider as ProviderId | undefined,
            model,
            maxTokens,
            temperature,
            systemPrompt,
        });

        return NextResponse.json({
            success: result.success,
            content: result.content,
            error: result.error,
            model: result.model,
            provider: result.provider,
        });

    } catch (error) {
        console.error('AI generation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Generation failed'
            },
            { status: 500 }
        );
    }
}
