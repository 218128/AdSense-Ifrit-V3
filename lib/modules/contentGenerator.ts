import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

import { contentLogger } from '@/lib/utils/logger';
import { aiServices } from '@/lib/ai/services';

// Import humanization and template systems
import {
    AuthorPersona,
    getBestPersonaForTopic,
    generateVoiceInstructions,
    generateEEATInstructions,
    generateAnecdotePrompt,
    addHumanTouches,
    DEFAULT_VOICE_CONFIG
} from '@/lib/humanization';

import {
    ArticleTemplate,
    ArticleType,
    getBestTemplateForNiche,
    getTemplateById,
    PRODUCT_REVIEW_TEMPLATE
} from '@/templates/shared/articleTemplates';

import {
    generateArticleSchema,
    generateFAQSchema,
    generateSchemaScripts,
    FAQSchemaItem
} from '@/lib/formatting/schemaOrg';

export interface Article {
    title: string;
    body: string;
    keyword: string;
    slug: string;
}

export interface EnhancedArticle extends Article {
    wordCount: number;
    generationPasses: number;
    researchData?: string;
    persona?: string;
    template?: string;
}

export interface ArticleConfig {
    keyword: string;
    context: string;
    targetWordCount: number;
    includeProducts: boolean;
    includeFAQ: boolean;
    websiteUrl?: string;  // Website domain (e.g., https://example.com) - used for Schema.org URLs
    // Deprecated: blogUrl - use websiteUrl instead (legacy field kept for backwards compatibility)
    blogUrl?: string;
    templateType?: ArticleType;
    personaId?: string;
    modelId?: string; // User-selected model from Settings
    // U4 FIX: Add tone for article generation
    tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
    adsenseConfig?: {
        publisherId?: string;
        leaderboardSlot?: string;
        articleSlot?: string;
        multiplexSlot?: string;
    };
}

export interface UserContentConfig {
    websiteUrl?: string;  // Website domain - preferred
    blogUrl?: string;     // Deprecated: use websiteUrl
    templateType?: ArticleType;
    modelId?: string; // User-selected model from Settings
    // U4 FIX: Add article generation options
    tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
    targetWordCount?: number;
    adsenseConfig?: {
        publisherId?: string;
        leaderboardSlot?: string;
        articleSlot?: string;
        multiplexSlot?: string;
    };
}

// Default model if none selected
const DEFAULT_MODEL = 'gemini-2.0-flash';

export class ContentGenerator {
    private contentDir: string;

    constructor() {
        this.contentDir = path.join(process.cwd(), 'content');
    }

    async generate(
        keyword: string,
        context: string,
        apiKey: string,
        userConfig?: UserContentConfig,
        providerKeys?: { gemini?: string[]; deepseek?: string[]; openrouter?: string[]; vercel?: string[]; perplexity?: string[] }
    ): Promise<Article> {
        contentLogger.info(`Generating content for: ${keyword}`);

        // If providerKeys provided, use multi-provider system
        if (providerKeys && Object.values(providerKeys).some(arr => arr && arr.length > 0)) {
            return this.generateWithMultiProvider(keyword, context, providerKeys, userConfig);
        }

        // Legacy: Single key mode
        if (!apiKey) {
            throw new Error("API Key is required for generation");
        }

        try {
            // Create GoogleGenAI client with the new SDK
            const ai = new GoogleGenAI({ apiKey });
            const modelId = userConfig?.modelId || DEFAULT_MODEL;

            const config: ArticleConfig = {
                keyword,
                context,
                // U4 FIX: Use user's targetWordCount if provided, default to 2000
                targetWordCount: userConfig?.targetWordCount || 2000,
                includeProducts: true,
                includeFAQ: true,
                blogUrl: userConfig?.blogUrl,
                templateType: userConfig?.templateType,
                modelId,
                // U4 FIX: Pass tone to generator
                tone: userConfig?.tone,
                adsenseConfig: userConfig?.adsenseConfig
            };

            const generator = new EnhancedContentGenerator(ai, modelId);
            const article = await generator.generate(config);

            return {
                title: article.title,
                body: article.body,
                keyword: article.keyword,
                slug: article.slug
            };

        } catch (error) {
            contentLogger.error("Gemini generation failed", error instanceof Error ? error : undefined);
            throw error;
        }
    }

