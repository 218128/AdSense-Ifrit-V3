import { NextRequest, NextResponse } from 'next/server';
import {
    generateContentPrompt,
    ContentRequest,
    ContentType,
    SiteContext,
    getDefaultSiteContext
} from '@/lib/prompts/contentPrompts';
import {
    AIKeyManager,
    MultiProviderAI,
    AIProvider,
    PROVIDERS
} from '@/lib/ai/multiProvider';

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
    preferredProvider?: AIProvider;

    contentType: ContentType;
    topic?: string;
    keywords?: string[];
    parentPillar?: string;
    categories?: string[];
    siteContext?: Partial<SiteContext>;
}

/**
 * Site Content Generation API with Multi-Provider Support
 * 
 * Features:
 * - Automatic key rotation across multiple keys
 * - Failover between Gemini, DeepSeek, and Perplexity
 * - Rate limit awareness
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

        // Validate we have at least one key
        const hasKeys = geminiKey ||
            (providerKeys?.gemini?.length) ||
            (providerKeys?.deepseek?.length) ||
            (providerKeys?.perplexity?.length);

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

        // Initialize key manager and add keys
        const keyManager = new AIKeyManager();

        // Add single gemini key (backward compatible)
        if (geminiKey) {
            keyManager.addKey('gemini', geminiKey, 'primary');
        }

        // Add provider keys
        if (providerKeys) {
            if (providerKeys.gemini) {
                providerKeys.gemini.forEach((key, idx) =>
                    keyManager.addKey('gemini', key, `gemini-${idx + 1}`)
                );
            }
            if (providerKeys.deepseek) {
                providerKeys.deepseek.forEach((key, idx) =>
                    keyManager.addKey('deepseek', key, `deepseek-${idx + 1}`)
                );
            }
            if (providerKeys.openrouter) {
                providerKeys.openrouter.forEach((key, idx) =>
                    keyManager.addKey('openrouter', key, `openrouter-${idx + 1}`)
                );
            }
            if (providerKeys.vercel) {
                providerKeys.vercel.forEach((key, idx) =>
                    keyManager.addKey('vercel', key, `vercel-${idx + 1}`)
                );
            }
            if (providerKeys.perplexity) {
                providerKeys.perplexity.forEach((key, idx) =>
                    keyManager.addKey('perplexity', key, `perplexity-${idx + 1}`)
                );
            }
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

        // Initialize multi-provider AI
        const ai = new MultiProviderAI(keyManager);

        // Generate content with automatic failover
        const result = await ai.generateContent(prompt, {
            maxTokens: getMaxTokens(contentType),
            temperature: 0.7,
            preferredProvider
        });

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error || 'All providers failed',
                stats: keyManager.getStats()
            }, { status: 500 });
        }

        // Parse structured content if JSON expected
        let parsedContent: string | object = result.content || '';
        if (contentType === 'homepage' || contentType === 'author') {
            try {
                const jsonMatch = (result.content || '').match(/```json\n?([\s\S]*?)\n?```/);
                if (jsonMatch) {
                    parsedContent = JSON.parse(jsonMatch[1]);
                } else {
                    parsedContent = JSON.parse(result.content || '');
                }
            } catch {
                // Return raw content if JSON parsing fails
                parsedContent = result.content || '';
            }
        }

        return NextResponse.json({
            success: true,
            contentType,
            topic,
            content: parsedContent,
            provider: result.provider,
            model: result.model,
            siteContext: mergedContext,
            stats: keyManager.getStats()
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
