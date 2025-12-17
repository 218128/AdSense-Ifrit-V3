/**
 * Schema.org Structured Data Generators
 * 
 * Generates JSON-LD schema for SEO benefits:
 * - Article schema
 * - Product/Review schema
 * - FAQPage schema
 * - HowTo schema
 * - BreadcrumbList schema
 */

export interface ArticleSchemaOptions {
    title: string;
    description: string;
    datePublished: string;
    dateModified?: string;
    authorName: string;
    authorUrl?: string;
    imageUrl?: string;
    url: string;
    publisherName?: string;
    publisherLogo?: string;
}

export interface ProductReviewSchemaOptions {
    productName: string;
    productDescription: string;
    rating: number;  // 1-5
    reviewBody: string;
    authorName: string;
    datePublished: string;
    price?: string;
    priceCurrency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    brand?: string;
}

export interface FAQSchemaItem {
    question: string;
    answer: string;
}

export interface HowToStep {
    name: string;
    text: string;
    imageUrl?: string;
}

export interface HowToSchemaOptions {
    name: string;
    description: string;
    totalTime?: string;  // ISO 8601 duration, e.g., "PT30M"
    estimatedCost?: string;
    supply?: string[];
    tool?: string[];
    steps: HowToStep[];
    imageUrl?: string;
}

export interface BreadcrumbItem {
    name: string;
    url: string;
}

/**
 * Generate Article schema (for general articles)
 */
export function generateArticleSchema(options: ArticleSchemaOptions): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: options.title,
        description: options.description,
        datePublished: options.datePublished,
        dateModified: options.dateModified || options.datePublished,
        author: {
            '@type': 'Person',
            name: options.authorName,
            url: options.authorUrl
        },
        publisher: {
            '@type': 'Organization',
            name: options.publisherName || options.authorName,
            logo: options.publisherLogo ? {
                '@type': 'ImageObject',
                url: options.publisherLogo
            } : undefined
        },
        image: options.imageUrl,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': options.url
        }
    };
}

/**
 * Generate Product + Review schema (for product reviews)
 */
export function generateProductReviewSchema(options: ProductReviewSchemaOptions): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: options.productName,
        description: options.productDescription,
        brand: options.brand ? {
            '@type': 'Brand',
            name: options.brand
        } : undefined,
        offers: options.price ? {
            '@type': 'Offer',
            price: options.price,
            priceCurrency: options.priceCurrency || 'USD',
            availability: `https://schema.org/${options.availability || 'InStock'}`
        } : undefined,
        review: {
            '@type': 'Review',
            reviewRating: {
                '@type': 'Rating',
                ratingValue: options.rating,
                bestRating: 5,
                worstRating: 1
            },
            author: {
                '@type': 'Person',
                name: options.authorName
            },
            datePublished: options.datePublished,
            reviewBody: options.reviewBody
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: options.rating,
            bestRating: 5,
            worstRating: 1,
            ratingCount: 1
        }
    };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQSchema(faqs: FAQSchemaItem[]): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    };
}

/**
 * Generate HowTo schema (for tutorials)
 */
export function generateHowToSchema(options: HowToSchemaOptions): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: options.name,
        description: options.description,
        totalTime: options.totalTime,
        estimatedCost: options.estimatedCost ? {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: options.estimatedCost
        } : undefined,
        supply: options.supply?.map(s => ({
            '@type': 'HowToSupply',
            name: s
        })),
        tool: options.tool?.map(t => ({
            '@type': 'HowToTool',
            name: t
        })),
        step: options.steps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.name,
            text: step.text,
            image: step.imageUrl
        })),
        image: options.imageUrl
    };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url
        }))
    };
}

/**
 * Wrap schema object in script tag for HTML embedding
 */
export function wrapSchemaInScriptTag(schema: object): string {
    return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}

/**
 * Generate combined schema for an article with FAQs
 */
export function generateCombinedArticleFAQSchema(
    articleOptions: ArticleSchemaOptions,
    faqs: FAQSchemaItem[]
): object[] {
    return [
        generateArticleSchema(articleOptions),
        generateFAQSchema(faqs)
    ];
}

/**
 * Generate combined schema for a product review with FAQs
 */
export function generateCombinedReviewFAQSchema(
    reviewOptions: ProductReviewSchemaOptions,
    faqs: FAQSchemaItem[]
): object[] {
    return [
        generateProductReviewSchema(reviewOptions),
        generateFAQSchema(faqs)
    ];
}

/**
 * Embed all schemas as script tags
 */
export function generateSchemaScripts(schemas: object[]): string {
    return schemas.map(s => wrapSchemaInScriptTag(s)).join('\n');
}
