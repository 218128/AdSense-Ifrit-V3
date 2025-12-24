/**
 * Generate Domain Profile API
 * 
 * Takes a domain name and SpamZilla data, uses AI to discover
 * relevant keywords and generate a complete DomainProfile.
 * 
 * POST /api/domain-profiles/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveDomainProfile, DomainProfile } from '@/lib/websiteStore';

export const maxDuration = 60; // Allow time for AI generation

interface GenerateRequest {
    domain: string;
    spamzillaData?: {
        trustFlow?: number;
        citationFlow?: number;
        domainAuthority?: number;
        age?: number;
        szScore?: number;
        majesticTopics?: string;
        auctionSource?: string;
        price?: string;
    };
    saveProfile?: boolean;
    apiKey?: string; // Client-provided API key from localStorage
}

interface AIKeywordResult {
    niche: string;
    nicheDescription: string;
    primaryKeywords: string[];
    secondaryKeywords: string[];
    questionKeywords: string[];
    suggestedTopics: string[];
    suggestedCategories: string[];
    contentAngles: string[];
    monetizationHints: string[];
}

// ============================================
// Domain Name Segmentation
// ============================================

function segmentDomainName(domain: string): string[] {
    // Remove TLD
    const name = domain.split('.')[0];

    // Handle common patterns
    // 1. Hyphenated: "my-domain" -> ["my", "domain"]
    if (name.includes('-')) {
        return name.split('-').filter(Boolean);
    }

    // 2. CamelCase or lowercase compound: "MyDomain" or "mydomain"
    // Use dictionary-based segmentation for common words
    const commonWords = [
        'access', 'commerce', 'neo', 'splice', 'tech', 'web', 'net', 'cloud',
        'digital', 'smart', 'hub', 'zone', 'pro', 'max', 'plus', 'online',
        'shop', 'store', 'market', 'trade', 'buy', 'sell', 'deal', 'best',
        'top', 'first', 'prime', 'elite', 'super', 'mega', 'ultra', 'hyper',
        'home', 'house', 'land', 'world', 'global', 'local', 'city', 'town',
        'blog', 'news', 'info', 'guide', 'tips', 'help', 'learn', 'how',
        'health', 'fit', 'life', 'style', 'beauty', 'food', 'cook', 'recipe',
        'travel', 'trip', 'tour', 'fly', 'hotel', 'book', 'rent', 'car',
        'money', 'cash', 'pay', 'fund', 'invest', 'save', 'loan', 'credit',
        'game', 'play', 'fun', 'sport', 'team', 'win', 'score', 'bet',
        'photo', 'video', 'music', 'art', 'design', 'create', 'make', 'build',
        'soft', 'ware', 'app', 'code', 'dev', 'data', 'api', 'server',
        'real', 'estate', 'property', 'agent', 'broker', 'sell', 'buy',
        'biker', 'hut', 'gator', 'homes', 'lander', 'children', 'museum'
    ];

    // Try to find word boundaries
    const words: string[] = [];
    let remaining = name.toLowerCase();

    while (remaining.length > 0) {
        let found = false;

        // Try longest match first
        for (let len = Math.min(remaining.length, 12); len >= 2; len--) {
            const candidate = remaining.substring(0, len);
            if (commonWords.includes(candidate)) {
                words.push(candidate);
                remaining = remaining.substring(len);
                found = true;
                break;
            }
        }

        if (!found) {
            // No match, take single character or remaining
            if (remaining.length <= 3) {
                words.push(remaining);
                break;
            } else {
                // Take first 3-4 chars as a word
                words.push(remaining.substring(0, 3));
                remaining = remaining.substring(3);
            }
        }
    }

    return words.filter(w => w.length > 1);
}

// ============================================
// AI Prompt Builder
// ============================================

function buildAIPrompt(
    domain: string,
    words: string[],
    spamzillaData?: GenerateRequest['spamzillaData']
): string {
    let context = `Domain: ${domain}\nExtracted words: ${words.join(', ')}`;

    if (spamzillaData) {
        if (spamzillaData.majesticTopics) {
            context += `\nMajestic Topics: ${spamzillaData.majesticTopics}`;
        }
        if (spamzillaData.age) {
            context += `\nDomain Age: ${spamzillaData.age} years`;
        }
        if (spamzillaData.domainAuthority) {
            context += `\nDomain Authority: ${spamzillaData.domainAuthority}`;
        }
    }

    return `You are an SEO expert analyzing a domain for AdSense monetization.

${context}

Based on the domain name and any available data, generate a comprehensive keyword profile.
The goal is to identify the most profitable niche and keywords for this domain.

Respond in this exact JSON format:
{
  "niche": "One or two word niche (e.g., 'E-commerce Software', 'Outdoor Gear', 'Health Tips')",
  "nicheDescription": "One sentence describing the niche focus",
  "primaryKeywords": ["5 high-volume commercial intent keywords"],
  "secondaryKeywords": ["10 long-tail keyword variations"],
  "questionKeywords": ["5 'how to' or 'what is' style questions"],
  "suggestedTopics": ["5 article topic ideas with good AdSense potential"],
  "suggestedCategories": ["3-4 website section/category names"],
  "contentAngles": ["3 unique content angles or perspectives"],
  "monetizationHints": ["2-3 AdSense optimization tips for this niche"]
}

Focus on keywords with commercial intent that work well with AdSense ads.
Make suggestions specific to the domain name's implied meaning.`;
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
    try {
        const body: GenerateRequest = await request.json();

        if (!body.domain) {
            return NextResponse.json(
                { success: false, error: 'Domain is required' },
                { status: 400 }
            );
        }

        const domain = body.domain.toLowerCase().trim();

        // Step 1: Segment domain name
        const words = segmentDomainName(domain);
        console.log(`[Profile Generate] Domain: ${domain}, Words: ${words.join(', ')}`);

        // Step 2: Build AI prompt
        const prompt = buildAIPrompt(domain, words, body.spamzillaData);

        // Step 3: Call AI API (use client-provided key or fallback to env)
        const aiResult = await generateWithAI(prompt, body.apiKey);

        if (!aiResult) {
            return NextResponse.json(
                { success: false, error: 'AI generation failed' },
                { status: 500 }
            );
        }

        // Step 4: Build unified profile with all 3 sections
        const now = Date.now();

        const profile: DomainProfile = {
            domain,
            niche: aiResult.niche,
            purchaseType: 'external',  // Default to external, can be overridden
            purchasedAt: now,

            // Deep Analysis (placeholder until actual analysis done)
            deepAnalysis: {
                score: {
                    overall: body.spamzillaData?.domainAuthority || 50,
                    authority: body.spamzillaData?.domainAuthority || 0,
                    trustworthiness: body.spamzillaData?.trustFlow || 0,
                    relevance: 50,
                    emailPotential: 50,
                    flipPotential: 50,
                    nameQuality: 50,
                },
                riskLevel: 'medium',
                recommendation: 'consider',
                estimatedValue: 0,
                estimatedMonthlyRevenue: 0,
                wayback: {
                    hasHistory: false,
                },
                risks: [],
                trust: {
                    trustworthy: true,
                    score: body.spamzillaData?.trustFlow || 50,
                    positives: [],
                    negatives: [],
                },
                analyzedAt: now,
            },

            // Keyword Analysis (from AI generation)
            keywordAnalysis: {
                sourceKeywords: words,  // Domain-extracted words as source
                analysisResults: aiResult.primaryKeywords.map(kw => ({
                    keyword: kw,
                    searchVolume: 0,  // Placeholder - real API needed
                    cpc: 0,
                    competition: 'medium' as const,
                    difficulty: 50,
                    opportunity: 50,
                    potentialTraffic: 0,
                    relatedKeywords: [],
                })),
                primaryKeywords: aiResult.primaryKeywords,
                secondaryKeywords: aiResult.secondaryKeywords,
                questionKeywords: aiResult.questionKeywords,
                totalSearchVolume: 0,
                averageCPC: 0,
                analyzedAt: now,
            },

            // AI Generated Niche/Keywords
            aiNiche: {
                niche: aiResult.niche,
                suggestedTopics: aiResult.suggestedTopics,
                primaryKeywords: aiResult.primaryKeywords,
                contentAngles: aiResult.contentAngles,
                targetAudience: inferTargetAudience(aiResult.niche),
                monetizationStrategy: aiResult.monetizationHints.join('. '),
                generatedBy: 'gemini',
                generatedAt: now,
            },

            // Legacy fields (for backward compatibility)
            primaryKeywords: aiResult.primaryKeywords,
            secondaryKeywords: aiResult.secondaryKeywords,
            questionKeywords: aiResult.questionKeywords,
            suggestedTopics: aiResult.suggestedTopics,
            suggestedCategories: aiResult.suggestedCategories,
            competitorUrls: [],
            contentGaps: aiResult.contentAngles,
            trafficPotential: body.spamzillaData?.domainAuthority || 50,
            difficultyScore: 50,
            researchedAt: now,
            notes: `Auto-generated from domain name. ${aiResult.nicheDescription}`,
            transferredToWebsite: false
        };

        // Step 5: Optionally save
        if (body.saveProfile) {
            saveDomainProfile(profile);
        }

        return NextResponse.json({
            success: true,
            profile,
            aiResult,
            domainWords: words,
            message: body.saveProfile ? 'Profile generated and saved' : 'Profile generated (not saved)'
        });

    } catch (error) {
        console.error('[Profile Generate] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate profile' },
            { status: 500 }
        );
    }
}

// ============================================
// AI Generation Helper
// ============================================

async function generateWithAI(prompt: string, clientApiKey?: string): Promise<AIKeywordResult | null> {
    try {
        // Use client-provided key first, fall back to environment variable
        const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

        if (!apiKey) {
            console.error('[Profile Generate] No AI API key configured');
            // Return fallback result
            return getFallbackResult();
        }

        // Use Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('[Profile Generate] AI API error:', response.status);
            return getFallbackResult();
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return getFallbackResult();
        }

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

        try {
            const result = JSON.parse(jsonStr);
            return result as AIKeywordResult;
        } catch {
            console.error('[Profile Generate] Failed to parse AI response');
            return getFallbackResult();
        }

    } catch (error) {
        console.error('[Profile Generate] AI call failed:', error);
        return getFallbackResult();
    }
}

function getFallbackResult(): AIKeywordResult {
    return {
        niche: 'General',
        nicheDescription: 'A general purpose website',
        primaryKeywords: ['tips', 'guide', 'how to', 'best', 'reviews'],
        secondaryKeywords: ['beginner guide', 'expert tips', 'complete guide', 'step by step', 'ultimate guide'],
        questionKeywords: ['how to get started', 'what is the best way', 'why should I', 'when to use', 'where to find'],
        suggestedTopics: ['Getting Started Guide', 'Top 10 Tips', 'Complete Beginner Tutorial', 'Expert Strategies', 'Common Mistakes to Avoid'],
        suggestedCategories: ['Guides', 'Tips', 'Reviews', 'News'],
        contentAngles: ['Beginner-friendly tutorials', 'Expert deep-dives', 'Comparison reviews'],
        monetizationHints: ['Use informational content for high ad engagement', 'Create comparison articles for commercial keywords']
    };
}

/**
 * Infer target audience from niche name
 */
function inferTargetAudience(niche: string): string {
    const nicheLower = niche.toLowerCase();

    if (nicheLower.includes('tech') || nicheLower.includes('software')) {
        return 'Developers, tech enthusiasts, and IT professionals';
    }
    if (nicheLower.includes('health') || nicheLower.includes('fitness')) {
        return 'Health-conscious individuals seeking wellness information';
    }
    if (nicheLower.includes('finance') || nicheLower.includes('money') || nicheLower.includes('invest')) {
        return 'Investors and individuals seeking financial guidance';
    }
    if (nicheLower.includes('travel')) {
        return 'Travel enthusiasts and vacation planners';
    }
    if (nicheLower.includes('food') || nicheLower.includes('cook') || nicheLower.includes('recipe')) {
        return 'Home cooks and food enthusiasts';
    }
    if (nicheLower.includes('business') || nicheLower.includes('marketing')) {
        return 'Business owners and marketing professionals';
    }
    if (nicheLower.includes('education') || nicheLower.includes('learn')) {
        return 'Students and lifelong learners';
    }
    if (nicheLower.includes('home') || nicheLower.includes('diy')) {
        return 'Homeowners and DIY enthusiasts';
    }

    return `People interested in ${niche.toLowerCase()}`;
}
