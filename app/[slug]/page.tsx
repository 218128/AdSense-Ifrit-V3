import { Metadata } from 'next';
import { getAllArticles, getArticleBySlug, Article } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

export async function generateStaticParams() {
    const articles = getAllArticles();
    return articles.map((article) => ({
        slug: article.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const article = getArticleBySlug(slug);

    if (!article) {
        return {
            title: 'Article Not Found',
        };
    }

    const articleUrl = `${siteUrl}/${article.slug}`;

    return {
        title: article.title,
        description: article.description,
        openGraph: {
            title: article.title,
            description: article.description,
            type: 'article',
            publishedTime: article.date,
            modifiedTime: article.date,
            url: articleUrl,
            siteName: 'AdSense Ifrit',
            images: [
                {
                    url: `${siteUrl}/og-image.png`,
                    width: 1200,
                    height: 630,
                    alt: article.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.description,
            images: [`${siteUrl}/og-image.png`],
        },
        alternates: {
            canonical: articleUrl,
        },
    };
}

function ArticleSchema({ article }: { article: Article }) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.description,
        "datePublished": article.date,
        "dateModified": article.date,
        "author": {
            "@type": "Person",
            "name": article.author || "AdSense Ifrit",
            "url": siteUrl
        },
        "publisher": {
            "@type": "Organization",
            "name": "AdSense Ifrit",
            "url": siteUrl,
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${siteUrl}/${article.slug}`
        },
        "articleSection": "Technology & Finance",
        "inLanguage": "en-US"
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

function RelatedArticles({ currentSlug }: { currentSlug: string }) {
    const allArticles = getAllArticles();
    const related = allArticles
        .filter(a => a.slug !== currentSlug)
        .slice(0, 2);

    if (related.length === 0) return null;

    return (
        <div className="mt-12 pt-8 border-t border-neutral-200">
            <h3 className="text-lg font-bold mb-4">You might also like...</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {related.map(article => (
                    <Link
                        key={article.slug}
                        href={`/${article.slug}`}
                        className="bg-neutral-50 p-4 rounded-lg border border-neutral-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                    >
                        <h4 className="font-medium text-neutral-800 group-hover:text-blue-600 line-clamp-2">
                            {article.title}
                        </h4>
                        <p className="text-sm text-neutral-500 mt-1">{article.date}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);

    if (!article) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-neutral-800 mb-4">Article Not Found</h1>
                    <Link href="/" className="text-blue-600 hover:text-blue-800">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Article Schema */}
            <ArticleSchema article={article} />

            {/* Navigation / Header */}
            <nav className="border-b border-neutral-100 py-4 px-6 md:px-12 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <Link href="/" className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    AdSense Ifrit
                </Link>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <Link href="/" className="text-blue-600 hover:text-blue-800 mb-8 inline-block">
                    &larr; Back to Trends
                </Link>

                <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
                <div className="flex items-center gap-4 text-neutral-500 mb-8">
                    <time dateTime={article.date}>{article.date}</time>
                    <span className="text-neutral-300">•</span>
                    <span>By {article.author || 'AdSense Ifrit'}</span>
                </div>

                {/* AdSense Top Leaderboard */}
                <div className="w-full h-24 bg-neutral-100 flex items-center justify-center mb-8 border border-neutral-200 rounded-lg">
                    <span className="text-neutral-400 text-sm font-mono">AdSense Leaderboard (728x90)</span>
                </div>

                <article className="prose lg:prose-xl prose-blue max-w-none prose-headings:scroll-mt-20">
                    <ReactMarkdown>{article.content}</ReactMarkdown>
                </article>

                {/* AdSense Bottom Unit */}
                <div className="w-full h-60 bg-neutral-100 flex items-center justify-center mt-12 border border-neutral-200 rounded-lg">
                    <span className="text-neutral-400 text-sm font-mono">AdSense Multiplex (Grid)</span>
                </div>

                {/* Related Content */}
                <RelatedArticles currentSlug={slug} />
            </main>
        </div>
    );
}
