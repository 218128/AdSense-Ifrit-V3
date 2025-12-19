/**
 * Article Template System
 * 
 * Defines structures for different high-engagement content formats
 * optimized for AdSense revenue and user engagement.
 */

export type ArticleType =
    | 'product_review'
    | 'comparison'
    | 'how_to'
    | 'listicle'
    | 'diy_tutorial'
    | 'case_study'
    | 'ultimate_guide'
    | 'faq_roundup';

export interface AdPlacement {
    position: 'above_fold' | 'mid_content' | 'after_h2' | 'before_conclusion' | 'end';
    type: 'leaderboard' | 'rectangle' | 'in_article' | 'multiplex';
}

export interface SectionTemplate {
    heading: string;
    type: 'intro' | 'body' | 'list' | 'comparison_table' | 'pros_cons' | 'faq' | 'conclusion';
    targetWordCount: number;
    promptHint: string;
    required: boolean;
}

export interface ArticleTemplate {
    id: ArticleType;
    name: string;
    description: string;
    cpcPotential: 'low' | 'medium' | 'high' | 'very_high';
    targetWordCount: number;
    sections: SectionTemplate[];
    adPlacements: AdPlacement[];
    schemaTypes: string[];
    bestForNiches: string[];
}

/**
 * Product Review Template
 * Highest CPC potential - commercial intent
 */
export const PRODUCT_REVIEW_TEMPLATE: ArticleTemplate = {
    id: 'product_review',
    name: 'In-Depth Product Review',
    description: 'Comprehensive single-product review with personal experience',
    cpcPotential: 'very_high',
    targetWordCount: 2000,
    sections: [
        {
            heading: 'Introduction + Quick Verdict',
            type: 'intro',
            targetWordCount: 200,
            promptHint: 'Hook the reader, state what the product is, give a quick verdict score (e.g., 4.5/5), mention who its best for',
            required: true
        },
        {
            heading: 'Key Specifications',
            type: 'list',
            targetWordCount: 150,
            promptHint: 'Bullet list of key specs, features, pricing, compatibility',
            required: true
        },
        {
            heading: 'My Testing Experience',
            type: 'body',
            targetWordCount: 400,
            promptHint: 'Personal first-hand experience using the product over time. Specific scenarios, real usage examples.',
            required: true
        },
        {
            heading: 'Features Deep Dive',
            type: 'body',
            targetWordCount: 400,
            promptHint: 'Detailed analysis of 3-5 key features with specific examples of how each performs',
            required: true
        },
        {
            heading: 'Pros and Cons',
            type: 'pros_cons',
            targetWordCount: 200,
            promptHint: 'Honest pros and cons list based on testing. At least 4-5 of each.',
            required: true
        },
        {
            heading: 'Who Should Buy This (And Who Shouldn\'t)',
            type: 'body',
            targetWordCount: 200,
            promptHint: 'Specific user profiles who would benefit, and who should look elsewhere',
            required: true
        },
        {
            heading: 'Alternatives to Consider',
            type: 'list',
            targetWordCount: 200,
            promptHint: 'Brief mention of 2-3 alternatives with why someone might choose them instead',
            required: false
        },
        {
            heading: 'Final Verdict',
            type: 'conclusion',
            targetWordCount: 150,
            promptHint: 'Summary recommendation with final score, best use case, and call to action',
            required: true
        },
        {
            heading: 'FAQ',
            type: 'faq',
            targetWordCount: 200,
            promptHint: '5 common questions about the product with concise answers',
            required: true
        }
    ],
    adPlacements: [
        { position: 'above_fold', type: 'leaderboard' },
        { position: 'after_h2', type: 'in_article' },
        { position: 'before_conclusion', type: 'rectangle' },
        { position: 'end', type: 'multiplex' }
    ],
    schemaTypes: ['Article', 'Product', 'Review', 'FAQPage'],
    bestForNiches: ['Technology', 'Finance', 'Health', 'Home', 'Business']
};

/**
 * Comparison Template
 * Very high CPC - commercial intent with buying signals
 */
