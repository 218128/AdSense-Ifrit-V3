/**
 * Generate Domain Profile API
 * 
 * Takes a domain name and SpamZilla data, uses AI to discover
 * relevant keywords and generate a complete DomainProfile.
 * 
 * POST /api/domain-profiles/generate
 * 
 * MIGRATION: Uses CapabilityExecutor + aiServices. Engine import added for future migration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { IfritEngine } from '@/lib/core';
import { saveDomainProfile, DomainProfile } from '@/lib/websiteStore';
import { statusEmitter } from '@/app/api/status/stream/route';

export const maxDuration = 60; // Allow time for AI generation

interface GenerateRequest {
    domain: string;
    /** Session ID for SSE status streaming */
    sessionId?: string;
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
        niche?: string;
        enrichment?: Record<string, unknown>;
    };
    /** Domain score from analysis step */
    domainScore?: {
        overall: number;
        recommendation: string;
        risks: Array<{ description: string }>;
    };
    /** API key from client (same pattern as /api/capabilities) */
    apiKey?: string;
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
    const startTime = Date.now();

    try {
        const body: GenerateRequest = await request.json();

        if (!body.domain) {
            return NextResponse.json(
                { success: false, error: 'Domain is required' },
                { status: 400 }
            );
        }

        const domain = body.domain.toLowerCase().trim();

        // Create SSE tracker if session provided
        const actionId = `profile_${Date.now()}`;
        // createTracker automatically emits a 'start' event
        const tracker = body.sessionId ? statusEmitter.createTracker(body.sessionId, actionId, `Profile: ${domain}`, 'hunt') : null;

        // Step 1: Segment domain name
        const words = segmentDomainName(domain);
        console.log(`[Profile Generate] Domain: ${domain}, Words: ${words.join(', ')}`);
        tracker?.step('Domain Analysis', 'success', `Extracted: ${words.slice(0, 3).join(', ')}${words.length > 3 ? '...' : ''}`);

        if (body.keywordContext?.keywords?.length) {
            console.log(`[Profile Generate] Using keyword context: ${body.keywordContext.keywords.join(', ')}`);
            tracker?.step('Keyword Context', 'success', `${body.keywordContext.keywords.length} target keywords provided`);
        }

        if (body.domainScore) {
            tracker?.step('Domain Score', 'success', `Score: ${body.domainScore.overall}/100 - ${body.domainScore.recommendation}`);
        }

        // Step 2: Build AI prompt (including keyword context from Keyword Hunter)
        tracker?.step('Building Prompt', 'success', 'Combining domain + keyword context');
        const prompt = buildAIPrompt(domain, words, body.spamzillaData, body.keywordContext);

        // Step 3: Call AI API (AIServices gets keys from Settings)
        const aiResult = await generateWithAI(prompt, body.keywordContext, tracker, body.apiKey);

        if (!aiResult) {
            tracker?.fail('AI generation failed - no response');
            return NextResponse.json(
                { success: false, error: 'AI generation failed' },
                { status: 500 }
            );
        }

        tracker?.step('AI Generation', 'success', `Niche identified: ${aiResult.niche}`);

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
        tracker?.step('Profile Assembly', 'success', `${aiResult.primaryKeywords.length} keywords, ${aiResult.suggestedTopics.length} topics`);

        if (body.saveProfile) {
            tracker?.step('Saving', 'running', 'Saving profile...');
            saveDomainProfile(profile);
            tracker?.step('Saving', 'success', 'Profile saved');
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        tracker?.complete(`Profile generated in ${duration}s`);

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

// Tracker interface for type safety (matches statusEmitter.createTracker return type)
interface StatusTracker {
    step: (message: string, status: 'running' | 'success' | 'fail' | 'warning' | 'skipped', reason?: string) => string;
    complete: (message: string, details?: string[]) => void;
    fail: (message: string, reason?: string) => void;
}

async function generateWithAI(
    prompt: string,
    keywordContext?: { keywords: string[]; research: Record<string, string[]> },
    tracker?: StatusTracker | null,
    apiKey?: string  // API key from client (same pattern as /api/capabilities)
): Promise<AIKeywordResult | null> {
    try {
        // Use CapabilityExecutor like /api/capabilities/[capability] route does
        const { getCapabilityExecutor } = await import('@/lib/ai/services/CapabilityExecutor');
        const { aiServices } = await import('@/lib/ai/services');
        await aiServices.initialize();

        const executor = getCapabilityExecutor();
        const handlers = aiServices.getHandlers();
        const config = aiServices.getConfig();

        // Step 1: Use 'keywords' capability for keyword discovery
        console.log('[Profile Generate] Using capability: keywords');

        const keywordResult = await executor.execute(
            {
                capability: 'keywords',
                prompt,
                context: { itemType: 'domain-profile', keywordContext, apiKey },  // Pass apiKey in context
            },
            handlers,
            config
        );

        if (!keywordResult.success) {
            console.warn('[Profile Generate] Keywords capability failed:', keywordResult.error);
            tracker?.step('Keyword Discovery', 'fail', keywordResult.error || 'AI failed');
            return getFallbackResult();
        }

        tracker?.step('Keyword Discovery', 'success', `Handler: ${keywordResult.handlerUsed}`);

        // Parse keywords result
        let keywordsData: Record<string, unknown> | null = null;
        if (keywordResult.data && typeof keywordResult.data === 'object') {
            keywordsData = keywordResult.data as Record<string, unknown>;
        } else if (keywordResult.text) {
            const jsonMatch = keywordResult.text.match(/```json\n?([\s\S]*?)\n?```/) || keywordResult.text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : keywordResult.text;
            try {
                keywordsData = JSON.parse(jsonStr);
            } catch {
                console.warn('[Profile Generate] Failed to parse keywords response');
            }
        }

        if (!keywordsData) {
            console.warn('[Profile Generate] No keywords data returned');
            return getFallbackResult();
        }

        // Step 2: Use 'keyword-analyze' capability to get CPC/difficulty for discovered keywords
        const discoveredKeywords = [
            ...(toStringArray(keywordsData.primary_keywords || keywordsData.primaryKeywords)),
            ...(toStringArray(keywordsData.secondary_keywords || keywordsData.secondaryKeywords)).slice(0, 3)
        ].slice(0, 10); // Limit to 10 keywords for analysis

        if (discoveredKeywords.length > 0) {
            console.log('[Profile Generate] Using capability: keyword-analyze');

            const analysisPrompt = `Analyze these keywords for SEO difficulty, search volume, and CPC potential:\n${discoveredKeywords.join('\n')}`;

            const analysisResult = await executor.execute(
                {
                    capability: 'keyword-analyze',
                    prompt: analysisPrompt,
                    context: { keywords: discoveredKeywords, apiKey },  // Pass apiKey
                },
                handlers,
                config
            );

            if (analysisResult.success) {
                console.log('[Profile Generate] Keyword analysis complete');
                tracker?.step('Keyword Analysis', 'success', `Handler: ${analysisResult.handlerUsed}`);
                // Merge analysis data into profile if available
                if (analysisResult.data && typeof analysisResult.data === 'object') {
                    const analysisData = analysisResult.data as Record<string, unknown>;
                    // Add analysis metadata to keywordsData
                    keywordsData.keywordAnalysis = analysisData;
                }
            } else {
                tracker?.step('Keyword Analysis', 'warning', 'Skipped - using defaults');
            }
        }

        // Normalize with snake_case support
        return normalizeAIKeywordResult(keywordsData);

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
