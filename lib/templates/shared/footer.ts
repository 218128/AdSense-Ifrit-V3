/**
 * Shared Footer Component Generator
 * Used by all template types
 */

export interface FooterConfig {
    siteName: string;
    tagline: string;
    quickLinks?: Array<{ href: string; label: string }>;
    legalLinks?: Array<{ href: string; label: string }>;
}

export function generateFooter(config: FooterConfig): string {
    const {
        siteName,
        tagline,
        quickLinks = [
            { href: '/', label: 'Home' },
            { href: '/about', label: 'About Us' }
        ],
        legalLinks = [
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/terms', label: 'Terms of Service' }
        ]
    } = config;

    const quickLinksJsx = quickLinks
        .map(link => `<li><Link href="${link.href}">${link.label}</Link></li>`)
        .join('\n                                ');

    const legalLinksJsx = legalLinks
        .map(link => `<li><Link href="${link.href}">${link.label}</Link></li>`)
        .join('\n                                ');

    return `<footer className="footer">
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
                                ${quickLinksJsx}
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h5>Legal</h5>
                            <ul>
                                ${legalLinksJsx}
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        © {new Date().getFullYear()} ${siteName}. All rights reserved.
                    </div>
                </footer>`;
}
