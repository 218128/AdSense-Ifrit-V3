/**
 * Hunt AI Helpers
 * FSD: features/hunt/lib/huntHelpers.ts
 * 
 * Provides AI-powered features for Hunt using the unified capabilities system.
 * Features are AGNOSTIC to AI provider - capabilities system handles handler selection.
 */

// ============================================================================
// Types
// ============================================================================

export interface NicheAnalysis {
    niche: string;
    profitability: 'high' | 'medium' | 'low';
    estimatedCPM: { min: number; max: number };
    competition: 'high' | 'medium' | 'low';
    growthTrend: 'growing' | 'stable' | 'declining';
    bestContentTypes: string[];
    topKeywords: string[];
    monetizationTips: string[];
}

export interface KeywordExpansion {
    seedKeyword: string;
    longTailVariations: string[];
    questionKeywords: string[];
    comparisonKeywords: string[];
    voiceSearchPhrases: string[];
    relatedNiches: string[];
}

export interface DomainScore {
    domain: string;
    overallScore: number;      // 0-100
    memorability: number;
    brandPotential: number;
    nicheRelevance: number;
    seoFriendliness: number;
    verdict: 'excellent' | 'good' | 'fair' | 'poor';
    suggestions: string[];
}

// ============================================================================
// Niche Analyzer
// ============================================================================

/**
 * Analyze a niche for AdSense profitability
 */
export async function analyzeNiche(niche: string): Promise<NicheAnalysis | null> {
    try {
        const prompt = `Analyze the following niche for AdSense monetization profitability.

Niche: "${niche}"

Provide a detailed analysis in this exact JSON format:
{
    "niche": "${niche}",
    "profitability": "high|medium|low",
    "estimatedCPM": { "min": number, "max": number },
    "competition": "high|medium|low",
    "growthTrend": "growing|stable|declining",
    "bestContentTypes": ["5 content types that work well"],
    "topKeywords": ["10 high-value keywords"],
    "monetizationTips": ["3-5 AdSense optimization tips"]
}

Be specific and realistic with estimates.`;

        const response = await fetch('/api/capabilities/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                topic: niche,
                itemType: 'niche-analysis',
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success || !data.text) return null;

        // Parse JSON from response
        const text = data.text;
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

        return JSON.parse(jsonStr) as NicheAnalysis;
    } catch (error) {
        console.error('[Hunt] Niche analysis failed:', error);
        return null;
    }
}

// ============================================================================
// Keyword Expander
// ============================================================================

/**
 * Expand a seed keyword into variations
 */
export async function expandKeywords(seedKeyword: string): Promise<KeywordExpansion | null> {
    try {
        const prompt = `Expand the following seed keyword for SEO and content planning.

Seed Keyword: "${seedKeyword}"

Generate keyword variations in this exact JSON format:
{
    "seedKeyword": "${seedKeyword}",
    "longTailVariations": ["10 long-tail keyword variations"],
    "questionKeywords": ["5 question-based keywords (how, what, why, etc.)"],
    "comparisonKeywords": ["5 comparison keywords (vs, best, top, etc.)"],
    "voiceSearchPhrases": ["5 voice search phrases"],
    "relatedNiches": ["3 related niches to consider"]
}

Focus on keywords with commercial intent for AdSense.`;

        const response = await fetch('/api/capabilities/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                topic: seedKeyword,
                itemType: 'keyword-expansion',
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success || !data.text) return null;

        const text = data.text;
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

        return JSON.parse(jsonStr) as KeywordExpansion;
    } catch (error) {
        console.error('[Hunt] Keyword expansion failed:', error);
        return null;
    }
}

// ============================================================================
// Domain Scorer
// ============================================================================

/**
 * Score a domain name for quality and potential
 */
export async function scoreDomain(
    domain: string,
    targetNiche?: string
): Promise<DomainScore | null> {
    try {
        const nicheContext = targetNiche ? `Target Niche: "${targetNiche}"` : '';

        const prompt = `Evaluate the following domain name for a niche website.

Domain: "${domain}"
${nicheContext}

Score the domain on these criteria (0-100) and provide an overall verdict.
Respond in this exact JSON format:
{
    "domain": "${domain}",
    "overallScore": number (0-100),
    "memorability": number (0-100),
    "brandPotential": number (0-100),
    "nicheRelevance": number (0-100),
    "seoFriendliness": number (0-100),
    "verdict": "excellent|good|fair|poor",
    "suggestions": ["2-3 suggestions for using this domain"]
}

Be objective in scoring.`;

        const response = await fetch('/api/capabilities/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                topic: domain,
                itemType: 'domain-scoring',
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success || !data.text) return null;

        const text = data.text;
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

        return JSON.parse(jsonStr) as DomainScore;
    } catch (error) {
        console.error('[Hunt] Domain scoring failed:', error);
        return null;
    }
}
