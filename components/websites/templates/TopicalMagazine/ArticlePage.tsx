'use client';

/**
 * Topical Magazine Template - Article Page
 * 
 * Clean, readable article layout with magazine-style typography,
 * author team display, and related content.
 */

import React from 'react';
import { AuthorCard, TrustBadges, TrustBadgePresets, AdZone, ArticleCard } from '../shared';
import MagazineLayout from './Layout';

interface Author {
    name: string;
    role: string;
    avatar?: string;
    bio?: string;
}

interface Article {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    author: string;
    date: string;
    image?: string;
}

interface ArticlePageProps {
    siteName: string;
    categories: string[];
    title: string;
    excerpt: string;
    content: string;
    category: string;
    author: Author;
    publishDate: string;
    updateDate?: string;
    readTime: string;
    featuredImage?: string;
    relatedArticles: Article[];
    tags?: string[];
}

export default function MagazineArticlePage({
    siteName,
    categories,
    title,
    excerpt,
    content,
    category,
    author,
    publishDate,
    updateDate,
    readTime,
    featuredImage,
    relatedArticles,
    tags
}: ArticlePageProps) {
    return (
        <MagazineLayout siteName={siteName} categories={categories} currentCategory={category}>
            <article className="max-w-4xl mx-auto">
                {/* Article Header */}
                <header className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <a
                            href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                            className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium hover:bg-rose-200 transition-colors"
                        >
                            {category}
                        </a>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 text-sm">{readTime}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        {title}
                    </h1>

                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        {excerpt}
                    </p>

                    {/* Author Info */}
                    <div className="flex items-center justify-center gap-4">
                        {author.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={author.avatar}
                                alt={author.name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-lg">
                                {author.name.charAt(0)}
                            </div>
                        )}
                        <div className="text-left">
                            <div className="font-semibold text-gray-900">{author.name}</div>
                            <div className="text-sm text-gray-500">
                                {publishDate}
                                {updateDate && ` • Updated ${updateDate}`}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Featured Image */}
                {featuredImage && (
                    <figure className="mb-10 -mx-4 md:mx-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={featuredImage}
                            alt={title}
                            className="w-full rounded-xl object-cover max-h-[500px]"
                        />
                    </figure>
                )}

                {/* Trust Badges */}
                <div className="mb-8">
                    <TrustBadges variant="inline" badges={TrustBadgePresets.standard} />
                </div>

                {/* Article Content */}
                <div
                    className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-rose-600 prose-a:no-underline hover:prose-a:underline mb-10"
                    dangerouslySetInnerHTML={{ __html: formatContent(content) }}
                />

                {/* In-Article Ad */}
                <AdZone id="in-article" className="my-10" />

                {/* Tags */}
                {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-10 pt-6 border-t border-gray-200">
                        <span className="text-gray-500 text-sm">Tags:</span>
                        {tags.map(tag => (
                            <a
                                key={tag}
                                href={`/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                            >
                                {tag}
                            </a>
                        ))}
                    </div>
                )}

                {/* Author Bio */}
                <div className="bg-gray-50 rounded-2xl p-6 mb-10">
                    <AuthorCard
                        author={{
                            name: author.name,
                            role: author.role,
                            bio: author.bio || `${author.name} is a contributor at ${siteName}, covering ${category} topics with expert insights.`,
                            avatar: author.avatar
                        }}
                        variant="full"
                    />
                </div>

                {/* Share Buttons */}
                <div className="flex items-center justify-center gap-4 py-8 border-t border-b border-gray-200 mb-10">
                    <span className="text-gray-500 text-sm">Share this article:</span>
                    <ShareButton platform="twitter" title={title} />
                    <ShareButton platform="facebook" />
                    <ShareButton platform="linkedin" title={title} />
                    <ShareButton platform="copy" />
                </div>
            </article>

            {/* Related Articles */}
            <section className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">You May Also Like</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {relatedArticles.slice(0, 3).map(article => (
                        <ArticleCard
                            key={article.slug}
                            variant="default"
                            {...article}
                        />
                    ))}
                </div>
            </section>

            {/* Bottom Ad */}
            <AdZone id="footer" className="mt-12" />
        </MagazineLayout>
    );
}

// Format markdown content to HTML (simplified)
function formatContent(content: string): string {
    return content
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
}

// Share Button Component
function ShareButton({
    platform,
    title
}: {
    platform: 'twitter' | 'facebook' | 'linkedin' | 'copy';
    title?: string;
}) {
    const icons: Record<string, string> = {
        twitter: '𝕏',
        facebook: 'f',
        linkedin: 'in',
        copy: '📋'
    };

    const colors: Record<string, string> = {
        twitter: 'bg-black text-white',
        facebook: 'bg-blue-600 text-white',
        linkedin: 'bg-blue-700 text-white',
        copy: 'bg-gray-200 text-gray-700'
    };

    const handleClick = () => {
        if (platform === 'copy') {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied!');
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`w-10 h-10 rounded-full ${colors[platform]} flex items-center justify-center font-bold hover:opacity-80 transition-opacity`}
            aria-label={`Share on ${platform}`}
        >
            {icons[platform]}
        </button>
    );
}
