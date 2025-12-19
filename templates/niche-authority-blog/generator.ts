/**
 * Niche Authority Blog Template
 * Professional template files for AdSense-optimized niche sites
 * 
 * Features:
 * - Unique theme generation via themeSeed
 * - Niche-aware color palettes
 * - 30+ font pairings
 * - AdSense-optimized layouts
 */

import {
    createThemeSeed,
    generateTheme,
    generateThemeCSS,
    generateAdsTxt,
    generateRobotsTxt,
    generateSitemapXml,
    generateManifest,
    generateGraphicsFiles
} from '../shared';
import { AISiteDecisions, applyAIDecisionsToTheme, generateAIDecisionCSS } from '@/lib/aiSiteBuilder';

export interface SiteConfig {
    siteName: string;
    tagline: string;
    domain: string;
    niche?: string; // e.g., 'tech', 'finance', 'health' - used for theme generation
    adsensePublisherId?: string; // e.g., 'ca-pub-1658375151633555'
    author: {
        name: string;
        role: string;
        bio: string;
    };
    colors?: { // Now optional - will be generated from theme seed if not provided
        primary: string;
        secondary: string;
    };
    themeSeed?: string; // Optional custom seed for reproducible themes
    umamiId?: string; // Optional Umami Website ID
    template?: 'niche' | 'magazine' | 'expert'; // Template selection
    aiDecisions?: AISiteDecisions; // AI-generated configuration decisions
}

// Get domain from config or extract from repo name
function getDomain(repoName: string, config?: Partial<SiteConfig>): string {
    return config?.domain || repoName.replace(/-/g, '.');
}

