'use client';

/**
 * Topical Magazine Template - Layout
 * 
 * Modern magazine-style layout with category tabs and featured stories.
 * Clean grid layout optimized for browsing multiple articles.
 */

import React from 'react';
import { Header, Footer, Newsletter } from '../shared';

interface LayoutProps {
    siteName: string;
    siteTagline?: string;
    categories: string[];
    children: React.ReactNode;
    currentCategory?: string;
    socialLinks?: {
        twitter?: string;
        facebook?: string;
        instagram?: string;
    };
}

export default function MagazineLayout({
    siteName,
    siteTagline,
    categories,
    children,
    currentCategory,
    socialLinks
}: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Top Bar */}
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white py-2 text-center text-sm">
                <span>📰 Your trusted source for {siteTagline || 'expert insights'}</span>
            </div>

            {/* Header */}
            <Header
                siteName={siteName}
                navItems={[
                    { label: 'Home', href: '/' },
                    ...categories.slice(0, 4).map(cat => ({
                        label: cat,
                        href: `/category/${cat.toLowerCase().replace(/\s+/g, '-')}`
                    })),
                    { label: 'About', href: '/about' }
                ]}
            />

            {/* Category Tabs */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex overflow-x-auto py-3 gap-2 scrollbar-hide">
                        <CategoryTab
                            label="All"
                            href="/"
                            active={!currentCategory}
                        />
                        {categories.map(category => (
                            <CategoryTab
                                key={category}
                                label={category}
                                href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                                active={currentCategory === category}
                            />
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {children}
                </div>
            </main>

            {/* Newsletter Section */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 py-12">
                <div className="max-w-2xl mx-auto px-4">
                    <Newsletter variant="card" />
                </div>
            </div>

            {/* Footer */}
            <Footer
                siteName={siteName}
                tagline={siteTagline}
                quickLinks={categories.slice(0, 4).map(cat => ({
                    label: cat,
                    href: `/category/${cat.toLowerCase().replace(/\s+/g, '-')}`
                }))}
                legalLinks={[
                    { label: 'Privacy Policy', href: '/privacy' },
                    { label: 'Terms of Service', href: '/terms' },
                    { label: 'Contact', href: '/contact' }
                ]}
                socialLinks={socialLinks}
            />
        </div>
    );
}

// Category Tab Component
function CategoryTab({
    label,
    href,
    active
}: {
    label: string;
    href: string;
    active: boolean;
}) {
    return (
        <a
            href={href}
            className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${active
                    ? 'bg-rose-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
            `}
        >
            {label}
        </a>
    );
}