export const COMPARISON_TEMPLATE: ArticleTemplate = {
    id: 'comparison',
    name: 'Product Comparison',
    description: 'Head-to-head comparison of 2-5 products',
    cpcPotential: 'very_high',
    targetWordCount: 2500,
    sections: [
        {
            heading: 'Introduction + Quick Winner',
            type: 'intro',
            targetWordCount: 200,
            promptHint: 'Explain what you\'re comparing, why it matters, reveal quick winner with one-line reason',
            required: true
        },
        {
            heading: 'Comparison Table',
            type: 'comparison_table',
            targetWordCount: 100,
            promptHint: 'Markdown table comparing key features, pricing, ratings across all products',
            required: true
        },
        {
            heading: '[Product 1] Review',
            type: 'body',
            targetWordCount: 350,
            promptHint: 'Brief review of first product with key strengths, weaknesses, best use case',
            required: true
        },
        {
            heading: '[Product 2] Review',
            type: 'body',
            targetWordCount: 350,
            promptHint: 'Brief review of second product with key strengths, weaknesses, best use case',
            required: true
        },
        {
            heading: '[Product 3] Review',
            type: 'body',
            targetWordCount: 350,
            promptHint: 'Brief review of third product with key strengths, weaknesses, best use case',
            required: false
        },
        {
            heading: 'Head-to-Head: Key Differences',
            type: 'body',
            targetWordCount: 400,
            promptHint: 'Direct comparison on 4-5 key factors: price, features, ease of use, support, value',
            required: true
        },
        {
            heading: 'Which One Should You Choose?',
            type: 'body',
            targetWordCount: 300,
            promptHint: 'Recommendations based on user profiles: budget, power user, beginner, specific use cases',
            required: true
        },
        {
            heading: 'Final Verdict',
            type: 'conclusion',
            targetWordCount: 150,
            promptHint: 'Declare overall winner with reasoning, mention runner-up for specific cases',
            required: true
        },
        {
            heading: 'FAQ',
            type: 'faq',
            targetWordCount: 200,
            promptHint: '5 comparison-related questions people commonly ask',
            required: true
        }
    ],
    adPlacements: [
        { position: 'above_fold', type: 'leaderboard' },
        { position: 'after_h2', type: 'in_article' },
        { position: 'mid_content', type: 'rectangle' },
        { position: 'end', type: 'multiplex' }
    ],
    schemaTypes: ['Article', 'FAQPage'],
    bestForNiches: ['Technology', 'Finance', 'Business', 'Home']
};

/**
 * How-To Guide Template
 * High engagement, good for featured snippets
 */
export const HOW_TO_TEMPLATE: ArticleTemplate = {
    id: 'how_to',
    name: 'Step-by-Step How-To Guide',
    description: 'Actionable tutorial with clear steps',
    cpcPotential: 'medium',
    targetWordCount: 1500,
    sections: [
        {
            heading: 'Introduction',
            type: 'intro',
            targetWordCount: 150,
            promptHint: 'What will they learn, why it matters, what they\'ll achieve, time/difficulty estimate',
            required: true
        },
        {
            heading: 'What You\'ll Need',
            type: 'list',
            targetWordCount: 100,
            promptHint: 'Prerequisites, tools, materials, accounts, or software needed',
            required: true
        },
        {
            heading: 'Quick Overview',
            type: 'list',
            targetWordCount: 100,
            promptHint: 'Numbered list of high-level steps (this helps featured snippets)',
            required: true
        },
        {
            heading: 'Step 1: [Action]',
            type: 'body',
            targetWordCount: 200,
            promptHint: 'Detailed first step with specific instructions',
            required: true
        },
        {
            heading: 'Step 2: [Action]',
            type: 'body',
            targetWordCount: 200,
            promptHint: 'Detailed second step with specific instructions',
            required: true
        },
        {
            heading: 'Step 3: [Action]',
            type: 'body',
            targetWordCount: 200,
            promptHint: 'Detailed third step with specific instructions',
            required: true
        },
        {
            heading: 'Pro Tips',
            type: 'list',
            targetWordCount: 150,
            promptHint: '3-5 expert tips to get better results',
            required: true
        },
        {
            heading: 'Common Mistakes to Avoid',
            type: 'list',
            targetWordCount: 150,
            promptHint: '3-5 pitfalls and how to avoid them',
            required: true
        },
        {
            heading: 'Conclusion',
            type: 'conclusion',
            targetWordCount: 100,
            promptHint: 'Recap what they learned, encourage action, next steps',
            required: true
        },
        {
            heading: 'FAQ',
            type: 'faq',
            targetWordCount: 150,
            promptHint: '4-5 common questions about this process',
            required: true
        }
    ],
    adPlacements: [
        { position: 'above_fold', type: 'leaderboard' },
        { position: 'after_h2', type: 'in_article' },
        { position: 'end', type: 'multiplex' }
    ],
    schemaTypes: ['Article', 'HowTo', 'FAQPage'],
    bestForNiches: ['Technology', 'DIY', 'Finance', 'Education']
};

