/**
 * WP Content Prompts
 * FSD: features/wordpress/lib/wpContentPrompts.ts
 * 
 * Prompt templates for WordPress content generation.
 * All prompts are EXPOSED and EDITABLE - users can customize defaults.
 */

import type { HumanizationConfig, WPSiteType } from '../model/wpSiteTypes';

// ============================================================================
// Prompt Context
// ============================================================================

/**
 * Site context passed to all prompts
 */
export interface WPPromptContext {
    siteName: string;
    niche: string;
    siteType: WPSiteType;
    targetAudience: string;
    authorName: string;
    authorRole?: string;
    authorCredentials?: string;
}

/**
 * Article generation request
 */
export interface WPArticleRequest {
    type: 'pillar' | 'how-to' | 'listicle' | 'review' | 'comparison' | 'news';
    topic: string;
    keywords?: string[];
    targetWordCount?: number;
    context: WPPromptContext;
    humanization?: HumanizationConfig;
    customPromptOverride?: string;       // User can fully override
}

// ============================================================================
// Prompt Templates (Editable Defaults)
// ============================================================================

/**
 * Default prompt templates - stored and editable per site
 */
export interface WPPromptTemplates {
    pillar: string;
    howTo: string;
    listicle: string;
    review: string;
    comparison: string;
    news: string;
    aboutPage: string;
    contactPage: string;
    privacyPolicy: string;
    termsOfService: string;
}

/**
 * Get default prompt templates
 * These are the starting point - users can edit and save custom versions
 */
export function getDefaultPromptTemplates(): WPPromptTemplates {
    return {
        pillar: DEFAULT_PILLAR_PROMPT,
        howTo: DEFAULT_HOWTO_PROMPT,
        listicle: DEFAULT_LISTICLE_PROMPT,
        review: DEFAULT_REVIEW_PROMPT,
        comparison: DEFAULT_COMPARISON_PROMPT,
        news: DEFAULT_NEWS_PROMPT,
        aboutPage: DEFAULT_ABOUT_PROMPT,
        contactPage: DEFAULT_CONTACT_PROMPT,
        privacyPolicy: DEFAULT_PRIVACY_PROMPT,
        termsOfService: DEFAULT_TERMS_PROMPT,
    };
}

// ============================================================================
// Prompt Variables (Replaceable)
// ============================================================================

/**
 * Variables that get replaced in prompts
 */
export const PROMPT_VARIABLES = {
    '{{SITE_NAME}}': 'Site name',
    '{{NICHE}}': 'Site niche/topic area',
    '{{TARGET_AUDIENCE}}': 'Target audience description',
    '{{AUTHOR_NAME}}': 'Author display name',
    '{{AUTHOR_ROLE}}': 'Author role/title',
    '{{AUTHOR_CREDENTIALS}}': 'Author credentials',
    '{{TOPIC}}': 'Article topic',
    '{{KEYWORDS}}': 'Target keywords (comma-separated)',
    '{{WORD_COUNT}}': 'Target word count',
} as const;

/**
 * Replace variables in a prompt template
 */
export function interpolatePrompt(
    template: string,
    request: WPArticleRequest
): string {
    return template
        .replace(/\{\{SITE_NAME\}\}/g, request.context.siteName)
        .replace(/\{\{NICHE\}\}/g, request.context.niche)
        .replace(/\{\{TARGET_AUDIENCE\}\}/g, request.context.targetAudience)
        .replace(/\{\{AUTHOR_NAME\}\}/g, request.context.authorName)
        .replace(/\{\{AUTHOR_ROLE\}\}/g, request.context.authorRole || 'Writer')
        .replace(/\{\{AUTHOR_CREDENTIALS\}\}/g, request.context.authorCredentials || '')
        .replace(/\{\{TOPIC\}\}/g, request.topic)
        .replace(/\{\{KEYWORDS\}\}/g, request.keywords?.join(', ') || request.topic)
        .replace(/\{\{WORD_COUNT\}\}/g, String(request.targetWordCount || 2000));
}

// ============================================================================
// Default Prompt Templates
// ============================================================================

