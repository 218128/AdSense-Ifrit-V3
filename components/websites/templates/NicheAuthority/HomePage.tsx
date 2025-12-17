/**
 * Niche Authority Blog - Home Page
 * 
 * Homepage with hero, featured article, article grid, and in-feed ads.
 */

import React from 'react';
import ArticleCard, { ArticlePreview } from '../shared/ArticleCard';
import { AdZones } from '../shared/AdZone';
import TrustBadges from '../shared/TrustBadges';

interface HomePageProps {
    siteName: string;
    siteTagline: string;
    niche: string;
    featuredArticle?: ArticlePreview;
    articles: ArticlePreview[];
    pillars?: { title: string; slug: string; description: string }[];
    primaryColor?: string;
}

export default function HomePage({
    siteName,
    siteTagline,
    niche,
    featuredArticle,
    articles,
    pillars = [],
    primaryColor = '#2563eb'
}: HomePageProps) {
    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="text-center py-8 bg-gradient-to-br from-blue-50 to-indigo-50 -mx-4 px-4 rounded-2xl">
                <h1
                    className="text-4xl md:text-5xl font-bold mb-3"
                    style={{ color: primaryColor }}
                >
                    {siteName}
                </h1>
                <p className="text-xl text-gray-600 mb-4">{siteTagline}</p>
                <p className="text-gray-500 max-w-2xl mx-auto">
                    Your trusted source for expert reviews, guides, and recommendations in {niche}.
                </p>

                {/* Trust Badges */}
                <div className="mt-6 flex justify-center">
                    <TrustBadges
                        badges={[
                            { type: 'expert-reviewed' },
                            { type: 'fact-checked' }
                        ]}
                        variant="inline"
                    />
                </div>
            </section>

            {/* Featured Article */}
            {featuredArticle && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Featured</h2>
                    </div>
                    <ArticleCard
                        article={featuredArticle}
                        variant="featured"
                        primaryColor={primaryColor}
                    />
                </section>
            )}

            {/* Ad Zone - Above Content */}
            <AdZones.AboveFold />

            {/* Pillar Topics */}
            {pillars.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore Topics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pillars.map((pillar, idx) => (
                            <a
                                key={idx}
                                href={`/${pillar.slug}`}
                                className="group block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                            >
                                <h3
                                    className="text-lg font-semibold group-hover:text-blue-600 transition-colors"
                                    style={{ color: primaryColor }}
                                >
                                    {pillar.title}
                                </h3>
                                <p className="text-gray-600 mt-2 text-sm">{pillar.description}</p>
                                <span className="inline-block mt-3 text-sm font-medium text-blue-600 group-hover:underline">
                                    Read Guide →
                                </span>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Articles Grid */}
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Latest Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.slice(0, 6).map((article, idx) => (
                        <React.Fragment key={article.slug}>
                            <ArticleCard
                                article={article}
                                primaryColor={primaryColor}
                            />

                            {/* In-Feed Ad after 3rd article */}
                            {idx === 2 && (
                                <div className="md:col-span-2 lg:col-span-3">
                                    <AdZones.InFeed />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Load More */}
                {articles.length > 6 && (
                    <div className="text-center mt-8">
                        <a
                            href="/articles"
                            className="inline-block px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                        >
                            View All Articles
                        </a>
                    </div>
                )}
            </section>
        </div>
    );
}
