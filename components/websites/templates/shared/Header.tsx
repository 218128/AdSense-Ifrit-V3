/**
 * Header Component
 * 
 * Responsive header with logo, navigation, and mobile menu.
 * Used across all template types.
 */

'use client';

import React, { useState } from 'react';

export interface NavItem {
    label: string;
    href: string;
    children?: NavItem[];
}

interface HeaderProps {
    siteName: string;
    logo?: string;
    tagline?: string;
    navItems?: NavItem[];
    primaryColor?: string;
    variant?: 'default' | 'transparent' | 'magazine';
    className?: string;
}

const DEFAULT_NAV: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/categories' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
];

export default function Header({
    siteName,
    logo,
    tagline,
    navItems = DEFAULT_NAV,
    primaryColor = '#2563eb',
    variant = 'default',
    className = ''
}: HeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const bgClass = variant === 'transparent'
        ? 'bg-transparent'
        : variant === 'magazine'
            ? 'bg-white border-b-2'
            : 'bg-white shadow-sm';

    return (
        <header className={`sticky top-0 z-50 ${bgClass} ${className}`}>
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo / Site Name */}
                    <a href="/" className="flex items-center gap-3">
                        {logo ? (
                            <img src={logo} alt={siteName} className="h-10 w-auto" />
                        ) : (
                            <div
                                className="text-2xl font-bold"
                                style={{ color: primaryColor }}
                            >
                                {siteName}
                            </div>
                        )}
                        {tagline && variant !== 'transparent' && (
                            <span className="hidden md:block text-sm text-gray-500 border-l pl-3 ml-1">
                                {tagline}
                            </span>
                        )}
                    </a>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navItems.map((item, idx) => (
                            <div key={idx} className="relative group">
                                <a
                                    href={item.href}
                                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                                >
                                    {item.label}
                                    {item.children && (
                                        <span className="ml-1">▾</span>
                                    )}
                                </a>

                                {/* Dropdown */}
                                {item.children && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                        {item.children.map((child, childIdx) => (
                                            <a
                                                key={childIdx}
                                                href={child.href}
                                                className="block px-4 py-2 text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                                            >
                                                {child.label}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t">
                        <nav className="py-4 space-y-1">
                            {navItems.map((item, idx) => (
                                <a
                                    key={idx}
                                    href={item.href}
                                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