/**
 * Listicle Template
 * High engagement, shareable
 */
export const LISTICLE_TEMPLATE: ArticleTemplate = {
    id: 'listicle',
    name: 'Top 10 List',
    description: 'Curated list of best options in a category',
    cpcPotential: 'high',
    targetWordCount: 2000,
    sections: [
        {
            heading: 'Introduction',
            type: 'intro',
            targetWordCount: 150,
            promptHint: 'What the list covers, how items were selected, quick preview of #1 pick',
            required: true
        },
        {
            heading: 'Our Selection Criteria',
            type: 'list',
            targetWordCount: 100,
            promptHint: 'Bullet list of 4-5 factors used to evaluate options',
            required: true
        },
        {
            heading: '#1 [Best Overall]',
            type: 'body',
            targetWordCount: 200,
            promptHint: 'Top pick with features, why it\'s #1, pricing, who it\'s best for',
            required: true
        },
        {
            heading: '#2 [Runner Up]',
            type: 'body',
            targetWordCount: 175,
            promptHint: 'Second pick with key differentiators from #1',
            required: true
        },
        {
            heading: '#3-#5 [Category Winners]',
            type: 'body',
            targetWordCount: 400,
            promptHint: 'Three more options with brief reviews highlighting unique strengths',
            required: true
        },
        {
            heading: '#6-#10 [Honorable Mentions]',
            type: 'list',
            targetWordCount: 300,
            promptHint: 'Shorter descriptions of remaining options',
            required: true
        },
        {
            heading: 'Quick Comparison Table',
            type: 'comparison_table',
            targetWordCount: 100,
            promptHint: 'Table comparing all 10 on key metrics',
            required: true
        },
        {
            heading: 'How to Choose',
            type: 'body',
            targetWordCount: 200,
            promptHint: 'Decision guide based on different needs/budgets/use cases',
            required: true
        },
        {
            heading: 'Conclusion',
            type: 'conclusion',
            targetWordCount: 100,
            promptHint: 'Restate top pick, encourage action',
            required: true
        },
        {
            heading: 'FAQ',
            type: 'faq',
            targetWordCount: 175,
            promptHint: '5 questions about the category',
            required: true
        }
    ],
    adPlacements: [
        { position: 'above_fold', type: 'leaderboard' },
        { position: 'after_h2', type: 'in_article' },
        { position: 'mid_content', type: 'rectangle' },
        { position: 'end', type: 'multiplex' }
    ],
    schemaTypes: ['Article', 'ItemList', 'FAQPage'],
    bestForNiches: ['Technology', 'Finance', 'Business', 'Health', 'Travel']
};

/**
 * Ultimate Guide Template
 * Very high engagement, authority building
 */