    /**
     * Generate with multi-provider support and key rotation
     */
    private async generateWithMultiProvider(
        keyword: string,
        context: string,
        providerKeys: { gemini?: string[]; deepseek?: string[]; openrouter?: string[]; vercel?: string[]; perplexity?: string[] },
        userConfig?: UserContentConfig
    ): Promise<Article> {
        const geminiKeys = providerKeys.gemini || [];
        const modelId = userConfig?.modelId || DEFAULT_MODEL;

        if (geminiKeys.length > 0) {
            // Try each Gemini key until one works
            for (const key of geminiKeys) {
                try {
                    // Create GoogleGenAI client with the new SDK
                    const ai = new GoogleGenAI({ apiKey: key });

                    const config: ArticleConfig = {
                        keyword,
                        context,
                        targetWordCount: 2000,
                        includeProducts: true,
                        includeFAQ: true,
                        blogUrl: userConfig?.blogUrl,
                        templateType: userConfig?.templateType,
                        modelId,
                        adsenseConfig: userConfig?.adsenseConfig
                    };

                    const generator = new EnhancedContentGenerator(ai, modelId);
                    const article = await generator.generate(config);

                    contentLogger.success(`Generated with Gemini key rotation`);

                    return {
                        title: article.title,
                        body: article.body,
                        keyword: article.keyword,
                        slug: article.slug
                    };
                } catch (error) {
                    contentLogger.warn(`Gemini key failed, trying next...`);
                    continue;
                }
            }
        }

        // If no Gemini keys worked, throw error
        throw new Error("All Gemini keys failed. Add more keys in Settings or check rate limits.");
    }

    save(article: Article): void {
        if (!fs.existsSync(this.contentDir)) {
            fs.mkdirSync(this.contentDir, { recursive: true });
        }

        const filename = `${article.slug}.md`;
        const filepath = path.join(this.contentDir, filename);

        fs.writeFileSync(filepath, article.body, 'utf8');
        contentLogger.success(`Saved article to ${filepath}`);
    }

    exists(keyword: string): boolean {
        const filename = `${keyword}.md`;
        const filepath = path.join(this.contentDir, filename);
        return fs.existsSync(filepath);
    }
}

/**
 * Enhanced Content Generator with Humanization and Templates
 * 
 * V4 Architecture: Uses @google/genai unified client pattern
 * 
 * Generation Pipeline:
 * - Pass 0: Select persona and template
 * - Pass 1: Research phase (real products, statistics)
 * - Pass 2: Outline generation (template-guided)
 * - Pass 3: Full article generation (with persona voice)
 * - Pass 4: Quality enhancement (if needed)
 * - Pass 5: Post-processing (human touches)
 * - Pass 6: Schema.org structured data
 */
class EnhancedContentGenerator {
    private ai: GoogleGenAI;
    private modelId: string;

    constructor(ai: GoogleGenAI, modelId: string) {
        this.ai = ai;
        this.modelId = modelId;
    }

    /**
     * Generate content using the new @google/genai SDK
     */
    private async generateContent(prompt: string): Promise<string> {
        const response = await this.ai.models.generateContent({
            model: this.modelId,
            contents: prompt
        });
        return response.text || '';
    }

    async generate(config: ArticleConfig): Promise<EnhancedArticle> {
        contentLogger.info(`Starting enhanced generation for: ${config.keyword}`);
        contentLogger.info(`Using model: ${this.modelId}`);

        // Pass 0: Select persona and template
        const persona = getBestPersonaForTopic(config.keyword);
        const template = config.templateType
            ? getTemplateById(config.templateType) || PRODUCT_REVIEW_TEMPLATE
            : getBestTemplateForNiche(config.context);

        contentLogger.progress(`Pass 0: Selected persona "${persona.name}" and template "${template.name}"`);

        // Pass 1: Research Phase
        const researchData = await this.researchPhase(config.keyword, template);
        contentLogger.progress(`Pass 1: Research completed`);

        // Pass 2: Outline Generation (template-guided)
        const outline = await this.generateOutline(config, template, researchData);
        contentLogger.progress(`Pass 2: Outline created`);

        // Pass 3: Full Article Generation (with persona voice)
        const article = await this.generateFullArticle(config, template, persona, outline, researchData);
        contentLogger.progress(`Pass 3: Article generated (${article.wordCount} words)`);

        // Pass 4: Quality Enhancement (if needed)
        let finalArticle = article;
        if (article.wordCount < config.targetWordCount * 0.8) {
            contentLogger.warn(`Article too short. Expanding...`);
            finalArticle = await this.expandArticle(article, config, persona);
            contentLogger.progress(`Pass 4: Article expanded (${finalArticle.wordCount} words)`);
        }

        // Pass 5: Post-processing humanization
        finalArticle.body = addHumanTouches(finalArticle.body);
        contentLogger.progress(`Pass 5: Human touches applied`);

        // Pass 6: Add Schema.org structured data for rich snippets
        const schemaScripts = this.generateSchemaMarkup(finalArticle, config, persona);
        if (schemaScripts) {
            finalArticle.body = finalArticle.body + '\n\n' + schemaScripts;
            contentLogger.progress(`Pass 6: Schema.org rich snippets added`);
        }

        return {
            ...finalArticle,
            persona: persona.name,
            template: template.name
        };
    }