export function generateTemplateFiles(repoName: string, config?: Partial<SiteConfig>) {
    const siteName = config?.siteName || repoName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const tagline = config?.tagline || 'Your trusted source for quality content';
    const authorName = config?.author?.name || 'Editorial Team';
    const authorRole = config?.author?.role || 'Content Team';
    const authorBio = config?.author?.bio || 'We are dedicated to bringing you the best content.';
    const adsensePublisherId = config?.adsensePublisherId || '';
    const umamiId = config?.umamiId;

    // Generate unique theme for this site
    const niche = config?.niche || detectNicheFromName(siteName);
    const themeSeed = createThemeSeed(niche, config?.themeSeed);
    let theme = generateTheme(themeSeed);

    // Apply AI decisions if provided
    const aiDecisions = config?.aiDecisions;
    if (aiDecisions) {
        theme = applyAIDecisionsToTheme(theme, aiDecisions);
    }

    // Use provided colors or theme-generated colors
    const primaryColor = config?.colors?.primary || theme.colors.primary;
    const secondaryColor = config?.colors?.secondary || theme.colors.secondary;
    const domain = getDomain(repoName, config);

    return [
        // Package.json
        {
            path: 'package.json',
            content: JSON.stringify({
                name: repoName,
                version: '1.0.0',
                private: true,
                scripts: {
                    dev: 'next dev',
                    build: 'next build',
                    start: 'next start'
                },
                dependencies: {
                    next: '^14.0.0',
                    react: '^18.2.0',
                    'react-dom': '^18.2.0',
                    'gray-matter': '^4.0.3',
                    'react-markdown': '^9.0.0'
                },
                devDependencies: {
                    typescript: '^5.0.0',
                    '@types/node': '^20.0.0',
                    '@types/react': '^18.2.0',
                    '@types/react-dom': '^18.2.0'
                }
            }, null, 2)
        },

        // Next config
        {
            path: 'next.config.js',
            content: `/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone'
};
module.exports = nextConfig;
`
        },

        // TypeScript env
        {
            path: 'next-env.d.ts',
            content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`
        },

        // TSConfig
        {
            path: 'tsconfig.json',
            content: JSON.stringify({
                compilerOptions: {
                    target: 'es5',
                    lib: ['dom', 'dom.iterable', 'esnext'],
                    allowJs: true,
                    skipLibCheck: true,
                    strict: true,
                    noEmit: true,
                    esModuleInterop: true,
                    module: 'esnext',
                    moduleResolution: 'bundler',
                    resolveJsonModule: true,
                    isolatedModules: true,
                    jsx: 'preserve',
                    incremental: true,
                    plugins: [{ name: 'next' }],
                    paths: { '@/*': ['./*'] }
                },
                include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
                exclude: ['node_modules']
            }, null, 2)
        },

        // Global CSS with professional design
        // Global Styles - Generated from unique theme seed + AI decisions
        {
            path: 'app/globals.css',
            content: generateThemeCSS(theme) + (aiDecisions ? '\n\n' + generateAIDecisionCSS(aiDecisions) : '')
        },

        // Theme configuration file (for reference/debugging)
        {
            path: 'theme.json',
            content: JSON.stringify({
                seed: themeSeed.seed,
                niche: themeSeed.niche,
                mood: themeSeed.mood,
                generatedAt: themeSeed.generatedAt,
                colors: theme.colors,
                typography: {
                    headingFont: theme.typography.headingFont,
                    bodyFont: theme.typography.bodyFont
                },
                components: {
                    headerStyle: theme.components.header.style,
                    cardStyle: theme.components.cards.style,
                    buttonStyle: theme.components.buttons.style
                },
                layoutVariant: {
                    homepage: theme.layoutVariant.homepage,
                    articleGrid: theme.layoutVariant.articleGrid.style,
                    newsletter: theme.layoutVariant.newsletter.placement,
                    headerLayout: theme.layoutVariant.headerLayout.style,
                    footerLayout: theme.layoutVariant.footerLayout.style,
                    sidebarPosition: theme.layoutVariant.sidebarConfig.position,
                    articleLayout: theme.layoutVariant.articleLayout.style,
                    adZones: theme.layoutVariant.adZones
                }
            }, null, 2)
        },

        // Layout with header/footer + AdSense + Analytics
        {
            path: 'app/layout.tsx',
            content: generateLayoutComponent(siteName, tagline, adsensePublisherId, umamiId)
        },

        // Homepage
        {
            path: 'app/page.tsx',
            content: generateHomepage(siteName, tagline)
        },

        // Article page
        {
            path: 'app/[slug]/page.tsx',
            content: generateArticlePage(authorName, authorRole, authorBio)
        },

        // About page
        {
            path: 'app/about/page.tsx',
            content: generateAboutPage(siteName, authorName, authorRole, authorBio)
        },

        // Privacy page
        {
            path: 'app/privacy/page.tsx',
            content: generatePrivacyPage(siteName)
        },

        // Terms page
        {
            path: 'app/terms/page.tsx',
            content: generateTermsPage(siteName)
        },

        // Contact page
        {
            path: 'app/contact/page.tsx',
            content: generateContactPage(siteName)
        },

        // Content library
        {
            path: 'lib/content.ts',
            content: generateContentLib()
        },

        // Content placeholder
        {
            path: 'content/.gitkeep',
            content: '# Articles will be pushed here\n'
        },

        // ============================================
        // SEO & ADSENSE COMPLIANCE FILES
        // ============================================

        // ads.txt (Required by Google AdSense)
        ...(adsensePublisherId ? [{
            path: 'public/ads.txt',
            content: generateAdsTxt(adsensePublisherId)
        }] : []),

        // robots.txt
        {
            path: 'public/robots.txt',
            content: generateRobotsTxt(domain)
        },

        // sitemap.xml (base - articles added dynamically)
        {
            path: 'public/sitemap.xml',
            content: generateSitemapXml(domain)
        },

        // Web App Manifest (PWA support + theme colors)
        {
            path: 'public/manifest.json',
            content: generateManifest(siteName, theme.colors.primary, theme.colors.background)
        },

        // ============================================
        // SITE GRAPHICS (logos, favicons, OG images)
        // ============================================
        ...generateGraphicsFiles(siteName, tagline, theme)
    ];
}

function generateGlobalStyles(primary: string, secondary: string): string {
    return `/* Niche Authority Blog - Professional Design System */
:root {
  --color-primary: ${primary};
  --color-primary-dark: ${adjustColor(primary, -20)};
  --color-secondary: ${secondary};
  --color-bg: #ffffff;
  --color-bg-alt: #f8fafc;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --max-width: 1200px;
  --content-width: 720px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: var(--font-sans); color: var(--color-text); background: var(--color-bg); line-height: 1.6; -webkit-font-smoothing: antialiased; }

h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.25; }
h1 { font-size: 2.5rem; }
h2 { font-size: 1.875rem; }
h3 { font-size: 1.5rem; }

a { color: var(--color-primary); text-decoration: none; }
a:hover { color: var(--color-primary-dark); }

.container { max-width: var(--max-width); margin: 0 auto; padding: 0 1.5rem; }
.content-wrapper { max-width: var(--content-width); margin: 0 auto; }

/* Header */
.header { position: sticky; top: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid var(--color-border); z-index: 100; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; max-width: var(--max-width); margin: 0 auto; }
.logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; font-weight: 800; color: var(--color-text); }
.logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
.nav { display: flex; gap: 1.5rem; }
.nav a { color: var(--color-text-muted); font-weight: 500; }
.nav a:hover { color: var(--color-primary); }

/* Hero */
.hero { background: linear-gradient(135deg, var(--color-bg-alt), var(--color-bg)); padding: 4rem 1.5rem; text-align: center; }
.hero h1 { font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-tagline { font-size: 1.25rem; color: var(--color-text-muted); max-width: 600px; margin: 0 auto 2rem; }

/* Article Cards */
.articles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; padding: 2rem 0; }
.article-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; transition: all 0.3s; }
.article-card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transform: translateY(-4px); }
.article-card-image { aspect-ratio: 16/9; background: var(--color-bg-alt); display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: 3rem; }
.article-card-content { padding: 1.5rem; }
.article-card-category { display: inline-block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--color-primary); margin-bottom: 0.5rem; }
.article-card h3 { font-size: 1.25rem; margin-bottom: 0.5rem; line-height: 1.4; }
.article-card h3 a { color: var(--color-text); }
.article-card h3 a:hover { color: var(--color-primary); }
.article-card-meta { display: flex; gap: 1rem; font-size: 0.875rem; color: var(--color-text-muted); }

