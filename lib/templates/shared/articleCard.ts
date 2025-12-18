/**
 * Shared Article Card Component Generator
 * Used in homepage grids across all templates
 */

export interface ArticleCardConfig {
    showImage?: boolean;
    showCategory?: boolean;
    showDate?: boolean;
    showDescription?: boolean;
}

export function generateArticleCard(config: ArticleCardConfig = {}): string {
    const {
        showImage = true,
        showCategory = true,
        showDate = true,
        showDescription = true
    } = config;

    const imageBlock = showImage ? `
                                <div className="article-card-image">
                                    {article.image || article.featuredImage ? (
                                        <img 
                                            src={article.image || article.featuredImage} 
                                            alt={article.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="article-card-placeholder">📄</div>
                                    )}
                                </div>` : '';

    const categoryBlock = showCategory ? `
                                    <span className="article-card-category">{article.category || 'Article'}</span>` : '';

    const descriptionBlock = showDescription ? `
                                    <p className="article-card-excerpt">
                                        {article.description || 'Read this article to learn more...'}
                                    </p>` : '';

    const dateBlock = showDate ? `
                                    <div className="article-card-meta">
                                        <span>{article.date}</span>
                                        {article.readingTime && <span>• {article.readingTime} min read</span>}
                                    </div>` : '';

    return `<article key={article.slug} className="article-card">
                                ${imageBlock}
                                <div className="article-card-content">
                                    ${categoryBlock}
                                    <h3>
                                        <Link href={\`/\${article.slug}\`}>{article.title}</Link>
                                    </h3>
                                    ${descriptionBlock}
                                    ${dateBlock}
                                </div>
                            </article>`;
}

/**
 * Generate CSS for article cards
 */
export function generateArticleCardStyles(): string {
    return `
/* Article Cards */
.article-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: all 0.3s;
}
.article-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    transform: translateY(-4px);
}
.article-card-image {
    aspect-ratio: 16/9;
    background: var(--color-bg-alt);
    overflow: hidden;
}
.article-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
}
.article-card:hover .article-card-image img {
    transform: scale(1.05);
}
.article-card-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: var(--color-text-muted);
}
.article-card-content {
    padding: 1.5rem;
}
.article-card-category {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-primary);
    margin-bottom: 0.5rem;
}
.article-card h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    line-height: 1.4;
}
.article-card h3 a {
    color: var(--color-text);
}
.article-card h3 a:hover {
    color: var(--color-primary);
}
.article-card-excerpt {
    color: var(--color-text-muted);
    font-size: 0.9375rem;
    margin-bottom: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.article-card-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-muted);
}
`;
}
