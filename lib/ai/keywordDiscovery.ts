/**
 * AI-Powered Keyword Discovery
 * 
 * MUST FEATURE: Discovers keywords using AI and optional MCP tools.
 * Works with or without MCP for maximum flexibility.
 */

import { GoogleGenAI, Type } from '@google/genai';

export interface KeywordResult {
    keyword: string;
    searchVolume?: string;  // 'high', 'medium', 'low'
    difficulty?: string;    // 'easy', 'medium', 'hard'
    intent?: string;        // 'informational', 'commercial', 'transactional'
    relatedTopics?: string[];
}

export interface KeywordDiscoveryResult {
    success: boolean;
    keywords: KeywordResult[];
    suggestedTitle?: string;
    contentOutline?: string[];
    error?: string;
    source: 'ai' | 'ai+search';  // Indicates if MCP tools were used
}

interface DiscoverKeywordsOptions {
    topic: string;
    niche: string;
    targetAudience?: string;
    region?: string;
    language?: string;
    maxKeywords?: number;
    useMCPSearch?: boolean;  // If true and available, use web search
}

/**
 * Discover keywords for a topic using AI
 * 
 * This uses Gemini's structured output to get consistent keyword data.
 * Optionally enhanced with MCP web search for real-time data.
 * 
 * Now integrated with AIServices for unified capability handling.
 */
export async function discoverKeywords(
    apiKey: string,
    options: DiscoverKeywordsOptions
): Promise<KeywordDiscoveryResult> {
    const {
        topic,
        niche,
        targetAudience = 'general audience',
        region = 'global',
        language = 'English',
        maxKeywords = 10
    } = options;

    // Build comprehensive prompt for keyword discovery
    const prompt = `You are an expert SEO and content strategist.

Discover ${maxKeywords} high-value keywords for the following:
- Topic: ${topic}
- Niche: ${niche}
- Target Audience: ${targetAudience}
- Region: ${region}
- Language: ${language}

For each keyword, analyze:
1. Estimated search volume (high/medium/low)
2. Competition difficulty (easy/medium/hard)
3. Search intent (informational/commercial/transactional)
4. 2-3 related sub-topics

Also suggest:
- An SEO-optimized article title
- A content outline with 5-7 sections

Focus on keywords that are:
- Relevant to the niche
- Have good traffic potential
- Achievable for new content
- Match the target audience's language

Return as JSON with structure: { keywords: [...], suggestedTitle: "...", contentOutline: [...] }`;

    // Try AIServices first (if available client-side)
    if (typeof window !== 'undefined') {
        try {
            const { aiServices } = await import('./services');
            const result = await aiServices.execute({
                capability: 'keywords',
                prompt,
                context: { topic, niche, maxKeywords },
            });

            if (result.success && result.text) {
                try {
                    const data = JSON.parse(result.text);
                    return {
                        success: true,
                        keywords: data.keywords || [],
                        suggestedTitle: data.suggestedTitle,
                        contentOutline: data.contentOutline,
                        source: result.source === 'mcp' ? 'ai+search' : 'ai'
                    };
                } catch {
                    // Parse failed, fall through to direct call
                }
            }
        } catch {
            // AIServices not available, fall through to direct call
        }
    }

    // Fallback: Direct Gemini call (server-side or when AIServices fails)
    try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',  // User-selected model in actual use
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        keywords: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    keyword: { type: Type.STRING },
                                    searchVolume: { type: Type.STRING },
                                    difficulty: { type: Type.STRING },
                                    intent: { type: Type.STRING },
                                    relatedTopics: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    }
                                }
                            }
                        },
                        suggestedTitle: { type: Type.STRING },
                        contentOutline: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(response.text || '{}');

        return {
            success: true,
            keywords: data.keywords || [],
            suggestedTitle: data.suggestedTitle,
            contentOutline: data.contentOutline,
            source: 'ai'
        };

    } catch (error) {
        return {
            success: false,
            keywords: [],
            error: error instanceof Error ? error.message : 'Keyword discovery failed',
            source: 'ai'
        };
    }
}

/**
 * Quick keyword suggestions (lighter version)
 */
