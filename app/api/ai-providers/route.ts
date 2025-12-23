import { NextRequest, NextResponse } from 'next/server';
import {
    PROVIDER_ADAPTERS,
    ProviderId
} from '@/lib/ai/providers';

/**
 * AI Providers API
 * 
 * GET - List all available providers with their info
 * POST - Test/validate an API key for a specific provider
 * 
 * Uses new modular provider system directly.
 */

/**
 * GET - List all available AI providers
 */
export async function GET() {
    const providerIds = Object.keys(PROVIDER_ADAPTERS) as ProviderId[];

    const providers = providerIds.map(id => {
        const adapter = PROVIDER_ADAPTERS[id];
        return {
            id,
            name: adapter.meta.name,
            description: adapter.meta.description,
            signupUrl: adapter.meta.signupUrl,
            docsUrl: adapter.meta.docsUrl,
            keyPrefix: adapter.meta.keyPrefix
        };
    });

    return NextResponse.json({
        success: true,
        providers,
        totalProviders: providers.length,
        recommendation: 'Start with Gemini (free) + OpenRouter (many free models) + DeepSeek (very cheap backup)'
    });
}

interface TestKeyRequest {
    provider: ProviderId;
    key: string;
}

/**
 * POST - Test/validate an API key
 * Returns real models from provider API
 */
export async function POST(request: NextRequest) {
    try {
        const body: TestKeyRequest = await request.json();
        const { provider, key } = body;

        if (!provider) {
            return NextResponse.json({
                success: false,
                error: 'Provider is required'
            }, { status: 400 });
        }

        if (!key) {
            return NextResponse.json({
                success: false,
                error: 'API key is required'
            }, { status: 400 });
        }

        // Validate provider exists
        const adapter = PROVIDER_ADAPTERS[provider];
        if (!adapter) {
            return NextResponse.json({
                success: false,
                error: `Unknown provider: ${provider}. Valid providers: ${Object.keys(PROVIDER_ADAPTERS).join(', ')}`
            }, { status: 400 });
        }

        // Test the key using the provider adapter directly
        const result = await adapter.testKey(key);

        if (result.valid) {
            return NextResponse.json({
                success: true,
                valid: true,
                provider,
                models: result.models.map(m => m.id),
                modelDetails: result.models,
                responseTime: result.responseTimeMs,
                message: `✅ Key is valid! Found ${result.models.length} models`,
                providerInfo: {
                    name: adapter.meta.name,
                    description: adapter.meta.description,
                    docsUrl: adapter.meta.docsUrl
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                valid: false,
                provider,
                error: result.error,
                message: `❌ Key validation failed: ${result.error}`,
                troubleshooting: getTroubleshootingTips(provider, result.error || '')
            });
        }

    } catch (error) {
        console.error('Key validation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Validation failed'
        }, { status: 500 });
    }
}

/**
 * Get troubleshooting tips based on error
 */
function getTroubleshootingTips(provider: ProviderId, error: string): string[] {
    const tips: string[] = [];
    const adapter = PROVIDER_ADAPTERS[provider];

    // Common tips
    tips.push('Double-check that you copied the entire API key');
    tips.push(`Get a new key from ${adapter.meta.signupUrl}`);

    // Provider-specific tips
    if (provider === 'gemini') {
        if (error.includes('quota') || error.includes('rate')) {
            tips.push('You may have hit rate limits (15 RPM, 1500/day)');
            tips.push('Try creating a new API key in AI Studio');
        }
        if (error.includes('403')) {
            tips.push('Make sure billing is linked to your Google Cloud project');
            tips.push('API key may have been disabled');
        }
    }

    if (provider === 'openrouter') {
        tips.push('Free tier has 50 requests/day limit');
        tips.push('Purchase $10+ credits to unlock 1000/day');
    }

    if (provider === 'perplexity') {
        tips.push('Perplexity API requires Pro subscription ($20/month)');
        tips.push('API keys must start with "pplx-"');
    }

    if (provider === 'deepseek') {
        tips.push('DeepSeek requires account credits');
        tips.push('Check your balance at platform.deepseek.com');
    }

    return tips;
}
