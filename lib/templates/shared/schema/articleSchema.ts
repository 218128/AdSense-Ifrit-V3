/**
 * Article Schema Generator
 * Generates JSON-LD structured data for articles
 * https://schema.org/Article
 */

export interface ArticleSchemaConfig {
    siteName: string;
    siteUrl: string;
    authorName: string;
    authorUrl?: string;
    publisherLogo?: string;
}

/**
 * Generate Article JSON-LD schema component
 */
export function generateArticleSchema(config: ArticleSchemaConfig): string {
    const { siteName, siteUrl, authorName, authorUrl = '', publisherLogo = '' } = config;

    return `
// Article JSON-LD Schema Component
function ArticleSchema({ article }: { article: { 
    title: string; 
    description: string; 
    date: string; 
    slug: string;
    image?: string;
    featuredImage?: string;
    modifiedDate?: string;
} }) {
    const articleUrl = \`${siteUrl}/\${article.slug}\`;
    const imageUrl = article.image || article.featuredImage || \`${siteUrl}/og-default.png\`;
    
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.description,
        "image": imageUrl,
        "datePublished": article.date,
        "dateModified": article.modifiedDate || article.date,
        "url": articleUrl,
        "author": {
            "@type": "Person",
            "name": "${authorName}"${authorUrl ? `,
            "url": "${authorUrl}"` : ''}
        },
        "publisher": {
            "@type": "Organization",
            "name": "${siteName}",
            "url": "${siteUrl}"${publisherLogo ? `,
            "logo": {
                "@type": "ImageObject",
                "url": "${publisherLogo}"
            }` : ''}
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": articleUrl
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}`;
}

/**
 * Generate inline article schema (for embedding in page)
 */
export function generateInlineArticleSchema(): string {
    return `{/* Article Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": article.title,
                        "description": article.description,
                        "datePublished": article.date,
                        "author": {
                            "@type": "Person",
                            "name": article.author || "Editorial Team"
                        }
                    })
                }}
            />`;
}
