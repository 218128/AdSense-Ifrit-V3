import { getAllArticles } from '@/lib/content';
import Link from 'next/link';
import MainDashboard from '@/components/layout/MainDashboard';

export default function Home() {
  const articles = getAllArticles();

  // Prepare articles for SEO audit
  const articlesForAudit = articles.map(a => ({
    slug: a.slug,
    title: a.title
  }));

  // Check if article is new (less than 24 hours old)
  const isNewArticle = (dateStr: string) => {
    const articleDate = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 px-4 py-8 md:px-8 lg:px-16 font-sans text-neutral-900">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          AdSense Ifrit
        </h1>
        <p className="text-lg text-neutral-600 max-w-xl mx-auto">
          AI-powered content factory for high-revenue monetization
        </p>
      </header>

      {/* Main Dashboard with Factory/Store Tabs */}
      <MainDashboard articles={articlesForAudit} />

      {/* Articles Grid */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Generated Articles</h2>
          <span className="text-sm text-neutral-500">{articles.length} articles</span>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200">
            <p className="text-neutral-500">No articles yet. Use the Factory to generate your first article!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link href={`/${article.slug}`} key={article.slug} className="group block">
                <article className="h-full bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-neutral-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      {isNewArticle(article.date) && (
                        <span className="px-2 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                        Article
                      </span>
                    </div>

                    <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-neutral-600 line-clamp-2 mb-4 text-sm">
                      {article.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>{article.date}</span>
                      <span className="group-hover:translate-x-1 transition-transform">Read →</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 py-6 border-t border-neutral-200 text-center text-neutral-500 text-sm">
        &copy; 2025 AdSense Ifrit. Content Factory + Store System.
      </footer>
    </main>
  );
}
