/**
 * Topical Magazine Template
 * Multi-category layout for broader niches
 */

export interface SiteConfig {
    siteName: string;
    tagline: string;
    domain: string;
    adsensePublisherId?: string;
    author: {
        name: string;
        role: string;
        bio: string;
    };
    colors: {
        primary: string;
        secondary: string;
    };
    umamiId?: string; // Optional Umami Website ID
}

export function generateTemplateFiles(repoName: string, config?: Partial<SiteConfig>) {
    const siteName = config?.siteName || repoName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const tagline = config?.tagline || 'Your daily dose of insights';
    const authorName = config?.author?.name || 'Editorial Staff';
    const authorRole = config?.author?.role || 'Editor';
    const authorBio = config?.author?.bio || 'Curating the best stories for you.';
    const primaryColor = config?.colors?.primary || '#db2777'; // Pink-600 for Magazine
    const secondaryColor = config?.colors?.secondary || '#8b5cf6'; // Violet-500
    const adsensePublisherId = config?.adsensePublisherId || '';
    const umamiId = config?.umamiId;

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

        // Global CSS
        {
            path: 'app/globals.css',
            content: generateGlobalStyles(primaryColor, secondaryColor)
        },

        // Layout
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

        // Content library
        {
            path: 'lib/content.ts',
            content: generateContentLib()
        },

        // Content placeholder
        {
            path: 'content/.gitkeep',
            content: '# Articles will be pushed here\n'
        }
    ];
}

function generateGlobalStyles(primary: string, secondary: string): string {
    return `/* Topical Magazine - Vibrant & Dynamic */
:root {
  --color-primary: ${primary};
  --color-primary-dark: ${adjustColor(primary, -20)};
  --color-secondary: ${secondary};
  --color-bg: #ffffff;
  --color-bg-alt: #f3f4f6;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --font-sans: 'Inter', system-ui, sans-serif;
  --max-width: 1400px; /* Wider for magazine */
  --content-width: 800px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans); color: var(--color-text); background: var(--color-bg); line-height: 1.6; }

h1, h2, h3, h4, h5, h6 { font-weight: 800; letter-spacing: -0.025em; line-height: 1.1; }
h1 { font-size: 3.5rem; }

a { color: inherit; text-decoration: none; transition: color 0.2s; }
a:hover { color: var(--color-primary); }

.container { max-width: var(--max-width); margin: 0 auto; padding: 0 2rem; }

/* Magazine Header */
.header { border-bottom: 4px solid var(--color-primary); padding: 2rem 0; margin-bottom: 3rem; }
.header-inner { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.logo { font-size: 2.5rem; font-weight: 900; background: linear-gradient(to right, var(--color-primary), var(--color-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.tagline { font-family: serif; font-style: italic; font-size: 1.25rem; color: var(--color-text-muted); }
.nav { display: flex; gap: 2rem; margin-top: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.875rem; }

/* Magazine Grid */
.hero-section { margin-bottom: 4rem; }
.hero-article { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; background: var(--color-bg-alt); border-radius: 1rem; overflow: hidden; }
.hero-image { background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); min-height: 400px; display: flex; align-items: center; justify-content: center; font-size: 5rem; color: white; }
.hero-content { padding: 3rem; display: flex; flex-direction: column; justify-content: center; }
.hero-category { color: var(--color-primary); font-weight: 700; text-transform: uppercase; font-size: 0.875rem; margin-bottom: 1rem; }
.hero-title { font-size: 2.5rem; margin-bottom: 1rem; }
.hero-excerpt { font-size: 1.125rem; color: var(--color-text-muted); margin-bottom: 2rem; }

.articles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 3rem; }
.article-card-image { aspect-ratio: 16/10; background: var(--color-bg-alt); border-radius: 0.5rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: var(--color-text-muted); }
.article-card h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }

/* Article Page */
.article-header { text-align: center; max-width: 900px; margin: 0 auto 4rem; }
.article-content { max-width: var(--content-width); margin: 0 auto; font-size: 1.125rem; }
.article-content p { margin-bottom: 1.5rem; }

/* Footer */
.footer { background: #111827; color: white; padding: 4rem 0; margin-top: 6rem; }
.footer a:hover { color: var(--color-primary); }

@media (max-width: 768px) {
  .hero-article { grid-template-columns: 1fr; }
  h1 { font-size: 2.5rem; }
}
`;
}

function adjustColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function generateLayoutComponent(siteName: string, tagline: string, adsensePublisherId?: string, umamiId?: string): string {
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
                ${adsensePublisherId ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}" crossOrigin="anonymous" />` : ''}
                {/* Umami Analytics - Optional */}
                ${umamiId ? `<script defer src="https://cloud.umami.is/script.js" data-website-id="${umamiId}"></script>` : ''}
            </head>
            <body>
                <header className="header">
                    <div className="container header-inner">
                        <Link href="/" className="logo">${siteName}</Link>
                        <p className="tagline">${tagline}</p>
                        <nav className="nav">
                            <Link href="/">Home</Link>
                            <Link href="/about">About</Link>
                            <Link href="/privacy">Privacy</Link>
                        </nav>
                    </div>
                </header>
                
                <main>{children}</main>
                
                <footer className="footer">
                    <div className="container" style={{ textAlign: 'center' }}>
                        <h4 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>${siteName}</h4>
                        <p style={{ color: '#9ca3af', maxWidth: '600px', margin: '0 auto 2rem' }}>${tagline}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                            <Link href="/">Home</Link>
                            <Link href="/about">About Us</Link>
                            <Link href="/privacy">Privacy Policy</Link>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            © {new Date().getFullYear()} ${siteName}. All rights reserved.
                        </p>
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
    const featured = articles[0];
    const rest = articles.slice(1);
    
    return (
        <div className="container">
            {featured ? (
                <section className="hero-section">
                    <article className="hero-article">
                        <div className="hero-image">★</div>
                        <div className="hero-content">
                            <span className="hero-category">Featured Story</span>
                            <h2 className="hero-title">
                                <Link href={\`/\${featured.slug}\`}>{featured.title}</Link>
                            </h2>
                            <p className="hero-excerpt">
                                {featured.description || 'Read the full story to learn more about this detailed topic...'}
                            </p>
                            <Link href={\`/\${featured.slug}\`} style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                                Read Article →
                            </Link>
                        </div>
                    </article>
                </section>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <p>No articles yet.</p>
                </div>
            )}
            
            <section className="articles-grid">
                {rest.map((article) => (
                    <article key={article.slug} className="article-card">
                        <div className="article-card-image">📄</div>
                        <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Article</span>
                        <h3>
                            <Link href={\`/\${article.slug}\`}>{article.title}</Link>
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            {article.description}
                        </p>
                    </article>
                ))}
            </section>
        </div>
    );
}
`;
}

// Re-use standard generators for pages
function generateArticlePage(name: string, role: string, bio: string) {
    return \`import { getArticleBySlug, getAllArticles } from '../../lib/content';
import ReactMarkdown from 'react-markdown';

export async function generateStaticParams() {
    const articles = getAllArticles();
    return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    return { title: article?.title, description: article?.description };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);
    if (!article) return <div>Not Found</div>;
    
    return (
        <article>
            <header className="article-header">
                <div className="container">
                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>
                        {article.category || 'Opinion'}
                    </span>
                    <h1>{article.title}</h1>
                    <div style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
                        By <span style={{ color: 'var(--color-text)', fontWeight: 'bold' }}>${name}</span> • {article.date}
                    </div>
                </div>
            </header>
            
            <div className="article-content">
                <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>
        </article>
    );
}
\`; }

function generateAboutPage(siteName: string, name: string, role: string, bio: string) { return \`export default function About() {
    return (
        <div className="container" style={{ maxWidth: '800px', padding: '4rem 2rem' }}>
            <h1>About ${siteName}</h1>
            <p className="lead" style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                We are a digital magazine dedicated to bringing you the freshest perspectives.
            </p>
            <div style={{ background: 'var(--color-bg-alt)', padding: '2rem', borderRadius: '1rem' }}>
                <h3>Editorial Team</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '60px', height: '60px', background: 'var(--color-primary)', borderRadius: '50%' }}></div>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>${name}</div>
                        <div style={{ fontSize: '0.875rem' }}>${role}</div>
                    </div>
                </div>
                <p style={{ marginTop: '1rem' }}>${bio}</p>
            </div>
        </div>
    );
}\`; }

function generateContentLib() { return \`import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'content');

export interface Article {
    slug: string;
    title: string;
    date: string;
    description: string;
    category?: string;
    content: string;
}

export function getAllArticles(): Article[] {
    if (!fs.existsSync(contentDir)) return [];
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
    return files.map((file) => {
        const slug = file.replace(/\\.md$/, '');
        const { data, content } = matter(fs.readFileSync(path.join(contentDir, file), 'utf8'));
        return {
            slug,
            title: data.title || slug,
            date: data.date || new Date().toISOString().split('T')[0],
            description: data.description || '',
            category: data.category,
            content
        };
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticleBySlug(slug: string): Article | null {
    try {
        const { data, content } = matter(fs.readFileSync(path.join(contentDir, \`\${slug}.md\`), 'utf8'));
        return {
            slug,
            title: data.title || slug,
            date: data.date || new Date().toISOString().split('T')[0],
            description: data.description || '',
            category: data.category,
            content
        };
    } catch { return null; }
}
\`; }
