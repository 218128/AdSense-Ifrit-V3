/**
 * Shared Author Card Component Generator
 * Used in article pages and about pages
 */

export interface AuthorCardConfig {
    authorName: string;
    authorRole: string;
    authorBio: string;
    showCredentials?: boolean;
    variant?: 'full' | 'compact' | 'inline';
}

export function generateAuthorCard(config: AuthorCardConfig): string {
    const { authorName, authorRole, authorBio, variant = 'full' } = config;
    const initials = authorName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    if (variant === 'inline') {
        return `<div className="article-author">
                    <span className="author-avatar">${initials}</span>
                    <span>${authorName}</span>
                </div>`;
    }

    if (variant === 'compact') {
        return `<div className="author-card author-card--compact">
                    <div className="author-avatar">${initials}</div>
                    <div className="author-info">
                        <h4>${authorName}</h4>
                        <p className="author-role">${authorRole}</p>
                    </div>
                </div>`;
    }

    // Full variant (default)
    return `<div className="author-box">
                <div className="author-box-avatar">${initials}</div>
                <div className="author-box-content">
                    <h4>${authorName}</h4>
                    <p className="author-box-role">${authorRole}</p>
                    <p className="author-box-bio">${authorBio}</p>
                </div>
            </div>`;
}

/**
 * Generate CSS for author cards
 */
export function generateAuthorCardStyles(): string {
    return `
/* Author Cards */
.author-box {
    background: var(--color-bg-alt);
    border-radius: 0.75rem;
    padding: 2rem;
    margin-top: 3rem;
    display: flex;
    gap: 1.5rem;
}
.author-box-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 2rem;
    font-weight: bold;
    flex-shrink: 0;
}
.author-box-content h4 {
    margin-bottom: 0.25rem;
}
.author-box-role {
    color: var(--color-primary);
    font-weight: 500;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}
.author-box-bio {
    color: var(--color-text-muted);
    font-size: 0.9375rem;
}

/* Inline author (in article header) */
.article-author {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.author-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 0.875rem;
}

/* Compact author card */
.author-card--compact {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-alt);
    border-radius: 0.5rem;
}
.author-card--compact .author-avatar {
    width: 48px;
    height: 48px;
}
.author-card--compact h4 {
    margin: 0;
    font-size: 1rem;
}
.author-card--compact .author-role {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
}

@media (max-width: 768px) {
    .author-box {
        flex-direction: column;
        text-align: center;
    }
    .author-box-avatar {
        margin: 0 auto;
    }
}
`;
}
