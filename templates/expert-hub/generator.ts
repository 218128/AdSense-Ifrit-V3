/**
 * Expert Hub Template
 * Pillar-focused layout for high-authority niches
 */

import { AISiteDecisions, generateAIDecisionCSS } from '@/lib/aiSiteBuilder';

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
    umamiId?: string;
    aiDecisions?: AISiteDecisions; // AI-generated configuration decisions
}

export function generateTemplateFiles(repoName: string, config?: Partial<SiteConfig>) {
    const siteName = config?.siteName || repoName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const tagline = config?.tagline || 'Expert analysis and guides';
    const authorName = config?.author?.name || 'Review Board';
    const authorRole = config?.author?.role || 'Senior Analyst';
    const authorBio = config?.author?.bio || 'Deep dives into complex topics.';
    const primaryColor = config?.colors?.primary || '#0f172a'; // Slate-900 (Professional/Dark)
    const secondaryColor = config?.colors?.secondary || '#0ea5e9'; // Sky-500
    const adsensePublisherId = config?.adsensePublisherId || '';
    const umamiId = config?.umamiId;
    const aiDecisions = config?.aiDecisions;

    return [
        {
            path: 'package.json',
            content: JSON.stringify({
                name: repoName,
                version: '1.0.0',
                private: true,
                scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
                dependencies: { next: '^14.0.0', react: '^18.2.0', 'react-dom': '^18.2.0', 'gray-matter': '^4.0.3', 'react-markdown': '^9.0.0' },
                devDependencies: { typescript: '^5.0.0', '@types/node': '^20.0.0', '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0' }
            }, null, 2)
        },
        {
            path: 'next.config.js',
            content: `module.exports = { output: 'standalone' };`
        },
        {
            path: 'next-env.d.ts',
            content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />`
        },
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

        // Global CSS + AI Decision CSS
        {
            path: 'app/globals.css',
            content: generateGlobalStyles(primaryColor, secondaryColor) + (aiDecisions ? '\n\n' + generateAIDecisionCSS(aiDecisions) : '')
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
        }
    ];
}

function generateGlobalStyles(primary: string, secondary: string): string {
    return `/* Expert Hub - Clean & Data-Focused */
:root {
  --color-primary: ${primary};
  --color-secondary: ${secondary};
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-text: #334155;
  --color-heading: #0f172a;
  --font-sans: 'Inter', system-ui, sans-serif;
  --max-width: 1024px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans); color: var(--color-text); background: var(--color-bg); line-height: 1.7; font-size: 1.05rem; }

h1, h2, h3, h4, h5, h6 { color: var(--color-heading); font-weight: 700; letter-spacing: -0.01em; }
h1 { font-size: 3rem; letter-spacing: -0.03em; }

a { color: var(--color-secondary); text-decoration: none; font-weight: 500; }
a:hover { text-decoration: underline; }

.container { max-width: var(--max-width); margin: 0 auto; padding: 0 1.5rem; }

.header { background: var(--color-surface); border-bottom: 1px solid #e2e8f0; padding: 1.5rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.header-inner { display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.5rem; font-weight: 800; color: var(--color-primary); display: flex; align-items: center; gap: 0.5rem; }
.logo::before { content: ''; width: 24px; height: 24px; background: var(--color-secondary); border-radius: 4px; }
.nav { display: flex; gap: 1.5rem; font-size: 0.9rem; }
.nav a { color: var(--color-text); }
.nav a:hover { color: var(--color-secondary); }

.hero { background: var(--color-heading); color: white; padding: 4rem 0; text-align: center; margin-bottom: 2rem; }
.hero h1 { color: white; margin-bottom: 1rem; }
.hero p { color: #94a3b8; font-size: 1.25rem; max-width: 600px; margin: 0 auto; }

.section-title { border-left: 4px solid var(--color-secondary); padding-left: 1rem; margin: 3rem 0 1.5rem; font-size: 1.5rem; }

.card { background: var(--color-surface); border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; }
.card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: var(--color-secondary); }
.card h3 { font-size: 1.25rem; margin-bottom: 0.75rem; }
.card h3 a { color: var(--color-heading); }
.card h3 a:hover { color: var(--color-secondary); text-decoration: none; }
.card-meta { font-size: 0.875rem; color: #64748b; margin-top: 1rem; display: flex; gap: 1rem; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 1.5rem; }

.footer { background: white; border-top: 1px solid #e2e8f0; margin-top: 4rem; padding: 3rem 0; font-size: 0.875rem; }

@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
`;
}

function generateLayoutComponent(siteName: string, tagline: string, adsensePublisherId?: string, umamiId?: string): string {
    return `import './globals.css';
import Link from 'next/link';
export const metadata = { title: '${siteName}', description: '${tagline}' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                ${adsensePublisherId ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}" crossOrigin="anonymous" />` : ''}
                ${umamiId ? `<script defer src="https://cloud.umami.is/script.js" data-website-id="${umamiId}"></script>` : ''}
            </head>
            <body>
                <header className="header">
                    <div className="container header-inner">
                        <Link href="/" className="logo">${siteName}</Link>
                        <nav className="nav">
                            <Link href="/">Insights</Link>
                            <Link href="/about">Expertise</Link>
                        </nav>
                    </div>
                </header>
                <main>{children}</main>
                <footer className="footer">
                    <div className="container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>© ${new Date().getFullYear()} ${siteName}</div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Link href="/privacy">Privacy</Link>
                                <Link href="/terms">Terms</Link>
                            </div>
                        </div>
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
        <div>
            <section className="hero">
                <div className="container">
                    <h1>${siteName}</h1>
                    <p>${tagline}</p>
                </div>
            </section>
            
            <div className="container">
                <h2 className="section-title">Latest Analysis</h2>
                {articles.length > 0 ? (
                    <div className="grid">
                        {articles.map((article) => (
                            <article key={article.slug} className="card">
                                <h3><Link href={\`/\${article.slug}\`}>{article.title}</Link></h3>
                                <p style={{ color: '#475569' }}>{article.description}</p>
                                <div className="card-meta">
                                    <span>📅 {article.date}</span>
                                    <span>👤 {article.author || 'Analyst'}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', margin: '4rem 0', color: '#94a3b8' }}>Establishing data connection...</p>
                )}
            </div>
        </div>
    );
}
`;
}

function generateArticlePage(name: string, role: string, bio: string) {
    return `import { getArticleBySlug, getAllArticles } from '../../lib/content';
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
    if (!article) return <div>404</div>;
    return (
        <article className="container" style={{ marginTop: '3rem', marginBottom: '4rem' }}>
            <header style={{ marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{article.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#64748b' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--color-primary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        ${name.charAt(0)}
                    </div>
                    <div>
                        <div style={{ color: 'var(--color-heading)', fontWeight: '600' }}>${name}</div>
                        <div style={{ fontSize: '0.875rem' }}>${role} • {article.date}</div>
                    </div>
                </div>
            </header>
            <div style={{ fontSize: '1.125rem', maxWidth: '750px' }}>
                <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>
            <div style={{ marginTop: '4rem', background: '#f1f5f9', padding: '2rem', borderRadius: '0.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>About the Author</h4>
                <p><strong>${name}</strong> is a ${role} specializing in this domain. ${bio}</p>
            </div>
        </article>
    );
}
`;
}

function generateAboutPage(siteName: string, _name: string, _role: string, _bio: string) {
    return `import { getStructuralPage } from '@/lib/content';

export const metadata = {
    title: 'About Us',
    description: 'Learn more about ${siteName}.',
};

export default function About() {
    const page = getStructuralPage('about');
    
    if (!page) {
        return (
            <div className="container" style={{ padding: '4rem 1.5rem' }}>
                <h1>About Us</h1>
                <p className="lead" style={{ fontSize: '1.25rem', color: '#64748b' }}>We provide data-driven insights for professionals.</p>
            </div>
        );
    }

    return (
        <div className="container structural-page" style={{ padding: '4rem 1.5rem' }}>
            <article className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
    );
}`;
}

function generatePrivacyPage(siteName: string): string {
    return `import { getStructuralPage } from '@/lib/content';

export const metadata = {
    title: 'Privacy Policy',
    description: 'Privacy policy for ${siteName}.',
};

export default function PrivacyPage() {
    const page = getStructuralPage('privacy');
    
    if (!page) {
        return (
            <div className="container structural-page" style={{ padding: '4rem 1.5rem' }}>
                <h1>Privacy Policy</h1>
                <p>Privacy policy content coming soon.</p>
            </div>
        );
    }

    return (
        <div className="container structural-page" style={{ padding: '4rem 1.5rem' }}>
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
    description: 'Terms of service for ${siteName}.',
};

export default function TermsPage() {
    const page = getStructuralPage('terms');
    
    if (!page) {
        return (
            <div className="container structural-page" style={{ padding: '4rem 1.5rem' }}>
                <h1>Terms of Service</h1>
                <p>Terms of service content coming soon.</p>
            </div>
        );
    }

    return (
        <div className="container structural-page" style={{ padding: '4rem 1.5rem' }}>
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
    description: 'Get in touch with ${siteName}.',
};

export default function ContactPage() {
    const page = getStructuralPage('contact');
    
    if (!page) {
        return (
            <div className="container structural-page" style={{ padding: '4rem 1.5rem' }}>
                <h1>Contact Us</h1>
                <p>Contact information coming soon.</p>
            </div>
        );
    }

    return (
        <div className="container structural-page" style={{ padding: '4rem 1.5rem' }}>
            <article className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
    );
}
`;
}

function generateContentLib() {
    return `import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'content');

// Structural page slugs to exclude from article listings
const STRUCTURAL_SLUGS = ['about', 'privacy', 'terms', 'contact', 'disclaimer'];

export function getAllArticles() {
    if (!fs.existsSync(contentDir)) return [];
    const files = fs.readdirSync(contentDir)
        .filter(f => f.endsWith('.md'))
        .filter(f => !STRUCTURAL_SLUGS.includes(f.replace(/\\.md$/, '')));
    return files.map((file) => {
        const { data, content } = matter(fs.readFileSync(path.join(contentDir, file), 'utf8'));
        return { slug: file.replace(/\\.md$/, ''), title: data.title, date: data.date, description: data.description, author: data.author, content };
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticleBySlug(slug: string) {
    try {
        const { data, content } = matter(fs.readFileSync(path.join(contentDir, \`\${slug}.md\`), 'utf8'));
        return { slug, title: data.title, date: data.date, description: data.description, author: data.author, content };
    } catch { return null; }
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
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\\/li>\\n?)+/gm, '<ul>$&</ul>')
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
