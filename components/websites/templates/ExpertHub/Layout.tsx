'use client';

/**
 * Expert Resource Hub Template - Layout
 * 
 * Trust-focused design with prominent credentials,
 * structured navigation, and professional appearance.
 */

import React from 'react';
import { Header, Footer, TrustBadges, TrustBadgePresets } from '../shared';

interface LayoutProps {
    siteName: string;
    siteTagline?: string;
    navItems: { label: string; href: string }[];
    children: React.ReactNode;
    showTrustBar?: boolean;
    credentials?: string[];
}

export default function ExpertLayout({
    siteName,
    siteTagline,
    navItems,
    children,
    showTrustBar = true,
    credentials = ['Expert Reviewed', 'Research-Based', 'Regularly Updated']
}: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Trust Bar */}
            {showTrustBar && (
                <div className="bg-slate-900 text-white py-2">
                    <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-6 text-sm">
                        {credentials.map((cred, idx) => (
                            <span key={idx} className="flex items-center gap-2">
                                <span className="text-emerald-400">✓</span>
                                {cred}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Header */}
            <Header
                siteName={siteName}
                navItems={[
                    { label: 'Home', href: '/' },
                    ...navItems,
                    { label: 'Resources', href: '/resources' },
                    { label: 'About Us', href: '/about' }
                ]}
            />

            {/* Breadcrumb Area */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <TrustBadges variant="inline" badges={TrustBadgePresets.expert} />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Pre-Footer Trust Section */}
            <div className="bg-slate-100 py-12">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                        Why Trust {siteName}?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <TrustFeature
                            icon="🎓"
                            title="Expert Authors"
                            description="Content written by industry professionals with years of experience"
                        />
                        <TrustFeature
                            icon="📚"
                            title="Research-Based"
                            description="Every article backed by thorough research and credible sources"
                        />
                        <TrustFeature
                            icon="🔄"
                            title="Regularly Updated"
                            description="Content reviewed and updated to ensure accuracy"
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer
                siteName={siteName}
                tagline={siteTagline}
                quickLinks={navItems.slice(0, 4)}
                legalLinks={[
                    { label: 'Privacy Policy', href: '/privacy' },
                    { label: 'Terms of Service', href: '/terms' },
                    { label: 'Disclaimer', href: '/disclaimer' },
                    { label: 'Contact', href: '/contact' }
                ]}
            />
        </div>
    );
}

// Trust Feature Component
function TrustFeature({
    icon,
    title,
    description
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="bg-white rounded-xl p-6 shadow-sm">
            <span className="text-3xl mb-3 block">{icon}</span>
            <h4 className="font-semibold text-slate-800 mb-2">{title}</h4>
            <p className="text-sm text-slate-600">{description}</p>
        </div>
    );
}
