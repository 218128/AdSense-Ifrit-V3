/**
 * SEO Head Component Generator
 * Generates meta tags for OpenGraph, Twitter Cards, and basic SEO
 */

export interface SEOConfig {
    siteName: string;
    siteUrl: string;
    defaultDescription?: string;
    twitterHandle?: string;
    locale?: string;
}

/**
 * Generate metadata export for Next.js app router
 * This goes in the page component's generateMetadata function
 */
export function generateSEOMetadata(config: SEOConfig): string {
    const { siteName, siteUrl, defaultDescription = '', twitterHandle = '', locale = 'en_US' } = config;

    return `
// Enhanced SEO metadata generator
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    
    if (!article) {
        return {
            title: 'Article Not Found',
            description: 'The article you are looking for does not exist.'
        };
    }

    const url = \`${siteUrl}/\${slug}\`;
    const imageUrl = article.image || article.featuredImage || \`${siteUrl}/og-default.png\`;

    return {
        title: article.title,
        description: article.description || '${defaultDescription}',
        
        // OpenGraph
        openGraph: {
            title: article.title,
            description: article.description || '${defaultDescription}',
            url,
            siteName: '${siteName}',
            locale: '${locale}',
            type: 'article',
            publishedTime: article.date,
            authors: [article.author || '${siteName}'],
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: article.title
                }
            ]
        },
        
        // Twitter Cards
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.description || '${defaultDescription}',
            ${twitterHandle ? `site: '${twitterHandle}',` : ''}
            images: [imageUrl]
        },
        
        // Canonical URL
        alternates: {
            canonical: url
        }
    };
}`;
}

/**
 * Generate homepage SEO metadata
 */
export function generateHomepageSEO(config: SEOConfig): string {
    const { siteName, siteUrl, defaultDescription = '' } = config;

    return `export const metadata = {
    title: '${siteName}',
    description: '${defaultDescription}',
    
    openGraph: {
        title: '${siteName}',
        description: '${defaultDescription}',
        url: '${siteUrl}',
        siteName: '${siteName}',
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '${siteUrl}/og-default.png',
                width: 1200,
                height: 630,
                alt: '${siteName}'
            }
        ]
    },
    
    twitter: {
        card: 'summary_large_image',
        title: '${siteName}',
        description: '${defaultDescription}'
    }
};`;
}
