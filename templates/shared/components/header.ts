/**
 * Shared Header Component Generator
 * Used by all template types
 */

export interface HeaderConfig {
    siteName: string;
    initials: string;
    navLinks?: Array<{ href: string; label: string }>;
}

export function generateHeader(config: HeaderConfig): string {
    const { siteName, initials, navLinks = [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' }
    ] } = config;

    const navLinksJsx = navLinks
        .map(link => `<Link href="${link.href}">${link.label}</Link>`)
        .join('\n                            ');

    return `<header className="header">
                    <div className="header-inner">
                        <Link href="/" className="logo">
                            <span className="logo-icon">${initials}</span>
                            <span>${siteName}</span>
                        </Link>
                        <nav className="nav">
                            ${navLinksJsx}
                        </nav>
                    </div>
                </header>`;
}