/* Article Page */
.article { padding: 3rem 1.5rem; }
.article-header { text-align: center; margin-bottom: 3rem; max-width: var(--content-width); margin-left: auto; margin-right: auto; }
.article-header h1 { font-size: 2.5rem; margin-bottom: 1.5rem; }
.article-meta { display: flex; align-items: center; justify-content: center; gap: 1.5rem; color: var(--color-text-muted); }
.article-author { display: flex; align-items: center; gap: 0.5rem; }
.author-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }

.article-content { max-width: var(--content-width); margin: 0 auto; }
.article-content h2 { margin-top: 3rem; margin-bottom: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border); }
.article-content h3 { margin-top: 2rem; margin-bottom: 0.5rem; }
.article-content p { margin-bottom: 1rem; }
.article-content ul, .article-content ol { margin-bottom: 1rem; padding-left: 2rem; }
.article-content li { margin-bottom: 0.25rem; }
.article-content blockquote { border-left: 4px solid var(--color-primary); padding-left: 1.5rem; margin: 2rem 0; font-style: italic; color: var(--color-text-muted); }
.article-content table { width: 100%; border-collapse: collapse; margin: 2rem 0; }
.article-content th, .article-content td { padding: 1rem; border: 1px solid var(--color-border); text-align: left; }
.article-content th { background: var(--color-bg-alt); font-weight: 600; }

/* Author Box */
.author-box { background: var(--color-bg-alt); border-radius: 0.75rem; padding: 2rem; margin-top: 3rem; display: flex; gap: 1.5rem; }
.author-box-avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold; flex-shrink: 0; }
.author-box-content h4 { margin-bottom: 0.25rem; }
.author-box-role { color: var(--color-primary); font-weight: 500; font-size: 0.875rem; margin-bottom: 0.5rem; }
.author-box-bio { color: var(--color-text-muted); font-size: 0.9375rem; }

