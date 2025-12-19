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

    // Get the template preview component - static mockup for consistent rendering
    const renderPreview = () => {
        const featured = getFeaturedArticle();
        const recent = getRecentArticles(4);
        const siteInfo = MOCK_SITE_INFO;

        // Static mockup that works for all templates
        return (
            <div className="font-sans">
                {/* Header Mock */}
                <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="font-bold text-xl">{siteInfo.name}</div>
                        <nav className="hidden md:flex gap-6 text-sm">
                            {siteInfo.categories.slice(0, 4).map(cat => (
                                <span key={cat} className="hover:opacity-80 cursor-pointer">{cat}</span>
                            ))}
                        </nav>
                    </div>
                </header>

                {/* Hero/Featured */}
                {previewPage === 'home' ? (
                    <div className="max-w-4xl mx-auto p-6">
                        {/* Hero */}
                        <div className="text-center py-8 mb-8 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{siteInfo.name}</h1>
                            <p className="text-gray-600">{siteInfo.tagline}</p>
                        </div>

                        {/* Featured Article */}
                        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border">
                            <span className="text-xs font-semibold text-indigo-600 uppercase">Featured</span>
                            <h2 className="text-2xl font-bold text-gray-900 mt-2">{featured.title}</h2>
                            <p className="text-gray-600 mt-2">{featured.excerpt}</p>
                            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                <span>By {featured.author.name}</span>
                                <span>•</span>
                                <span>{featured.readTime} min read</span>
                            </div>
                        </div>

                        {/* Article Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {recent.slice(1).map(article => (
                                <div key={article.slug} className="p-4 bg-white rounded-lg shadow-sm border">
                                    <span className="text-xs text-indigo-600 font-medium">{article.category}</span>
                                    <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">{article.title}</h3>
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{article.excerpt}</p>
                                    <div className="text-xs text-gray-500 mt-3">{article.readTime} min read</div>
                                </div>
                            ))}
                        </div>

                        {/* Ad Zone Placeholder */}
                        <div className="mt-8 p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
                            <span className="text-xs text-gray-500 font-medium">📢 AD ZONE - Responsive Ad Unit</span>
                        </div>
                    </div>
                ) : (
                    /* Article Page */
                    <div className="max-w-3xl mx-auto p-6">
                        {/* Breadcrumb */}
                        <div className="text-sm text-gray-500 mb-4">
                            Home / {featured.category} / Article
                        </div>

                        {/* Article Header */}
                        <article>
                            <span className="text-indigo-600 font-semibold text-sm">{featured.category}</span>
                            <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-4">{featured.title}</h1>

                            {/* Author */}
                            <div className="flex items-center gap-3 py-4 border-y border-gray-200 mb-6">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400" />
                                <div>
                                    <div className="font-semibold text-gray-900">{featured.author.name}</div>
                                    <div className="text-sm text-gray-500">{featured.author.role} • {featured.publishedAt}</div>
                                </div>
                            </div>

                            {/* Content Preview */}
                            <div className="prose prose-lg max-w-none">
                                <p className="text-gray-700 leading-relaxed">{featured.excerpt}</p>
                                <div className="my-6 p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
                                    <span className="text-xs text-gray-500 font-medium">📢 IN-ARTICLE AD</span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mt-6">Key Takeaways</h2>
                                <ul className="list-disc pl-5 text-gray-700 space-y-2">
                                    <li>First important point from the article</li>
                                    <li>Second key insight for readers</li>
                                    <li>Third actionable tip</li>
                                </ul>
                            </div>

                            {/* E-E-A-T Signals */}
                            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                                    <Shield className="w-4 h-4" />
                                    About the Author
                                </div>
                                <p className="text-sm text-blue-700">{featured.author.bio}</p>
                                <div className="flex gap-2 mt-2">
                                    {MOCK_AUTHORS[0].credentials.map(cred => (
                                        <span key={cred} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                            ✓ {cred}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </article>
                    </div>
                )}

                {/* Footer Mock */}
                <footer className="bg-gray-900 text-white p-8 mt-12">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="font-bold text-lg mb-2">{siteInfo.name}</div>
                        <p className="text-gray-400 text-sm mb-4">{siteInfo.tagline}</p>
                        <div className="flex justify-center gap-4 text-sm text-gray-400">
                            <span>Privacy Policy</span>
                            <span>•</span>
                            <span>Terms of Service</span>
                            <span>•</span>
                            <span>Contact</span>
                        </div>
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
