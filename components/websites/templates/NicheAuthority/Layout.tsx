/**
 * Niche Authority Blog - Layout
 * 
 * Clean, professional layout with sidebar for ads and related content.
 * Best for: Long-term sustainable revenue, single-niche focus.
 */

import React from 'react';
import Header, { NavItem } from '../shared/Header';
import Footer from '../shared/Footer';
import { AdZones } from '../shared/AdZone';
import Newsletter from '../shared/Newsletter';

export interface NicheAuthorityConfig {
    siteName: string;
    siteTagline?: string;
    primaryColor?: string;
    logo?: string;
    navItems?: NavItem[];
    socialLinks?: {
        twitter?: string;
        facebook?: string;
        linkedin?: string;
    };
}

interface LayoutProps {
    config: NicheAuthorityConfig;
    children: React.ReactNode;
    showSidebar?: boolean;
    sidebarContent?: React.ReactNode;
}

export default function NicheAuthorityLayout({
    config,
    children,
    showSidebar = true,
    sidebarContent
}: LayoutProps) {
    const { siteName, siteTagline, primaryColor = '#2563eb', logo, navItems, socialLinks } = config;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <Header
                siteName={siteName}
                tagline={siteTagline}
                logo={logo}
                navItems={navItems}
                primaryColor={primaryColor}
            />

            {/* Main Content */}
            <main className="flex-1">
                <div className="max-w-6xl mx-auto px-4 py-8">
                    {showSidebar ? (
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Main Content Area */}
                            <div className="flex-1 min-w-0">
                                {children}
                            </div>

                            {/* Sidebar */}
                            <aside className="w-full lg:w-80 shrink-0 space-y-6">
                                {/* Ad Zone - Sidebar Top */}
                                <AdZones.Sidebar />

                                {/* Custom Sidebar Content */}
                                {sidebarContent}

                                {/* Newsletter */}
                                <Newsletter
                                    title="Join Our Newsletter"
                                    description="Get weekly updates on the best budget tech."
                                    primaryColor={primaryColor}
                                />

                                {/* Ad Zone - Sidebar Bottom */}
                                <AdZones.Sidebar />
                            </aside>
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </main>

            {/* Footer */}
            <Footer
                siteName={siteName}
                tagline={siteTagline}
                primaryColor={primaryColor}
                socialLinks={socialLinks}
            />
        </div>
    );
}
