/**
 * Keyword Analysis Prompts
 * 
 * AI prompt templates for analyzing keywords.
 * Separated from inference logic for maintainability.
 * 
 * @module prompts/analysis
 */

import type { KeywordItem } from '@/lib/keywords/types';

/**
 * Analysis options
 */
export interface KeywordAnalysisOptions {
    /** Include competition analysis */
    includeCompetition?: boolean;
    /** Include content suggestions */
    includeContentSuggestions?: boolean;
    /** Focus on specific niches */
    focusNiches?: string[];
    /** Research data per keyword for enhanced analysis */
    researchData?: Record<string, string[]>;
}

/**
 * Build keyword analysis prompt
 * 
 * @param keywords - Keywords to analyze
 * @param options - Analysis options (can include research data)
 * @returns Formatted prompt string
 */
export function buildKeywordAnalysisPrompt(
    keywords: KeywordItem[],
    options: KeywordAnalysisOptions = {}
): string {
    const keywordList = keywords.map(k => k.keyword).join(', ');

    // Build research context if available
    let researchContext = '';
    if (options.researchData && Object.keys(options.researchData).length > 0) {
        researchContext = '\n\n**Research Context (use this for more accurate scoring):**\n';
        for (const [keyword, findings] of Object.entries(options.researchData)) {
            if (findings && findings.length > 0) {
                researchContext += `\n- ${keyword}:\n`;
                findings.slice(0, 3).forEach(finding => {
                    researchContext += `  • ${finding}\n`;
                });
            }
        }
    }

    let prompt = `
Analyze these keywords for monetization potential: ${keywordList}
${researchContext}
For each keyword, provide:
1. **Estimated CPC**: Low ($0-1), Medium ($1-3), High ($3-10), Very High ($10+)
2. **Competition Level**: Low, Medium, High
3. **Niche Category**: What category does this belong to?
4. **Monetization Score**: 1-10 rating
5. **Best Monetization Method**: AdSense, Affiliate, Product, Services
`.trim();

    if (options.includeCompetition) {
        prompt += `
6. **Top Competitors**: Who ranks for this keyword?
7. **Content Gap**: What's missing from current results?
`;
    }

    if (options.includeContentSuggestions) {
        prompt += `
8. **Content Ideas**: 3 specific article/video ideas
9. **Target Audience**: Who searches for this?
`;
    }

    prompt += `

Return structured data for easy parsing.`;

    return prompt;
}

/**
 * Build batch keyword analysis prompt (for many keywords)
 * 
 * @param keywords - Array of keyword strings
 * @returns Formatted prompt string
 */
export function buildBatchKeywordPrompt(keywords: string[]): string {
    const keywordList = keywords.join('\n- ');

    return `
Analyze these keywords and return a JSON array with analysis for each:

Keywords:
- ${keywordList}

For each keyword, return: {
  "keyword": string,
  "estimatedCPC": "$X.XX",
  "competition": "Low" | "Medium" | "High",
  "niche": string,
  "monetizationScore": 1-10,
  "recommendation": string
}

Return ONLY the JSON array, no additional text.
`.trim();
}
