/**
 * Shared Social Share Component Generator
 * Share buttons for articles
 */

export interface SocialShareConfig {
    platforms?: ('twitter' | 'facebook' | 'linkedin' | 'copy')[];
    style?: 'buttons' | 'icons';
}

export function generateSocialShare(config: SocialShareConfig = {}): string {
    const {
        platforms = ['twitter', 'facebook', 'linkedin', 'copy'],
        style = 'buttons'
    } = config;

    const shareButtons = platforms.map(platform => {
        switch (platform) {
            case 'twitter':
                return `<a 
                    href={\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(title)}&url=\${encodeURIComponent(url)}\`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-btn--twitter"
                    aria-label="Share on Twitter"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    ${style === 'buttons' ? '<span>Tweet</span>' : ''}
                </a>`;
            case 'facebook':
                return `<a 
                    href={\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(url)}\`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-btn--facebook"
                    aria-label="Share on Facebook"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    ${style === 'buttons' ? '<span>Share</span>' : ''}
                </a>`;
            case 'linkedin':
                return `<a 
                    href={\`https://www.linkedin.com/shareArticle?mini=true&url=\${encodeURIComponent(url)}&title=\${encodeURIComponent(title)}\`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-btn--linkedin"
                    aria-label="Share on LinkedIn"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    ${style === 'buttons' ? '<span>LinkedIn</span>' : ''}
                </a>`;
            case 'copy':
                return `<button 
                    onClick={() => {
                        navigator.clipboard.writeText(url);
                        alert('Link copied!');
                    }}
                    className="share-btn share-btn--copy"
                    aria-label="Copy link"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    ${style === 'buttons' ? '<span>Copy</span>' : ''}
                </button>`;
            default:
                return '';
        }
    }).join('\n                ');

    return `{(() => {
            const url = typeof window !== 'undefined' ? window.location.href : '';
            const title = article?.title || '';
            return (
                <div className="social-share">
                    <span className="share-label">Share:</span>
                    ${shareButtons}
                </div>
            );
        })()}`;
}

/**
 * Generate CSS for social share buttons
 */
export function generateSocialShareStyles(): string {
    return `
/* Social Share */
.social-share {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1.5rem 0;
    padding: 1rem 0;
    border-top: 1px solid var(--color-border);
}
.share-label {
    font-weight: 500;
    color: var(--color-text-muted);
    font-size: 0.875rem;
}
.share-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}
.share-btn svg {
    flex-shrink: 0;
}
.share-btn--twitter {
    background: #1da1f2;
    color: white;
}
.share-btn--twitter:hover {
    background: #0c85d0;
}
.share-btn--facebook {
    background: #4267B2;
    color: white;
}
.share-btn--facebook:hover {
    background: #365899;
}
.share-btn--linkedin {
    background: #0077b5;
    color: white;
}
.share-btn--linkedin:hover {
    background: #005885;
}
.share-btn--copy {
    background: var(--color-bg-alt);
    color: var(--color-text);
    border: 1px solid var(--color-border);
}
.share-btn--copy:hover {
    background: var(--color-border);
}

@media (max-width: 640px) {
    .social-share {
        flex-wrap: wrap;
    }
    .share-btn span {
        display: none;
    }
    .share-btn {
        padding: 0.5rem;
    }
}
`;
}
