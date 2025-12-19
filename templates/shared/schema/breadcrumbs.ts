/**
 * Breadcrumb Schema Generator
 * Generates JSON-LD structured data for navigation breadcrumbs
 * https://schema.org/BreadcrumbList
 */

export interface BreadcrumbConfig {
    siteUrl: string;
    siteName: string;
}

/**
 * Generate Breadcrumb JSON-LD schema component
 */
export function generateBreadcrumbSchema(config: BreadcrumbConfig): string {
    const { siteUrl, siteName } = config;

    return `
// Breadcrumb JSON-LD Schema Component
function BreadcrumbSchema({ 
    items 
}: { 
    items: Array<{ name: string; url: string }> 
}) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
        }))
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
 * Generate inline breadcrumb schema for articles
 */
export function generateArticleBreadcrumbSchema(config: BreadcrumbConfig): string {
    const { siteUrl, siteName } = config;

    return `{/* Breadcrumb Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            {
                                "@type": "ListItem",
                                "position": 1,
                                "name": "${siteName}",
                                "item": "${siteUrl}"
                            },
                            {
                                "@type": "ListItem",
                                "position": 2,
                                "name": "Articles",
                                "item": "${siteUrl}/articles"
                            },
                            {
                                "@type": "ListItem",
                                "position": 3,
                                "name": article.title,
                                "item": \`${siteUrl}/\${article.slug}\`
                            }
                        ]
                    })
                }}
            />`;
}

/**
 * Generate visual breadcrumb navigation component
 */
export function generateBreadcrumbNav(): string {
    return `
// Visual Breadcrumb Navigation
function Breadcrumbs({ items }: { items: Array<{ name: string; href: string }> }) {
    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol>
                {items.map((item, index) => (
                    <li key={item.href}>
                        {index < items.length - 1 ? (
                            <>
                                <a href={item.href}>{item.name}</a>
                                <span className="breadcrumb-separator">/</span>
                            </>
                        ) : (
                            <span aria-current="page">{item.name}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}`;
}

/**
 * Generate CSS for breadcrumbs
 */
export function generateBreadcrumbStyles(): string {
    return `
/* Breadcrumbs */
.breadcrumbs {
    padding: 1rem 0;
    font-size: 0.875rem;
}
.breadcrumbs ol {
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0.5rem;
}
.breadcrumbs li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.breadcrumbs a {
    color: var(--color-text-muted);
}
.breadcrumbs a:hover {
    color: var(--color-primary);
}
.breadcrumb-separator {
    color: var(--color-border);
}
.breadcrumbs [aria-current="page"] {
    color: var(--color-text);
    font-weight: 500;
}
`;
}
