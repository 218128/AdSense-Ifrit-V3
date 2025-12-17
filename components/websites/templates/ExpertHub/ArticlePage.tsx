'use client';

/**
 * Expert Resource Hub Template - Article Page
 * 
 * Authoritative article layout with prominent author credentials,
 * table of contents, disclaimers, and expert-level formatting.
 */

import React, { useState, useEffect } from 'react';
import { AuthorCard, TrustBadges, TrustBadgePresets, AdZone, ArticleCard } from '../shared';
import ExpertLayout from './Layout';

interface Expert {
    name: string;
    role: string;
    credentials: string;
    avatar?: string;
    bio: string;
}

interface Article {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    author: string;
    date: string;
}

interface TOCItem {
    id: string;
    title: string;
    level: number;
}

interface ArticlePageProps {
    siteName: string;
    navItems: { label: string; href: string }[];
    title: string;
    excerpt: string;
    content: string;
    category: string;
    author: Expert;
    reviewer?: Expert;
    publishDate: string;
    updateDate?: string;
    readTime: string;
    sources?: { title: string; url: string }[];
    relatedArticles: Article[];
    disclaimer?: string;
}

export default function ExpertArticlePage({
    siteName,
    navItems,
    title,
    excerpt,
    content,
    category,
    author,
    reviewer,
    publishDate,
    updateDate,
    readTime,
    sources,
    relatedArticles,
    disclaimer
}: ArticlePageProps) {
    const [tocItems, setTocItems] = useState<TOCItem[]>([]);
    const [activeSection, setActiveSection] = useState('');

    // Extract TOC from content
    useEffect(() => {
        const headings = content.match(/^##\s+(.+)$/gm) || [];
        const items = headings.map((heading, idx) => ({
            id: `section-${idx}`,
            title: heading.replace(/^##\s+/, ''),
            level: 2
        }));
        setTocItems(items);
    }, [content]);

    return (
        <ExpertLayout siteName={siteName} navItems={navItems}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar - TOC */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="sticky top-24 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <h3 className="font-semibold text-slate-900 mb-4">📋 Table of Contents</h3>
                            <nav className="space-y-2">
                                {tocItems.map(item => (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className={`block text-sm py-1 border-l-2 pl-3 transition-colors ${activeSection === item.id
                                            ? 'border-emerald-500 text-emerald-600'
                                            : 'border-slate-200 text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        {item.title}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <article className="flex-1 max-w-3xl">
                        {/* Breadcrumb */}
                        <nav className="text-sm text-slate-500 mb-6">
                            <a href="/" className="hover:text-slate-700">Home</a>
                            <span className="mx-2">›</span>
                            <a href={`/category/${category.toLowerCase()}`} className="hover:text-slate-700">{category}</a>
                            <span className="mx-2">›</span>
                            <span className="text-slate-700">{title}</span>
                        </nav>

                        {/* Article Header */}
                        <header className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                    {category}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500 text-sm">{readTime}</span>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                                {title}
                            </h1>

                            <p className="text-xl text-slate-600 mb-6">
                                {excerpt}
                            </p>

                            {/* Author & Reviewer Cards */}
                            <div className="bg-slate-50 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="text-xs text-slate-500 mb-2">Written by</div>
                                    <div className="flex items-center gap-3">
                                        {author.avatar ? (
                                            <img src={author.avatar} alt={author.name} className="w-10 h-10 rounded-full" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                                {author.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-semibold text-slate-900">{author.name}</div>
                                            <div className="text-xs text-slate-500">{author.credentials}</div>
                                        </div>
                                    </div>
                                </div>
                                {reviewer && (
                                    <div className="flex-1 md:border-l md:pl-4 border-slate-200">
                                        <div className="text-xs text-slate-500 mb-2">Reviewed by</div>
                                        <div className="flex items-center gap-3">
                                            {reviewer.avatar ? (
                                                <img src={reviewer.avatar} alt={reviewer.name} className="w-10 h-10 rounded-full" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {reviewer.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-semibold text-slate-900">{reviewer.name}</div>
                                                <div className="text-xs text-slate-500">{reviewer.credentials}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Date Info */}
                            <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                                <span>Published: {publishDate}</span>
                                {updateDate && (
                                    <>
                                        <span>•</span>
                                        <span>Updated: {updateDate}</span>
                                    </>
                                )}
                            </div>
                        </header>

                        {/* Trust Indicators */}
                        <div className="mb-8">
                            <TrustBadges variant="banner" badges={TrustBadgePresets.expert} />
                        </div>

                        {/* Disclaimer */}
                        {disclaimer && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
                                <div className="flex items-start gap-3">
                                    <span className="text-amber-500 text-xl">⚠️</span>
                                    <div>
                                        <div className="font-semibold text-amber-800 mb-1">Important Disclaimer</div>
                                        <p className="text-sm text-amber-700">{disclaimer}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Article Content */}
                        <div
                            className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-emerald-600 prose-strong:text-slate-900 mb-10"
                            dangerouslySetInnerHTML={{ __html: formatContent(content, tocItems) }}
                        />

                        {/* In-Article Ad */}
                        <AdZone id="in-article" className="my-10" />

                        {/* Sources */}
                        {sources && sources.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-6 mb-8">
                                <h3 className="font-semibold text-slate-900 mb-4">📚 Sources & References</h3>
                                <ol className="list-decimal list-inside space-y-2">
                                    {sources.map((source, idx) => (
                                        <li key={idx} className="text-sm">
                                            <a
                                                href={source.url}
                                                className="text-emerald-600 hover:underline"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {source.title}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Author Bio */}
                        <div className="bg-white rounded-xl p-6 border border-slate-200 mb-8">
                            <h3 className="font-semibold text-slate-900 mb-4">About the Author</h3>
                            <AuthorCard
                                author={{
                                    name: author.name,
                                    role: author.role,
                                    bio: author.bio,
                                    avatar: author.avatar,
                                    credentials: [author.credentials]
                                }}
                                variant="full"
                            />
                        </div>
                    </article>
                </div>

                {/* Related Articles */}
                <section className="mt-12 pt-12 border-t border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Related Resources</h2>
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

                {/* Footer Ad */}
                <AdZone id="footer" className="mt-12" />
            </div>
        </ExpertLayout>
    );
}

// Format markdown content to HTML with section IDs
function formatContent(content: string, tocItems: TOCItem[]): string {
    let result = content;
    let tocIndex = 0;

    // Add IDs to headings
    result = result.replace(/^## (.+)$/gm, () => {
        const id = tocItems[tocIndex]?.id || `section-${tocIndex}`;
        tocIndex++;
        return `<h2 id="${id}">$1</h2>`;
    });

    // Format other markdown
    result = result
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/g, '<br/>');

    return result;
}
