/**
 * Niche Authority Blog - Article Page
 * 
 * Article display with author byline, trust badges, ToC, and ad zones.
 */

import React from 'react';
import { AuthorByline, Author } from '../shared/AuthorCard';
import TrustBadges from '../shared/TrustBadges';
import { AdZones } from '../shared/AdZone';
import ArticleCard, { ArticlePreview } from '../shared/ArticleCard';

interface ArticlePageProps {
    title: string;
    content: string;
    author: Author;
    publishedAt: string;
    updatedAt?: string;
    readTime?: string;
    category?: string;
    thumbnail?: string;
    relatedArticles?: ArticlePreview[];
    primaryColor?: string;
}

export default function ArticlePage({
    title,
    content,
    author,
    publishedAt,
    updatedAt,
    readTime,
    category,
    thumbnail,
    relatedArticles = [],
    primaryColor = '#2563eb'
}: ArticlePageProps) {
    return (
        <article className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Thumbnail */}
            {thumbnail && (
                <div className="aspect-[21/9] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <div className="p-6 md:p-8">
                {/* Category */}
                {category && (
                    <a
                        href={`/category/${category.toLowerCase()}`}
                        className="inline-block text-sm font-medium mb-3"
                        style={{ color: primaryColor }}
                    >
                        {category}
                    </a>
                )}

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {title}
                </h1>

                {/* Trust Badges */}
                <TrustBadges
                    badges={[
                        { type: 'expert-reviewed' },
                        { type: 'fact-checked' },
                        ...(updatedAt ? [{ type: 'updated' as const, date: updatedAt }] : [])
                    ]}
                    variant="inline"
                    className="mb-4"
                />

                {/* Author Byline */}
                <AuthorByline
                    author={author}
                    date={publishedAt}
                    readTime={readTime}
                />

                {/* Ad Zone - Above Content */}
                <div className="my-6">
                    <AdZones.AboveFold />
                </div>

                {/* Article Content */}
                <div
                    className="prose prose-lg max-w-none
                               prose-headings:text-gray-900 prose-headings:font-bold
                               prose-p:text-gray-700 prose-p:leading-relaxed
                               prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                               prose-img:rounded-lg prose-img:shadow-md
                               prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4
                               prose-ul:list-disc prose-ol:list-decimal
                               prose-li:text-gray-700"
                    dangerouslySetInnerHTML={{ __html: content }}
                />

                {/* In-Article Ad */}
                <div className="my-8">
                    <AdZones.InArticle />
                </div>

                {/* Author Box */}
                <div className="mt-8 p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                            {author.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
                            ) : author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 text-lg">
                                Written by {author.name}
                            </div>
                            <div className="text-gray-600 text-sm">{author.role}</div>
                            <p className="text-gray-700 mt-2">{author.bio}</p>
                            {author.credentials && author.credentials.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {author.credentials.map((cred, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                        >
                                            ✓ {cred}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Related Articles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {relatedArticles.slice(0, 4).map(article => (
                                <ArticleCard
                                    key={article.slug}
                                    article={article}
                                    variant="horizontal"
                                    primaryColor={primaryColor}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}
