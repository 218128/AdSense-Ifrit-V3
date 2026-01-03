/**
 * Keyword Analysis API
 * 
 * Analyzes keywords using AI capabilities to provide:
 * - Estimated CPC
 * - Search volume
 * - Competition level
 * - Commercial intent
 * - Best niches
 * 
 * Uses aiServices.execute() for AI-powered analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiServices } from '@/lib/ai/services';

export const dynamic = 'force-dynamic';

interface KeywordAnalysisRequest {
    keywords: string[];
    /** API key from client (standard capability pattern) */
    apiKey?: string;
    context?: {
        niche?: string;
        region?: string;
    };
}

interface KeywordAnalysis {
    keyword: string;
    niche: string;
    estimatedCPC: string;
    estimatedVolume: string;
    competition: 'Low' | 'Medium' | 'High';
    score: number;
    intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
    reasoning: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: KeywordAnalysisRequest = await request.json();

        if (!body.keywords || body.keywords.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'At least one keyword is required'
            }, { status: 400 });
        }

        // Limit to 10 keywords per request
        const keywords = body.keywords.slice(0, 10);

        // Build prompt for AI analysis
        const prompt = `Analyze these keywords for AdSense monetization potential. For each keyword, provide:
1. Best niche category (Finance, Technology, Health, Legal, Insurance, Education, Travel, etc.)
2. Estimated CPC range (e.g., "$0.50-1.00", "$2.00-5.00", "$10.00-20.00")
3. Estimated monthly search volume (e.g., "1K-10K", "10K-100K", "100K-1M")
4. Competition level (Low, Medium, High)
5. User intent (informational, navigational, transactional, commercial)
6. Score 0-100 for AdSense revenue potential
7. Brief reasoning

Keywords to analyze:
${keywords.map((kw, i) => `${i + 1}. "${kw}"`).join('\n')}

Respond in JSON format:
{
  "analyses": [
    {
      "keyword": "...",
      "niche": "...",
      "estimatedCPC": "$X.XX-X.XX",
      "estimatedVolume": "XK-XK",
      "competition": "Low|Medium|High",
      "score": 0-100,
      "intent": "informational|navigational|transactional|commercial",
      "reasoning": "..."
    }
  ]
}`;

        // Use standard capability pattern with CapabilityExecutor
        const { getCapabilityExecutor } = await import('@/lib/ai/services/CapabilityExecutor');
        await aiServices.initialize();

        const executor = getCapabilityExecutor();
        const handlers = aiServices.getHandlers();
        const config = aiServices.getConfig();

        const result = await executor.execute(
            {
                capability: 'generate',
                prompt,
                systemPrompt: 'You are an SEO and AdSense monetization expert. Analyze keywords for their revenue potential. Be realistic with CPC estimates.',
                context: {
                    responseFormat: 'json',
                    apiKey: body.apiKey,  // Pass apiKey in context
                },
            },
            handlers,
            config
        );

        if (result.success && (result.data || result.text)) {
            try {
                // Parse AI response (can be in data or text)
                const responseText = result.data
                    ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data))
                    : result.text || '';

                // Extract JSON from response
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return NextResponse.json({
                        success: true,
                        analyses: parsed.analyses,
                        source: 'ai',
                        handler: result.handlerUsed,
                    });
                }
            } catch (parseError) {
                console.error('Failed to parse AI response:', parseError);
            }
        }

        // Fallback: algorithmic analysis
        const analyses: KeywordAnalysis[] = keywords.map(keyword =>
            analyzeKeywordAlgorithmically(keyword, body.context?.niche)
        );

        return NextResponse.json({
            success: true,
            analyses,
            source: 'algorithmic',
            note: 'AI analysis unavailable, using algorithmic fallback',
        });

    } catch (error) {
        console.error('Keyword analysis error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed'
        }, { status: 500 });
    }
}

/**
 * Algorithmic fallback for keyword analysis
 * Uses heuristics based on keyword patterns
 */
function analyzeKeywordAlgorithmically(keyword: string, niche?: string): KeywordAnalysis {
    const kw = keyword.toLowerCase();

    // High-value keyword patterns
    const highValuePatterns = [
        { pattern: /insurance|lawyer|attorney|mortgage|loan|credit/, cpc: '$15.00-50.00', niche: 'Finance/Legal' },
        { pattern: /mesothelioma|asbestos|injury|accident/, cpc: '$30.00-100.00', niche: 'Legal' },
        { pattern: /crypto|bitcoin|trading|forex/, cpc: '$5.00-20.00', niche: 'Finance' },
        { pattern: /hosting|vpn|software|saas/, cpc: '$3.00-15.00', niche: 'Technology' },
        { pattern: /weight loss|supplement|treatment|therapy/, cpc: '$2.00-10.00', niche: 'Health' },
    ];

    // Check for high-value patterns
    for (const { pattern, cpc, niche: detectedNiche } of highValuePatterns) {
        if (pattern.test(kw)) {
            return {
                keyword,
                niche: niche || detectedNiche,
                estimatedCPC: cpc,
                estimatedVolume: '10K-100K',
                competition: 'High',
                score: 75 + Math.floor(Math.random() * 20),
                intent: 'commercial',
                reasoning: `High-value keyword in ${detectedNiche} niche`,
            };
        }
    }

    // Commercial intent indicators
    const isCommercial = /buy|best|review|cheap|discount|deal|coupon|vs|compare/.test(kw);
    const isInformational = /how to|what is|guide|tutorial|tips|learn/.test(kw);

    // Default analysis
    return {
        keyword,
        niche: niche || detectNiche(kw),
        estimatedCPC: isCommercial ? '$1.00-5.00' : '$0.30-1.00',
        estimatedVolume: kw.split(' ').length > 3 ? '100-1K' : '1K-10K',
        competition: isCommercial ? 'Medium' : 'Low',
        score: isCommercial ? 55 : 40,
        intent: isCommercial ? 'commercial' : isInformational ? 'informational' : 'navigational',
        reasoning: 'Algorithmic analysis based on keyword patterns',
    };
}

function detectNiche(keyword: string): string {
    const kw = keyword.toLowerCase();

    if (/money|finance|invest|bank|credit|loan|tax/.test(kw)) return 'Finance';
    if (/tech|software|app|computer|phone|gadget/.test(kw)) return 'Technology';
    if (/health|medical|doctor|fitness|diet|wellness/.test(kw)) return 'Health';
    if (/law|legal|attorney|court|rights/.test(kw)) return 'Legal';
    if (/travel|hotel|flight|vacation|trip/.test(kw)) return 'Travel';
    if (/education|school|course|learn|degree/.test(kw)) return 'Education';
    if (/game|gaming|play|esport/.test(kw)) return 'Gaming';
    if (/food|recipe|cook|restaurant/.test(kw)) return 'Food';

    return 'General';
}
