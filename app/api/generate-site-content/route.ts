import { NextRequest, NextResponse } from 'next/server';
import {
    generateContentPrompt,
    ContentRequest,
    ContentType,
    SiteContext,
    getDefaultSiteContext
} from '@/lib/prompts/contentPrompts';
import { aiServices } from '@/lib/ai/services';
import { PROVIDERS } from '@/lib/ai/multiProvider';

interface ProviderKeys {
    gemini?: string[];
    deepseek?: string[];
    openrouter?: string[];
    vercel?: string[];
    perplexity?: string[];
}

interface GenerateSiteContentRequest {
    // Support both single key (backward compatible) and multi-key
    geminiKey?: string;
    providerKeys?: ProviderKeys;
    preferredProvider?: string;

    contentType: ContentType;
    topic?: string;
    keywords?: string[];
    parentPillar?: string;
    categories?: string[];
    siteContext?: Partial<SiteContext>;
}

/**
 * Site Content Generation API with Unified Capabilities System
 * 
 * Features:
 * - Uses AIServices.executeWithKeys for server-side execution
 * - Automatic failover between providers
 * - Retry logic and validation via CapabilityExecutor
 */
export async function POST(request: NextRequest) {
    try {
        const body: GenerateSiteContentRequest = await request.json();
        const {
            geminiKey,
            providerKeys,
            preferredProvider,
            contentType,
            topic,
            keywords,
            parentPillar,
            categories,
            siteContext
        } = body;

        // Build provider keys map for AIServices
        const keysMap: Record<string, string[]> = {};

        if (geminiKey) {
            keysMap.gemini = [geminiKey];
        }

        if (providerKeys) {
            if (providerKeys.gemini?.length) {
                keysMap.gemini = [...(keysMap.gemini || []), ...providerKeys.gemini];
            }
            if (providerKeys.deepseek?.length) {
                keysMap.deepseek = providerKeys.deepseek;
            }
            if (providerKeys.openrouter?.length) {
                keysMap.openrouter = providerKeys.openrouter;
            }
            if (providerKeys.perplexity?.length) {
                keysMap.perplexity = providerKeys.perplexity;
            }
        }

        // Validate we have at least one key
        const hasKeys = Object.values(keysMap).some(keys => keys?.length > 0);
        if (!hasKeys) {
            return NextResponse.json({
                success: false,
                error: 'At least one API key is required (geminiKey or providerKeys)'
            }, { status: 400 });
        }

        if (!contentType) {
            return NextResponse.json({
                success: false,
                error: 'Content type is required'
            }, { status: 400 });
        }

        // Merge provided context with defaults
        const defaultContext = getDefaultSiteContext();
        const mergedContext: SiteContext = {
            siteName: siteContext?.siteName || defaultContext.siteName,
            tagline: siteContext?.tagline || defaultContext.tagline,
            niche: siteContext?.niche || defaultContext.niche,
            audience: siteContext?.audience || defaultContext.audience,
            voice: siteContext?.voice || defaultContext.voice,
            author: {
                name: siteContext?.author?.name || defaultContext.author.name,
                role: siteContext?.author?.role || defaultContext.author.role,
                experience: siteContext?.author?.experience || defaultContext.author.experience
            }
        };

        // Build content request
        const contentRequest: ContentRequest = {
            type: contentType,
            topic,
            keywords,
            parentPillar,
            categories,
            siteContext: mergedContext
        };

        // Generate the appropriate prompt
        const prompt = generateContentPrompt(contentRequest);

        // Use AIServices.executeWithKeys for server-side execution
        const result = await aiServices.executeWithKeys(
            {
                capability: 'generate',
                prompt,
                maxTokens: getMaxTokens(contentType),
                temperature: 0.7,
                preferredHandler: preferredProvider,
            },
            keysMap
        );

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error || 'All providers failed',
            }, { status: 500 });
        }

        // Parse structured content if JSON expected
        let parsedContent: string | object = result.text || '';
        if (contentType === 'homepage' || contentType === 'author') {
            try {
                const jsonMatch = (result.text || '').match(/```json\n?([\s\S]*?)\n?```/);
                if (jsonMatch) {
                    parsedContent = JSON.parse(jsonMatch[1]);
                } else {
                    parsedContent = JSON.parse(result.text || '');
                }
            } catch {
                // Return raw content if JSON parsing fails
                parsedContent = result.text || '';
            }
        }

        return NextResponse.json({
            success: true,
            contentType,
            topic,
            content: parsedContent,
            provider: result.handlerUsed,
            model: result.model,
            siteContext: mergedContext,
            latencyMs: result.latencyMs,
        });

    } catch (error) {
        console.error('Site content generation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Generation failed'
        }, { status: 500 });
    }
}

/**
 * Get appropriate max tokens based on content type
 */
function getMaxTokens(contentType: ContentType): number {
    switch (contentType) {
        case 'homepage':
            return 2000;
        case 'pillar':
            return 8000;
        case 'cluster':
            return 4000;
        case 'about':
            return 2000;
        case 'author':
            return 1000;
        default:
            return 4000;
    }
}

/**
 * GET endpoint to list available content types and rate limits
 */
export async function GET() {
    return NextResponse.json({
        contentTypes: [
            {
                type: 'homepage',
                description: 'Hero section, categories, and trust elements',
                outputFormat: 'JSON',
                estimatedLength: '500-800 words'
            },
            {
                type: 'pillar',
                description: 'Comprehensive guide article (main authority content)',
                outputFormat: 'Markdown',
                estimatedLength: '3000-5000 words'
            },
            {
                type: 'cluster',
                description: 'Focused supporting article (links to pillar)',
                outputFormat: 'Markdown',
                estimatedLength: '1500-2500 words'
            },
            {
                type: 'about',
                description: 'About page with E-E-A-T elements',
                outputFormat: 'Markdown',
                estimatedLength: '400-600 words'
            },
            {
                type: 'author',
                description: 'Author bio for bylines and author page',
                outputFormat: 'JSON',
                estimatedLength: '200-400 words'
            }
        ],
        providers: Object.entries(PROVIDERS).reduce((acc, [key, info]) => {
            acc[key] = {
                description: info.description,
                rateLimits: info.rateLimit,
                models: info.models,
                signupUrl: info.signupUrl,
                pricing: info.pricing
            };
            return acc;
        }, {} as Record<string, unknown>),
        requiredParams: {
            'geminiKey OR providerKeys': 'API key(s) for generation',
            contentType: 'Required - one of the types above',
            topic: 'Required for pillar/cluster articles',
            preferredProvider: 'Optional - gemini, deepseek, openrouter, vercel, or perplexity'
        },
        example: {
            geminiKey: 'your-key',
            providerKeys: {
                gemini: ['key1', 'key2'],
                deepseek: ['deepseek-key'],
                openrouter: ['openrouter-key'],
                vercel: ['vercel-key'],
                perplexity: ['perplexity-key']
            },
            preferredProvider: 'gemini',
            contentType: 'pillar',
            topic: 'Best Budget Smartphones 2025'
        },
        defaultSiteContext: getDefaultSiteContext()
    });
}