export async function suggestKeywords(
    apiKey: string,
    topic: string,
    count: number = 5
): Promise<string[]> {
    try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest ${count} SEO keywords for: "${topic}". Return only keywords, one per line.`,
        });

        const text = response.text || '';
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, count);

    } catch {
        return [];
    }
}

/**
 * Analyze keyword competition
 */
export async function analyzeKeywordCompetition(
    apiKey: string,
    keyword: string
): Promise<{
    difficulty: string;
    reasoning: string;
    alternatives: string[];
}> {
    try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the SEO competition for the keyword: "${keyword}"

Provide:
1. Difficulty assessment (easy/medium/hard)
2. Brief reasoning (1-2 sentences)
3. 3 easier alternative keywords`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        difficulty: { type: Type.STRING },
                        reasoning: { type: Type.STRING },
                        alternatives: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        return JSON.parse(response.text || '{"difficulty":"unknown","reasoning":"","alternatives":[]}');

    } catch {
        return {
            difficulty: 'unknown',
            reasoning: 'Analysis failed',
            alternatives: []
        };
    }
}

/**
 * Enhanced keyword discovery using Brave Search + AI
 * 
 * This function:
 * 1. Uses Brave Search to find real-time trending topics
 * 2. Analyzes search results with AI to extract keywords
 * 3. Provides more accurate, current keyword suggestions
 */
export async function discoverKeywordsWithSearch(
    apiKey: string,
    options: DiscoverKeywordsOptions
): Promise<KeywordDiscoveryResult> {
    const {
        topic,
        niche,
        targetAudience = 'general audience',
        region = 'global',
        language = 'English',
        maxKeywords = 10
    } = options;

    // Import MCP client utilities
    const { isBraveSearchAvailable, braveWebSearch } = await import('../mcp/client');

    if (!isBraveSearchAvailable()) {
        // Fall back to standard AI-only discovery
        console.log('[KeywordDiscovery] Brave Search not available, using AI-only');
        return discoverKeywords(apiKey, options);
    }

    try {
        // Step 1: Perform Brave web search for the topic
        const searchQuery = `${topic} ${niche} best ${new Date().getFullYear()}`;
        console.log(`[KeywordDiscovery] Searching: "${searchQuery}"`);

        const searchResult = await braveWebSearch(searchQuery, 10);

        if (!searchResult.success || !searchResult.results?.length) {
            console.log('[KeywordDiscovery] Search failed, falling back to AI-only');
            return discoverKeywords(apiKey, options);
        }

        // Step 2: Use AI to analyze search results and extract keywords
        const searchContext = searchResult.results
            .map(r => `- ${r.title}: ${r.description}`)
            .join('\n');

        const enhancedPrompt = `You are an expert SEO and content strategist.

I performed a web search for "${topic}" in the "${niche}" niche and found these results:

${searchContext}

Based on this real-time search data, discover ${maxKeywords} high-value keywords for:
- Topic: ${topic}
- Niche: ${niche}
- Target Audience: ${targetAudience}
- Region: ${region}
- Language: ${language}

For each keyword, analyze:
1. Estimated search volume (high/medium/low) based on how often it appears in search results
2. Competition difficulty (easy/medium/hard)
3. Search intent (informational/commercial/transactional)
4. 2-3 related sub-topics

Also suggest:
- An SEO-optimized article title that would rank well
- A content outline with 5-7 sections

Focus on keywords that:
- Appear frequently in the search results
- Are relevant to the niche
- Have good traffic potential
- Match the target audience's language

Return as JSON with structure: { keywords: [...], suggestedTitle: "...", contentOutline: [...] }`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: enhancedPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        keywords: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    keyword: { type: Type.STRING },
                                    searchVolume: { type: Type.STRING },
                                    difficulty: { type: Type.STRING },
                                    intent: { type: Type.STRING },
                                    relatedTopics: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING }
                                    }
                                }
                            }
                        },
                        suggestedTitle: { type: Type.STRING },
                        contentOutline: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(response.text || '{}');

        console.log(`[KeywordDiscovery] Found ${data.keywords?.length || 0} keywords with search enhancement`);

        return {
            success: true,
            keywords: data.keywords || [],
            suggestedTitle: data.suggestedTitle,
            contentOutline: data.contentOutline,
            source: 'ai+search'  // Indicates MCP was used
        };

    } catch (error) {
        console.error('[KeywordDiscovery] Search-enhanced discovery failed:', error);
        // Fall back to standard discovery
        return discoverKeywords(apiKey, options);
    }
}
