/**
 * E-E-A-T Generator
 * 
 * Generates Experience, Expertise, Authoritativeness, and Trustworthiness
 * signals for authority sites optimized for Google's quality guidelines.
 */

export interface AuthorProfile {
    name: string;
    role: string;
    bio: string;
    credentials?: string[];
    experience?: string;      // Years or specific experience
    specializations?: string[];
    socialLinks?: {
        twitter?: string;
        linkedin?: string;
        website?: string;
    };
    imageUrl?: string;
}

export interface EEATConfig {
    author: AuthorProfile;
    siteName: string;
    niche: string;
    domain: string;
    foundedYear?: number;
    factCheckPolicy: boolean;
    editorialPolicy: boolean;
    updatePolicy: boolean;
}

export interface EEATPages {
    about: string;
    editorial: string;
    authorSchema: string;
    articleSchema: (title: string, description: string, date: string) => string;
}

// ============================================
// PAGE GENERATORS
// ============================================

/**
 * Generate comprehensive About page with E-E-A-T signals
 */
export function generateAboutPage(config: EEATConfig): string {
    const { author, siteName, niche, foundedYear } = config;
    const year = foundedYear || new Date().getFullYear();

    return `import Link from 'next/link';

export const metadata = {
    title: 'About Us - ${siteName}',
    description: 'Learn about ${siteName}, our expert team, and our commitment to providing accurate, well-researched ${niche} content.',
};

export default function AboutPage() {
    return (
        <div className="container" style={{ maxWidth: '800px', padding: '3rem 1.5rem' }}>
            {/* Hero Section */}
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>About ${siteName}</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>
                    Your trusted source for expert ${niche} insights since ${year}.
                </p>
            </header>
            
            {/* Mission Statement */}
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Our Mission</h2>
                <p style={{ lineHeight: '1.8' }}>
                    At ${siteName}, we're committed to providing accurate, actionable, and 
                    well-researched content in the ${niche} space. Every article is crafted 
                    by experts with real-world experience, ensuring you get insights you can trust.
                </p>
            </section>
            
            {/* Meet the Expert */}
            <section style={{ 
                marginBottom: '3rem', 
                padding: '2rem', 
                background: 'var(--color-bg-alt, #f8fafc)', 
                borderRadius: '1rem' 
            }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Meet Our Expert</h2>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                    <div style={{ 
                        width: '100px', 
                        height: '100px', 
                        borderRadius: '50%', 
                        background: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        flexShrink: 0
                    }}>
                        ${author.name.charAt(0)}
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>${author.name}</h3>
                        <p style={{ color: 'var(--color-primary)', fontWeight: '600', marginBottom: '0.75rem' }}>
                            ${author.role}
                        </p>
                        <p style={{ lineHeight: '1.7', marginBottom: '1rem' }}>${author.bio}</p>
                        ${author.credentials ? `
                        <div style={{ marginTop: '1rem' }}>
                            <strong>Credentials:</strong>
                            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                                ${author.credentials.map(c => `<li>${c}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        ${author.experience ? `
                        <p style={{ marginTop: '1rem' }}>
                            <strong>Experience:</strong> ${author.experience}
                        </p>
                        ` : ''}
                    </div>
                </div>
            </section>
            
            {/* Trust Signals */}
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Our Commitment to Quality</h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.5rem' }}>✓</span>
                        <div>
                            <strong>Expert-Written Content</strong>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                All content is written by professionals with hands-on experience in ${niche}.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.5rem' }}>✓</span>
                        <div>
                            <strong>Fact-Checked Information</strong>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                We verify claims with credible sources and update content regularly.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.5rem' }}>✓</span>
                        <div>
                            <strong>Transparent & Unbiased</strong>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                We disclose any affiliations and maintain editorial independence.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Contact */}
            <section>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Get in Touch</h2>
                <p>
                    Have questions or feedback? We'd love to hear from you.
                </p>
                <p style={{ marginTop: '1rem' }}>
                    <Link href="/contact" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                        Contact Us →
                    </Link>
                </p>
            </section>
        </div>
    );
}
`;
}

/**
 * Generate Editorial Policy page
 */
export function generateEditorialPolicyPage(config: EEATConfig): string {
    const { siteName, niche, author } = config;

    return `export const metadata = {
    title: 'Editorial Policy - ${siteName}',
    description: 'Learn about our editorial standards, fact-checking process, and commitment to quality ${niche} content.',
};

export default function EditorialPolicyPage() {
    return (
        <div className="container" style={{ maxWidth: '800px', padding: '3rem 1.5rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Editorial Policy</h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)', marginBottom: '3rem' }}>
                At ${siteName}, we maintain rigorous editorial standards to ensure every piece of content 
                meets the highest quality benchmarks.
            </p>
            
            <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Content Creation Process</h2>
                <ol style={{ paddingLeft: '1.5rem', lineHeight: '2' }}>
                    <li><strong>Research:</strong> Every article begins with comprehensive research from authoritative sources.</li>
                    <li><strong>Expert Writing:</strong> Content is written by ${author.name}, a ${author.role} with expertise in ${niche}.</li>
                    <li><strong>Fact-Checking:</strong> All claims are verified against primary sources before publication.</li>
                    <li><strong>Review:</strong> Content undergoes editorial review for accuracy, clarity, and completeness.</li>
                    <li><strong>Updates:</strong> Articles are regularly reviewed and updated to ensure ongoing accuracy.</li>
                </ol>
            </section>
            
            <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Our Standards</h2>
                <ul style={{ paddingLeft: '1.5rem', lineHeight: '2' }}>
                    <li><strong>Accuracy:</strong> We cite credible sources and verify all factual claims.</li>
                    <li><strong>Transparency:</strong> We clearly disclose any affiliations, sponsorships, or conflicts of interest.</li>
                    <li><strong>Expertise:</strong> Content is created by qualified professionals with real-world experience.</li>
                    <li><strong>Objectivity:</strong> We present balanced perspectives and clearly label opinions.</li>
                    <li><strong>Timeliness:</strong> We update content when new information becomes available.</li>
                </ul>
            </section>
            
            <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Corrections Policy</h2>
                <p style={{ lineHeight: '1.8' }}>
                    If we discover an error in our content, we will promptly correct it and note the correction 
                    at the end of the article. For significant corrections, we will update the article's date 
                    and add an editor's note explaining the change.
                </p>
            </section>
            
            <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Affiliate Disclosure</h2>
                <p style={{ lineHeight: '1.8' }}>
                    Some articles may contain affiliate links. This means we may earn a commission if you make 
                    a purchase through our links, at no additional cost to you. This never influences our 
                    editorial recommendations—we only recommend products and services we genuinely believe in.
                </p>
            </section>
            
            <section>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Contact Us</h2>
                <p style={{ lineHeight: '1.8' }}>
                    If you have questions about our editorial policy or would like to report an error, 
                    please contact us at <strong>editorial@${config.domain}</strong>.
                </p>
            </section>
        </div>
    );
}
`;
}

/**
 * Generate JSON-LD Author Schema
 */
export function generateAuthorSchema(author: AuthorProfile, siteUrl: string): string {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": author.name,
        "jobTitle": author.role,
        "description": author.bio,
        "url": `${siteUrl}/about`,
        ...(author.socialLinks?.twitter && {
            "sameAs": [
                author.socialLinks.twitter,
                author.socialLinks?.linkedin,
                author.socialLinks?.website
            ].filter(Boolean)
        })
    };

    return JSON.stringify(schema, null, 2);
}

/**
 * Generate JSON-LD Article Schema with E-E-A-T signals
 */
export function generateArticleSchema(
    config: EEATConfig,
    article: { title: string; description: string; date: string; slug: string }
): string {
    const { author, siteName, domain } = config;
    const siteUrl = `https://${domain}`;

    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.description,
        "datePublished": article.date,
        "dateModified": article.date,
        "author": {
            "@type": "Person",
            "name": author.name,
            "jobTitle": author.role,
            "description": author.bio,
            "url": `${siteUrl}/about`
        },
        "publisher": {
            "@type": "Organization",
            "name": siteName,
            "url": siteUrl,
            "logo": {
                "@type": "ImageObject",
                "url": `${siteUrl}/logo.png`
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${siteUrl}/${article.slug}`
        }
    };

    return JSON.stringify(schema, null, 2);
}

/**
 * Generate FAQ Schema for AI Overview optimization
 */
export function generateFAQSchema(
    faqs: { question: string; answer: string }[]
): string {
    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return JSON.stringify(schema, null, 2);
}

/**
 * Generate HowTo Schema for step-by-step guides
 */
export function generateHowToSchema(
    title: string,
    description: string,
    steps: { name: string; text: string }[],
    totalTime?: string
): string {
    const schema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": title,
        "description": description,
        ...(totalTime && { "totalTime": totalTime }),
        "step": steps.map((step, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": step.name,
            "text": step.text
        }))
    };

    return JSON.stringify(schema, null, 2);
}

// ============================================
// E-E-A-T SIGNAL INJECTORS
// ============================================

export interface EEATSignal {
    type: 'experience' | 'expertise' | 'authority' | 'trust';
    marker: string;
    description: string;
}

/**
 * Get E-E-A-T signals based on content type
 */
export function getEEATSignalsForContentType(signals: string[]): EEATSignal[] {
    const signalMap: Record<string, EEATSignal> = {
        'hands_on_experience': {
            type: 'experience',
            marker: '✅ Tested & Verified',
            description: 'Based on hands-on testing and real-world usage'
        },
        'expert_definition': {
            type: 'expertise',
            marker: '📚 Expert Definition',
            description: 'Clear, authoritative definition from domain expert'
        },
        'source_citations': {
            type: 'trust',
            marker: '🔗 Sources Cited',
            description: 'All claims backed by credible sources'
        },
        'step_by_step': {
            type: 'experience',
            marker: '📋 Step-by-Step',
            description: 'Actionable steps based on practical experience'
        },
        'faq_section': {
            type: 'authority',
            marker: '❓ FAQ',
            description: 'Comprehensive answers to common questions'
        },
        'expert_tips': {
            type: 'expertise',
            marker: '💡 Expert Tips',
            description: 'Professional insights and recommendations'
        },
        'fact_checking': {
            type: 'trust',
            marker: '✓ Fact-Checked',
            description: 'Verified by our editorial team'
        },
        'expert_quotes': {
            type: 'authority',
            marker: '💬 Expert Quote',
            description: 'Insights from industry professionals'
        },
        'original_research': {
            type: 'authority',
            marker: '📊 Original Research',
            description: 'Based on our own data analysis'
        },
        'data_visualization': {
            type: 'expertise',
            marker: '📈 Data',
            description: 'Clear data visualizations and analysis'
        },
        'screenshots': {
            type: 'experience',
            marker: '🖼️ Screenshots',
            description: 'Visual proof from actual usage'
        },
        'pro_tips': {
            type: 'experience',
            marker: '⭐ Pro Tip',
            description: 'Advanced tips from experienced practitioners'
        },
        'comprehensive_coverage': {
            type: 'authority',
            marker: '📖 Comprehensive',
            description: 'Complete coverage of the topic'
        },
        'case_studies': {
            type: 'experience',
            marker: '📋 Case Study',
            description: 'Real-world examples and analysis'
        },
        'hands_on_testing': {
            type: 'experience',
            marker: '🧪 Tested',
            description: 'Personally tested and reviewed'
        },
        'comparison_table': {
            type: 'expertise',
            marker: '⚖️ Comparison',
            description: 'Side-by-side analysis'
        },
        'verdict': {
            type: 'authority',
            marker: '🏆 Verdict',
            description: 'Clear recommendation from expert'
        },
        'expert_solutions': {
            type: 'expertise',
            marker: '🔧 Solution',
            description: 'Expert-verified solutions'
        },
        'industry_expertise': {
            type: 'authority',
            marker: '🏢 Industry Expert',
            description: 'Insights from industry professionals'
        },
        'real_examples': {
            type: 'experience',
            marker: '📝 Real Example',
            description: 'Actual examples from practice'
        },
        'up_to_date': {
            type: 'trust',
            marker: '🔄 Updated',
            description: 'Regularly reviewed and updated'
        },
        'expert_picks': {
            type: 'authority',
            marker: '⭐ Expert Pick',
            description: 'Curated by domain experts'
        },
        'clear_rankings': {
            type: 'expertise',
            marker: '🥇 Ranked',
            description: 'Clear, justified rankings'
        },
        'data_backed': {
            type: 'trust',
            marker: '📊 Data-Backed',
            description: 'Supported by data and research'
        },
        'expert_opinions': {
            type: 'authority',
            marker: '💭 Expert Opinion',
            description: 'Professional perspective shared'
        },
        'comprehensive_authority': {
            type: 'authority',
            marker: '🏛️ Definitive Guide',
            description: 'The authoritative resource on this topic'
        },
        'expert_authorship': {
            type: 'expertise',
            marker: '👤 Expert Author',
            description: 'Written by a qualified expert'
        },
        'regular_updates': {
            type: 'trust',
            marker: '📅 Maintained',
            description: 'Regularly updated for accuracy'
        }
    };

    return signals
        .map(signal => signalMap[signal])
        .filter((signal): signal is EEATSignal => signal !== undefined);
}

/**
 * Generate E-E-A-T badge HTML for article
 */
export function generateEEATBadges(signals: EEATSignal[]): string {
    return signals
        .map(signal => `<span class="eeat-badge eeat-${signal.type}" title="${signal.description}">${signal.marker}</span>`)
        .join(' ');
}

/**
 * Generate all E-E-A-T pages for a site
 */
export function generateAllEEATPages(config: EEATConfig): {
    path: string;
    content: string;
}[] {
    return [
        {
            path: 'app/about/page.tsx',
            content: generateAboutPage(config)
        },
        {
            path: 'app/editorial-policy/page.tsx',
            content: generateEditorialPolicyPage(config)
        }
    ];
}