const DEFAULT_PILLAR_PROMPT = `You are an expert content writer for {{SITE_NAME}}, a {{NICHE}} website.

## Task
Write a comprehensive PILLAR ARTICLE (3000-5000 words) for {{TARGET_AUDIENCE}}.

## Article Details
- Topic: {{TOPIC}}
- Target Keywords: {{KEYWORDS}}
- Target Length: {{WORD_COUNT}} words

## Structure Required

### 1. Introduction (300-400 words)
- Hook with a pain point or question
- Explain what this guide covers
- Preview key takeaways
- Primary keyword in first 100 words

### 2. Quick Summary Box
Create a comparison table with:
- Top 5 recommendations
- Columns: Name | Best For | Key Feature | Rating

### 3. Methodology Section (200-300 words)
- Explain your evaluation process
- List 4-5 criteria used
- Establish E-E-A-T signals

### 4. Main Content (5-7 sections, 400-600 words each)
For each section:
- H2 heading with keyword variation
- Practical examples and specifics
- Pros/cons lists where appropriate

### 5. FAQ Section (5-7 questions)
- Use H3 for questions
- Target "People Also Ask" queries

### 6. Conclusion (200-300 words)
- Summarize recommendations
- Clear CTA

## Writing Style
- First person plural ("we tested")
- Specific numbers and data
- No AI-sounding phrases
- Written by {{AUTHOR_NAME}}, {{AUTHOR_ROLE}}

## Output
Return in clean HTML format ready for WordPress.`;

const DEFAULT_HOWTO_PROMPT = `You are a helpful guide writer for {{SITE_NAME}}.

## Task
Write a practical HOW-TO GUIDE (1500-2500 words) for {{TARGET_AUDIENCE}}.

## Article Details
- Topic: {{TOPIC}}
- Keywords: {{KEYWORDS}}

## Structure

### 1. Introduction
- What readers will accomplish
- Why this matters
- Time/difficulty estimate

### 2. What You'll Need
- List of requirements/tools
- Estimated cost if applicable

### 3. Step-by-Step Instructions
- 5-10 clear steps
- Each step with heading, explanation, pro tip
- Include common mistakes to avoid

### 4. Troubleshooting
- 3-5 common problems and solutions

### 5. Conclusion
- Recap what was accomplished
- Next steps or related guides

## Author
Written by {{AUTHOR_NAME}}

Return in clean HTML format.`;

const DEFAULT_LISTICLE_PROMPT = `You are a list-article expert for {{SITE_NAME}}.

## Task
Write an engaging LISTICLE (1500-2000 words) for {{TARGET_AUDIENCE}}.

## Article Details
- Topic: {{TOPIC}}
- Keywords: {{KEYWORDS}}

## Structure

### 1. Hook Introduction
- Brief intro (100 words max)
- Why this list matters

### 2. The List (10-15 items)
Each item needs:
- Clear heading with number
- 100-150 word description
- Why it's on the list
- Pro tip or quick fact

### 3. Quick Comparison Table
Summarize all items in a table

### 4. Wrap-Up
- Top 3 picks highlighted
- CTA for related content

Return in HTML format.`;

const DEFAULT_REVIEW_PROMPT = `You are a product reviewer for {{SITE_NAME}}.

## Task
Write an in-depth REVIEW ARTICLE (2000-3000 words) for {{TARGET_AUDIENCE}}.

## Article Details
- Product/Service: {{TOPIC}}
- Keywords: {{KEYWORDS}}

## Structure

### 1. Verdict Summary
- Quick rating (X/5)
- 3-sentence summary
- Best for / Not for

### 2. Overview
- What it is
- Key specs/features

### 3. Testing Methodology
- How we evaluated
- What we looked for

### 4. Detailed Analysis (5-7 aspects)
Each aspect:
- Score
- What's good
- What could be better

### 5. Alternatives
- 2-3 competitors with brief comparison

### 6. Final Verdict
- Who should buy
- Who should skip
- Overall rating

Written by {{AUTHOR_NAME}}, {{AUTHOR_ROLE}}
Return in HTML format.`;

const DEFAULT_COMPARISON_PROMPT = `You are a comparison expert for {{SITE_NAME}}.

## Task  
Write a COMPARISON ARTICLE (2000-2500 words) for {{TARGET_AUDIENCE}}.

## Article Details
- Topic: {{TOPIC}}
- Keywords: {{KEYWORDS}}

## Structure

### 1. Quick Winner
- TL;DR who wins and why

### 2. Comparison Table
Full feature comparison table

### 3. Category Comparisons
Compare across 5-7 categories:
- Each with clear winner

### 4. Verdict
- Best overall
- Best for specific use cases

Return in HTML format.`;

