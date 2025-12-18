/**
 * Author Credentials Component Generator
 * Displays author expertise and credentials for E-E-A-T
 */

/**
 * Generate Enhanced Author Card with Credentials
 */
export function generateAuthorCredentials(): string {
    return `
// Enhanced Author Card with Credentials
function AuthorWithCredentials({ 
    name, 
    role, 
    bio, 
    credentials = [],
    yearsExperience
}: {
    name: string;
    role: string;
    bio: string;
    credentials?: string[];
    yearsExperience?: number;
}) {
    const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    
    return (
        <div className="author-credentials">
            <div className="author-credentials-avatar">{initials}</div>
            <div className="author-credentials-content">
                <div className="author-credentials-header">
                    <h4>{name}</h4>
                    <span className="author-credentials-role">{role}</span>
                </div>
                
                {(credentials.length > 0 || yearsExperience) && (
                    <div className="author-credentials-badges">
                        {yearsExperience && (
                            <span className="credential-badge credential-badge--experience">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                {yearsExperience}+ Years Experience
                            </span>
                        )}
                        {credentials.map((cred, i) => (
                            <span key={i} className="credential-badge">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                                </svg>
                                {cred}
                            </span>
                        ))}
                    </div>
                )}
                
                <p className="author-credentials-bio">{bio}</p>
            </div>
        </div>
    );
}`;
}

/**
 * Generate Author Credentials CSS
 */
export function generateAuthorCredentialsStyles(): string {
    return `
/* Author Credentials */
.author-credentials {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, var(--color-bg-alt), var(--color-bg));
    border: 1px solid var(--color-border);
    border-radius: 1rem;
    margin-top: 2rem;
}
.author-credentials-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    flex-shrink: 0;
}
.author-credentials-content {
    flex: 1;
}
.author-credentials-header {
    margin-bottom: 0.5rem;
}
.author-credentials-header h4 {
    margin: 0;
    font-size: 1.125rem;
}
.author-credentials-role {
    color: var(--color-primary);
    font-size: 0.875rem;
    font-weight: 500;
}
.author-credentials-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.75rem 0;
}
.credential-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.625rem;
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-muted);
}
.credential-badge svg {
    color: var(--color-primary);
}
.credential-badge--experience {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #059669;
}
.credential-badge--experience svg {
    color: #059669;
}
.author-credentials-bio {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    line-height: 1.6;
}

@media (max-width: 640px) {
    .author-credentials {
        flex-direction: column;
        text-align: center;
    }
    .author-credentials-avatar {
        margin: 0 auto;
    }
    .author-credentials-badges {
        justify-content: center;
    }
}
`;
}