    /**
     * Generate Schema.org markup for the article
     * Uses websiteUrl (preferred) or blogUrl (deprecated) for canonical URLs
     */
    private generateSchemaMarkup(
        article: EnhancedArticle,
        config: ArticleConfig,
        persona: AuthorPersona
    ): string {
        const schemas: object[] = [];
        const today = new Date().toISOString().split('T')[0];

        // Prefer websiteUrl, fallback to blogUrl for backwards compatibility
        const siteUrl = config.websiteUrl || config.blogUrl;
        const articleUrl = siteUrl
            ? `${siteUrl}/${article.slug}`
            : `https://example.com/${article.slug}`;

        schemas.push(generateArticleSchema({
            title: article.title,
            description: article.title,
            datePublished: today,
            authorName: persona.name,
            url: articleUrl,
            publisherName: siteUrl ? new URL(siteUrl).hostname : undefined
        }));

        const faqs = this.extractFAQsFromBody(article.body);
        if (faqs.length > 0) {
            schemas.push(generateFAQSchema(faqs));
        }

        return generateSchemaScripts(schemas);
    }

    /**
     * Extract FAQ items from article body for schema generation
     */
    private extractFAQsFromBody(body: string): FAQSchemaItem[] {
        const faqs: FAQSchemaItem[] = [];
        const faqSectionMatch = body.match(/##\s*(?:FAQ|Frequently Asked Questions)[\s\S]*?(?=##|$)/i);

        if (faqSectionMatch) {
            const faqSection = faqSectionMatch[0];
            const questionPattern = /(?:###\s*|\*\*)(.*?(?:\?|\*\*))\n+([^#\*][\s\S]*?)(?=(?:###|\*\*|$))/g;
            let match;

            while ((match = questionPattern.exec(faqSection)) !== null) {
                const question = match[1].replace(/\*\*/g, '').trim();
                const answer = match[2].trim().split('\n')[0];

                if (question && answer && question.length > 10 && answer.length > 20) {
                    faqs.push({ question, answer });
                }
            }
        }

        return faqs.slice(0, 10);
    }

    private async researchPhase(keyword: string, template: ArticleTemplate): Promise<string> {
        const humanKeyword = this.humanizeKeyword(keyword);

        const prompt = `You are a research assistant gathering factual information for a ${template.name} about "${humanKeyword}".

Provide the following in a structured format:

## Real Products/Tools
List 5-7 ACTUAL, EXISTING products or tools related to this topic. For each include:
- Product Name (must be real, not placeholder)
- Key Features (2-3 bullet points)
- Approximate Pricing (monthly/yearly or one-time)
- Official Website URL
- Target User (who it's best for)

## Industry Statistics (2025 Data)
Provide 5-7 relevant, recent statistics about this topic:
- Include the year/source for each stat
- Focus on data that supports purchase decisions
- Include market size, growth rates, or user statistics

## Expert Insights
Share 3-4 actionable insights that industry experts recommend:
- Include the type of expert (what credentials would they have)
- Make these specific and actionable

## Pricing Comparison
Create a quick pricing comparison of the top 3 products:
| Product | Free Tier | Basic Plan | Pro Plan |
| --- | --- | --- | --- |

## Common Questions
List 7 frequently asked questions users have about this topic, focusing on:
- Buying decisions
- Comparisons
- How-to questions
- Value/ROI questions

Be specific, factual, and use ONLY real product names. No placeholders.`;

        return this.generateContent(prompt);
    }

    private async generateOutline(
        config: ArticleConfig,
        template: ArticleTemplate,
        research: string
    ): Promise<string> {
        const humanKeyword = this.humanizeKeyword(config.keyword);

        const sectionInstructions = template.sections.map((section, i) =>
            `${i + 1}. **${section.heading}** (${section.type})\n   - Target: ~${section.targetWordCount} words\n   - Hint: ${section.promptHint}`
        ).join('\n\n');

        const prompt = `Create a detailed article outline for a "${template.name}" about "${humanKeyword}".

CONTEXT: ${config.context}

RESEARCH DATA TO USE:
${research}

TEMPLATE STRUCTURE:
${sectionInstructions}

REQUIREMENTS:
- Total target: ${config.targetWordCount}+ words
- Use REAL products from the research data
- Include specific data points and statistics
- Create compelling subheadings that include keywords naturally

OUTPUT FORMAT:
For each section, provide:
1. The heading (H2)
2. 2-3 subheadings (H3) if applicable
3. Key points to cover
4. Which research data to include
5. Estimated word count`;

        return this.generateContent(prompt);
    }

    private async generateFullArticle(
        config: ArticleConfig,
        template: ArticleTemplate,
        persona: AuthorPersona,
        outline: string,
        research: string
    ): Promise<EnhancedArticle> {
        const today = new Date().toISOString().split('T')[0];
        const humanTitle = this.humanizeTitle(config.keyword);
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const voiceInstructions = generateVoiceInstructions(persona, DEFAULT_VOICE_CONFIG);
        const eeatInstructions = generateEEATInstructions(persona);
        const anecdotePrompt = generateAnecdotePrompt(persona, humanTitle, config.context);

        const prompt = `${voiceInstructions}

${eeatInstructions}

${anecdotePrompt}

---

Now write the full article.

TOPIC: "${humanTitle}"
ARTICLE TYPE: ${template.name}
CONTEXT: ${config.context}

ARTICLE OUTLINE:
${outline}

RESEARCH DATA (use these REAL products and statistics):
${research}

REQUIREMENTS:

1. **Frontmatter** (YAML format):
---
title: "${humanTitle}"
date: "${today}"
description: "[Compelling 150-160 character meta description with keyword]"
author: "${persona.name}"
template: "${template.id}"
---

2. **Content Structure**:
   - Follow the outline sections with proper H2 (##) and H3 (###) headings
   - Include REAL product names from research, NOT placeholders
   - Add comparison tables using Markdown table syntax
   - Include blockquotes for expert insights or key takeaways
   - Add a "Key Takeaways" box before the conclusion

3. **Quality Requirements**:
   - Minimum ${config.targetWordCount} words (aim for more)
   - Use SPECIFIC product names, prices, and features from research
   - Include statistics with year and source context
   - Natural keyword integration (avoid stuffing)
   - Write in ${persona.name}'s authentic voice

4. **Formatting**:
   - Use bullet points for lists
   - **Bold** important terms and product names
   - Use emoji sparingly for visual breaks (✅ ⚠️ 💡)
   - Include "Last Updated: ${currentMonth}" at the bottom

5. **Schema-Friendly Elements**:
${template.schemaTypes.includes('FAQPage') ? '   - FAQ section with proper Q: A: format' : ''}
${template.schemaTypes.includes('HowTo') ? '   - Numbered steps with clear actions' : ''}
${template.schemaTypes.includes('Review') ? '   - Clear rating/score (e.g., 4.5/5 stars)' : ''}

Start directly with --- (no preamble like "Here is the article").`;

        const body = await this.generateContent(prompt);

        const titleMatch = body.match(/^title: "([^"]+)"/m);
        const title = titleMatch ? titleMatch[1] : humanTitle;

        return {
            title,
            body,
            keyword: config.keyword,
            slug: config.keyword,
            wordCount: this.countWords(body),
            generationPasses: 3,
            researchData: research
        };
    }

    private async expandArticle(
        article: EnhancedArticle,
        config: ArticleConfig,
        persona: AuthorPersona
    ): Promise<EnhancedArticle> {
        const prompt = `This article needs to be expanded to at least ${config.targetWordCount} words. Current length: ${article.wordCount} words.

You are writing as ${persona.name}, a ${persona.profession} with ${persona.yearsExperience} years of experience.

CURRENT ARTICLE:
${article.body}

RESEARCH DATA TO USE:
${article.researchData || ''}

EXPANSION INSTRUCTIONS:
1. Add more detailed product descriptions with specific pros/cons
2. Expand examples with specific use cases and scenarios
3. Add a "Common Mistakes to Avoid" section with 5 items
4. Include more expert tips and actionable advice
5. Expand the FAQ section with 3-4 more questions
6. Add more statistics and data points with context
7. Expand the conclusion with a detailed action plan

VOICE REQUIREMENTS:
${persona.voiceTraits.map(t => `- ${t}`).join('\n')}

Keep the existing structure and frontmatter. Return the complete expanded article starting with ---.`;

        const expandedBody = await this.generateContent(prompt);

        return {
            ...article,
            body: expandedBody,
            wordCount: this.countWords(expandedBody),
            generationPasses: 4
        };
    }

    private humanizeKeyword(keyword: string): string {
        return keyword
            .split('-')
            .map(word => {
                const upper = word.toUpperCase();
                const acronyms = ['AI', 'SEO', 'API', 'CPC', 'ROI', 'SAAS', 'B2B', 'B2C', 'UI', 'UX', 'VPN', 'CRM', 'ERP', 'CMS', 'SSL', 'DNS', 'URL', 'HTML', 'CSS', 'JS'];
                if (acronyms.includes(upper)) {
                    return upper;
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    }

    private humanizeTitle(keyword: string): string {
        return this.humanizeKeyword(keyword);
    }

    private countWords(text: string): number {
        return text
            .replace(/---[\s\S]*?---/, '')
            .split(/\s+/)
            .filter(word => word.length > 0)
            .length;
    }
}
