'use client';

/**
 * Expert Resource Hub Template - Home Page
 * 
 * Resource-focused homepage with guides, FAQs,
 * expert bios, and structured content categories.
 */

import React, { useState } from 'react';
import { ArticleCard, AuthorCard, AdZone } from '../shared';
import ExpertLayout from './Layout';

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

interface Expert {
    name: string;
    role: string;
    credentials: string;
    avatar?: string;
    bio: string;
}

interface FAQ {
    question: string;
    answer: string;
}

interface HomePageProps {
    siteName: string;
    siteTagline: string;
    niche: string;
    navItems: { label: string; href: string }[];
    featuredGuides: Article[];
    latestArticles: Article[];
    experts: Expert[];
    faqs: FAQ[];
}

export default function ExpertHomePage({
    siteName,
    siteTagline,
    niche,
    navItems,
    featuredGuides,
    latestArticles,
    experts,
    faqs
}: HomePageProps) {
    return (
        <ExpertLayout siteName={siteName} siteTagline={siteTagline} navItems={navItems}>
            {/* Hero Section */}
            <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-16">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full text-emerald-300 text-sm mb-6">
                        <span>✓</span>
                        Trusted by 10,000+ readers
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Your Expert Guide to {niche}
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
                        {siteTagline}. Expert insights, comprehensive guides, and actionable advice.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="#guides"
                            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
                        >
                            Browse Guides
                        </a>
                        <a
                            href="/about"
                            className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
                        >
                            Meet Our Experts
                        </a>
                    </div>
                </div>
            </section>

            {/* Featured Guides */}
            <section id="guides" className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">
                            📚 Comprehensive Guides
                        </h2>
                        <p className="text-slate-600">In-depth resources to help you make informed decisions</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredGuides.map(guide => (
                            <GuideCard key={guide.slug} guide={guide} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Ad Zone */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                <AdZone id="in-content" />
            </div>

            {/* Expert Team */}
            <section className="py-16 bg-slate-50">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">
                            👨‍🔬 Our Expert Team
                        </h2>
                        <p className="text-slate-600">Meet the professionals behind our content</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {experts.map(expert => (
                            <div key={expert.name} className="bg-white rounded-xl p-6 shadow-sm">
                                <AuthorCard
                                    author={{
                                        name: expert.name,
                                        role: expert.role,
                                        bio: expert.bio,
                                        avatar: expert.avatar,
                                        credentials: [expert.credentials]
                                    }}
                                    variant="full"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Latest Articles */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-2xl font-bold text-slate-900">Latest Articles</h2>
                        <a href="/articles" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            View All →
                        </a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {latestArticles.slice(0, 4).map(article => (
                            <ArticleCard
                                key={article.slug}
                                variant="compact"
                                {...article}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 bg-slate-900 text-white">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold mb-3">❓ Frequently Asked Questions</h2>
                        <p className="text-slate-400">Quick answers to common questions</p>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <FAQAccordion key={idx} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                </div>
            </section>
        </ExpertLayout>
    );
}

// Guide Card Component
function GuideCard({ guide }: { guide: Article }) {
    return (
        <a
            href={`/${guide.slug}`}
            className="group bg-slate-50 rounded-xl p-6 border-2 border-transparent hover:border-emerald-500 transition-all"
        >
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium mb-3">
                <span>📖</span>
                Complete Guide
            </div>
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors mb-3">
                {guide.title}
            </h3>
            <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {guide.excerpt}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{guide.readTime || '10 min read'}</span>
                <span className="text-emerald-600 group-hover:translate-x-1 transition-transform">
                    Read Guide →
                </span>
            </div>
        </a>
    );
}

// FAQ Accordion Component
function FAQAccordion({ question, answer }: FAQ) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-700 transition-colors"
            >
                <span className="font-medium">{question}</span>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            {isOpen && (
                <div className="px-6 pb-4 text-slate-300">
                    {answer}
                </div>
            )}
        </div>
    );
}
