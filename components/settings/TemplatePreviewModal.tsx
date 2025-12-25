'use client';

/**
 * TemplatePreviewModal Component
 * 
 * Shows a full preview of a template with mock data.
 * Includes device switcher and component explorer.
 */

import { useState } from 'react';
import {
    X,
    Monitor,
    Tablet,
    Smartphone,
    Sun,
    Moon,
    ChevronRight,
    Layout,
    FileText,
    Grid3X3,
    Zap,
    Shield,
    DollarSign
} from 'lucide-react';
import { TemplateRegistry } from '@/lib/templateVersions';
import { MOCK_ARTICLES, MOCK_SITE_INFO, MOCK_AUTHORS, getFeaturedArticle, getRecentArticles } from '@/templates/shared/mockData';

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type PreviewTab = 'preview' | 'components' | 'features';

interface TemplatePreviewModalProps {
    template: TemplateRegistry;
    onClose: () => void;
}

// Feature categories for display
const FEATURE_CATEGORIES = {
    webmaster: {
        label: 'Webmaster Features',
        icon: <Layout className="w-4 h-4" />,
        color: 'blue',
        features: [
            { name: 'Newsletter Signup', description: 'Email collection form with customizable fields' },
            { name: 'Lead Magnet', description: 'Downloadable content gated by email' },
            { name: 'Analytics Integration', description: 'Umami, Google Analytics 4 support' },
            { name: 'SEO Meta Tags', description: 'Open Graph, Twitter Cards, canonical URLs' },
            { name: 'XML Sitemap', description: 'Auto-generated sitemap for search engines' },
            { name: 'robots.txt', description: 'Crawler directives configuration' },
            { name: 'Breadcrumbs', description: 'Navigation with structured data' },
            { name: 'Search', description: 'Built-in site search functionality' }
        ]
    },
    adsense: {
        label: 'AdSense Features',
        icon: <DollarSign className="w-4 h-4" />,
        color: 'green',
        features: [
            { name: 'Ad Zones', description: 'Header, sidebar, in-article, footer placements' },
            { name: 'Auto Ads', description: 'Google AdSense auto placement support' },
            { name: 'Lazy Loading', description: 'Ads load on scroll for better performance' },
            { name: 'Responsive Ads', description: 'Adapts to all screen sizes' },
            { name: 'Ad Density', description: 'Balanced ad-to-content ratio (1 per 400 words)' },
            { name: 'Above the Fold', description: 'High-visibility placement without intrusion' },
            { name: 'Native Ads', description: 'Ads that match site design' },
            { name: 'Multiplex Ads', description: 'Grid-style ad units for end of article' }
        ]
    },
    eeat: {
        label: 'E-E-A-T Signals',
        icon: <Shield className="w-4 h-4" />,
        color: 'purple',
        features: [
            { name: 'Author Bio', description: 'Detailed author profile with credentials' },
            { name: 'Author Credentials', description: 'Certifications, experience badges' },
            { name: 'Date Published', description: 'Visible publication timestamp' },
            { name: 'Date Modified', description: 'Last updated indicator for freshness' },
            { name: 'Fact Check Labels', description: 'Source citations and verification' },
            { name: 'Expert Reviewer', description: 'Second expert review badge' },
            { name: 'Trust Badges', description: 'SSL, security, privacy indicators' },
            { name: 'FAQ Schema', description: 'Structured FAQ for rich snippets' }
        ]
    },
    performance: {
        label: 'Performance (Core Web Vitals)',
        icon: <Zap className="w-4 h-4" />,
        color: 'amber',
        features: [
            { name: 'LCP Optimized', description: 'Largest Contentful Paint < 2.5s' },
            { name: 'INP Optimized', description: 'Interaction to Next Paint < 200ms' },
            { name: 'CLS Optimized', description: 'Cumulative Layout Shift < 0.1' },
            { name: 'Image Optimization', description: 'WebP, lazy loading, proper sizing' },
            { name: 'Font Loading', description: 'font-display: swap, preload' },
            { name: 'Code Splitting', description: 'Only load what\'s needed' },
            { name: 'SSR/SSG', description: 'Server-side rendering for speed' },
            { name: 'CDN Ready', description: 'Optimized for edge deployment' }
        ]
    }
};

