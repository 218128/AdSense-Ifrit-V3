/**
 * Trend Research Prompts
 * 
 * AI prompt templates for researching trend topics.
 * Separated from inference logic for maintainability.
 * 
 * @module prompts/research
 */

/**
 * Research options
 */
export interface TrendResearchOptions {
    /** Quick or deep research */
    researchType: 'quick' | 'deep';
    /** Focus areas */
    focusAreas?: ('monetization' | 'content' | 'competition' | 'audience')[];
}

/**
 * Build trend research prompt
 * 
 * @param topics - Topics to research
 * @param options - Research options
 * @returns Formatted prompt string
 * 
 * @example
 * const prompt = buildTrendResearchPrompt(['AI', 'Crypto'], { researchType: 'deep' });
 */
export function buildTrendResearchPrompt(
    topics: string[],
    options: TrendResearchOptions = { researchType: 'quick' }
): string {
    const topicList = topics.join(', ');

    if (options.researchType === 'deep') {
        return `
Research these trending topics for monetization potential and content opportunities: ${topicList}

For each topic, provide:
1. **Market Size & Trends**: Current market status and growth trajectory
2. **Monetization Potential**: AdSense CPC estimates, affiliate opportunities, product potential
3. **Content Opportunities**: Blog post ideas, video topics, social media angles
4. **Competition Analysis**: How saturated is this niche? Are there gaps?
5. **Target Audience**: Who searches for this? Demographics and intent
6. **Recommended Approach**: Best strategy to capitalize on this trend

Be specific with examples and data where possible.
`.trim();
    }

    // Quick research
    return `
Provide a quick analysis of these trending topics: ${topicList}

For each topic, summarize:
- Monetization potential (High/Medium/Low)
- Best content type (Blog/Video/Social)
- Key opportunity or insight
`.trim();
}

/**
 * Build competition analysis prompt
 * 
 * @param topics - Topics to analyze
 * @returns Formatted prompt string
 */
export function buildCompetitionAnalysisPrompt(topics: string[]): string {
    const topicList = topics.join(', ');

    return `
Analyze the competitive landscape for these topics: ${topicList}

For each topic, provide:
1. **Top Competitors**: Who dominates this space?
2. **Content Gaps**: What's missing from current coverage?
3. **Entry Difficulty**: How hard to rank/compete?
4. **Unique Angle**: What angle could differentiate new content?
`.trim();
}
