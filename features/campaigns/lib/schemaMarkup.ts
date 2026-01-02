/**
 * Schema Markup Generator
 * FSD: features/campaigns/lib/schemaMarkup.ts
 * 
 * Generate structured data for SEO (Article, FAQ, HowTo).
 */

// ============================================================================
// Types
// ============================================================================

export interface ArticleSchema {
    '@context': 'https://schema.org';
    '@type': 'Article' | 'BlogPosting' | 'NewsArticle';
    headline: string;
    description: string;
    image?: string;
    author: { '@type': 'Person' | 'Organization'; name: string };
    publisher: { '@type': 'Organization'; name: string; logo?: { '@type': 'ImageObject'; url: string } };
    datePublished: string;
    dateModified?: string;
}

export interface FAQSchema {
    '@context': 'https://schema.org';
    '@type': 'FAQPage';
    mainEntity: Array<{
        '@type': 'Question';
        name: string;
        acceptedAnswer: { '@type': 'Answer'; text: string };
    }>;
}

export interface HowToSchema {
    '@context': 'https://schema.org';
    '@type': 'HowTo';
    name: string;
    description: string;
    step: Array<{
        '@type': 'HowToStep';
        name: string;
        text: string;
        image?: string;
    }>;
    totalTime?: string;
}

// ============================================================================
// Article Schema
// ============================================================================

/**
 * Generate Article schema markup
 */
export function generateArticleSchema(
    title: string,
    description: string,
    options: {
        imageUrl?: string;
        authorName?: string;
        publisherName?: string;
        publisherLogoUrl?: string;
        datePublished?: string;
        articleType?: 'Article' | 'BlogPosting' | 'NewsArticle';
    } = {}
): ArticleSchema {
    return {
        '@context': 'https://schema.org',
        '@type': options.articleType || 'BlogPosting',
        headline: title.slice(0, 110), // Google limit
        description: description.slice(0, 200),
        image: options.imageUrl,
        author: {
            '@type': 'Person',
            name: options.authorName || 'Content Team',
        },
        publisher: {
            '@type': 'Organization',
            name: options.publisherName || 'Publisher',
            logo: options.publisherLogoUrl ? {
                '@type': 'ImageObject',
                url: options.publisherLogoUrl,
            } : undefined,
        },
        datePublished: options.datePublished || new Date().toISOString(),
    };
}

// ============================================================================
// FAQ Schema
// ============================================================================

/**
 * Extract FAQ items from content and generate schema
 */
export function generateFAQSchema(content: string): FAQSchema | null {
    const faqItems = extractFAQFromContent(content);

    if (faqItems.length === 0) return null;

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };
}

/**
 * Extract Q&A pairs from content
 */
function extractFAQFromContent(content: string): Array<{ question: string; answer: string }> {
    const faqs: Array<{ question: string; answer: string }> = [];

    // Look for FAQ section
    const faqSection = content.match(/(<h2[^>]*>.*?FAQ.*?<\/h2>)([\s\S]*?)(<h2|$)/i);
    if (!faqSection) return faqs;

    const faqContent = faqSection[2];

    // Pattern 1: H3 questions with paragraph answers
    const h3Pattern = /<h3[^>]*>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>/gi;
    let match;
    while ((match = h3Pattern.exec(faqContent)) !== null) {
        faqs.push({
            question: match[1].trim(),
            answer: match[2].trim(),
        });
    }

    // Pattern 2: Strong questions with text answers
    if (faqs.length === 0) {
        const strongPattern = /<strong>([^<]+\?)<\/strong>\s*([^<]+)/gi;
        while ((match = strongPattern.exec(faqContent)) !== null) {
            faqs.push({
                question: match[1].trim(),
                answer: match[2].trim(),
            });
        }
    }

    return faqs.slice(0, 10); // Limit to 10
}

// ============================================================================
// HowTo Schema
// ============================================================================

/**
 * Generate HowTo schema from content
 */
export function generateHowToSchema(
    title: string,
    content: string
): HowToSchema | null {
    const steps = extractStepsFromContent(content);

    if (steps.length < 2) return null;

    // Extract description from intro
    const introMatch = content.match(/<p>([^<]{50,300})<\/p>/);
    const description = introMatch?.[1] || title;

    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: title,
        description: description.slice(0, 250),
        step: steps.map((step, idx) => ({
            '@type': 'HowToStep',
            name: `Step ${idx + 1}`,
            text: step,
        })),
    };
}

/**
 * Extract steps from how-to content
 */
function extractStepsFromContent(content: string): string[] {
    const steps: string[] = [];

    // Pattern 1: Ordered list items
    const olMatch = content.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (olMatch) {
        const liPattern = /<li[^>]*>([^<]+)/gi;
        let match;
        while ((match = liPattern.exec(olMatch[1])) !== null) {
            steps.push(match[1].trim());
        }
    }

    // Pattern 2: Numbered H3 headings
    if (steps.length === 0) {
        const h3Pattern = /<h3[^>]*>(?:Step\s*)?(\d+)[.:]\s*([^<]+)<\/h3>/gi;
        let match;
        while ((match = h3Pattern.exec(content)) !== null) {
            steps.push(match[2].trim());
        }
    }

    return steps.slice(0, 20); // Limit to 20 steps
}

// ============================================================================
// Combined Schema
// ============================================================================

/**
 * Generate all applicable schemas for content
 */
export function generateAllSchemas(
    title: string,
    description: string,
    content: string,
    options: {
        imageUrl?: string;
        authorName?: string;
        publisherName?: string;
        articleType?: 'Article' | 'BlogPosting' | 'NewsArticle';
    } = {}
): string {
    const schemas: object[] = [];

    // Always add Article schema
    schemas.push(generateArticleSchema(title, description, options));

    // Add FAQ if present
    const faqSchema = generateFAQSchema(content);
    if (faqSchema) schemas.push(faqSchema);

    // Add HowTo if applicable
    if (title.toLowerCase().includes('how to') || content.includes('<ol>')) {
        const howToSchema = generateHowToSchema(title, content);
        if (howToSchema) schemas.push(howToSchema);
    }

    // Return as script tags
    return schemas
        .map(schema =>
            `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`
        )
        .join('\n');
}
