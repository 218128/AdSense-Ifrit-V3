'use client';

/**
 * Topical Magazine Template - Home Page
 * 
 * Magazine-style homepage with featured story, category sections,
 * and trending articles grid.
 */

 

import React from 'react';
import { ArticleCard, AdZone } from '../shared';
import MagazineLayout from './Layout';

interface Article {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    author: string;
    date: string;
    image?: string;
    readTime?: string;
}

interface HomePageProps {
    siteName: string;
    siteTagline: string;
    categories: string[];
    featuredArticle: Article;
    trendingArticles: Article[];
    latestArticles: Article[];
    categoryArticles: { [category: string]: Article[] };
}

export default function MagazineHomePage({
    siteName,
    siteTagline,
    categories,
    featuredArticle,
    trendingArticles,
    latestArticles,
    categoryArticles
}: HomePageProps) {
    return (
        <MagazineLayout siteName={siteName} siteTagline={siteTagline} categories={categories}>
            {/* Featured Story */}
            <section className="mb-10">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-rose-600 to-pink-600 text-white">
                    <div className="absolute inset-0 bg-black/30"></div>
                    {featuredArticle.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={featuredArticle.image}
                            alt={featuredArticle.title}
                            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                        />
                    )}
                    <div className="relative p-8 md:p-12 min-h-[400px] flex flex-col justify-end">
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm mb-4 w-fit">
                            📌 Featured Story
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold mb-4 max-w-3xl">
                            {featuredArticle.title}
                        </h1>
                        <p className="text-lg text-white/90 mb-6 max-w-2xl">
                            {featuredArticle.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-white/80">
                            <span>By {featuredArticle.author}</span>
                            <span>•</span>
                            <span>{featuredArticle.date}</span>
                            {featuredArticle.readTime && (
                                <>
                                    <span>•</span>
                                    <span>{featuredArticle.readTime}</span>
                                </>
                            )}
                        </div>
                        <a
                            href={`/${featuredArticle.slug}`}
                            className="mt-6 inline-block px-6 py-3 bg-white text-rose-600 rounded-lg font-semibold hover:bg-rose-50 transition-colors w-fit"
                        >
                            Read Full Story →
                        </a>
                    </div>
                </div>
            </section>

            {/* Trending Section */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        🔥 Trending Now
                    </h2>
                    <a href="/trending" className="text-rose-600 hover:text-rose-700 text-sm font-medium">
                        View All →
                    </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trendingArticles.slice(0, 4).map((article, idx) => (
                        <TrendingCard key={article.slug} article={article} rank={idx + 1} />
                    ))}
                </div>
            </section>

            {/* Ad Zone */}
            <AdZone id="in-content" className="mb-10" />

            {/* Latest Articles */}
            <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">📰 Latest Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {latestArticles.slice(0, 6).map(article => (
                        <ArticleCard
                            key={article.slug}
                            variant="default"
                            {...article}
                        />
                    ))}
                </div>
            </section>

            {/* Category Sections */}
            {Object.entries(categoryArticles).slice(0, 3).map(([category, articles]) => (
                <section key={category} className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">{category}</h2>
                        <a
                            href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                            className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                        >
                            More in {category} →
                        </a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {articles.slice(0, 3).map(article => (
                            <ArticleCard
                                key={article.slug}
                                variant="compact"
                                {...article}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </MagazineLayout>
    );
}

// Trending Card with Rank
function TrendingCard({ article, rank }: { article: Article; rank: number }) {
    return (
        <a
            href={`/${article.slug}`}
            className="group bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all"
        >
            <div className="flex items-start gap-3">
                <span className="text-3xl font-bold text-rose-200 group-hover:text-rose-400 transition-colors">
                    {rank.toString().padStart(2, '0')}
                </span>
                <div>
                    <span className="text-xs text-rose-600 font-medium">{article.category}</span>
                    <h3 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-2 mt-1">
                        {article.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">{article.date}</p>
                </div>
            </div>
        </a>
    );
}
