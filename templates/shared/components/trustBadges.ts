/**
 * Trust Badges Component Generator
 * Visual trust indicators for E-E-A-T signals
 */

export interface TrustBadgeConfig {
    showSecure?: boolean;
    showVerified?: boolean;
    showUpdated?: boolean;
}

/**
 * Generate Trust Badges component
 */
export function generateTrustBadges(): string {
    return `
// Trust Badges Component
function TrustBadges({ showSecure = true, showVerified = true, showUpdated = true }: {
    showSecure?: boolean;
    showVerified?: boolean;
    showUpdated?: boolean;
}) {
    return (
        <div className="trust-badges">
            {showSecure && (
                <div className="trust-badge trust-badge--secure">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                    </svg>
                    <span>Secure Site</span>
                </div>
            )}
            {showVerified && (
                <div className="trust-badge trust-badge--verified">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>Verified Content</span>
                </div>
            )}
            {showUpdated && (
                <div className="trust-badge trust-badge--updated">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <span>Recently Updated</span>
                </div>
            )}
        </div>
    );
}`;
}

/**
 * Generate inline trust badges for articles
 */
export function generateInlineTrustBadges(): string {
    return `<div className="trust-badges">
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
            </div>`;
}

/**
 * Generate Trust Badges CSS
 */
export function generateTrustBadgesStyles(): string {
    return `
/* Trust Badges */
.trust-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin: 1rem 0;
}
.trust-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}
.trust-badge svg {
    flex-shrink: 0;
}
.trust-badge--secure {
    background: #ecfdf5;
    color: #059669;
}
.trust-badge--verified {
    background: #eff6ff;
    color: #2563eb;
}
.trust-badge--updated {
    background: #fef3c7;
    color: #d97706;
}
`;
}