const DEFAULT_NEWS_PROMPT = `You are a news writer for {{SITE_NAME}}.

## Task
Write a NEWS ARTICLE (800-1200 words) for {{TARGET_AUDIENCE}}.

## Article Details
- Topic: {{TOPIC}}
- Keywords: {{KEYWORDS}}

## Structure

### 1. Lead (first paragraph)
- Who, what, when, where, why

### 2. Key Details
- Expand on the news

### 3. Context
- Background information

### 4. Expert Opinions
- Quotes or analysis

### 5. What's Next
- Future implications

Return in HTML format.`;

const DEFAULT_ABOUT_PROMPT = `Generate an About page for {{SITE_NAME}}.

## Site Details
- Niche: {{NICHE}}
- Audience: {{TARGET_AUDIENCE}}
- Author: {{AUTHOR_NAME}}, {{AUTHOR_ROLE}}

## Include
1. What the site is about
2. Our mission
3. How we create content
4. About the author
5. Contact invitation

Tone: Professional but approachable.
Return in HTML format.`;

const DEFAULT_CONTACT_PROMPT = `Generate a Contact page for {{SITE_NAME}}.

Include:
1. Friendly introduction
2. Reasons to contact
3. Response time expectation
4. Social media links placeholder

Return in HTML format.`;

const DEFAULT_PRIVACY_PROMPT = `Generate a Privacy Policy for {{SITE_NAME}}.

## Details
- Website: {{SITE_NAME}}
- Niche: {{NICHE}}

Include sections for:
1. Information we collect
2. How we use information
3. Cookies
4. Third-party services (Google Analytics, AdSense)
5. Your rights
6. Contact information

Return in HTML format.`;

const DEFAULT_TERMS_PROMPT = `Generate Terms of Service for {{SITE_NAME}}.

Include sections for:
1. Acceptance of terms
2. Use of content
3. Disclaimers
4. Limitation of liability
5. Changes to terms
6. Contact

Return in HTML format.`;

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Build the final prompt for article generation
 * User can see and modify this before sending
 */
export function buildPrompt(
    request: WPArticleRequest,
    customTemplate?: string
): {
    prompt: string;
    templateUsed: string;
    canEdit: true;
} {
    const templates = getDefaultPromptTemplates();
    let template: string;

    // Allow custom override
    if (request.customPromptOverride) {
        template = request.customPromptOverride;
    } else if (customTemplate) {
        template = customTemplate;
    } else {
        // Use default based on type
        switch (request.type) {
            case 'pillar': template = templates.pillar; break;
            case 'how-to': template = templates.howTo; break;
            case 'listicle': template = templates.listicle; break;
            case 'review': template = templates.review; break;
            case 'comparison': template = templates.comparison; break;
            case 'news': template = templates.news; break;
            default: template = templates.pillar;
        }
    }

    // Interpolate variables
    const finalPrompt = interpolatePrompt(template, request);

    // Add humanization instructions if configured
    const fullPrompt = request.humanization
        ? addHumanizationInstructions(finalPrompt, request.humanization)
        : finalPrompt;

    return {
        prompt: fullPrompt,
        templateUsed: request.type,
        canEdit: true,
    };
}

/**
 * Add humanization instructions to prompt
 */
function addHumanizationInstructions(
    prompt: string,
    config: HumanizationConfig
): string {
    const instructions: string[] = [];

    if (config.removeAIPatterns) {
        instructions.push('- Avoid AI-sounding phrases like "Certainly", "Indeed", "It is important to note"');
    }

    if (config.addContractions) {
        instructions.push('- Use contractions naturally (it\'s, you\'re, we\'ve)');
    }

    if (config.addConversationalHooks) {
        instructions.push('- Add conversational hooks: "Here\'s the thing:", "Let me explain"');
    }

    if (config.injectOpinions) {
        instructions.push('- Include personal opinions: "In my experience", "I recommend"');
    }

    if (config.addFirstHandExperience) {
        instructions.push('- Add first-hand experience: "When I tested...", "After using..."');
    }

    if (instructions.length === 0) return prompt;

    return `${prompt}

## Humanization Requirements
${instructions.join('\n')}`;
}