/* Footer */
.footer { background: var(--color-bg-alt); border-top: 1px solid var(--color-border); padding: 3rem 1.5rem; margin-top: 4rem; }
.footer-inner { max-width: var(--max-width); margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; }
.footer-section h5 { margin-bottom: 1rem; }
.footer-section ul { list-style: none; }
.footer-section li { margin-bottom: 0.5rem; }
.footer-section a { color: var(--color-text-muted); font-size: 0.9375rem; }
.footer-bottom { max-width: var(--max-width); margin: 2rem auto 0; padding-top: 1.5rem; border-top: 1px solid var(--color-border); text-align: center; color: var(--color-text-muted); font-size: 0.875rem; }

/* About Page */
.about-page { padding: 3rem 1.5rem; max-width: var(--content-width); margin: 0 auto; }
.about-page h1 { margin-bottom: 2rem; }
.about-section { margin-bottom: 3rem; }
.about-section h2 { margin-bottom: 1rem; font-size: 1.5rem; }

/* Social Share */
.social-share { display: flex; align-items: center; gap: 0.75rem; margin: 2rem 0; padding: 1.5rem 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
.share-label { font-weight: 500; color: var(--color-text-muted); font-size: 0.875rem; }
.share-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; text-decoration: none; transition: all 0.2s; }
.share-btn--twitter { background: #1da1f2; color: white; }
.share-btn--twitter:hover { background: #0c85d0; color: white; }
.share-btn--facebook { background: #4267B2; color: white; }
.share-btn--facebook:hover { background: #365899; color: white; }
.share-btn--linkedin { background: #0077b5; color: white; }
.share-btn--linkedin:hover { background: #005885; color: white; }

/* Trust Badges (E-E-A-T) */
.trust-badges { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1rem 0 1.5rem; }
.trust-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
.trust-badge svg { flex-shrink: 0; }
.trust-badge--secure { background: #ecfdf5; color: #059669; }
.trust-badge--verified { background: #eff6ff; color: #2563eb; }
.trust-badge--updated { background: #fef3c7; color: #d97706; }

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2rem; }
  .hero h1 { font-size: 2rem; }
  .nav { display: none; }
  .author-box { flex-direction: column; text-align: center; }
  .author-box-avatar { margin: 0 auto; }
}
`;
}

/**
 * Detect niche category from site name
 * Used when niche is not explicitly provided
 */
function detectNicheFromName(siteName: string): string {
    const name = siteName.toLowerCase();

    const nicheKeywords: Record<string, string[]> = {
        tech: ['tech', 'digital', 'code', 'software', 'app', 'ai', 'cyber', 'data', 'cloud', 'dev', 'gadget'],
        finance: ['finance', 'money', 'invest', 'bank', 'credit', 'wealth', 'budget', 'trade', 'stock', 'crypto'],
        health: ['health', 'fitness', 'wellness', 'medical', 'diet', 'nutrition', 'workout', 'yoga', 'mental'],
        lifestyle: ['lifestyle', 'fashion', 'beauty', 'home', 'decor', 'style', 'living', 'modern'],
        food: ['food', 'recipe', 'cook', 'kitchen', 'meal', 'chef', 'bake', 'eat', 'taste', 'gourmet'],
        travel: ['travel', 'trip', 'vacation', 'adventure', 'explore', 'journey', 'destination', 'tour'],
        education: ['learn', 'study', 'course', 'teach', 'education', 'tutorial', 'academy', 'skill'],
    };

    for (const [niche, keywords] of Object.entries(nicheKeywords)) {
        if (keywords.some(kw => name.includes(kw))) {
            return niche;
        }
    }

    return 'default';
}

function adjustColor(hex: string, percent: number): string {
    // Simple color adjustment - darken/lighten
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function generateLayoutComponent(siteName: string, tagline: string, adsensePublisherId?: string, umamiId?: string): string {
    const initials = siteName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    // Generate AdSense script - uses native script tag for Google verification (not Next.js Script component)
    // Native script tags appear in initial HTML, which is required for AdSense verification
    const adsenseScriptTag = adsensePublisherId
        ? `<script
                    async
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}"
                    crossOrigin="anonymous"
                />`
        : '';

    return `import './globals.css';
import Link from 'next/link';

export const metadata = {
    title: '${siteName}',
    description: '${tagline}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                ${adsensePublisherId ? `{/* Google AdSense - Native script for verification */}
                <script
                    async
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}"
                    crossOrigin="anonymous"
                />` : ''}
                {/* Umami Analytics - Optional */}
                ${umamiId ? `<script defer src="https://cloud.umami.is/script.js" data-website-id="${umamiId}"></script>` : ''}
            </head>
            <body>
                <header className="header">
                    <div className="header-inner">
                        <Link href="/" className="logo">
                            <span className="logo-icon">${initials}</span>
                            <span>${siteName}</span>
                        </Link>
                        <nav className="nav">
                            <Link href="/">Home</Link>
                            <Link href="/about">About</Link>
                        </nav>
                    </div>
                </header>
                
                <main>{children}</main>
                
                <footer className="footer">
                    <div className="footer-inner">
                        <div className="footer-section">
                            <h5>${siteName}</h5>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                ${tagline}
                            </p>
                        </div>
                        <div className="footer-section">
                            <h5>Quick Links</h5>
                            <ul>
                                <li><Link href="/">Home</Link></li>
                                <li><Link href="/about">About Us</Link></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h5>Legal</h5>
                            <ul>
                                <li><Link href="/privacy">Privacy Policy</Link></li>
                                <li><Link href="/terms">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        © {new Date().getFullYear()} ${siteName}. All rights reserved.
                    </div>
                </footer>
            </body>
        </html>
    );
}
`;
}

function generateHomepage(siteName: string, tagline: string): string {
    return `import { getAllArticles } from '../lib/content';
import Link from 'next/link';

export default function Home() {
    const articles = getAllArticles();
    
    return (
        <>
            <section className="hero">
                <div className="container">
                    <h1>${siteName}</h1>
                    <p className="hero-tagline">${tagline}</p>
                </div>
            </section>
            
            <section className="container">
                {articles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            Fresh content coming soon. Stay tuned!
                        </p>
                    </div>
                ) : (
                    <div className="articles-grid">
                        {articles.map((article) => (
                            <article key={article.slug} className="article-card">
                                <div className="article-card-image">
                                    {article.image || article.featuredImage ? (
                                        <img 
                                            src={article.image || article.featuredImage} 
                                            alt={article.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : '📄'}
                                </div>
                                <div className="article-card-content">
                                    <span className="article-card-category">Article</span>
                                    <h3>
                                        <Link href={\`/\${article.slug}\`}>{article.title}</Link>
                                    </h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                                        {article.description || 'Read this article to learn more...'}
                                    </p>
                                    <div className="article-card-meta">
                                        <span>{article.date}</span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
`;
}

function generateArticlePage(authorName: string, authorRole: string, authorBio: string): string {
    const initials = authorName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    return `import { getArticleBySlug, getAllArticles } from '../../lib/content';
import ReactMarkdown from 'react-markdown';

export async function generateStaticParams() {
    const articles = getAllArticles();
    return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    return {
        title: article?.title || 'Article',
        description: article?.description || '',
    };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    
    if (!article) {
        return (
            <div className="article">
                <div className="content-wrapper" style={{ textAlign: 'center' }}>
                    <h1>Article Not Found</h1>
                    <p>The article you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }
    
    return (
        <article className="article">
            {/* Article Schema for Rich Results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": article.title,
                        "description": article.description,
                        "image": article.image || article.featuredImage,
                        "datePublished": article.date,
                        "author": {
                            "@type": "Person",
                            "name": "${authorName}"
                        }
                    })
                }}
            />
            <header className="article-header">
                <h1>{article.title}</h1>
                <div className="article-meta">
                    <div className="article-author">
                        <span className="author-avatar">${initials}</span>
                        <span>${authorName}</span>
                    </div>
                    <span>•</span>
                    <span>{article.date}</span>
                </div>
            </header>
            
            {/* E-E-A-T Trust Signals */}
            <div className="trust-badges">
                <div className="trust-badge trust-badge--verified">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>Expert Reviewed</span>
                </div>
                <div className="trust-badge trust-badge--updated">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <span>Updated {article.date}</span>
                </div>
            </div>
            
            <div className="article-content">
                <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>
            
            {/* Social Share */}
            <div className="social-share">
                <span className="share-label">Share this article:</span>
                <a 
                    href={\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(article.title)}&url=\${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}\`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-btn--twitter"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </a>
                <a 
                    href={\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}\`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-btn--facebook"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>Share</span>
                </a>
                <a 
                    href={\`https://www.linkedin.com/shareArticle?mini=true&url=\${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=\${encodeURIComponent(article.title)}\`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-btn--linkedin"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span>LinkedIn</span>
                </a>
            </div>
            
            <div className="author-box">
                <div className="author-box-avatar">${initials}</div>
                <div className="author-box-content">
                    <h4>${authorName}</h4>
                    <p className="author-box-role">${authorRole}</p>
                    <p className="author-box-bio">${authorBio}</p>
                </div>
            </div>
        </article>
    );
}
`
}

function generateAboutPage(siteName: string, authorName: string, authorRole: string, authorBio: string): string {
    const initials = authorName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    return `export const metadata = {
        title: 'About Us',
        description: 'Learn more about ${siteName} and our mission.',
    };

    export default function AboutPage() {
        return (
            <div className= "about-page" >
            <h1>About ${siteName} </h1>

                < section className = "about-section" >
                    <h2>Our Mission </h2>
                        <p>
                    We are dedicated to providing you with the most accurate, helpful, and
        up - to - date information.Our goal is to be your trusted resource for 
                    making informed decisions.
                </p>
            </section>

            < section className = "about-section" >
                <h2>What We Do </h2>
                    <p>
                    We research, test, and review products and topics to bring you
        honest, unbiased recommendations.Every piece of content is created
        with your needs in mind.
                </p>
            </section>

            < section className = "about-section" >
                <h2>Meet the Team </h2>
                    < div className = "author-box" >
                        <div className="author-box-avatar" > ${initials} </div>
                            < div className = "author-box-content" >
                                <h4>${authorName} </h4>
                                    < p className = "author-box-role" > ${authorRole} </p>
                                        < p className = "author-box-bio" > ${authorBio} </p>
                                            </div>
                                            </div>
                                            </section>

                                            < section className = "about-section" >
                                                <h2>Contact Us </h2>
                                                    <p>
                    Have questions or feedback ? We'd love to hear from you. 
                    Reach out to us and we'll get back to you as soon as possible.
            </p>
            </section>
            </div>
    );
    }
    `;
}

function generatePrivacyPage(siteName: string): string {
    return `import { getStructuralPage } from '@/lib/content';
import { notFound } from 'next/navigation';

export const metadata = {
    title: 'Privacy Policy',
    description: 'Privacy policy for ${siteName}. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
    const page = getStructuralPage('privacy');
    
    if (!page) {
        return (
            <div className="structural-page">
                <h1>Privacy Policy</h1>
                <p>Privacy policy content coming soon.</p>
            </div>
        );
    }

    return (
        <div className="structural-page">
            <article className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
    );
}
`;
}

function generateTermsPage(siteName: string): string {
    return `import { getStructuralPage } from '@/lib/content';

export const metadata = {
    title: 'Terms of Service',
    description: 'Terms of service for ${siteName}. Read our terms and conditions.',
};

export default function TermsPage() {
    const page = getStructuralPage('terms');
    
    if (!page) {
        return (
            <div className="structural-page">
                <h1>Terms of Service</h1>
                <p>Terms of service content coming soon.</p>
            </div>
        );
    }

    return (
        <div className="structural-page">
            <article className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
    );
}
`;
}

function generateContactPage(siteName: string): string {
    return `import { getStructuralPage } from '@/lib/content';

export const metadata = {
    title: 'Contact Us',
    description: 'Get in touch with ${siteName}. We would love to hear from you.',
};

export default function ContactPage() {
    const page = getStructuralPage('contact');
    
    if (!page) {
        return (
            <div className="structural-page">
                <h1>Contact Us</h1>
                <p>Contact information coming soon.</p>
            </div>
        );
    }

    return (
        <div className="structural-page">
            <article className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
    );
}
`;
}

function generateContentLib(): string {
    return `import fs from 'fs';
    import path from 'path';
    import matter from 'gray-matter';

    const contentDir = path.join(process.cwd(), 'content');

    export interface Article {
        slug: string;
        title: string;
        date: string;
        description: string;
        author?: string;
        category?: string;
        image?: string;
        featuredImage?: string;
        content: string;
    }

    // gray-matter parses YAML dates as Date objects, convert to string
    function formatDate(date: unknown): string {
        if (!date) return new Date().toISOString().split('T')[0];
        if (date instanceof Date) return date.toISOString().split('T')[0];
        if (typeof date === 'string') return date;
        return new Date().toISOString().split('T')[0];
    }

    // Structural page slugs to exclude from article listings
    const STRUCTURAL_SLUGS = ['about', 'privacy', 'terms', 'contact', 'disclaimer'];

    export function getAllArticles(): Article[] {
        if (!fs.existsSync(contentDir)) return [];

        const files = fs.readdirSync(contentDir)
            .filter(f => f.endsWith('.md'))
            .filter(f => !STRUCTURAL_SLUGS.includes(f.replace(/\\.md$/, '')));
        if (files.length === 0) return [];

        return files.map((file) => {
            const slug = file.replace(/\\.md$/, '');
            const fullPath = path.join(contentDir, file);
            const fileContents = fs.readFileSync(fullPath, 'utf8');
            const { data, content } = matter(fileContents);

            return {
                slug,
                title: data.title || slug,
                date: formatDate(data.date),
                description: data.description || '',
                author: data.author,
                category: data.category,
                image: data.image || data.featuredImage,
                featuredImage: data.featuredImage || data.image,
                content
            };
        }).sort((a, b) => (a.date < b.date ? 1 : -1));
    }

    export function getArticleBySlug(slug: string): Article | null {
        try {
            const fullPath = path.join(contentDir, \`\${slug}.md\`);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);
        
        return {
            slug,
            title: data.title || slug,
            date: formatDate(data.date),
            description: data.description || '',
            author: data.author,
            category: data.category,
            image: data.image || data.featuredImage,
            featuredImage: data.featuredImage || data.image,
            content
        };
    } catch {
        return null;
    }
}

    // Interface for structural pages
    export interface StructuralPage {
        slug: string;
        title: string;
        content: string;
        html: string;
    }

    // Simple markdown to HTML converter
    function markdownToHtml(markdown: string): string {
        return markdown
            // Headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Bold and italic
            .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
            .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
            // Links
            .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>')
            // Lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\\/li>\\n?)+/gm, '<ul>$&</ul>')
            // Paragraphs
            .split('\\n\\n')
            .map(para => {
                para = para.trim();
                if (!para) return '';
                if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<li')) return para;
                return '<p>' + para.replace(/\\n/g, ' ') + '</p>';
            })
            .join('\\n');
    }

    // Get structural page (about, privacy, terms, contact)
    export function getStructuralPage(slug: string): StructuralPage | null {
        try {
            const fullPath = path.join(contentDir, \`\${slug}.md\`);
            if (!fs.existsSync(fullPath)) return null;
            
            const fileContents = fs.readFileSync(fullPath, 'utf8');
            const { data, content } = matter(fileContents);
            
            return {
                slug,
                title: data.title || slug.charAt(0).toUpperCase() + slug.slice(1),
                content,
                html: markdownToHtml(content)
            };
        } catch {
            return null;
        }
    }
`;
}
