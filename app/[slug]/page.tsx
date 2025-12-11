import { getAllArticles, getArticleBySlug } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export async function generateStaticParams() {
    const articles = getAllArticles();
    return articles.map((article) => ({
        slug: article.slug,
    }));
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
    const article = getArticleBySlug(params.slug);

    if (!article) {
        return <div className="p-10 text-center">Article not found</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation / Header */}
            <nav className="border-b border-neutral-100 py-4 px-6 md:px-12 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <Link href="/" className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    AdSense Ifrit
                </Link>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <Link href="/" className="text-blue-600 hover:text-blue-800 mb-8 inline-block">&larr; Back to Trends</Link>

                {/* JSON-LD Schema Injection */}
                {article.schema && (
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: article.schema }}
                    />
                )}

                <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
                <div className="text-neutral-500 mb-8">{article.date}</div>

                {/* AdSense Top Leaderboard Placeholder */}
                <div className="w-full h-24 bg-neutral-100 flex items-center justify-center mb-8 border border-neutral-200 rounded-lg">
                    <span className="text-neutral-400 text-sm font-mono">AdSense Leaderboard (728x90)</span>
                </div>

                <article className="prose lg:prose-xl prose-blue max-w-none">
                    <ReactMarkdown>{article.content}</ReactMarkdown>
                </article>

                {/* AdSense Bottom Unit Placeholder */}
                <div className="w-full h-60 bg-neutral-100 flex items-center justify-center mt-12 border border-neutral-200 rounded-lg">
                    <span className="text-neutral-400 text-sm font-mono">AdSense Multiplex (Grid)</span>
                </div>

                {/* Related Content Placeholder */}
                <div className="mt-12 pt-8 border-t border-neutral-200">
                    <h3 className="text-lg font-bold mb-4">You might also like...</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100 h-24"></div>
                        <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100 h-24"></div>
                    </div>
                </div>
            </main>
        </div>
    );
}
