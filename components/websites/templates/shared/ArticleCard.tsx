/**
 * ArticleCard Component
 * 
 * Preview card for articles in grids and lists.
 * Shows thumbnail, title, excerpt, author, and date.
 */

import React from 'react';
import { Author } from './AuthorCard';

export interface ArticlePreview {
    title: string;
    slug: string;
    excerpt: string;
    thumbnail?: string;
    category?: string;
    author?: Author;
    publishedAt: string;
    readTime?: string;
}

// Support both object pattern and spread pattern
interface ArticleCardPropsWithObject {
    article: ArticlePreview;
    variant?: 'default' | 'featured' | 'horizontal' | 'compact';
    showAuthor?: boolean;
    showExcerpt?: boolean;
    primaryColor?: string;
    className?: string;
}

interface ArticleCardPropsSpread {
    title: string;
    slug: string;
    excerpt: string;
    thumbnail?: string;
    category?: string;
    author?: string;
    date?: string;
    image?: string;
    readTime?: string;
    variant?: 'default' | 'featured' | 'horizontal' | 'compact';
    showAuthor?: boolean;
    showExcerpt?: boolean;
    primaryColor?: string;
    className?: string;
}

type ArticleCardProps = ArticleCardPropsWithObject | ArticleCardPropsSpread;

function isObjectProps(props: ArticleCardProps): props is ArticleCardPropsWithObject {
    return 'article' in props && props.article !== undefined;
}

export default function ArticleCard(props: ArticleCardProps) {
    // Normalize props - support both patterns
    const {
        variant = 'default',
        showAuthor = true,
        showExcerpt = true,
        primaryColor = '#2563eb',
        className = ''
    } = props;

    // Extract article data from either pattern
    let title: string, slug: string, excerpt: string, thumbnail: string | undefined,
        category: string | undefined, author: Author | undefined, publishedAt: string, readTime: string | undefined;

    if (isObjectProps(props)) {
        ({ title, slug, excerpt, thumbnail, category, author, publishedAt, readTime } = props.article);
    } else {
        title = props.title;
        slug = props.slug;
        excerpt = props.excerpt;
        thumbnail = props.thumbnail || props.image;
        category = props.category;
        publishedAt = props.date || '';
        readTime = props.readTime;
        // Convert string author to Author object if provided
        author = props.author ? { name: props.author, role: 'Author', bio: '' } : undefined;
    }

    const authorInitials = author?.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase() || '';

    // Featured variant - large hero card
    if (variant === 'featured') {
        return (
            <a
                href={`/${slug}`}
                className={`group block relative overflow-hidden rounded-2xl aspect-[16/9] bg-gray-900 ${className}`}
            >
                {thumbnail && (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    {category && (
                        <span
                            className="inline-block px-3 py-1 text-xs font-medium rounded-full mb-3"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {category}
                        </span>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 group-hover:underline">
                        {title}
                    </h2>
                    {showExcerpt && (
                        <p className="text-gray-300 line-clamp-2 mb-3">{excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        {showAuthor && author && (
                            <>
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">
                                    {author.avatar ? (
                                        <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full" />
                                    ) : authorInitials}
                                </div>
                                <span>{author.name}</span>
                                <span>•</span>
                            </>
                        )}
                        <span>{publishedAt}</span>
                        {readTime && (
                            <>
                                <span>•</span>
                                <span>{readTime}</span>
                            </>
                        )}
                    </div>
                </div>
            </a>
        );
    }

    // Horizontal variant
    if (variant === 'horizontal') {
        return (
            <a
                href={`/${slug}`}
                className={`group flex gap-4 ${className}`}
            >
                <div className="w-1/3 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {thumbnail ? (
                        <img
                            src={thumbnail}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            📄
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    {category && (
                        <span
                            className="text-xs font-medium"
                            style={{ color: primaryColor }}
                        >
                            {category}
                        </span>
                    )}
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 mt-1">
                        {title}
                    </h3>
                    {showExcerpt && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{excerpt}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                        {publishedAt} {readTime && `• ${readTime}`}
                    </div>
                </div>
            </a>
        );
    }

    // Compact variant
    if (variant === 'compact') {
        return (
            <a
                href={`/${slug}`}
                className={`group flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 ${className}`}
            >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {thumbnail ? (
                        <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                            📄
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600 line-clamp-2">
                        {title}
                    </h4>
                    <div className="text-xs text-gray-500 mt-1">{publishedAt}</div>
                </div>
            </a>
        );
    }

    // Default variant - vertical card
    return (
        <a
            href={`/${slug}`}
            className={`group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}
        >
            <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                        📄
                    </div>
                )}
            </div>
            <div className="p-4">
                {category && (
                    <span
                        className="text-xs font-medium"
                        style={{ color: primaryColor }}
                    >
                        {category}
                    </span>
                )}
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 mt-1">
                    {title}
                </h3>
                {showExcerpt && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">{excerpt}</p>
                )}
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                    {showAuthor && author && (
                        <>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs">
                                {author.avatar ? (
                                    <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full" />
                                ) : authorInitials[0]}
                            </div>
                            <span className="font-medium text-gray-700">{author.name}</span>
                            <span>•</span>
                        </>
                    )}
                    <span>{publishedAt}</span>
                </div>
            </div>
        </a>
    );
}