// Template-specific features
const TEMPLATE_FEATURES: Record<string, string[]> = {
    'niche-authority': [
        'Related Articles Sidebar',
        'Table of Contents',
        'Reading Progress Bar',
        'Social Share Buttons',
        'Comment Section Ready'
    ],
    'topical-magazine': [
        'Breaking News Banner',
        'Featured Carousel',
        'Trending Section',
        'Category Mega Menu',
        'Multi-column Layout'
    ],
    'expert-hub': [
        'Pillar Page Navigation',
        'Progress Tracker',
        'Resource Library',
        'Learning Path',
        'Certificate of Completion'
    ]
};

export default function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
    const [device, setDevice] = useState<DeviceType>('desktop');
    const [darkMode, setDarkMode] = useState(false);
    const [activeTab, setActiveTab] = useState<PreviewTab>('preview');
    const [previewPage, setPreviewPage] = useState<'home' | 'article'>('home');

    // Get device dimensions
    const getDeviceWidth = () => {
        switch (device) {
            case 'mobile': return 375;
            case 'tablet': return 768;
            default: return 1200;
        }
    };

    // Get the template preview component - renders template-specific mockup
    const renderPreview = () => {
        const featured = getFeaturedArticle();
        const recent = getRecentArticles(4);
        const siteInfo = MOCK_SITE_INFO;

        // Template-specific styles and layouts
        const templateStyles: Record<string, { headerGradient: string; accent: string; layout: string }> = {
            'niche-authority': {
                headerGradient: 'from-indigo-600 to-purple-600',
                accent: 'indigo',
                layout: 'sidebar'
            },
            'topical-magazine': {
                headerGradient: 'from-rose-500 to-orange-500',
                accent: 'rose',
                layout: 'magazine'
            },
            'expert-hub': {
                headerGradient: 'from-emerald-500 to-teal-500',
                accent: 'emerald',
                layout: 'hub'
            }
        };

        const style = templateStyles[template.id] || templateStyles['niche-authority'];

        // Niche Authority Blog - Sidebar layout, reading-focused
        if (template.id === 'niche-authority') {
            return (
                <div className="font-sans">
                    <header className={`bg-gradient-to-r ${style.headerGradient} text-white p-4`}>
                        <div className="max-w-5xl mx-auto flex items-center justify-between">
                            <div className="font-bold text-xl">{siteInfo.name}</div>
                            <nav className="hidden md:flex gap-6 text-sm">
                                {siteInfo.categories.slice(0, 4).map(cat => (
                                    <span key={cat} className="hover:opacity-80 cursor-pointer">{cat}</span>
                                ))}
                            </nav>
                        </div>
                    </header>

                    {previewPage === 'home' ? (
                        <div className="max-w-5xl mx-auto p-6 flex gap-8">
                            {/* Main Content */}
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Latest Articles</h2>
                                <div className="space-y-6">
                                    {[featured, ...recent.slice(0, 2)].map((article, i) => (
                                        <div key={i} className="p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                                            <span className="text-xs font-semibold text-indigo-600 uppercase">{article.category}</span>
                                            <h3 className="text-xl font-bold text-gray-900 mt-2">{article.title}</h3>
                                            <p className="text-gray-600 mt-2">{article.excerpt}</p>
                                            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                                <span>By {article.author.name}</span>
                                                <span>•</span>
                                                <span>{article.readTime} min read</span>
                                            </div>
                                            {i === 0 && (
                                                <div className="mt-4 flex gap-2">
                                                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">📖 Reading Progress Bar</span>
                                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">📑 Table of Contents</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Sidebar - Niche Authority specific */}
                            <aside className="w-72 hidden lg:block">
                                <div className="sticky top-6 space-y-6">
                                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                        <h4 className="font-semibold text-indigo-900 mb-3">📧 Newsletter</h4>
                                        <p className="text-xs text-indigo-600 mb-3">Get weekly insights</p>
                                        <input type="email" placeholder="Your email" className="w-full px-3 py-2 text-sm border rounded-lg mb-2" />
                                        <button className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg">Subscribe</button>
                                    </div>
                                    <div className="p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                                        <span className="text-xs text-gray-500 font-medium">📢 SIDEBAR AD</span>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border">
                                        <h4 className="font-semibold text-gray-900 mb-3">🔗 Related Articles</h4>
                                        {recent.slice(2).map((a, i) => (
                                            <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                                                <p className="text-sm text-gray-700 font-medium">{a.title}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto p-6">
                            <article>
                                <h1 className="text-3xl font-bold text-gray-900 mb-4">{featured.title}</h1>
                                <div className="flex items-center gap-3 py-4 border-y border-gray-200 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400" />
                                    <div>
                                        <div className="font-semibold text-gray-900">{featured.author.name}</div>
                                        <div className="text-sm text-gray-500">{featured.publishedAt}</div>
                                    </div>
                                </div>
                                <p className="text-gray-700 leading-relaxed">{featured.excerpt}</p>
                            </article>
                        </div>
                    )}

                    <footer className="bg-gray-900 text-white p-8 mt-12">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="font-bold text-lg mb-2">{siteInfo.name}</div>
                            <p className="text-gray-400 text-sm">{siteInfo.tagline}</p>
                        </div>
                    </footer>
                </div>
            );
        }

        // Topical Magazine - Multi-column, news-style layout
        if (template.id === 'topical-magazine') {
            return (
                <div className="font-sans">
                    {/* Breaking News Banner */}
                    <div className="bg-red-600 text-white text-xs py-1 px-4">
                        <span className="font-bold mr-2">🔴 BREAKING:</span>
                        Latest updates and trending topics
                    </div>
                    <header className={`bg-gradient-to-r ${style.headerGradient} text-white p-4`}>
                        <div className="max-w-6xl mx-auto">
                            <div className="flex items-center justify-between">
                                <div className="font-bold text-2xl tracking-tight">{siteInfo.name}</div>
                                <span className="text-xs opacity-80">{new Date().toLocaleDateString()}</span>
                            </div>
                            <nav className="flex gap-4 text-sm mt-3 border-t border-white/20 pt-3">
                                {siteInfo.categories.map(cat => (
                                    <span key={cat} className="hover:opacity-80 cursor-pointer font-medium">{cat}</span>
                                ))}
                            </nav>
                        </div>
                    </header>

                    {previewPage === 'home' ? (
                        <div className="max-w-6xl mx-auto p-6">
                            {/* Featured Carousel */}
                            <div className="mb-8 p-6 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded">FEATURED</span>
                                    <span className="text-xs text-rose-600">🔥 Trending Now</span>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900">{featured.title}</h2>
                                <p className="text-gray-600 mt-2 text-lg">{featured.excerpt}</p>
                            </div>

                            {/* Magazine Grid */}
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    {recent.slice(0, 3).map((article, i) => (
                                        <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                                            <div className="w-32 h-24 bg-gradient-to-br from-rose-200 to-orange-200 rounded-lg flex-shrink-0" />
                                            <div>
                                                <span className="text-xs font-medium text-rose-600">{article.category}</span>
                                                <h3 className="font-semibold text-gray-900 mt-1">{article.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{article.readTime} min read</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Trending Sidebar */}
                                <div className="bg-gray-50 rounded-xl p-4 border">
                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        📈 Trending
                                    </h4>
                                    {recent.map((a, i) => (
                                        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-200 last:border-0">
                                            <span className="text-2xl font-bold text-rose-300">{i + 1}</span>
                                            <p className="text-sm font-medium text-gray-700">{a.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto p-6">
                            <article>
                                <span className="px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded">{featured.category}</span>
                                <h1 className="text-4xl font-bold text-gray-900 mt-4 mb-4">{featured.title}</h1>
                                <p className="text-xl text-gray-600">{featured.excerpt}</p>
                            </article>
                        </div>
                    )}

                    <footer className="bg-gray-900 text-white p-8 mt-12">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="font-bold text-lg mb-2">{siteInfo.name}</div>
                        </div>
                    </footer>
                </div>
            );
        }

        // Expert Hub - Documentation/learning-style layout
        return (
            <div className="font-sans">
                <header className={`bg-gradient-to-r ${style.headerGradient} text-white p-4`}>
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/20 rounded-lg">📚</div>
                            <div>
                                <div className="font-bold text-xl">{siteInfo.name}</div>
                                <div className="text-xs opacity-80">Knowledge Hub</div>
                            </div>
                        </div>
                        <nav className="hidden md:flex gap-6 text-sm">
                            <span className="hover:opacity-80 cursor-pointer">Pillar Topics</span>
                            <span className="hover:opacity-80 cursor-pointer">Resources</span>
                            <span className="hover:opacity-80 cursor-pointer">Learning Paths</span>
                        </nav>
                    </div>
                </header>

                {previewPage === 'home' ? (
                    <div className="max-w-6xl mx-auto p-6">
                        {/* Learning Path Progress */}
                        <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-emerald-900">📖 Your Learning Progress</h3>
                                <span className="text-sm text-emerald-600">3/10 Topics Completed</span>
                            </div>
                            <div className="w-full bg-emerald-200 rounded-full h-2">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '30%' }} />
                            </div>
                        </div>

                        {/* Pillar Pages Grid */}
                        <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Pillar Topics</h2>
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            {['Beginner Guide', 'Advanced Topics', 'Expert Resources'].map((pillar, i) => (
                                <div key={i} className="p-6 bg-white rounded-xl border-2 border-emerald-200 hover:border-emerald-400 transition-colors">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl mb-4 flex items-center justify-center text-white text-xl">
                                        {i + 1}
                                    </div>
                                    <h3 className="font-bold text-gray-900">{pillar}</h3>
                                    <p className="text-sm text-gray-600 mt-2">Comprehensive guide with {5 + i * 3} articles</p>
                                    <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                                        <span>Start Learning</span>
                                        <span>→</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Resource Library */}
                        <div className="p-6 bg-gray-50 rounded-xl border">
                            <h3 className="font-bold text-gray-900 mb-4">📚 Resource Library</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {['Downloadable Templates', 'Checklists', 'Case Studies', 'Video Tutorials'].map((resource, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                                        <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center text-emerald-600">
                                            {['📄', '✅', '📊', '🎬'][i]}
                                        </div>
                                        <span className="font-medium text-gray-700">{resource}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto p-6 flex gap-8">
                        {/* Article Content */}
                        <article className="flex-1">
                            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                                <span>Pillar Topic</span>
                                <span>›</span>
                                <span className="text-emerald-600">{featured.category}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">{featured.title}</h1>
                            <p className="text-gray-700 leading-relaxed">{featured.excerpt}</p>
                        </article>
                        {/* Hub Navigation */}
                        <aside className="w-64 hidden lg:block">
                            <div className="sticky top-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                <h4 className="font-semibold text-emerald-900 mb-3">In This Section</h4>
                                {['Introduction', 'Key Concepts', 'Examples', 'Next Steps'].map((item, i) => (
                                    <div key={i} className="py-2 text-sm text-emerald-700 border-l-2 border-emerald-300 pl-3 hover:border-emerald-500 cursor-pointer">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                )}

                <footer className="bg-gray-900 text-white p-8 mt-12">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="font-bold text-lg mb-2">{siteInfo.name}</div>
                        <p className="text-gray-400 text-sm">Expert Knowledge Hub</p>
                    </div>
                </footer>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-neutral-900">{template.name}</h2>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            v{template.currentVersion}
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-neutral-200 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'preview'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => setActiveTab('components')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'components'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            Components
                        </button>
                        <button
                            onClick={() => setActiveTab('features')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'features'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            Features
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {/* Preview Tab */}
                    {activeTab === 'preview' && (
                        <div className="h-full flex flex-col">
                            {/* Preview Controls */}
                            <div className="flex items-center justify-between px-6 py-3 bg-neutral-50 border-b border-neutral-200">
                                {/* Page Selector */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPreviewPage('home')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${previewPage === 'home'
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                                            }`}
                                    >
                                        Home Page
                                    </button>
                                    <button
                                        onClick={() => setPreviewPage('article')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${previewPage === 'article'
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                                            }`}
                                    >
                                        Article Page
                                    </button>
                                </div>

                                {/* Device Selector */}
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1 bg-white border border-neutral-200 p-1 rounded-lg">
                                        <button
                                            onClick={() => setDevice('desktop')}
                                            className={`p-2 rounded-md transition-all ${device === 'desktop' ? 'bg-indigo-500 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                                                }`}
                                            title="Desktop"
                                        >
                                            <Monitor className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDevice('tablet')}
                                            className={`p-2 rounded-md transition-all ${device === 'tablet' ? 'bg-indigo-500 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                                                }`}
                                            title="Tablet"
                                        >
                                            <Tablet className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDevice('mobile')}
                                            className={`p-2 rounded-md transition-all ${device === 'mobile' ? 'bg-indigo-500 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                                                }`}
                                            title="Mobile"
                                        >
                                            <Smartphone className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Dark Mode Toggle */}
                                    <button
                                        onClick={() => setDarkMode(!darkMode)}
                                        className={`p-2 rounded-lg border transition-all ${darkMode
                                            ? 'bg-neutral-800 border-neutral-700 text-yellow-400'
                                            : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                                            }`}
                                        title={darkMode ? 'Light Mode' : 'Dark Mode'}
                                    >
                                        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="text-sm text-neutral-500">
                                    {getDeviceWidth()}px wide
                                </div>
                            </div>

                            {/* Preview Frame */}
                            <div className="flex-1 overflow-auto bg-neutral-200 p-4 flex justify-center">
                                <div
                                    className={`bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300 ${darkMode ? 'dark' : ''}`}
                                    style={{
                                        width: getDeviceWidth(),
                                        minHeight: '100%'
                                    }}
                                >
                                    <div className="overflow-auto h-full">
                                        {renderPreview()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Components Tab */}
                    {activeTab === 'components' && (
                        <div className="h-full overflow-auto p-6">
                            <div className="max-w-4xl mx-auto space-y-6">
                                {/* Pages */}
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        Pages
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {['HomePage', 'ArticlePage', 'CategoryPage', 'AuthorPage'].map((page) => (
                                            <div key={page} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                                                <div>
                                                    <span className="font-medium text-neutral-800">{page}</span>
                                                    <p className="text-xs text-neutral-500 mt-1">
                                                        components/websites/templates/{template.id}/{page}.tsx
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-neutral-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Shared Components */}
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                        <Grid3X3 className="w-5 h-5 text-purple-500" />
                                        Shared Components
                                    </h3>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        {['Header', 'Footer', 'AdZone', 'Newsletter', 'AuthorCard', 'ArticleCard', 'TrustBadges'].map((comp) => (
                                            <div key={comp} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                <span className="font-medium text-purple-800">{comp}</span>
                                                <p className="text-xs text-purple-600 mt-1">shared/{comp}.tsx</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Template-Specific Features */}
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-amber-500" />
                                        Template-Specific Features
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {(TEMPLATE_FEATURES[template.id] || []).map((feature) => (
                                            <div key={feature} className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                <span className="text-amber-800">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Features Tab */}
                    {activeTab === 'features' && (
                        <div className="h-full overflow-auto p-6">
                            <div className="max-w-5xl mx-auto space-y-8">
                                {Object.entries(FEATURE_CATEGORIES).map(([key, category]) => (
                                    <div key={key}>
                                        <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 text-${category.color}-700`}>
                                            <span className={`p-2 bg-${category.color}-100 rounded-lg`}>
                                                {category.icon}
                                            </span>
                                            {category.label}
                                        </h3>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {category.features.map((feature) => (
                                                <div
                                                    key={feature.name}
                                                    className={`p-4 rounded-xl border bg-gradient-to-br from-white to-${category.color}-50 border-${category.color}-200`}
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-2 h-2 rounded-full bg-${category.color}-500`} />
                                                        <span className="font-medium text-neutral-800">{feature.name}</span>
                                                    </div>
                                                    <p className="text-xs text-neutral-600">{feature.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
