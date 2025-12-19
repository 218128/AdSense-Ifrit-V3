/**
 * Related Articles Component Generator
 * Shows related content based on category/tags
 */

/**
 * Generate Related Articles component
 */
export function generateRelatedArticles(): string {
    return `
// Related Articles Component
import Link from 'next/link';

interface Article {
    slug: string;
    title: string;
    date: string;
    description: string;
    category?: string;
    image?: string;
    featuredImage?: string;
}

function RelatedArticles({ 
    currentSlug, 
    currentCategory, 
    articles,
    limit = 3 
}: { 
    currentSlug: string;
    currentCategory?: string;
    articles: Article[];
    limit?: number;
}) {
    // Filter related articles (same category, excluding current)
    const related = articles
        .filter(a => a.slug !== currentSlug)
        .filter(a => currentCategory ? a.category === currentCategory : true)
        .slice(0, limit);

    if (related.length === 0) return null;

    return (
        <section className="related-articles">
            <h3>Related Articles</h3>
            <div className="related-articles-grid">
                {related.map((article) => (
                    <article key={article.slug} className="related-article-card">
                        {(article.image || article.featuredImage) && (
                            <div className="related-article-image">
                                <img 
                                    src={article.image || article.featuredImage} 
                                    alt={article.title}
                                    loading="lazy"
                                />
                            </div>
                        )}
                        <div className="related-article-content">
                            <h4>
                                <Link href={\`/\${article.slug}\`}>{article.title}</Link>
                            </h4>
                            <span className="related-article-date">{article.date}</span>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}`;
}

/**
 * Generate Related Articles CSS
 */
export function generateRelatedArticlesStyles(): string {
    return `
/* Related Articles */
.related-articles {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--color-border);
}
.related-articles h3 {
    margin-bottom: 1.5rem;
    font-size: 1.25rem;
}
.related-articles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}
.related-article-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-alt);
    border-radius: 0.5rem;
    transition: background 0.2s;
}
.related-article-card:hover {
    background: var(--color-border);
}
.related-article-image {
    width: 80px;
    height: 80px;
    border-radius: 0.5rem;
    overflow: hidden;
    flex-shrink: 0;
}
.related-article-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.related-article-content {
    flex: 1;
    min-width: 0;
}
.related-article-content h4 {
    margin: 0 0 0.5rem;
    font-size: 0.9375rem;
    line-height: 1.4;
}
.related-article-content h4 a {
    color: var(--color-text);
}
.related-article-content h4 a:hover {
    color: var(--color-primary);
}
.related-article-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
}
`;
}
