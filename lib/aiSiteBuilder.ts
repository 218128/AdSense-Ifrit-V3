/**
 * AI Site Builder
 * 
 * Generates prompts for external AI to make revenue-optimized decisions
 * about website configuration using Ifrit features.
 * 
 * The AI receives:
 * 1. Domain profile data (niche, keywords, competitors)
 * 2. Complete feature catalog (all options)
 * 3. Goal directive: "Maximize AdSense revenue"
 * 
 * The AI returns a structured decision object with reasoning.
 */

import { FEATURE_CATALOG } from '@/templates/shared/featureCatalog';

// ============================================
// TYPES
// ============================================

export interface DomainProfileForAI {
    domain: string;
    niche: string;
    primaryKeywords: string[];
    secondaryKeywords: string[];
    questionKeywords: string[];
    suggestedTopics: string[];
    suggestedCategories: string[];
    competitorUrls: string[];
    contentGaps: string[];
    trafficPotential: number;
    difficultyScore: number;
}

export interface AIDecision {
    value: string;
    reasoning: string;
}

export interface AISiteDecisions {
    template: AIDecision;
    homepageLayout: AIDecision;
    articleGridStyle: AIDecision;
    headerStyle: AIDecision;
    footerStyle: AIDecision;
    cardStyle: AIDecision;
    buttonStyle: AIDecision;
    newsletterPlacement: AIDecision;
    adZones: {
        aboveFold: AIDecision & { enabled: boolean };
        inFeed: AIDecision & { enabled: boolean; frequency?: number };
        sidebar: AIDecision & { enabled: boolean };
        inArticle: AIDecision & { enabled: boolean; frequency?: number };
        footer: AIDecision & { enabled: boolean };
        betweenSections: AIDecision & { enabled: boolean };
    };
    articleLayout: AIDecision;
    trustSignals: {
        authorBox: AIDecision & { enabled: boolean };
        authorCredentials: AIDecision & { enabled: boolean };
        datePublished: AIDecision & { enabled: boolean };
        trustBadges: AIDecision & { enabled: boolean };
        tableOfContents: AIDecision & { enabled: boolean };
        readingProgressBar: AIDecision & { enabled: boolean };
        relatedArticles: AIDecision & { enabled: boolean; count?: number };
    };
    typographyMood: AIDecision;
    colorApproach: AIDecision;
    overallStrategy: string;
}

export interface AISiteBuilderOutput {
    decisions: AISiteDecisions;
    generatedAt: number;
    profileUsed: DomainProfileForAI;
}

// ============================================
// PROMPT GENERATOR
// ============================================

/**
 * Generate the complete prompt for external AI
 */
export function generateAISiteBuilderPrompt(profile: DomainProfileForAI): string {
    const catalogJson = JSON.stringify(FEATURE_CATALOG, null, 2);
    const profileJson = JSON.stringify(profile, null, 2);

    return `# AI Website Configuration Assistant

## YOUR GOAL
You are configuring a website to **MAXIMIZE ADSENSE REVENUE**. Every decision you make should be driven by this goal:
- Higher ad viewability
- Better user engagement (more pageviews)
- Longer session duration
- Lower bounce rate
- Trust and credibility (especially for YMYL niches)

## DOMAIN PROFILE
This is data about the website you're configuring:

\`\`\`json
${profileJson}
\`\`\`

## AVAILABLE FEATURES
These are ALL the options available in the Ifrit system. You must choose from ONLY these options:

\`\`\`json
${catalogJson}
\`\`\`

## YOUR TASK
Make decisions about each configuration option. For EVERY decision, you must:
1. Choose a value from the available options
2. Explain your reasoning related to maximizing AdSense revenue

## OUTPUT FORMAT
Return a valid JSON object with this exact structure:

\`\`\`json
{
  "decisions": {
    "template": { "value": "template-name", "reasoning": "..." },
    "homepageLayout": { "value": "layout-name", "reasoning": "..." },
    "articleGridStyle": { "value": "style-name", "reasoning": "..." },
    "headerStyle": { "value": "style-name", "reasoning": "..." },
    "footerStyle": { "value": "style-name", "reasoning": "..." },
    "cardStyle": { "value": "style-name", "reasoning": "..." },
    "buttonStyle": { "value": "style-name", "reasoning": "..." },
    "newsletterPlacement": { "value": "placement-name", "reasoning": "..." },
    "adZones": {
      "aboveFold": { "enabled": true/false, "value": "description", "reasoning": "..." },
      "inFeed": { "enabled": true/false, "frequency": N, "value": "...", "reasoning": "..." },
      "sidebar": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "inArticle": { "enabled": true/false, "frequency": N, "value": "...", "reasoning": "..." },
      "footer": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "betweenSections": { "enabled": true/false, "value": "...", "reasoning": "..." }
    },
    "articleLayout": { "value": "layout-name", "reasoning": "..." },
    "trustSignals": {
      "authorBox": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "authorCredentials": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "datePublished": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "trustBadges": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "tableOfContents": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "readingProgressBar": { "enabled": true/false, "value": "...", "reasoning": "..." },
      "relatedArticles": { "enabled": true/false, "count": N, "value": "...", "reasoning": "..." }
    },
    "typographyMood": { "value": "mood-name", "reasoning": "..." },
    "colorApproach": { "value": "description", "reasoning": "..." },
    "overallStrategy": "Brief summary of your revenue-optimization strategy for this site..."
  }
}
\`\`\`

## IMPORTANT RULES
1. Only use values from the AVAILABLE FEATURES catalog
2. Every "reasoning" must explain how this choice helps AdSense revenue
3. Consider the niche when making decisions (YMYL niches need more trust signals)
4. Balance ad density with user experience (too many ads = high bounce rate)
5. Think about user journey: arrival → engagement → ad impressions → return visits

Return ONLY the JSON object, no additional text.`;
}