export const ULTIMATE_GUIDE_TEMPLATE: ArticleTemplate = {
    id: 'ultimate_guide',
    name: 'Ultimate Guide',
    description: 'Comprehensive, authoritative resource on a topic',
    cpcPotential: 'high',
    targetWordCount: 3000,
    sections: [
        {
            heading: 'Introduction',
            type: 'intro',
            targetWordCount: 200,
            promptHint: 'What this guide covers, who it\'s for, what they\'ll learn, why you\'re qualified to write it',
            required: true
        },
        {
            heading: 'Table of Contents',
            type: 'list',
            targetWordCount: 50,
            promptHint: 'Linked table of contents for main sections',
            required: true
        },
        {
            heading: 'Chapter 1: [Foundation Topic]',
            type: 'body',
            targetWordCount: 500,
            promptHint: 'Foundational concepts, definitions, history, why it matters',
            required: true
        },
        {
            heading: 'Chapter 2: [Core Concepts]',
            type: 'body',
            targetWordCount: 500,
            promptHint: 'Main principles, key frameworks, important considerations',
            required: true
        },
        {
            heading: 'Chapter 3: [Practical Application]',
            type: 'body',
            targetWordCount: 500,
            promptHint: 'How to apply the concepts, step-by-step implementation',
            required: true
        },
        {
            heading: 'Chapter 4: [Advanced Strategies]',
            type: 'body',
            targetWordCount: 400,
            promptHint: 'Expert-level tips, optimization techniques, advanced use cases',
            required: true
        },
        {
            heading: 'Tools and Resources',
            type: 'list',
            targetWordCount: 200,
            promptHint: 'Recommended tools, resources, further reading with brief descriptions',
            required: true
        },
        {
            heading: 'Common Mistakes to Avoid',
            type: 'list',
            targetWordCount: 200,
            promptHint: '5-7 pitfalls with explanations of why they\'re problematic',
            required: true
        },
        {
            heading: 'Key Takeaways',
            type: 'list',
            targetWordCount: 150,
            promptHint: 'Bulleted summary of main points from the guide',
            required: true
        },
        {
            heading: 'Conclusion',
            type: 'conclusion',
            targetWordCount: 150,
            promptHint: 'Recap, encouragement, call to action, what to do next',
            required: true
        },
        {
            heading: 'FAQ',
            type: 'faq',
            targetWordCount: 250,
            promptHint: '7-10 frequently asked questions about the topic',
            required: true
        }
    ],
    adPlacements: [
        { position: 'above_fold', type: 'leaderboard' },
        { position: 'after_h2', type: 'in_article' },
        { position: 'mid_content', type: 'rectangle' },
        { position: 'before_conclusion', type: 'in_article' },
        { position: 'end', type: 'multiplex' }
    ],
    schemaTypes: ['Article', 'FAQPage'],
    bestForNiches: ['Finance', 'Technology', 'Business', 'Education', 'Health']
};

/**
 * All available templates
 */
export const ALL_TEMPLATES: ArticleTemplate[] = [
    PRODUCT_REVIEW_TEMPLATE,
    COMPARISON_TEMPLATE,
    HOW_TO_TEMPLATE,
    LISTICLE_TEMPLATE,
    ULTIMATE_GUIDE_TEMPLATE
];

/**
 * Get template by ID
 */
export function getTemplateById(id: ArticleType): ArticleTemplate | undefined {
    return ALL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates sorted by CPC potential
 */
export function getTemplatesByCPC(): ArticleTemplate[] {
    const cpcOrder = { 'very_high': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return [...ALL_TEMPLATES].sort((a, b) =>
        cpcOrder[b.cpcPotential] - cpcOrder[a.cpcPotential]
    );
}

/**
 * Get best template for a niche
 */
export function getBestTemplateForNiche(niche: string): ArticleTemplate {
    const nicheLower = niche.toLowerCase();

    // Find templates that match the niche
    const matching = ALL_TEMPLATES.filter(t =>
        t.bestForNiches.some(n => n.toLowerCase().includes(nicheLower))
    );

    if (matching.length > 0) {
        // Return highest CPC among matching
        const cpcOrder = { 'very_high': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return matching.sort((a, b) =>
            cpcOrder[b.cpcPotential] - cpcOrder[a.cpcPotential]
        )[0];
    }

    // Default to product review (highest CPC)
    return PRODUCT_REVIEW_TEMPLATE;
}
