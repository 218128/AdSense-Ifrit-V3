import { NextRequest, NextResponse } from 'next/server';
import {
    AIKeyManager,
    MultiProviderAI,
    AIProvider,
    PROVIDERS,
    getProvidersList
} from '@/lib/ai/multiProvider';

/**
 * AI Providers API
 * 
 * GET - List all available providers with their info
 * POST - Test/validate an API key for a specific provider
 */

/**
 * GET - List all available AI providers
 */
export async function GET() {
    const providers = getProvidersList();

    return NextResponse.json({
        success: true,
        providers: providers.map(p => ({
            id: Object.keys(PROVIDERS).find(key => PROVIDERS[key as AIProvider] === p),
            name: p.name,
            description: p.description,
            models: p.models,
            defaultModel: p.defaultModel,
            rateLimit: {
                requestsPerMinute: p.rateLimit.requestsPerMinute,
                requestsPerDay: p.rateLimit.requestsPerDay,
                cooldownMs: p.rateLimit.cooldownMs
            },
            features: p.features,
            signupUrl: p.signupUrl,
            pricing: p.pricing
        })),
        totalProviders: providers.length,
        recommendation: 'Start with Gemini (free) + OpenRouter (many free models) + DeepSeek (very cheap backup)'
    });
}

interface TestKeyRequest {
    provider: AIProvider;
    key: string;
}

/**
 * POST - Test/validate an API key
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

        // Validate provider
        if (!PROVIDERS[provider]) {
            return NextResponse.json({
                success: false,
                error: `Unknown provider: ${provider}. Valid providers: ${Object.keys(PROVIDERS).join(', ')}`
            }, { status: 400 });
        }

        // Create a temporary key manager and AI instance for testing
        const keyManager = new AIKeyManager();
        keyManager.addKey(provider, key, 'test');

        const ai = new MultiProviderAI(keyManager);

        // Test the key
        const startTime = Date.now();
        const result = await ai.validateKey(provider, key);
        const responseTime = Date.now() - startTime;

        if (result.valid) {
            return NextResponse.json({
                success: true,
                valid: true,
                provider: result.provider,
                models: result.models || [], // List of available models
                responseTime: result.responseTime,
                message: `✅ Key is valid! Found ${result.models?.length || 0} models`,
                providerInfo: {
                    name: PROVIDERS[provider].name,
                    rateLimit: PROVIDERS[provider].rateLimit,
                    features: PROVIDERS[provider].features
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                valid: false,
                provider: result.provider,
                error: result.error,
                responseTime,
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
function getTroubleshootingTips(provider: AIProvider, error: string): string[] {
    const tips: string[] = [];

    // Common tips
    tips.push('Double-check that you copied the entire API key');
    tips.push(`Get a new key from ${PROVIDERS[provider].signupUrl}`);

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
    }

    return tips;
}
