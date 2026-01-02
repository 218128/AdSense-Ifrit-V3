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
    /** Keyword context from previous step (Keyword Hunter) */
    keywordContext?: {
        keywords: string[];
        research: Record<string, string[]>;
    };
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
    spamzillaData?: GenerateRequest['spamzillaData'],
    keywordContext?: GenerateRequest['keywordContext']
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

    // Add keyword context from Keyword Hunter if available
    let keywordSection = '';
    if (keywordContext && keywordContext.keywords.length > 0) {
        keywordSection = `\n\n**User's Target Keywords from Research:**
${keywordContext.keywords.join(', ')}`;

        // Add research findings if available
        const researchEntries = Object.entries(keywordContext.research);
        if (researchEntries.length > 0) {
            keywordSection += '\n\n**Research Findings:**';
            for (const [keyword, findings] of researchEntries.slice(0, 3)) {
                const topFindings = findings.slice(0, 3).join('; ');
                keywordSection += `\n- ${keyword}: ${topFindings}`;
            }
        }

        keywordSection += '\n\n**IMPORTANT:** Align the generated niche and keywords with the user\'s research above. The domain should complement their existing keyword strategy.';
    }

    return `You are an SEO expert analyzing a domain for AdSense monetization.

${context}${keywordSection}

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
        if (body.keywordContext?.keywords?.length) {
            console.log(`[Profile Generate] Using keyword context: ${body.keywordContext.keywords.join(', ')}`);
        }

        // Step 2: Build AI prompt (including keyword context from Keyword Hunter)
        const prompt = buildAIPrompt(domain, words, body.spamzillaData, body.keywordContext);

        // Step 3: Call AI API (pass client's API key from request body)
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
// AI Generation Helper - Uses Unified Capabilities
// ============================================

async function generateWithAI(prompt: string): Promise<AIKeywordResult | null> {
    try {
        // Use the unified capabilities system directly (no HTTP roundtrip)
        const { aiServices } = await import('@/lib/ai/services');
        await aiServices.initialize();

        const result = await aiServices.execute({
            capability: 'generate',  // Use existing generate capability
            prompt,
            context: { itemType: 'domain-profile' },
        });

        if (!result.success) {
            console.warn('[Profile Generate] Capability failed:', result.error);
            return getFallbackResult();
        }

        // Parse JSON from response
        let parsed: Record<string, unknown> | null = null;

        // Priority 1: Use result.data if available
        if (result.data && typeof result.data === 'object') {
            parsed = result.data as Record<string, unknown>;
        }
        // Priority 2: Parse from result.text
        else if (result.text) {
            const text = result.text;
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

            try {
                parsed = JSON.parse(jsonStr);
            } catch {
                console.error('[Profile Generate] Failed to parse AI response');
                return getFallbackResult();
            }
        }

        if (!parsed) {
            console.warn('[Profile Generate] No data in response');
            return getFallbackResult();
        }

        // Normalize with snake_case support
        return normalizeAIKeywordResult(parsed);

    } catch (error) {
        console.error('[Profile Generate] AI call failed:', error);
        return getFallbackResult();
    }
}

/**
 * Normalize AI response - handles both snake_case and camelCase fields
 */
function normalizeAIKeywordResult(raw: Record<string, unknown>): AIKeywordResult {
    return {
        niche: String(raw.niche || 'General'),
        nicheDescription: String(raw.niche_description || raw.nicheDescription || ''),
        primaryKeywords: toStringArray(raw.primary_keywords || raw.primaryKeywords),
        secondaryKeywords: toStringArray(raw.secondary_keywords || raw.secondaryKeywords),
        questionKeywords: toStringArray(raw.question_keywords || raw.questionKeywords),
        suggestedTopics: toStringArray(raw.suggested_topics || raw.suggestedTopics),
        suggestedCategories: toStringArray(raw.suggested_categories || raw.suggestedCategories),
        contentAngles: toStringArray(raw.content_angles || raw.contentAngles),
        monetizationHints: toStringArray(raw.monetization_hints || raw.monetizationHints),
    };
}

function toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map(v => String(v));
    }
    return [];
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