/**
 * Generate a simpler prompt for quick decisions
 */
export function generateQuickDecisionPrompt(
    profile: DomainProfileForAI,
    featureCategory: keyof typeof FEATURE_CATALOG
): string {
    const options = FEATURE_CATALOG[featureCategory];

    return `Given a ${profile.niche} website targeting keywords like "${profile.primaryKeywords.slice(0, 3).join(', ')}", 
which ${featureCategory} option would MAXIMIZE ADSENSE REVENUE?

Available options:
${JSON.stringify(options, null, 2)}

Choose one and explain why it's best for revenue. Return JSON:
{ "value": "option-name", "reasoning": "..." }`;
}

// ============================================
// DECISION VALIDATOR
// ============================================

/**
 * Validate AI decisions against the feature catalog
 */
export function validateAIDecisions(decisions: AISiteDecisions): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Validate template
    if (!Object.keys(FEATURE_CATALOG.templates).includes(decisions.template.value)) {
        errors.push(`Invalid template: ${decisions.template.value}`);
    }

    // Validate homepage layout
    if (!Object.keys(FEATURE_CATALOG.homepageLayouts).includes(decisions.homepageLayout.value)) {
        errors.push(`Invalid homepage layout: ${decisions.homepageLayout.value}`);
    }

    // Validate article grid style
    if (!Object.keys(FEATURE_CATALOG.articleGridStyles).includes(decisions.articleGridStyle.value)) {
        errors.push(`Invalid article grid style: ${decisions.articleGridStyle.value}`);
    }

    // Validate header style
    if (!Object.keys(FEATURE_CATALOG.headerStyles).includes(decisions.headerStyle.value)) {
        errors.push(`Invalid header style: ${decisions.headerStyle.value}`);
    }

    // Validate footer style
    if (!Object.keys(FEATURE_CATALOG.footerStyles).includes(decisions.footerStyle.value)) {
        errors.push(`Invalid footer style: ${decisions.footerStyle.value}`);
    }

    // Validate card style
    if (!Object.keys(FEATURE_CATALOG.cardStyles).includes(decisions.cardStyle.value)) {
        errors.push(`Invalid card style: ${decisions.cardStyle.value}`);
    }

    // Validate button style
    if (!Object.keys(FEATURE_CATALOG.buttonStyles).includes(decisions.buttonStyle.value)) {
        errors.push(`Invalid button style: ${decisions.buttonStyle.value}`);
    }

    // Validate newsletter placement
    if (!Object.keys(FEATURE_CATALOG.newsletterPlacements).includes(decisions.newsletterPlacement.value)) {
        errors.push(`Invalid newsletter placement: ${decisions.newsletterPlacement.value}`);
    }

    // Validate article layout
    if (!Object.keys(FEATURE_CATALOG.articleLayouts).includes(decisions.articleLayout.value)) {
        errors.push(`Invalid article layout: ${decisions.articleLayout.value}`);
    }

    // Validate typography mood
    if (!Object.keys(FEATURE_CATALOG.typographyMoods).includes(decisions.typographyMood.value)) {
        errors.push(`Invalid typography mood: ${decisions.typographyMood.value}`);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================
// DECISION STORAGE
// ============================================

/**
 * Create a decisions record for storage
 */
export function createDecisionRecord(
    profile: DomainProfileForAI,
    decisions: AISiteDecisions
): AISiteBuilderOutput {
    return {
        decisions,
        generatedAt: Date.now(),
        profileUsed: profile,
    };
}

/**
 * Generate the decisions.json content
 */
export function generateDecisionsJson(output: AISiteBuilderOutput): string {
    return JSON.stringify(output, null, 2);
}
